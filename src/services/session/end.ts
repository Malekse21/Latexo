import { createClient } from '@supabase/supabase-js';
import { groqChat, GROQ_MODEL_EVAL } from '../../config/groq';
import { getSession, deleteSession } from '../../lib/session/state';
import { AGENTS } from '../../config/agents';
import { EndSessionResponse, PdfContext } from '../../types/session';

// Supabase admin client (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function endSession(
  userId: string,
  sessionId: string
): Promise<EndSessionResponse> {
  const supabase = getAdminClient();

  // ── Load full transcript from DB ──────────────────────
  const { data: turns, error: turnsError } = await supabase
    .from('turns')
    .select('*')
    .eq('simulation_id', sessionId)
    .order('turn_index', { ascending: true });

  if (turnsError || !turns) throw new Error('TURNS_NOT_FOUND');

  const session = await getSession(userId);
  if (!session) throw new Error('SESSION_NOT_FOUND');

  // ── Evaluate (1 AI call — full model) ─────────────────
  const feedback = await evaluateSession(turns, session.pdfContext);

  // ── Save to simulations table (replaces sessions + feedback) ──
  await supabase
    .from('simulations')
    .update({
      status: 'COMPLETED',
      final_grade: feedback.score,
      mention: feedback.mention,
      feedback: {
        strengths: feedback.strengths,
        weaknesses: feedback.weaknesses,
        newWeakTopics: feedback.newWeakTopics,
      },
      jury_feedback: {
        jury_comment: feedback.juryComment,
      },
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  // ── Update profile: weak_topics, history, stats ────────
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('total_sessions, best_score, session_history, weak_topics')
    .eq('id', userId)
    .single();

  const totalSessions = (currentProfile?.total_sessions || 0) + 1;
  const bestScore = Math.max(currentProfile?.best_score || 0, feedback.score);

  // Build session history entry (last 5 only)
  const newEntry = {
    score: feedback.score,
    duration: session.durationMinutes,
    date: new Date().toISOString(),
    mention: feedback.mention,
  };

  const existingHistory: any[] = currentProfile?.session_history || [];
  const updatedHistory = [newEntry, ...existingHistory].slice(0, 5);

  // Merge new weak topics into existing list (JSONB on profiles)
  const existingWeakTopics: any[] = currentProfile?.weak_topics || [];
  const existingTopicNames = existingWeakTopics.map((w: any) =>
    typeof w === 'string' ? w : w.topic
  );
  const mergedWeakTopics = [...existingWeakTopics];
  for (const topic of feedback.newWeakTopics) {
    const idx = existingTopicNames.indexOf(topic);
    if (idx >= 0) {
      // Update score
      mergedWeakTopics[idx] = { topic, score: 0.7, updated: new Date().toISOString() };
    } else {
      mergedWeakTopics.push({ topic, score: 0.7, updated: new Date().toISOString() });
    }
  }
  // Keep max 10 weak topics
  const finalWeakTopics = mergedWeakTopics.slice(-10);

  await supabase
    .from('profiles')
    .update({
      total_sessions: totalSessions,
      best_score: bestScore,
      session_history: updatedHistory,
      weak_topics: finalWeakTopics,
      memory: {
        last_session: new Date().toISOString(),
        last_note: feedback.juryComment,
        session_count: totalSessions,
        weak_topics: feedback.newWeakTopics,
      },
    })
    .eq('id', userId);

  // ── Prune old simulations: keep only last 5 in DB ──────
  const { data: allSims } = await supabase
    .from('simulations')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'COMPLETED')
    .order('ended_at', { ascending: false });

  if (allSims && allSims.length > 5) {
    const idsToDelete = allSims.slice(5).map(s => s.id);
    for (const oldId of idsToDelete) {
      await supabase.from('turns').delete().eq('simulation_id', oldId);
      await supabase.from('simulations').delete().eq('id', oldId);
    }
  }

  // ── Cleanup live session state ─────────────────────────
  await deleteSession(userId);

  return feedback;
}

// ── Pre-Evaluation Analytics (local, free) ─────────────────
interface SessionAnalytics {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  participationRate: number;       // 0-100
  avgAnswerWordCount: number;
  totalFillerWords: number;
  shortAnswerCount: number;        // answers under 15 words
  followUpCount: number;
  interruptCount: number;
}

function computeAnalytics(turns: any[]): SessionAnalytics {
  const FILLERS = [
    'euh', 'euhm', 'hm', 'uh', 'um',
    'so basically', 'you know', 'like i said',
    'donc euh', 'voilà', 'genre', 'bref',
    'ya3ni', 'walla', 'kima',
  ];

  const totalQuestions = turns.length;
  const answeredTurns = turns.filter(t => t.answer && t.answer.trim().length > 0);
  const answeredQuestions = answeredTurns.length;
  const unansweredQuestions = totalQuestions - answeredQuestions;
  const participationRate = totalQuestions > 0
    ? Math.round((answeredQuestions / totalQuestions) * 100)
    : 0;

  let totalWords = 0;
  let totalFillerWords = 0;
  let shortAnswerCount = 0;

  for (const turn of answeredTurns) {
    const words = turn.answer.trim().split(/\s+/);
    totalWords += words.length;

    if (words.length < 15) shortAnswerCount++;

    const lower = turn.answer.toLowerCase();
    for (const filler of FILLERS) {
      const matches = lower.split(filler).length - 1;
      totalFillerWords += matches;
    }
  }

  const avgAnswerWordCount = answeredQuestions > 0
    ? Math.round(totalWords / answeredQuestions)
    : 0;

  const followUpCount = turns.filter(t => t.is_follow_up).length;
  const interruptCount = turns.filter(t => t.was_interrupted).length;

  return {
    totalQuestions,
    answeredQuestions,
    unansweredQuestions,
    participationRate,
    avgAnswerWordCount,
    totalFillerWords,
    shortAnswerCount,
    followUpCount,
    interruptCount,
  };
}

function getMentionFromScore(score: number): string {
  if (score >= 18) return 'Très Bien';
  if (score >= 16) return 'Bien';
  if (score >= 14) return 'Assez Bien';
  if (score >= 12) return 'Passable';
  if (score >= 10) return 'Médiocre';
  return 'Insuffisant';
}

// ── Evaluator ──────────────────────────────────────────────
async function evaluateSession(
  turns: any[],
  pdfContext: PdfContext
): Promise<EndSessionResponse> {

  // ── Step 1: Compute hard analytics locally ────────────
  const stats = computeAnalytics(turns);

  // ── Step 2: If participation is too low, don't even ask AI ──
  if (stats.participationRate < 20) {
    const score = Math.min(4, Math.round(stats.participationRate / 5));
    return {
      score,
      mention: getMentionFromScore(score),
      strengths: ['L\'étudiant a commencé la session.'],
      weaknesses: [
        `Seulement ${stats.answeredQuestions}/${stats.totalQuestions} questions répondues (${stats.participationRate}%).`,
        'Participation largement insuffisante pour une évaluation.',
      ],
      newWeakTopics: ['Participation', 'Préparation générale'],
      juryComment: `L'étudiant n'a répondu qu'à ${stats.answeredQuestions} question(s) sur ${stats.totalQuestions}. La session est considérée comme incomplète. Une note minimale est attribuée. L'étudiant doit refaire la simulation avec une participation complète.`,
    };
  }

  // ── Step 3: Build transcript ──────────────────────────
  const transcript = turns
    .map((t, i) =>
`Q${i + 1} [${AGENTS[t.agent_id]?.name ?? 'Agent'}]: ${t.question}
Étudiant: ${t.answer ?? '[PAS DE RÉPONSE — question ignorée]'}`
    )
    .join('\n\n');

  // ── Step 4: Scoring cap based on participation ────────
  // If < 50% answered → max possible 8/20
  // If < 75% answered → max possible 12/20
  // If 100% answered  → full range 0-20
  let maxAllowed = 20;
  if (stats.participationRate < 50) {
    maxAllowed = 8;
  } else if (stats.participationRate < 75) {
    maxAllowed = 12;
  } else if (stats.participationRate < 90) {
    maxAllowed = 16;
  }

  const prompt =
`Tu es un jury de soutenance PFE tunisien. Tu évalues STRICTEMENT la performance de l'étudiant.

══════════════ DONNÉES DU PROJET ══════════════
Projet: ${pdfContext.title}
Domaine: ${pdfContext.domain}
Méthodologie: ${pdfContext.methodology || 'Non spécifiée'}
Technologies: ${pdfContext.technologies.join(', ') || 'Non spécifiées'}

══════════════ STATISTIQUES DE LA SESSION ══════════════
Questions posées: ${stats.totalQuestions}
Questions répondues: ${stats.answeredQuestions} / ${stats.totalQuestions} (${stats.participationRate}%)
Questions ignorées: ${stats.unansweredQuestions}
Longueur moyenne des réponses: ${stats.avgAnswerWordCount} mots
Réponses courtes (<15 mots): ${stats.shortAnswerCount}
Mots de remplissage (euh, hmm...): ${stats.totalFillerWords}
Relances du jury (follow-ups): ${stats.followUpCount}
Interruptions du jury: ${stats.interruptCount}

NOTE MAXIMALE AUTORISÉE: ${maxAllowed}/20 (basé sur le taux de participation de ${stats.participationRate}%)

══════════════ TRANSCRIPT COMPLET ══════════════
${transcript}

══════════════ CONSIGNES D'ÉVALUATION ══════════════

RÈGLES STRICTES:
1. La note DOIT être ≤ ${maxAllowed}/20 (cap de participation)
2. Une réponse courte (<15 mots) sans justification = réponse FAIBLE
3. Ignorer une question = 0 points pour cette question
4. Les mots de remplissage excessifs (>5) réduisent la note de fluence
5. Si l'étudiant répète la question au lieu de répondre = réponse INSUFFISANTE
6. Un étudiant qui ne justifie JAMAIS ses choix = max 10/20
7. Sois aussi strict qu'un vrai jury tunisien

COMMENT ÉVALUER:
- Chaque réponse: est-ce qu'elle montre la MAÎTRISE du sujet?
- Est-ce que l'étudiant JUSTIFIE ses choix avec des arguments concrets?
- Est-ce que l'étudiant fait des liens entre les questions?
- Profondeur technique: superficiel = faible, détaillé avec tradeoffs = fort

Barème strict:
18-20 = Très Bien (réponses excellentes, tous les sujets maîtrisés, justifications claires)
16-17 = Bien (bonnes réponses avec quelques lacunes mineures)
14-15 = Assez Bien (réponses correctes mais manque de profondeur)
12-13 = Passable (réponses superficielles, peu de justification)
10-11 = Médiocre (réponses vagues, beaucoup de lacunes)
0-9   = Insuffisant (non-réponses, hors sujet, ou participation insuffisante)

Réponds UNIQUEMENT en JSON strict:
{
  "score": <nombre ≤ ${maxAllowed}>,
  "mention": "<Très Bien|Bien|Assez Bien|Passable|Médiocre|Insuffisant>",
  "strengths": ["point fort 1 avec citation de leur réponse", "point fort 2"],
  "weaknesses": ["faiblesse 1 avec citation de leur réponse", "faiblesse 2"],
  "newWeakTopics": ["topic 1", "topic 2"],
  "juryComment": "Verdict formel du jury, 2-3 phrases en français académique."
}`;

  const content = await groqChat({
    model: GROQ_MODEL_EVAL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 700,
    temperature: 0.2,    // lower = more deterministic/strict
    response_format: { type: 'json_object' },
  });

  try {
    const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned) as EndSessionResponse;

    // ── Step 5: Enforce scoring cap (AI might ignore the instruction) ──
    const clampedScore = Math.min(
      Math.max(0, parsed.score),
      maxAllowed
    );

    // Recalculate mention based on clamped score
    const mention = getMentionFromScore(clampedScore);

    return {
      ...parsed,
      score: Math.round(clampedScore * 10) / 10,   // 1 decimal place
      mention,
    };
  } catch {
    // Fallback if JSON malformed
    const fallbackScore = Math.min(6, maxAllowed);
    return {
      score: fallbackScore,
      mention: getMentionFromScore(fallbackScore),
      strengths: ['Session terminée'],
      weaknesses: ['Évaluation automatique — données insuffisantes pour un avis détaillé'],
      newWeakTopics: [],
      juryComment: `L'étudiant a répondu à ${stats.answeredQuestions}/${stats.totalQuestions} questions. Session évaluée avec des données limitées.`,
    };
  }
}
