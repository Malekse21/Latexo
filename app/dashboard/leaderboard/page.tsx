import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardView } from "@/components/dashboard/LeaderboardView";

export interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  specialty: string | null;
  best_score: number;
  total_sessions: number;
  total_time_minutes: number;
  is_public: boolean;
  rating: number;
  rank: number;
}

function computeRating(best: number, sessions: number, totalTime: number): number {
  const masteryPart = best * 0.8;
  const consistencyPart = 2 * (sessions / (sessions + 10));
  const staminaPart = 2 * (totalTime / (totalTime + 120));
  return masteryPart + consistencyPart + staminaPart;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, university, specialty, best_score, total_sessions, total_time_minutes, is_public");

  if (error) {
    console.error("Leaderboard fetch error:", error);
    return <LeaderboardView initialProfiles={[]} currentUserId={user.id} initialIsPublic={true} currentUserProfile={null} />;
  }

  let isPublic = true;
  let myProfileData: LeaderboardEntry | null = null;

  const myProfileRaw = (data || []).find((p: any) => p.id === user.id);
  if (myProfileRaw) {
    isPublic = myProfileRaw.is_public !== false;
    myProfileData = {
      ...myProfileRaw,
      best_score: myProfileRaw.best_score || 0,
      total_sessions: myProfileRaw.total_sessions || 0,
      total_time_minutes: myProfileRaw.total_time_minutes || 0,
      is_public: myProfileRaw.is_public !== false,
      rating: computeRating(myProfileRaw.best_score || 0, myProfileRaw.total_sessions || 0, myProfileRaw.total_time_minutes || 0),
      rank: 0,
    };
  }

  const entries: LeaderboardEntry[] = (data || [])
    .filter((p: any) => p.is_public !== false && ((p.best_score || 0) > 0 || (p.total_sessions || 0) > 0))
    .map((p: any) => ({
      ...p,
      best_score: p.best_score || 0,
      total_sessions: p.total_sessions || 0,
      total_time_minutes: p.total_time_minutes || 0,
      is_public: p.is_public !== false,
      rating: computeRating(p.best_score || 0, p.total_sessions || 0, p.total_time_minutes || 0),
      rank: 0,
    }))
    .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.rating - a.rating);

  entries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return (
    <LeaderboardView
      initialProfiles={entries}
      currentUserId={user.id}
      initialIsPublic={isPublic}
      currentUserProfile={myProfileData}
    />
  );
}
