"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import { Trophy, Medal, Crown, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type SubTab = "global" | "university" | "specialty";

interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  specialty: string | null;
  best_score: number;
  total_sessions: number;
  total_time_minutes: number;
  rating: number;
  rank: number;
}

function computeRating(best: number, sessions: number, totalTime: number): number {
  const masteryPart = best * 0.8;
  const consistencyPart = 2 * (sessions / (sessions + 10));
  const staminaPart = 2 * (totalTime / (totalTime + 120));
  return masteryPart + consistencyPart + staminaPart;
}

export function LeaderboardView() {
  const { profile, user, t } = useUser();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("global");
  const [allProfiles, setAllProfiles] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [myProfileData, setMyProfileData] = useState<LeaderboardEntry | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, university, specialty, best_score, total_sessions, total_time_minutes, is_public");

      if (error) throw error;

      // Find current user's privacy setting
      if (user?.id) {
        const myProfile = (data || []).find((p: any) => p.id === user.id);
        if (myProfile) {
          setIsPublic(myProfile.is_public !== false);
          // Store full profile data for pinned row even if hidden
          setMyProfileData({
            ...myProfile,
            best_score: myProfile.best_score || 0,
            total_sessions: myProfile.total_sessions || 0,
            total_time_minutes: myProfile.total_time_minutes || 0,
            rating: computeRating(myProfile.best_score || 0, myProfile.total_sessions || 0, myProfile.total_time_minutes || 0),
            rank: 0,
          });
        }
      }

      const entries: LeaderboardEntry[] = (data || [])
        .filter((p: any) => p.is_public !== false && ((p.best_score || 0) > 0 || (p.total_sessions || 0) > 0))
        .map((p: any) => ({
          ...p,
          best_score: p.best_score || 0,
          total_sessions: p.total_sessions || 0,
          total_time_minutes: p.total_time_minutes || 0,
          rating: computeRating(p.best_score || 0, p.total_sessions || 0, p.total_time_minutes || 0),
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
  }, [user?.id]);

  // Fetch all profiles once
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Toggle privacy
  const togglePrivacy = async () => {
    if (!user?.id) return;
    setIsUpdatingPrivacy(true);
    const newValue = !isPublic;

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_public: newValue })
      .eq("id", user.id);

    if (!error) {
      setIsPublic(newValue);
      await fetchProfiles();
    }
    setIsUpdatingPrivacy(false);
  };

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
        <div className="flex items-center gap-3">
          <button
            onClick={togglePrivacy}
            disabled={isUpdatingPrivacy}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest border-[1.5px] transition-all",
              isPublic
                ? "border-black text-black hover:bg-black hover:text-white"
                : "bg-black text-white border-black hover:bg-gray-800",
              isUpdatingPrivacy && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden md:inline">{isPublic ? 'Public' : 'Hidden'}</span>
          </button>
          <Link
            href="/dashboard"
            className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← {t("leaderboard.back")}
          </Link>
        </div>
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
        <div className="grid grid-cols-[60px_1fr_70px] md:grid-cols-[60px_1fr_100px_100px_80px] items-center px-4 py-3 border-b-[1.5px] border-black bg-gray-50">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
            {t("leaderboard.rank")}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
            {t("leaderboard.name")}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 hidden md:block">
            {t("leaderboard.sessions")}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 hidden md:block">
            TIME
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 text-right">
            BEST
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
            const avatarUrl = entry.avatar_url;

            return (
              <div
                key={entry.id}
                className={cn(
                  "grid grid-cols-[60px_1fr_70px] md:grid-cols-[60px_1fr_100px_100px_80px] items-center px-4 py-3 border-b border-gray-100 transition-colors hover:bg-gray-50",
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

                {/* Total Time */}
                <span className="text-xs font-mono text-gray-500 hidden md:block">
                  {entry.total_time_minutes >= 60
                    ? `${Math.floor(entry.total_time_minutes / 60)}h ${entry.total_time_minutes % 60}m`
                    : `${entry.total_time_minutes}m`}
                </span>

                {/* Best Score */}
                <span className="text-sm font-black font-mono text-right">
                  {entry.best_score.toFixed(1)}<span className="text-[9px] text-gray-400 ml-0.5">/20</span>
                </span>
              </div>
            );
          })}

        {/* Pinned current user if not in top 50 (or hidden) */}
        {!loading && !isPublic && myProfileData && (
          <>
            {/* Separator */}
            <div className="px-4 py-2 bg-gray-50 border-y border-gray-200">
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> HIDDEN FROM PUBLIC
                </span>
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>
            </div>

            {/* Pinned row for hidden user */}
            <div className="grid grid-cols-[60px_1fr_70px] md:grid-cols-[60px_1fr_100px_100px_80px] items-center px-4 py-3 bg-gray-50/70 border-l-4 border-l-gray-400">
              <span className="text-sm font-mono font-bold text-gray-400 w-6 text-center">
                —
              </span>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full border-[1.5px] border-gray-400 bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {myProfileData.avatar_url ? (
                    <img src={myProfileData.avatar_url} alt="" className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-gray-500">
                    {myProfileData.full_name || "Anonymous"}
                    <span className="ml-2 text-[9px] bg-gray-400 text-white px-1.5 py-0.5 font-mono uppercase tracking-widest">
                      HIDDEN
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider">
                    {myProfileData.university || "—"}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono text-gray-400 hidden md:block">
                {myProfileData.total_sessions} {t("leaderboard.sessions").toLowerCase()}
              </span>

              <span className="text-xs font-mono text-gray-400 hidden md:block">
                {myProfileData.total_time_minutes >= 60
                  ? `${Math.floor(myProfileData.total_time_minutes / 60)}h ${myProfileData.total_time_minutes % 60}m`
                  : `${myProfileData.total_time_minutes}m`}
              </span>

              <span className="text-sm font-black font-mono text-right text-gray-500">
                {myProfileData.best_score.toFixed(1)}<span className="text-[9px] text-gray-400 ml-0.5">/20</span>
              </span>
            </div>
          </>
        )}

        {/* Pinned current user if public but not in top 50 */}
        {!loading && isPublic && currentUserEntry && !currentUserInTop50 && (
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
            <div className="grid grid-cols-[60px_1fr_70px] md:grid-cols-[60px_1fr_100px_100px_80px] items-center px-4 py-3 bg-yellow-50/70 border-l-4 border-l-black">
              <span className="text-sm font-mono font-bold text-black w-6 text-center">
                {currentUserEntry.rank}
              </span>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full border-[1.5px] border-black bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {currentUserEntry.avatar_url ? (
                    <img src={currentUserEntry.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  )}
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

              <span className="text-xs font-mono text-gray-500 hidden md:block">
                {currentUserEntry.total_time_minutes >= 60
                  ? `${Math.floor(currentUserEntry.total_time_minutes / 60)}h ${currentUserEntry.total_time_minutes % 60}m`
                  : `${currentUserEntry.total_time_minutes}m`}
              </span>

              <span className="text-sm font-black font-mono text-right">
                {currentUserEntry.best_score.toFixed(1)}<span className="text-[9px] text-gray-400 ml-0.5">/20</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
