import { createClient } from '@supabase/supabase-js';
import { groqChat, GROQ_MODEL_FAST } from '../../config/groq';
import { saveSession, sessionExists } from '../../lib/session/state';
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
  durationMinutes: SessionDuration
): Promise<StartSessionResponse> {
  const supabase = getAdminClient();

  // ── Step 1: Check no active session ──────────────────
  const hasActive = await sessionExists(userId);
  if (hasActive) {
    throw new Error('SESSION_ALREADY_ACTIVE');
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

  // Build PdfContext from existing report skeleton data
  const skeleton = report.data || {};
  const pdfContext: PdfContext = {
    title: skeleton.project_meta?.title || report.title || 'Untitled Project',
    domain: skeleton.logic_chain?.problem || 'General',
    methodology: skeleton.logic_chain?.solution || '',
    technologies: skeleton.technical_fingerprint?.stack || [],
    sections: (skeleton.chapter_map || []).map((ch: any) => ({
      name: ch.title || '',
      summary: ch.summary || '',
      weaknessScore: 0.5,
    })),
    potentialGaps: skeleton.simulation_hooks?.vulnerabilities || [],
    keyFindings: skeleton.simulation_hooks?.critical_questions || [],
  };

  // Load weak topics from profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('weak_topics, memory')
    .eq('id', userId)
    .single();

  // weak_topics is a JSONB array of {topic, score} objects
  const weakTopicsRaw: any[] = profileData?.weak_topics || [];
  const weakTopicNames: string[] = weakTopicsRaw.map((w: any) =>
    typeof w === 'string' ? w : w.topic
  ).filter(Boolean);

  // ── Step 4: Generate question bank (1 AI call) ────────
  const totalTurns = TURN_COUNT[durationMinutes];
  const questionBank = await generateQuestionBank(
    pdfContext,
    weakTopicNames,
    totalTurns
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

  // ── Step 6: Store live state ──────────────────────────
  const firstQuestion = questionBank[0];
  const session: LiveSession = {
    sessionId: dbSim.id,
    userId,
    reportId,
    pdfContext,
    weakTopics: weakTopicNames,
    questionBank,
    questionsAskedIds: [],
    questionsAskedTexts: [],
    extraQuestions: [],
    lastAnswers: [],
    currentQuestion: firstQuestion,
    currentAgentId: 0,         // always start with Malek
    turnCount: 0,
    followUpUsed: false,
    adaptiveCallsUsed: 0,
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
      agent_id: 0,
      question: firstQuestion.question,
      is_follow_up: false,
      was_interrupted: false,
      turn_index: 0,
    });

  return {
    sessionId: dbSim.id,
    firstQuestion: firstQuestion.question,
    agentId: 0,
    agentName: AGENTS[0].name,
    totalTurns,
    creditsDeducted: cost,
  };
}

// ── Question Bank Generator ────────────────────────────────
async function generateQuestionBank(
  pdfContext: PdfContext,
  weakTopics: string[],
  totalTurns: number
): Promise<GeneratedQuestion[]> {

  // Distribute questions across agents
  // Agent 0 (Malek):   40% — methodology focus
  // Agent 1 (Souad):   40% — technical focus
  // Agent 2 (Amir):    20% — research/big picture
  const counts = {
    0: Math.ceil(totalTurns * 0.4),
    1: Math.ceil(totalTurns * 0.4),
    2: Math.floor(totalTurns * 0.2),
  };

  const prompt = `
You are generating questions for a PFE thesis defense simulation.

Project: ${pdfContext.title}
Domain: ${pdfContext.domain}
Methodology: ${pdfContext.methodology}
Technologies: ${pdfContext.technologies.join(', ')}

Sections:
${pdfContext.sections.map(s =>
  `- ${s.name}: ${s.summary} [weakness: ${
    s.weaknessScore > 0.6 ? 'HIGH' :
    s.weaknessScore > 0.3 ? 'MEDIUM' : 'LOW'
  }]`
).join('\n')}

Gaps detected: ${pdfContext.potentialGaps.join(' | ')}
Weak topics from last session: ${weakTopics.join(', ') || 'none'}

Generate exactly ${totalTurns} questions split across 3 agents:
- Agent 0 (Malek, methodology): ${counts[0]} questions
- Agent 1 (Souad, technical): ${counts[1]} questions  
- Agent 2 (Amir, research): ${counts[2]} questions

Rules:
1. Mix difficulties: ~30% easy, ~50% medium, ~20% hard
2. Prioritize HIGH weakness sections for medium/hard questions
3. Prioritize weak topics from last session
4. Each question must be answerable from the project context
5. Questions must be realistic jury questions — direct, under 2 sentences

Return ONLY a valid JSON object with a "questions" array:
{"questions": [{
  "id": "a0_q1",
  "agentId": 0,
  "question": "...",
  "topic": "Methodology",
  "difficulty": "medium",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "followUp": "follow-up question if answer is weak, or null",
  "triggerCondition": "always"
}]}

triggerCondition values:
- "always"    → ask regardless of previous answer
- "if_weak"   → only ask if previous answer score < 60
- "if_strong" → only ask if previous answer score >= 75
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
