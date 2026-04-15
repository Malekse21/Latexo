import { createClient } from '@supabase/supabase-js';
import { groqChat, GROQ_MODEL_FAST } from '../../config/groq';
import { saveSession, sessionExists, deleteSession, getSession } from '../../lib/session/state';
import { AGENTS } from '../../config/agents';
import {
  SessionDuration,
  TURN_COUNT,
  CREDIT_COST,
  LiveSession,
  GeneratedQuestion,
  StartSessionResponse,
  PdfContext,
} from '../../types/session';

// Supabase admin client (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function startSession(
  userId: string,
  reportId: string,
  durationMinutes: SessionDuration,
  difficulty: "gentle" | "standard" | "hostile" = "standard"
): Promise<StartSessionResponse> {
  const supabase = getAdminClient();

  // ── Step 1: Check and clear any active session ───────
  const hasActive = await sessionExists(userId);
  if (hasActive) {
    // Before nuking the live session, let's mark its dangling DB row as ABORTED (optional, but clean)
    const oldSession = await getSession(userId);
    if (oldSession?.sessionId) {
      await supabase
        .from('simulations')
        .update({ status: 'ABORTED' })
        .eq('id', oldSession.sessionId);
    }
    // Delete the Redis/Live block
    await deleteSession(userId);
  }

  // ── Step 2: Check and deduct credits ──────────────────
  const cost = CREDIT_COST[durationMinutes];

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.credits < cost) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  const { error: deductError } = await supabase
    .from('profiles')
    .update({ credits: profile.credits - cost })
    .eq('id', userId);

  if (deductError) throw new Error('CREDIT_DEDUCTION_FAILED');

  // ── Step 3: Load report and weak topics ───────────────
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('data, title, extracted_text')
    .eq('id', reportId)
    .single();

  if (reportError || !report) throw new Error('REPORT_NOT_FOUND');

  // Build PdfContext from the new DNA skeleton schema
  const skeleton = report.data || {};
  const ch1 = skeleton.chapter_1_context_and_problem || {};
  const ch2 = skeleton.chapter_2_requirements || {};
  const ch3 = skeleton.chapter_3_conceptual_study || {};
  const ch4 = skeleton.chapter_4_realization || {};
  const devEnv = ch4.development_environment || {};

  // Build sections array from each chapter's key content
  const sections: { name: string; summary: string }[] = [
    {
      name: 'Context & Problem',
      summary: [ch1.core_problem, ch1.proposed_solution].filter(Boolean).join(' — ') || '',
    },
    {
      name: 'Requirements',
      summary: (ch2.functional_requirements || []).slice(0, 5).join(', ') || '',
    },
    {
      name: 'Conceptual Study',
      summary: [
        ch3.overall_architecture,
        ...(ch3.static_view_class_diagram || []).slice(0, 3),
      ].filter(Boolean).join(', ') || '',
    },
    {
      name: 'Realization',
      summary: (ch4.developed_interfaces || []).slice(0, 5).join(', ') || '',
    },
  ];

  const pdfContext: PdfContext = {
    title: skeleton.project_meta?.title || report.title || 'Untitled Project',
    domain: ch1.core_problem || 'General',
    methodology: skeleton.project_meta?.methodology || '',
    technologies: [
      ...(devEnv.frontend_stack || []),
      ...(devEnv.backend_stack || []),
      devEnv.database,
    ].filter(Boolean),
    sections,
    potentialGaps: [
      ...(ch1.critique_of_existing || []),
    ],
  };

  // Load memory from profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('memory')
    .eq('id', userId)
    .single();

  // Fetch the latest simulation's memory_snapshot for adaptive questions
  const { data: latestSim } = await supabase
    .from('simulations')
    .select('memory_snapshot')
    .eq('user_id', userId)
    .not('memory_snapshot', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const memorySnapshot: string = latestSim?.memory_snapshot || '';

  // ── Step 4: Generate question bank (1 AI call) ────────
  const totalTurns = TURN_COUNT[durationMinutes];
  // Past questions now live on the user profile, not the report
  const pastQuestions: string[] = profileData?.memory?.past_questions || [];
  const questionBank = await generateQuestionBank(
    pdfContext,
    memorySnapshot,
    totalTurns,
    pastQuestions,
    difficulty
  );

  // ── Step 5: Create simulation in Supabase ─────────────
  const { data: dbSim, error: simError } = await supabase
    .from('simulations')
    .insert({
      user_id: userId,
      report_id: reportId,
      status: 'IN_PROGRESS',
      duration_minutes: durationMinutes,
    })
    .select('id')
    .single();

  if (simError || !dbSim) {
    throw new Error(`SESSION_CREATE_FAILED: ${simError?.message}`);
  }

  // Shuffle the first 3 questions to randomize the starting agent but maintain general interleaving
  if (questionBank.length >= 3) {
    const firstThree = questionBank.splice(0, 3);
    // Simple random shuffle for the first 3 elements
    for (let i = firstThree.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [firstThree[i], firstThree[j]] = [firstThree[j], firstThree[i]];
    }
    questionBank.unshift(...firstThree);
  } else if (questionBank.length > 0) {
    questionBank.sort(() => Math.random() - 0.5);
  }

  // ── Step 6: Store live state ──────────────────────────
  const firstQuestion = questionBank[0];
  const session: LiveSession = {
    sessionId: dbSim.id,
    userId,
    reportId,
    pdfContext,
    questionBank,
    questionsAskedIds: [],
    questionsAskedTexts: [],
    extraQuestions: [],
    lastAnswers: [],
    currentQuestion: firstQuestion,
    currentAgentId: firstQuestion.agentId, // Start with the randomly selected first agent
    turnCount: 0,
    followUpsCount: 0,
    adaptiveCallsUsed: 0,
    difficulty,
    durationMinutes,
    totalTurns,
    startedAt: Date.now(),
  };

  await saveSession(userId, session);

  // ── Step 7: Save first turn to DB ────────────────────
  await supabase
    .from('turns')
    .insert({
      simulation_id: dbSim.id,
      agent_id: firstQuestion.agentId,
      question: firstQuestion.question,
      is_follow_up: false,
      was_interrupted: false,
      turn_index: 0,
    });

  return {
    sessionId: dbSim.id,
    firstQuestion: firstQuestion.question,
    agentId: firstQuestion.agentId,
    agentName: AGENTS[firstQuestion.agentId]?.name || AGENTS[0].name,
    totalTurns,
    creditsDeducted: cost,
  };
}

// ── Question Bank Generator ────────────────────────────────
async function generateQuestionBank(
  pdfContext: PdfContext,
  memorySnapshot: string,
  totalTurns: number,
  pastQuestions: string[] = [],
  difficulty: "gentle" | "standard" | "hostile" = "standard"
): Promise<GeneratedQuestion[]> {

  // Distribute questions evenly across agents (balanced talking turns)
  // Agent 0 (Malek):  ~1/3 — technical focus
  // Agent 1 (Souad):  ~1/3 — academic/methodology focus
  // Agent 2 (Amir):   ~1/3 — business/research focus
  const perAgent = Math.floor(totalTurns / 3);
  const remainder = totalTurns % 3;
  const counts = {
    0: perAgent + (remainder >= 1 ? 1 : 0),
    1: perAgent + (remainder >= 2 ? 1 : 0),
    2: perAgent,
  };

  // Determine distribution based on selected difficulty
  let difficultyDistribution = "";
  if (difficulty === "gentle") {
    difficultyDistribution = "~70% easy, ~30% medium, 0% hard";
  } else if (difficulty === "hostile") {
    difficultyDistribution = "~10% easy, ~40% medium, ~50% hard";
  } else {
    // Standard
    difficultyDistribution = "~30% easy, ~50% medium, ~20% hard";
  }

  const prompt = `
You are generating questions for a PFE thesis defense simulation.

Project: ${pdfContext.title}
Domain: ${pdfContext.domain}
Methodology: ${pdfContext.methodology}
Technologies: ${pdfContext.technologies.join(', ')}

Sections:
${pdfContext.sections.map(s =>
  `- ${s.name}: ${s.summary}`
).join('\n')}

Gaps detected: ${pdfContext.potentialGaps.join(' | ')}
${memorySnapshot ? `AI evaluation note from last session: "${memorySnapshot}"
Use this note to prioritize questions on areas where the student previously struggled.` : 'This is the student\'s first simulation.'}

${pastQuestions.length > 0 ? `PREVIOUSLY ASKED QUESTIONS ACROSS PAST SIMULATIONS (DO NOT REPEAT THESE):
${pastQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}
` : ''}
Generate exactly ${totalTurns} questions split across 3 agents:
- Agent 0 (Malek, technical): ${counts[0]} questions — architecture, databases, APIs, security, deployment
- Agent 1 (Souad, academic): ${counts[1]} questions — methodology, UML, report structure, academic rigor
- Agent 2 (Amir, business): ${counts[2]} questions — market viability, ROI, competitive analysis, user needs

Rules:
1. Mix difficulties: ${difficultyDistribution}
2. Use very clear, simple vocabulary and phrasing (in French or English). The concept can be hard, but the text itself must be extremely easy to understand. Do not use convoluted, archaic, or overly flowery academic words.
3. If an AI evaluation note is provided, generate harder questions targeting those weak areas
4. Each question must be answerable from the project context
5. Questions must be realistic jury questions — direct, under 2 sentences
6. CRITICAL: Generate entirely NEW questions. Do NOT ask any question that is semantically similar to the PREVIOUSLY ASKED QUESTIONS listed above
7. CRITICAL: Interleave the agent IDs so talking turns alternate naturally (e.g. 0,1,2,0,1,2,...). Do NOT group all questions from one agent together

Return ONLY a valid JSON object with a "questions" array:
{"questions": [{
  "id": "a0_q1",
  "agentId": 0,
  "question": "...",
  "topic": "Methodology",
  "difficulty": "medium",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}]}

`;

  const content = await groqChat({
    model: GROQ_MODEL_FAST,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  // Strip markdown if present
  const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);

  // Handle both {questions: [...]} and [...] response formats
  const questions: GeneratedQuestion[] = Array.isArray(parsed)
    ? parsed
    : parsed.questions ?? parsed[Object.keys(parsed)[0]];

  return questions.slice(0, totalTurns);
}
