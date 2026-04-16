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
  5: 10,     // 10 credits for 5 mins
  15: 20,    // 20 credits for 15 mins
  20: 25,    // extrapolated
  30: 30,    // 30 credits for 30 mins
  45: 45,    // extrapolated
  60: 60     // extrapolated
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
  followUpsCount: number;       // tracks follow-ups for the current question
  adaptiveCallsUsed: number;    // max 1 per session
  difficulty: "gentle" | "standard" | "hostile";

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
