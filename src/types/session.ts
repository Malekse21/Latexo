// ── Duration ──────────────────────────────────────────────
export type SessionDuration = 5 | 15 | 20 | 30 | 45 | 60;

export const TURN_COUNT: Record<SessionDuration, number> = {
  5: 6,
  15: 12,
  20: 16,
  30: 20,
  45: 30,
  60: 40
};

export const CREDIT_COST: Record<SessionDuration, number> = {
  5: 8,     // 6 turns + 2 evaluation
  15: 14,   // 12 turns + 2 evaluation
  20: 18,   // 16 turns + 2 evaluation
  30: 22,   // 20 turns + 2 evaluation
  45: 32,   // 30 turns + 2 evaluation
  60: 42    // 40 turns + 2 evaluation
};

// ── Agent ─────────────────────────────────────────────────
export type AgentId = 0 | 1 | 2;

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  personality: string;
  focusAreas: string[];
  interruptThreshold: number; // answer score below this → consider followup
}

// ── PDF Context ───────────────────────────────────────────
export interface PdfContext {
  title: string;
  domain: string;
  methodology: string;
  technologies: string[];
  sections: PdfSection[];
  potentialGaps: string[];
}

export interface PdfSection {
  name: string;
  summary: string;
}

// ── Question ──────────────────────────────────────────────
export interface GeneratedQuestion {
  id: string;
  agentId: AgentId;
  question: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  keywords: string[];
  followUp: string | null;
  triggerCondition: 'always' | 'if_weak' | 'if_strong';
}

// ── Turn ──────────────────────────────────────────────────
export interface SessionTurn {
  question: string;
  agentId: AgentId;
  answer: string | null;
  isFollowUp: boolean;
  wasInterrupted: boolean;
  turnIndex: number;
}

// ── Live Session (stored in Supabase JSONB) ───────────────
export interface LiveSession {
  // Identity
  sessionId: string;
  userId: string;
  reportId: string;

  // Context
  pdfContext: PdfContext;

  // Question tracking
  questionBank: GeneratedQuestion[];
  questionsAskedIds: string[];
  questionsAskedTexts: string[];
  extraQuestions: string[];     // generated when bank exhausted

  // Conversation memory
  lastAnswers: Array<{
    question: string;
    answer: string;
  }>;

  // Current state
  currentQuestion: GeneratedQuestion | null;
  currentAgentId: AgentId;
  turnCount: number;
  followUpUsed: boolean;        // one followup per question max
  adaptiveCallsUsed: number;    // max 1 per session

  // Session config
  durationMinutes: SessionDuration;
  totalTurns: number;           // from TURN_COUNT
  startedAt: number;            // unix timestamp
}

// ── API Responses ─────────────────────────────────────────
export interface StartSessionResponse {
  sessionId: string;
  firstQuestion: string;
  agentId: AgentId;
  agentName: string;
  totalTurns: number;
  creditsDeducted: number;
}

export interface TurnResponse {
  question: string;
  agentId: AgentId;
  agentName: string;
  isFollowUp: boolean;
  isInterrupt: boolean;
  interruptPhrase: string | null;
  turnIndex: number;
  turnsRemaining: number;
  isLastTurn: boolean;
}

export interface EndSessionResponse {
  score: number;           // out of 20
  mention: string;         // Très Bien | Bien | Assez Bien etc.
  strengths: string[];
  weaknesses: string[];
  newWeakTopics: string[];
  juryComment: string;
}
