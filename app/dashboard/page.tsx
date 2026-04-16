import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { DashboardProfile, DashboardReport, ReadinessData } from "@/lib/types/dashboard";
import { getSessionVolume, getRecencyScore, computeReadiness } from "@/lib/types/dashboard";
import { differenceInDays } from "date-fns";

// ─── Server-side data fetching ────────────────────────────────
async function fetchDashboardData(
  userId: string,
  profile: DashboardProfile
): Promise<{
  activeReport: DashboardReport | null;
  readiness: ReadinessData;
}> {
  const supabase = await createClient();

  // ── 1. Active Report ────────────────────────────────────────
  let activeReport: DashboardReport | null = null;

  if (profile.active_report_id) {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("id", profile.active_report_id)
      .maybeSingle();
    activeReport = data;
  }

  if (!activeReport) {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    activeReport = data;
  }

  if (activeReport) {
    activeReport = { ...activeReport, language: activeReport.detected_language };
  }

  // ── 2. Readiness Score ──────────────────────────────────────
  const totalSessions = profile.total_sessions || 0;
  const lastSession = profile.last_session;

  const { data: recentSims } = await supabase
    .from("simulations")
    .select("final_grade, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  let avgScoreNorm = 0;
  if (recentSims && recentSims.length > 0) {
    const avg =
      recentSims.reduce(
        (sum: number, s: any) => sum + (s.final_grade || 0),
        0
      ) / recentSims.length;
    avgScoreNorm = (avg / 20) * 100;
  }

  const sessionVol = getSessionVolume(totalSessions);

  let recency = 0;
  if (lastSession) {
    const days = Math.floor(
      (new Date().getTime() - new Date(lastSession).getTime()) /
        (1000 * 3600 * 24)
    );
    recency = getRecencyScore(days);
  }

  const readinessScore = computeReadiness(avgScoreNorm, sessionVol, recency);

  // Projected score (what the user would get if they do one more session)
  const nextSessionVol = getSessionVolume(totalSessions + 1);
  const proj = computeReadiness(avgScoreNorm, nextSessionVol, 100);
  const projectedScore = proj > readinessScore ? proj : readinessScore + 5;

  // Last grade
  const lastGrade =
    recentSims && recentSims.length > 0 ? recentSims[0].final_grade : null;

  // ── 3. Memory Snapshot ──────────────────────────────────────
  let memorySnapshot: string | null = null;
  const { data: latestSim } = await supabase
    .from("simulations")
    .select("memory_snapshot")
    .eq("user_id", userId)
    .eq("status", "COMPLETED")
    .not("memory_snapshot", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSim?.memory_snapshot) {
    memorySnapshot = latestSim.memory_snapshot;
  }

  return {
    activeReport,
    readiness: {
      readinessScore,
      projectedScore,
      lastGrade,
      memorySnapshot,
    },
  };
}

// ─── Page Component (Server) ──────────────────────────────────
interface DashboardPageProps {
  searchParams: Promise<{ tab?: string; simId?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  // 1. Validate session securely on the server
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/login");
  }

  // 2. Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profileError) {
    redirect("/onboarding");
  }

  // 3. Fetch all dashboard data on the server
  const { activeReport, readiness } = await fetchDashboardData(
    user.id,
    profile as DashboardProfile
  );

  // 4. Calculate Days Until Defense
  const daysUntilDefense = profile?.defense_date
    ? differenceInDays(new Date(profile.defense_date), new Date())
    : 0;

  // 5. Native Routing via SearchParams
  const tab = resolvedSearchParams.tab || "briefing";
  const simId = resolvedSearchParams.simId;

  // 6. Server-Side Fetching for Aftermath Dashboard
  let aftermathSim = null;
  let aftermathLastScore = null;

  if (simId) {
    // Poll on the server to handle the Postgres replication lag cleanly BEFORE the client renders!
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
      const { data } = await supabase.from('simulations').select('*').eq('id', simId).maybeSingle();
      aftermathSim = data;

      if (aftermathSim) break;
      
      // Wait 1 second before retrying
      await new Promise(res => setTimeout(res, 1000));
      attempts++;
    }
  } else {
    const { data } = await supabase.from('simulations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    aftermathSim = data;
  }

  if (aftermathSim) {
    const { data: prevSims } = await supabase
      .from("simulations")
      .select("final_grade")
      .eq("user_id", user.id)
      .lt("created_at", aftermathSim.created_at)
      .order("created_at", { ascending: false })
      .limit(1);
    if (prevSims && prevSims.length > 0) {
      aftermathLastScore = prevSims[0].final_grade;
    }
  }

  return (
    <DashboardShell
      profile={profile as DashboardProfile}
      activeReport={activeReport}
      daysUntilDefense={daysUntilDefense}
      readiness={readiness}
      initialTab={tab}
      aftermathSim={aftermathSim}
      aftermathLastScore={aftermathLastScore}
    />
  );
}
