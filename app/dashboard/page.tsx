"use client";

import { Suspense, useEffect, useState } from "react";
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

const QUOTES = [
  "Research is seeing what everybody else has seen and thinking what nobody else has thought.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The only way to do great work is to love what you do.",
  "Science is a way of thinking much more than it is a body of knowledge.",
  "An investment in knowledge pays the best interest.",
  "Education is the most powerful weapon which you can use to change the world.",
  "The higher we are placed, the more humbly we should walk.",
  "Data! Data! Data! I can't make bricks without clay.",
  "In the middle of difficulty lies opportunity."
];

const GREETINGS = [
  "Welcome back",
  "Greetings",
  "Back at it",
  "Ready for more",
  "The stage is yours",
  "Eyes on the prize",
  "Knowledge awaits"
];

function DashboardContent() {
  const { profile, refreshProfile, t, language } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { setSelectedReport } = useAppStore();
  
  const [dynamicQuote, setDynamicQuote] = useState("");
  const [dynamicGreeting, setDynamicGreeting] = useState("");
  const [simulationId, setSimulationId] = useState<string | null>(null);
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
    }
  };

  useEffect(() => {
    fetchActiveReport();
    setDynamicQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const greetings = t('dashboard.greetings');
    if (Array.isArray(greetings)) {
      setDynamicGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    } else {
      setDynamicGreeting("Welcome back");
    }
  }, [profile?.active_report_id, language]);

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
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {(activeTab === 'briefing' || activeTab === null) && (
          <CardsView 
            profile={profile}
            activeReport={activeReport}
            dynamicGreeting={dynamicGreeting}
            dynamicQuote={dynamicQuote}
            daysUntilDefense={daysUntilDefense}
            onUploadClick={() => setShowUploadModal(true)}
            t={t}
          />
        )}

        {/* Defense Room - Live Simulation */}
        {activeTab === 'defense' && (
          <div className="h-[calc(100vh-140px)]">
            <DefenseArena 
              onSimulationComplete={handleSimulationComplete}
              reportId={activeReport?.id}
              initialLanguage={activeReport?.language as "french" | "english" | "mixed"}
            />
          </div>
        )}

        {/* Aftermath - Results Dashboard */}
        {activeTab === 'aftermath' && (
          <div className="h-[calc(100vh-140px)]">
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
          </div>
        )}
      </div>

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

