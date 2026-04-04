// ─── Shared types for the Dashboard Server/Client boundary ───
// These types define the data contract between the Server Component
// (app/dashboard/page.tsx) and the Client Component (DashboardClient.tsx).

export interface DashboardProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  active_report_id: string | null;
  defense_date: string | null;
  university?: string | null;
  specialty?: string | null;
  total_sessions?: number;
  last_session?: string | null;
  best_score?: number;
  memory?: Record<string, any> | null;
  current_streak?: number;
  longest_streak?: number;
}

export interface DashboardReport {
  id: string;
  title: string;
  name: string;
  created_at: string;
  page_count: number;
  word_count: number;
  thumbnail_url?: string;
  detected_language?: string;
  language?: string;
  data?: any;
}

export interface ReadinessData {
  readinessScore: number | null;
  projectedScore: number | null;
  lastGrade: number | null;
  memorySnapshot: string | null;
}

/** Props passed from the Server Component to the DashboardClient */
export interface DashboardClientProps {
  initialProfile: DashboardProfile;
  initialReport: DashboardReport | null;
  initialReadiness: ReadinessData;
}

// ─── Readiness Score Helpers (pure functions, usable on server & client) ───

export function getSessionVolume(sessions: number): number {
  const capped = Math.min(sessions, 8);
  return Math.round((capped / 8) * 100);
}

export function getRecencyScore(daysSinceLast: number): number {
  if (daysSinceLast <= 2) return 100;
  if (daysSinceLast <= 5) return 70;
  if (daysSinceLast <= 9) return 40;
  return 10;
}

export function computeReadiness(
  avgScoreNorm: number,
  sessionVol: number,
  recency: number
): number {
  if (sessionVol === 0) return 0;
  return Math.round(avgScoreNorm * 0.50 + sessionVol * 0.35 + recency * 0.15);
}
