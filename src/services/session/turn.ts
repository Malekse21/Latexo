import { createClient } from '@supabase/supabase-js';
import { getSession, updateSession } from '../../lib/session/state';
import { AGENTS, AGENT_ROTATION, shouldSwitchToAmir } from '../../config/agents';
import { isAnswerWeak, countFillers } from '../../lib/weakDetector';
import { buildConversationBridge } from '../../lib/conversationBridge';
import { generateFollowUp, generateMoreQuestions } from '../../lib/questionGenerator';
import {
  TurnResponse,
  AgentId,
  GeneratedQuestion,
  LiveSession,
} from '../../types/session';

// Supabase admin client (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function processTurn(
  userId: string,
  userAnswer: string,
  silenceDuration: number = 0
): Promise<TurnResponse> {
  const supabase = getAdminClient();

  // ── Load session ──────────────────────────────────────
  const session = await getSession(userId);
  if (!session) throw new Error('SESSION_NOT_FOUND');

  const currentQuestion = session.currentQuestion;
  if (!currentQuestion) throw new Error('NO_CURRENT_QUESTION');

  // ── Save answer to current turn in DB ─────────────────
  await supabase
    .from('turns')
    .update({
      answer: userAnswer,
      silence_duration: silenceDuration,
    })
    .eq('simulation_id', session.sessionId)
    .eq('turn_index', session.turnCount)
    .is('answer', null);

  // ── Detect answer weakness (local, free) ─────────────
  const fillerCount = countFillers(userAnswer);
  const weak = isAnswerWeak(userAnswer, currentQuestion.keywords, fillerCount);

  // ── Update session memory ─────────────────────────────
  const updatedLastAnswers = [
    ...session.lastAnswers.slice(-2),   // keep last 2 only
    { question: currentQuestion.question, answer: userAnswer },
  ];

  const updatedAskedIds = [
    ...session.questionsAskedIds,
    currentQuestion.id,
  ];

  const updatedAskedTexts = [
    ...session.questionsAskedTexts,
    currentQuestion.question,
  ];

  // ── Check if session should end ───────────────────────
  const newTurnCount = session.turnCount + 1;
  const isLastTurn = newTurnCount >= session.totalTurns;

  if (isLastTurn) {
    // Save final state and signal end
    await updateSession(userId, {
      turnCount: newTurnCount,
      lastAnswers: updatedLastAnswers,
      questionsAskedIds: updatedAskedIds,
      questionsAskedTexts: updatedAskedTexts,
      currentQuestion: null,
    });

    return {
      question: '',
      agentId: session.currentAgentId,
      agentName: AGENTS[session.currentAgentId].name,
      isFollowUp: false,
      isInterrupt: false,
      interruptPhrase: null,
      turnIndex: newTurnCount,
      turnsRemaining: 0,
      isLastTurn: true,
    };
  }

  // ── Decision engine ───────────────────────────────────
  const { nextQuestion, isFollowUp, isInterrupt, interruptPhrase, nextAgentId } =
    await decideNextAction(session, weak, updatedAskedIds, updatedAskedTexts);

  // ── Build conversation bridge ─────────────────────────
  const bridgedQuestion = buildConversationBridge(
    userAnswer,
    weak,
    nextQuestion,
    currentQuestion,
    isFollowUp
  );

  // ── Save next turn to DB ──────────────────────────────
  await supabase
    .from('turns')
    .insert({
      simulation_id: session.sessionId,
      agent_id: nextAgentId,
      question: nextQuestion,
      is_follow_up: isFollowUp,
      was_interrupted: isInterrupt,
      turn_index: newTurnCount,
    });

  // ── Update live state ─────────────────────────────────
  const nextGeneratedQuestion: GeneratedQuestion = {
    id: `turn_${newTurnCount}`,
    agentId: nextAgentId,
    question: nextQuestion,
    topic: currentQuestion.topic,
    difficulty: currentQuestion.difficulty,
    keywords: currentQuestion.keywords,
    followUp: null,
    triggerCondition: 'always',
  };

  await updateSession(userId, {
    turnCount: newTurnCount,
    currentQuestion: nextGeneratedQuestion,
    currentAgentId: nextAgentId,
    lastAnswers: updatedLastAnswers,
    questionsAskedIds: updatedAskedIds,
    questionsAskedTexts: updatedAskedTexts,
    followUpUsed: isFollowUp,
    adaptiveCallsUsed: session.adaptiveCallsUsed,
  });

  return {
    question: bridgedQuestion,
    agentId: nextAgentId,
    agentName: AGENTS[nextAgentId].name,
    isFollowUp,
    isInterrupt,
    interruptPhrase,
    turnIndex: newTurnCount,
    turnsRemaining: session.totalTurns - newTurnCount,
    isLastTurn: false,
  };
}

// ── Decision Engine ────────────────────────────────────────
async function decideNextAction(
  session: LiveSession,
  weak: boolean,
  updatedAskedIds: string[],
  updatedAskedTexts: string[]
): Promise<{
  nextQuestion: string;
  isFollowUp: boolean;
  isInterrupt: boolean;
  interruptPhrase: string | null;
  nextAgentId: AgentId;
}> {

  // ── PATH A: Weak answer + followup not yet used ────────
  if (weak && !session.followUpUsed) {
    const lastAnswer = session.lastAnswers[session.lastAnswers.length - 1];
    const followUp = await generateFollowUp(
      session.currentQuestion!.question,
      lastAnswer?.answer ?? '',
      session.currentAgentId,
      session.pdfContext
    );

    // Build interrupt phrase using student's words
    const interruptPhrase = session.currentAgentId !== 2
      ? buildInterruptPhrase(lastAnswer?.answer ?? '', session.currentAgentId)
      : null;

    return {
      nextQuestion: followUp,
      isFollowUp: true,
      isInterrupt: interruptPhrase !== null,
      interruptPhrase,
      nextAgentId: session.currentAgentId,  // same agent follows up
    };
  }

  // ── PATH B: Normal flow — next question from bank ──────
  const nextAgentId = selectNextAgent(session);
  const nextQuestion = await selectNextQuestion(
    session,
    nextAgentId,
    updatedAskedIds,
    updatedAskedTexts
  );

  return {
    nextQuestion,
    isFollowUp: false,
    isInterrupt: false,
    interruptPhrase: null,
    nextAgentId,
  };
}

// ── Agent Selector ─────────────────────────────────────────
function selectNextAgent(session: LiveSession): AgentId {
  // Find last turn where Amir (agent 2) was used — approximate from asked IDs
  const lastAmirTurn = session.questionBank
    .filter(q => q.agentId === 2 && session.questionsAskedIds.includes(q.id))
    .length > 0 ? session.turnCount - 1 : -1;

  if (shouldSwitchToAmir(session.turnCount, lastAmirTurn)) {
    return 2;
  }

  return AGENT_ROTATION[session.currentAgentId];
}

// ── Question Selector ──────────────────────────────────────
async function selectNextQuestion(
  session: LiveSession,
  agentId: AgentId,
  askedIds: string[],
  askedTexts: string[]
): Promise<string> {

  // Filter bank by agent and not yet asked
  const available = session.questionBank.filter(q =>
    q.agentId === agentId &&
    !askedIds.includes(q.id)
  );

  if (available.length > 0) {
    // Pick appropriate difficulty based on turn progression
    const progress = session.turnCount / session.totalTurns;
    const targetDiff = progress < 0.3 ? 'easy'
      : progress < 0.7 ? 'medium'
      : 'hard';

    const byDiff = available.filter(q => q.difficulty === targetDiff);
    const selected = byDiff[0] ?? available[0];
    return selected.question;
  }

  // ── Bank exhausted → use extras or generate more ──────
  if (session.extraQuestions.length > 0) {
    const next = session.extraQuestions[0];
    await updateSession(session.userId, {
      extraQuestions: session.extraQuestions.slice(1),
    });
    return next;
  }

  // Generate fresh batch
  const newQuestions = await generateMoreQuestions(
    session.questionsAskedTexts,
    agentId,
    session.pdfContext,
  );

  // Store extras for upcoming turns
  await updateSession(session.userId, {
    extraQuestions: newQuestions.slice(1),
  });

  return newQuestions[0];
}

// ── Interrupt Phrase Builder ───────────────────────────────
function buildInterruptPhrase(answer: string, agentId: AgentId): string | null {
  if (!answer || answer.split(' ').length < 5) return null;

  // Extract last meaningful clause
  const sentences = answer.split(/[.،,]/);
  const lastClause = sentences[sentences.length - 2]?.trim()
    ?? sentences[0]?.trim()
    ?? '';

  const words = lastClause.split(' ');
  const quoted = words.slice(-4).join(' ').slice(0, 40);
  if (!quoted) return null;

  const templates: Record<number, string[]> = {
    0: [
      `— Attendez. "${quoted}" — quelle est la justification derrière ça ?`,
      `— "${quoted}" — pourquoi est-ce que ça suit logiquement ?`,
    ],
    1: [
      `— "${quoted}" — ce n'est pas ce que dit la section 3 de votre rapport.`,
      `— Attendez. "${quoted}" — quels sont les trade-offs de cette approche ?`,
    ],
    2: [
      `— "${quoted}" — mais est-ce que c'est vraiment le bon problème à résoudre ?`,
    ],
  };

  const options = templates[agentId];
  return options[Math.floor(Math.random() * options.length)];
}
