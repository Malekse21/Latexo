"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useUser } from "@/lib/context/user-context";
import { useAppStore } from "@/lib/store/useAppStore";
import { UploadModal } from "@/components/dashboard/UploadModal";
import { ReportFrame } from "@/components/dashboard/ReportFrame";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { DefenseArena } from "@/components/dashboard/DefenseArena";
import { AftermathDashboard } from "@/components/dashboard/AftermathDashboard";
import { CardsView } from "@/components/dashboard/CardsView";
import { cn } from "@/lib/utils";
import { BarChart2 } from "lucide-react";
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
  const { profile, refreshProfile, t, language, loading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
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

  const hasLoadedOnce = useRef(false);
  const isFirstRender = useRef(true);

  // Temporary debug block as requested
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      console.log("SESSION ON VERCEL (Dashboard):", data.session);
      console.log("SESSION ERROR (Dashboard):", error);
    };
    checkSession();
  }, []);

  // Sync activeTab from search params — runs on every URL change (including retry link)
  const prevTabParam = useRef<string | null>(null);
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    // Only act when the param actually changed to avoid unnecessary re-renders
    if (tabParam === prevTabParam.current) return;
    prevTabParam.current = tabParam;
    console.log('[Dashboard] searchParams changed, tab =', tabParam);
    if (tabParam === 'defense') setActiveTab('defense');
    else if (tabParam === 'aftermath') setActiveTab('aftermath');
    else setActiveTab(null);
  }, [searchParams]);

  const handleTabChange = (tab: 'briefing' | 'defense' | 'aftermath') => {
    if (tab === 'briefing') {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
    }
    // Update URL using Next.js router so searchParams stays in sync
    const url = tab === 'briefing' ? '/dashboard' : `/dashboard?tab=${tab}`;
    router.replace(url, { scroll: false });
  };

  // Single robust fetch effect
  useEffect(() => {
    if (userLoading || !profile?.id) return;
    
    // Only fetch if we haven't fetched yet 
    if (hasLoadedOnce.current) return;
    hasLoadedOnce.current = true;

    fetchActiveReport(profile.id);
    fetchReadinessData(profile.id);
    fetchMemorySnapshot(profile.id);
  }, [profile?.id, userLoading]);

  // Re-fetch only if language explicitly changes after initial load
  const prevLanguage = useRef(language);
  useEffect(() => {
    if (prevLanguage.current !== language) {
      prevLanguage.current = language;
      if (profile?.id) {
        fetchActiveReport(profile.id);
        fetchReadinessData(profile.id);
        fetchMemorySnapshot(profile.id);
      }
    }
  }, [language, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    
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
  }, [language, t, profile?.id]);

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

  const fetchReadinessData = async (userId: string) => {
    try {
      const supabase = createClient();

      const totalSessions = profile?.total_sessions || 0;
      const lastSession = profile?.last_session;

      // Calculate for all users using the uniform formula
      const { data: recentSims } = await supabase
        .from('simulations')
        .select('final_grade, created_at')
        .eq('user_id', userId)
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

  const fetchActiveReport = async (userId: string) => {
    try {
      setIsFetchingData(true);
      const supabase = createClient();

      let reportData = null;

      // 1. Try to get the active report from profile
      if (profile?.active_report_id) {
        const { data } = await supabase
          .from('reports')
          .select('*')
          .eq('id', profile.active_report_id)
          .maybeSingle();
        reportData = data;
      }

      // 2. If no active report (or not found), get the most recent one
      if (!reportData) {
        const { data } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
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
      setIsFetchingData(false);
    }
  };

  const fetchMemorySnapshot = async (userId: string) => {
    try {
      const supabase = createClient();

      const { data: latestSim } = await supabase
        .from('simulations')
        .select('memory_snapshot')
        .eq('user_id', userId)
        .eq('status', 'COMPLETED')
        .not('memory_snapshot', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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
    const { data } = await supabase.from('reports').select('*').eq('id', reportId).maybeSingle();
    if (data) {
        const language = data.detected_language;
        setActiveReport({ ...data, language });
        setSelectedReport({ ...data, language });
    }
  };

  const handleSimulationComplete = (simId: string) => {
    console.log('[Dashboard] handleSimulationComplete called with simId =', simId);
    setSimulationId(simId);
    handleTabChange('aftermath'); // Use handleTabChange to keep URL in sync
  };

  // derived state for header
  const daysUntilDefense = profile?.defense_date 
    ? differenceInDays(new Date(profile.defense_date), new Date()) 
    : 0;

  // DEBUG: trace which render path is taken
  console.log('[Dashboard Render]', { 
    userLoading, 
    profileId: profile?.id ?? 'NULL', 
    isFetchingData, 
    activeTab, 
    activeReport: activeReport?.id ?? 'NULL',
    hasLoadedOnce: hasLoadedOnce.current 
  });

  // The loop prevention logic
  if (userLoading) {
    console.log('[Dashboard] → showing userLoading spinner');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If loading is done, but there's no profile, returning null lets the middleware handle redirects
  // instead of rendering loops of fetching / failing / navigating constantly.
  if (!profile) {
    console.log('[Dashboard] → profile is null, returning null');
    return null;
  }

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
        {isFetchingData ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-64"
          >
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </motion.div>
        ) : (activeTab === 'briefing' || activeTab === null) ? (
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
        ) : activeTab === 'defense' ? (
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
        ) : activeTab === 'aftermath' ? (
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
                  <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden bg-white">
                    {/* Background Grid Pattern */}
                    <div 
                      className="absolute inset-0 z-0 opacity-10" 
                      style={{ backgroundImage: 'radial-gradient(black 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                    />

                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="relative z-10 flex flex-col items-center max-w-lg p-12 bg-white border-2 border-black shadow-[8px_8px_0px_#000000] text-center"
                    >
                      <div className="w-16 h-16 bg-neutral-100 border-2 border-black rounded-sm flex items-center justify-center mb-6 shadow-[4px_4px_0px_#000000] rotate-3">
                        <BarChart2 className="w-8 h-8 text-black" strokeWidth={2.5} />
                      </div>
                      
                      <h2 className="text-3xl font-black text-black tracking-tight uppercase mb-3 leading-tight">
                        {t('dashboard.aftermath_empty_title')}
                      </h2>
                      
                      <p className="text-neutral-600 font-medium mb-8">
                        {t('dashboard.aftermath_empty_subtitle')}
                      </p>
                      
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest relative overflow-hidden group">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="relative z-10">{t('dashboard.aftermath_status')}</span>
                      </div>
                    </motion.div>
                  </div>
                )}
              </motion.div>
        ) : null}
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

