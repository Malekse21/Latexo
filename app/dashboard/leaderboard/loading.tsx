import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="space-y-6 pt-4 max-w-3xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100">
            <Trophy className="w-5 h-5 text-gray-300" />
          </div>
          <Skeleton className="h-8 w-48 bg-gray-200" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-24 bg-gray-200" />
          <Skeleton className="h-8 w-16 bg-gray-200 hidden md:block" />
        </div>
      </div>

      {/* Sub-tabs Skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 bg-gray-200" />
        <Skeleton className="h-8 w-28 bg-gray-200" />
        <Skeleton className="h-8 w-24 bg-gray-200" />
      </div>

      {/* Leaderboard List Skeleton */}
      <div className="border-[1.5px] border-gray-200 bg-white shadow-none">
        {/* Table Header */}
        <div className="grid grid-cols-[60px_1fr_70px] md:grid-cols-[60px_1fr_100px_100px_80px] items-center px-4 py-3 border-b-[1.5px] border-gray-100 bg-gray-50/50">
           <Skeleton className="h-3 w-8 bg-gray-200" />
           <Skeleton className="h-3 w-16 bg-gray-200" />
           <Skeleton className="h-3 w-16 bg-gray-200 hidden md:block" />
           <Skeleton className="h-3 w-12 bg-gray-200 hidden md:block" />
           <Skeleton className="h-3 w-12 justify-self-end bg-gray-200" />
        </div>

        {/* Rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[60px_1fr_70px] md:grid-cols-[60px_1fr_100px_100px_80px] items-center px-4 py-3 border-b border-gray-50"
          >
            {/* Rank */}
            <Skeleton className="h-5 w-5 bg-gray-200" />

            {/* Name + avatar */}
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 bg-gray-200" />
                <Skeleton className="h-2 w-20 bg-gray-200" />
              </div>
            </div>

            {/* Sessions */}
            <Skeleton className="h-3 w-16 bg-gray-200 hidden md:block" />

            {/* Total Time */}
            <Skeleton className="h-3 w-12 bg-gray-200 hidden md:block" />

            {/* Best Score */}
            <Skeleton className="h-4 w-12 bg-gray-200 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}
