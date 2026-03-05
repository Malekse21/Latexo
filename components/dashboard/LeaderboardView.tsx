"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import { Trophy, Medal, Crown, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SubTab = "global" | "university" | "specialty";

interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  specialty: string | null;
  best_score: number;
  total_sessions: number;
  rating: number;
  rank: number;
}

function computeRating(bestScore: number, totalSessions: number): number {
  const normalizedScore = (bestScore / 20) * 100;
  const sessionEngagement = Math.min(totalSessions / 20, 1) * 100;
  return normalizedScore * 0.6 + sessionEngagement * 0.4;
}

export function LeaderboardView() {
  const { profile, user, t } = useUser();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("global");
  const [allProfiles, setAllProfiles] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all profiles once
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, university, specialty, best_score, total_sessions");

        if (error) throw error;

        const entries: LeaderboardEntry[] = (data || [])
          .filter((p: any) => (p.best_score || 0) > 0 || (p.total_sessions || 0) > 0)
          .map((p: any) => ({
            ...p,
            best_score: p.best_score || 0,
            total_sessions: p.total_sessions || 0,
            rating: computeRating(p.best_score || 0, p.total_sessions || 0),
            rank: 0,
          }))
          .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.rating - a.rating);

        // Assign ranks
        entries.forEach((entry, i) => {
          entry.rank = i + 1;
        });

        setAllProfiles(entries);
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  // Filter + slice based on active sub-tab
  const { top50, currentUserEntry, currentUserInTop50 } = useMemo(() => {
    let filtered = allProfiles;

    if (activeSubTab === "university" && profile?.university) {
      filtered = allProfiles.filter((e) => e.university === profile.university);
    } else if (activeSubTab === "specialty" && profile?.specialty) {
      filtered = allProfiles.filter((e) => e.specialty === profile.specialty);
    }

    // Re-rank after filtering
    const reranked = filtered.map((entry, i) => ({ ...entry, rank: i + 1 }));
    const top50 = reranked.slice(0, 50);
    const currentUserEntry = reranked.find((e) => e.id === user?.id) || null;
    const currentUserInTop50 = top50.some((e) => e.id === user?.id);

    return { top50, currentUserEntry, currentUserInTop50 };
  }, [allProfiles, activeSubTab, profile?.university, profile?.specialty, user?.id]);

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "global", label: t("leaderboard.global") },
    { id: "university", label: t("leaderboard.university") },
    { id: "specialty", label: t("leaderboard.specialty") },
  ];

  const getRankDecoration = (rank: number) => {
    if (rank === 1) return { icon: "🥇", bg: "bg-yellow-50", border: "border-yellow-400" };
    if (rank === 2) return { icon: "🥈", bg: "bg-gray-50", border: "border-gray-400" };
    if (rank === 3) return { icon: "🥉", bg: "bg-orange-50", border: "border-orange-400" };
    return null;
  };

  return (
    <div className="space-y-6 pt-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black text-white">
            <Trophy className="w-5 h-5" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            {t("leaderboard.title")}
          </h1>
        </div>
        <a
          href="/dashboard"
          className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
        >
          ← {t("leaderboard.back")}
        </a>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest border-[1.5px] transition-all",
              activeSubTab === tab.id
                ? "bg-black text-white border-black shadow-[3px_3px_0px_#000000]"
                : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="border-[1.5px] border-black shadow-[4px_4px_0px_#000000] bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-[60px_1fr_120px_100px] md:grid-cols-[60px_1fr_180px_100px] items-center px-4 py-3 border-b-[1.5px] border-black bg-gray-50">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
            {t("leaderboard.rank")}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
            {t("leaderboard.name")}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 hidden md:block">
            {t("leaderboard.sessions")}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 text-right">
            {t("leaderboard.rating")}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && top50.length === 0 && (
          <div className="py-16 text-center">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">
              {t("leaderboard.empty")}
            </p>
          </div>
        )}

        {/* Rows */}
        {!loading &&
          top50.map((entry) => {
            const isCurrentUser = entry.id === user?.id;
            const decoration = getRankDecoration(entry.rank);
            const avatarUrl = entry.avatar_url?.includes("dicebear.com")
              ? null
              : entry.avatar_url;

            return (
              <div
                key={entry.id}
                className={cn(
                  "grid grid-cols-[60px_1fr_120px_100px] md:grid-cols-[60px_1fr_180px_100px] items-center px-4 py-3 border-b border-gray-100 transition-colors hover:bg-gray-50",
                  isCurrentUser && "bg-yellow-50/50 border-l-4 border-l-black",
                  decoration && decoration.bg
                )}
              >
                {/* Rank */}
                <div className="flex items-center gap-1">
                  {decoration ? (
                    <span className="text-lg">{decoration.icon}</span>
                  ) : (
                    <span className="text-sm font-mono font-bold text-gray-400 w-6 text-center">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Name + University */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full border-[1.5px] border-black bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-sm font-bold truncate",
                      isCurrentUser && "text-black"
                    )}>
                      {entry.full_name || "Anonymous"}
                      {isCurrentUser && (
                        <span className="ml-2 text-[9px] bg-black text-white px-1.5 py-0.5 font-mono uppercase tracking-widest">
                          {t("leaderboard.you")}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider">
                      {entry.university || "—"}
                    </p>
                  </div>
                </div>

                {/* Sessions */}
                <span className="text-xs font-mono text-gray-500 hidden md:block">
                  {entry.total_sessions} {t("leaderboard.sessions").toLowerCase()}
                </span>

                {/* Rating */}
                <div className="text-right">
                  <span className={cn(
                    "text-sm font-black font-mono",
                    entry.rating >= 80 ? "text-emerald-600" :
                    entry.rating >= 50 ? "text-yellow-600" :
                    "text-gray-600"
                  )}>
                    {entry.rating.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-gray-400 ml-0.5">/100</span>
                </div>
              </div>
            );
          })}

        {/* Pinned current user if not in top 50 */}
        {!loading && currentUserEntry && !currentUserInTop50 && (
          <>
            {/* Separator */}
            <div className="px-4 py-2 bg-gray-50 border-y border-gray-200">
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t("leaderboard.not_in_top")}
                </span>
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>
            </div>

            {/* Pinned row */}
            <div className="grid grid-cols-[60px_1fr_120px_100px] md:grid-cols-[60px_1fr_180px_100px] items-center px-4 py-3 bg-yellow-50/70 border-l-4 border-l-black">
              <span className="text-sm font-mono font-bold text-black w-6 text-center">
                {currentUserEntry.rank}
              </span>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full border-[1.5px] border-black bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {(() => {
                    const av = currentUserEntry.avatar_url?.includes("dicebear.com")
                      ? null
                      : currentUserEntry.avatar_url;
                    return av ? (
                      <img src={av} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-gray-400" />
                    );
                  })()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-black">
                    {currentUserEntry.full_name || "Anonymous"}
                    <span className="ml-2 text-[9px] bg-black text-white px-1.5 py-0.5 font-mono uppercase tracking-widest">
                      {t("leaderboard.you")}
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider">
                    {currentUserEntry.university || "—"}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono text-gray-500 hidden md:block">
                {currentUserEntry.total_sessions} {t("leaderboard.sessions").toLowerCase()}
              </span>

              <div className="text-right">
                <span className={cn(
                  "text-sm font-black font-mono",
                  currentUserEntry.rating >= 80 ? "text-emerald-600" :
                  currentUserEntry.rating >= 50 ? "text-yellow-600" :
                  "text-gray-600"
                )}>
                  {currentUserEntry.rating.toFixed(1)}
                </span>
                <span className="text-[9px] text-gray-400 ml-0.5">/100</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
