"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DashboardTabs } from "./DashboardTabs";
import { CardsView } from "./CardsView";
import { DefenseArena } from "./DefenseArena";
import { AftermathDashboard } from "./AftermathDashboard";
import type { DashboardProfile, DashboardReport, ReadinessData } from "@/lib/types/dashboard";

interface DashboardShellProps {
  profile: DashboardProfile;
  activeReport: DashboardReport | null;
  daysUntilDefense: number;
  readiness: ReadinessData;
  initialTab: string;
  aftermathSim: any;
  aftermathLastScore: number | null;
}

export function DashboardShell({
  profile,
  activeReport,
  daysUntilDefense,
  readiness,
  initialTab,
  aftermathSim,
  aftermathLastScore,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab from URL when navigating externally (e.g. after simulation redirect)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "briefing";
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    // Update URL shallowly (no server round-trip) for bookmarkability
    if (newTab === "briefing") {
      window.history.replaceState(null, "", pathname);
    } else {
      window.history.replaceState(null, "", `${pathname}?tab=${newTab}`);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      {/* Sub-Nav (Tabs) — switches instantly */}
      <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      {activeTab === "briefing" && (
        <CardsView
          profile={profile}
          activeReport={activeReport}
          daysUntilDefense={daysUntilDefense}
          readinessScore={readiness.readinessScore}
          projectedScore={readiness.projectedScore}
          lastGrade={readiness.lastGrade}
          memorySnapshot={readiness.memorySnapshot}
        />
      )}

      {activeTab === "defense" && (
        <div className="h-[calc(100vh-140px)]">
          <DefenseArena
            reportId={activeReport?.id}
            initialLanguage={
              (activeReport?.language as "french" | "english" | "mixed") || "french"
            }
          />
        </div>
      )}

      {activeTab === "aftermath" && (
        <div className="h-[calc(100vh-140px)]">
          <AftermathDashboard simulationData={aftermathSim} lastScoreData={aftermathLastScore} />
        </div>
      )}
    </div>
  );
}
