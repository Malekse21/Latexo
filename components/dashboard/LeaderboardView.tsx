"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import { Trophy, Medal, Crown, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeaderboardEntry } from "@/app/dashboard/leaderboard/page";

type SubTab = "global" | "university" | "specialty";

interface LeaderboardViewProps {
  initialProfiles: LeaderboardEntry[];
  currentUserId: string | null;
  initialIsPublic: boolean;
  currentUserProfile: LeaderboardEntry | null;
}

export function LeaderboardView({
  initialProfiles,
  currentUserId,
  initialIsPublic,
  currentUserProfile
}: LeaderboardViewProps) {
  const { profile, t } = useUser();
  const router = useRouter();
  
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("global");
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);

  // Toggle privacy
  const togglePrivacy = async () => {
    if (!currentUserId) return;
    setIsUpdatingPrivacy(true);
    const newValue = !isPublic;

    // Optimistic update
    setIsPublic(newValue);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_public: newValue })
      .eq("id", currentUserId);

    if (error) {
      setIsPublic(!newValue);
    } else {
      router.refresh();
    }
    setIsUpdatingPrivacy(false);
  };

  // Filter + slice based on active sub-tab
  const { top50, currentUserEntry, currentUserInTop50 } = useMemo(() => {
    let filtered = initialProfiles;

    if (activeSubTab === "university" && profile?.university) {
      filtered = initialProfiles.filter((e) => e.university === profile.university);
    } else if (activeSubTab === "specialty" && profile?.specialty) {
      filtered = initialProfiles.filter((e) => e.specialty === profile.specialty);
    }

    // Re-rank after filtering
    const reranked = filtered.map((entry, i) => ({ ...entry, rank: i + 1 }));
    const top50 = reranked.slice(0, 50);
    const currentUserEntry = reranked.find((e) => e.id === currentUserId) || null;
    const currentUserInTop50 = top50.some((e) => e.id === currentUserId);

    return { top50, currentUserEntry, currentUserInTop50 };
  }, [initialProfiles, activeSubTab, profile?.university, profile?.specialty, currentUserId]);

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

        {/* Empty */}
        {top50.length === 0 && (
          <div className="py-16 text-center">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">
              {t("leaderboard.empty")}
            </p>
          </div>
        )}

        {/* Rows */}
        {top50.map((entry) => {
            const isCurrentUser = entry.id === currentUserId;
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
        {!isPublic && currentUserProfile && (
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
                  {currentUserProfile.avatar_url ? (
                    <img src={currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-gray-500">
                    {currentUserProfile.full_name || "Anonymous"}
                    <span className="ml-2 text-[9px] bg-gray-400 text-white px-1.5 py-0.5 font-mono uppercase tracking-widest">
                      HIDDEN
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider">
                    {currentUserProfile.university || "—"}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono text-gray-400 hidden md:block">
                {currentUserProfile.total_sessions} {t("leaderboard.sessions").toLowerCase()}
              </span>

              <span className="text-xs font-mono text-gray-400 hidden md:block">
                {currentUserProfile.total_time_minutes >= 60
                  ? `${Math.floor(currentUserProfile.total_time_minutes / 60)}h ${currentUserProfile.total_time_minutes % 60}m`
                  : `${currentUserProfile.total_time_minutes}m`}
              </span>

              <span className="text-sm font-black font-mono text-right text-gray-500">
                {currentUserProfile.best_score.toFixed(1)}<span className="text-[9px] text-gray-400 ml-0.5">/20</span>
              </span>
            </div>
          </>
        )}

        {/* Pinned current user if public but not in top 50 */}
        {isPublic && currentUserEntry && !currentUserInTop50 && (
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
