"use client";

import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useUser } from "@/lib/context/user-context";
import { useAppStore } from "@/lib/store/useAppStore";
import { posthog } from "@/components/providers/posthog-provider";
import { UploadModal } from "@/components/dashboard/UploadModal";
import { ReportFrame } from "@/components/dashboard/ReportFrame";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { DefenseArena } from "@/components/dashboard/DefenseArena";
import { AftermathDashboard } from "@/components/dashboard/AftermathDashboard";
import { CardsView } from "@/components/dashboard/CardsView";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

type Tab = 'briefing' | 'defense' | 'aftermath' | null;

interface Report {
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

function DashboardContent() {
  const { profile, refreshProfile, t, language } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { setSelectedReport } = useAppStore();
  
  const [dynamicGreeting, setDynamicGreeting] = useState("");
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [projectedScore, setProjectedScore] = useState<number | null>(null);
  const [lastGrade, setLastGrade] = useState<number | null>(null);
  const [memorySnapshot, setMemorySnapshot] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize activeTab from search params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'defense') setActiveTab('defense');
    else if (tabParam === 'aftermath') setActiveTab('aftermath');
    else setActiveTab(null);
  }, [searchParams]);

  const handleTabChange = (tab: 'briefing' | 'defense' | 'aftermath') => {
    if (tab === 'briefing') {
      setActiveTab(null);
      router.push('/dashboard');
    } else {
      setActiveTab(tab);
      router.push(`/dashboard?tab=${tab}`);

      // PostHog: Track simulation start
      if (tab === 'defense') {
        posthog.capture('simulation_started');
      }
    }
  };

  useEffect(() => {
    console.log("[DashboardContent] Effect triggered.", { loading, profileId: profile?.id });
    // Only fetch dashboard data once the UserProvider has finished loading the session and profile
    if (!loading && profile?.id) {
      console.log("[DashboardContent] Fetching dashboard data for:", profile.id);
      fetchActiveReport();
      fetchReadinessData();
      fetchMemorySnapshot();
      
      // Time-based greeting logic
      const hour = new Date().getHours();
      let greetingKey = 'dashboard.greetings.morning';
      if (hour >= 12 && hour < 18) {
        greetingKey = 'dashboard.greetings.afternoon';
      } else if (hour >= 18) {
        greetingKey = 'dashboard.greetings.evening';
      }
      
      // Fallback if translations don't exist
      const localizedGreeting = t(greetingKey);
      if (localizedGreeting !== greetingKey) {
         setDynamicGreeting(localizedGreeting);
      } else {
         if (hour >= 12 && hour < 18) {
           setDynamicGreeting(language === 'fr' ? 'Bonjour' : 'Good afternoon');
         } else if (hour >= 18) {
           setDynamicGreeting(language === 'fr' ? 'Bonsoir' : 'Good evening');
         } else {
           setDynamicGreeting(language === 'fr' ? 'Bonjour' : 'Good morning');
         }
      }
    } else if (!loading && !profile) {
      console.log("[DashboardContent] Loading finished but no profile found.");
    }
  }, [profile?.id, language, loading]);

  // ─── Readiness Score helpers ───────────────────────────────────
  const getSessionVolume = (sessions: number): number => {
    // sessions 0-8: linear scale from 0 → 100
    const capped = Math.min(sessions, 8);
    return Math.round((capped / 8) * 100);
  };

  const getRecencyScore = (daysSinceLast: number): number => {
    if (daysSinceLast <= 2) return 100;
    if (daysSinceLast <= 5) return 70;
    if (daysSinceLast <= 9) return 40;
    return 10;
  };

  const computeReadiness = (avgScoreNorm: number, sessionVol: number, recency: number) => {
    // If no sessions, return 0 to avoid NaNs or skewed results
    if (sessionVol === 0) return 0;
    return Math.round(avgScoreNorm * 0.50 + sessionVol * 0.35 + recency * 0.15);
  };

  const fetchReadinessData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const totalSessions = profile?.total_sessions || 0;
      const lastSession = profile?.last_session;

      // Calculate for all users using the uniform formula
      const { data: recentSims } = await supabase
        .from('simulations')
        .select('final_grade, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Avg Score (last 3, normalized to 100)
      let avgScoreNorm = 0;
      if (recentSims && recentSims.length > 0) {
        const avg = recentSims.reduce((sum: number, s: any) => sum + (s.final_grade || 0), 0) / recentSims.length;
        avgScoreNorm = (avg / 20) * 100;
      }

      // Session Volume (0 → 100 mapping)
      const sessionVol = getSessionVolume(totalSessions);

      // Recency
      let recency = 0; // default to 0 if no sessions
      if (lastSession) {
        const days = Math.floor((new Date().getTime() - new Date(lastSession).getTime()) / (1000 * 3600 * 24));
        recency = getRecencyScore(days);
      }

      const score = computeReadiness(avgScoreNorm, sessionVol, recency);
      setReadinessScore(score);

      // Projected next score (assuming they do another session and get average marks)
      const nextSessionVol = getSessionVolume(totalSessions + 1);
      // Assume recency is 100 since they would have just done a new session
      const proj = computeReadiness(avgScoreNorm, nextSessionVol, 100);
      setProjectedScore(proj > score ? proj : score + 5); // Add slight bump to motivate if projection drops

      // Last grade (most recent simulation)
      if (recentSims && recentSims.length > 0) {
        setLastGrade(recentSims[0].final_grade);
      }
    } catch (error) {
      console.error('Error fetching readiness data:', error);
    }
  };

  const fetchActiveReport = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let reportData = null;

      // 1. Try to get the active report from profile
      if (profile?.active_report_id) {
        const { data } = await supabase
          .from('reports')
          .select('*')
          .eq('id', profile.active_report_id)
          .single();
        reportData = data;
      }

      // 2. If no active report (or not found), get the most recent one
      if (!reportData) {
        const { data } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        reportData = data;
      }

      if (reportData) {
        // Use detected_language from database column
        const language = reportData.detected_language;
        
        setActiveReport({ ...reportData, language });
        setSelectedReport({ ...reportData, language });
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemorySnapshot = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: latestSim } = await supabase
        .from('simulations')
        .select('memory_snapshot')
        .eq('user_id', user.id)
        .eq('status', 'COMPLETED')
        .not('memory_snapshot', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestSim?.memory_snapshot) {
        setMemorySnapshot(latestSim.memory_snapshot);
      }
    } catch (error) {
      // Non-fatal — first-time users won't have any simulations
    }
  };

  const handleUploadComplete = async (reportId: string) => {
    await refreshProfile();
    // Fetch the new report directly to ensure UI updates immediately
    const supabase = createClient();
    const { data } = await supabase.from('reports').select('*').eq('id', reportId).single();
    if (data) {
        const language = data.detected_language;
        setActiveReport({ ...data, language });
        setSelectedReport({ ...data, language });
    }
  };

  const handleSimulationComplete = (simId: string) => {
    setSimulationId(simId);
    setActiveTab('aftermath');

    // PostHog: Track simulation completion
    posthog.capture('simulation_completed', { simulation_id: simId });
  };

  // derived state for header
  const daysUntilDefense = profile?.defense_date 
    ? differenceInDays(new Date(profile.defense_date), new Date()) 
    : 0;

  return (
    <div className="space-y-4 pt-4">
      {/* Sub-Nav (Tabs) */}
      <DashboardTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        t={t} 
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {loading || !profile ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-64"
          >
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </motion.div>
        ) : (
          <>
            {(activeTab === 'briefing' || activeTab === null) && (
          <motion.div
            key="briefing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <CardsView 
              profile={profile}
              activeReport={activeReport}
              greeting={dynamicGreeting}
              daysUntilDefense={daysUntilDefense}
              readinessScore={readinessScore}
              projectedScore={projectedScore}
              lastGrade={lastGrade}
              memorySnapshot={memorySnapshot}
              onUploadClick={() => setShowUploadModal(true)}
              onNavigateToDefense={() => handleTabChange('defense')}
              t={t}
            />
          </motion.div>
        )}

        {/* Defense Room - Live Simulation */}
        {activeTab === 'defense' && (
          <motion.div
            key="defense"
            className="h-[calc(100vh-140px)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <DefenseArena 
              onSimulationComplete={handleSimulationComplete}
              reportId={activeReport?.id}
              initialLanguage={activeReport?.language as "french" | "english" | "mixed"}
            />
          </motion.div>
        )}

            {/* Aftermath - Results Dashboard */}
            {activeTab === 'aftermath' && (
              <motion.div
                key="aftermath"
                className="h-[calc(100vh-140px)]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {simulationId ? (
                  <AftermathDashboard simulationId={simulationId} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.aftermath_empty_title')}</h2>
                    <p className="text-gray-500 max-w-md">
                      {t('dashboard.aftermath_empty_subtitle')}
                    </p>
                    <div className="px-4 py-2 bg-gray-100 text-gray-500 text-xs font-mono rounded mt-4">
                      {t('dashboard.aftermath_status')}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

