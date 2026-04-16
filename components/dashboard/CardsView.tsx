"use client";

import { useState, useEffect } from "react";
import { ReportFrame } from "@/components/dashboard/ReportFrame";
import { UploadModal } from "@/components/dashboard/UploadModal";
import { Clock, ArrowRight, Sparkles, TrendingDown } from "lucide-react";
import Image from "next/image";
import { usePaymentModal } from "@/lib/hooks/usePaymentModal";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/lib/context/user-context";
import type { DashboardProfile, DashboardReport } from "@/lib/types/dashboard";

export interface CardsViewProps {
  profile: DashboardProfile;
  activeReport: DashboardReport | null;
  daysUntilDefense: number;
  readinessScore: number | null;
  projectedScore: number | null;
  lastGrade: number | null;
  memorySnapshot: string | null;
}

export function CardsView({
  profile,
  activeReport,
  daysUntilDefense,
  readinessScore,
  projectedScore,
  lastGrade,
  memorySnapshot
}: CardsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, refreshProfile } = useUser();
  const { open: openPaymentModal } = usePaymentModal();
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [greeting, setGreeting] = useState("");

  const bestScore = profile?.best_score || 0;
  const gap = lastGrade !== null ? bestScore - lastGrade : 0;
  const hasSessionData = lastGrade !== null && bestScore > 0;

  // Generate Greeting Internally
  useEffect(() => {
    const hour = new Date().getHours();
    let greetingKey = "dashboard.greetings.morning";
    if (hour >= 12 && hour < 18) greetingKey = "dashboard.greetings.afternoon";
    else if (hour >= 18) greetingKey = "dashboard.greetings.evening";

    const localizedGreeting = t(greetingKey);
    if (localizedGreeting !== greetingKey) {
      setGreeting(localizedGreeting);
    } else {
      if (hour >= 12 && hour < 18) setGreeting(language === "fr" ? "Bonjour" : "Good afternoon");
      else if (hour >= 18) setGreeting(language === "fr" ? "Bonsoir" : "Good evening");
      else setGreeting(language === "fr" ? "Bonjour" : "Good morning");
    }
  }, [language, t]);

  const handleNavigateToDefense = () => {
    router.push(`${pathname}?tab=defense`);
  };

  const handleSimulateClick = () => {
    const credits = profile?.credits || 0;
    const sessionCost = 10; // Minimum session cost
    if (credits < sessionCost) {
      openPaymentModal('credits-wall', sessionCost);
    } else {
      handleNavigateToDefense();
    }
  };

  const handleUploadComplete = async () => {
    setIsUploadModalOpen(false);
    await refreshProfile();
    router.refresh();
  };

  return (
    <div className="flex flex-col h-auto md:h-[calc(100vh-200px)]">
      {/* Header Section */}
      <header className="w-full mb-6 px-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl lg:text-3xl font-black tracking-tight uppercase">
            {greeting}, {profile?.full_name?.split(' ')[0] || 'Scholar'}
          </h1>
          
          {daysUntilDefense > 0 && (
            <div className="inline-flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-sm shadow-sm w-max animate-pulse">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-xs uppercase tracking-widest font-bold">
                {t('welcome.defense_in')} <span className="font-black text-sm">{daysUntilDefense} {t('welcome.days').toUpperCase()}</span>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content: Left Thumbnail + Right Panel */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row justify-between gap-8 px-2">
        {/* Left: Artifact (Golden Frame) */}
        <div className="flex justify-center lg:justify-start shrink-0">
          <ReportFrame 
            isEmpty={!activeReport}
            thumbnailUrl={activeReport?.thumbnail_url}
            onUploadClick={() => setIsUploadModalOpen(true)}
            className="shadow-xl w-full max-w-[320px] sm:max-w-[400px] lg:w-[320px]"
          />
        </div>

        {/* Right: Coaching Panel — 2/3 of page on Desktop */}
        <div className="flex flex-col w-full lg:w-2/3">

          {/* ── Section 1: Readiness Score ────────────────────── */}
          <div className="border border-zinc-200 p-4">
            {readinessScore !== null ? (
              <>
                {/* Top row: label + score + mention */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em] font-mono">{t("dashboard.readiness")}</span>
                </div>

                {/* Big score */}
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="text-3xl md:text-4xl font-black tabular-nums tracking-tighter leading-none">{readinessScore}</span>
                  <span className="text-lg font-black text-zinc-300">/100</span>
                </div>

                {/* Progress bar */}
                <div className="relative w-full h-1.5 bg-zinc-100 mb-1.5">
                  <div 
                    className="absolute top-0 left-0 h-full bg-black transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(readinessScore, 100)}%` }}
                  />
                  <div className="absolute top-0 h-full w-px bg-zinc-300" style={{ left: '85%' }} />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[9px] text-zinc-400 font-mono tracking-wide">{t("dashboard.target")}</p>
                </div>
              </>
            ) : (
              <>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em] font-mono">{t("dashboard.readiness")}</span>
                <div className="flex items-baseline gap-1.5 mt-2 mb-2">
                  <span className="text-3xl font-black tabular-nums tracking-tighter leading-none text-zinc-200">—</span>
                  <span className="text-lg font-black text-zinc-100">/100</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-50" />
                <p className="text-[10px] text-zinc-400 font-mono mt-3">{t('dashboard.ai_notes_empty')}</p>
              </>
            )}
          </div>

          {/* ── Section 2: AI Supervisor Notes (Memory Snapshot) ───── */}
          <div className="border border-t-0 border-zinc-200 p-4 bg-zinc-50/30">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full border border-black bg-white shrink-0 shadow-sm overflow-hidden flex items-center justify-center">
                <Image src="/jury/Supervisor.png" alt="Supervisor" width={32} height={32} className="object-cover w-full h-full" />
              </div>
              <span className="text-xs text-black uppercase font-black tracking-[0.2em] font-mono">
                {t('dashboard.ai_notes_label')}
              </span>
            </div>

            {memorySnapshot ? (
              <p className="text-sm font-serif italic text-zinc-800 leading-relaxed pl-3 border-l-2 border-black py-1">
                &ldquo;{memorySnapshot}&rdquo;
              </p>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400">
                <Sparkles className="w-4 h-4" />
                <p className="text-[11px] font-mono">{t('dashboard.ai_notes_empty')}</p>
              </div>
            )}
          </div>

          {/* ── Section 3: Performance + CTA ──────────────────── */}
          <div className="border border-t-0 border-zinc-200 p-4">
            <span className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-[0.2em] font-mono">{t("dashboard.performance")}</span>

            {hasSessionData && (
              <div className="mt-4">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">{t('dashboard.perf_best')}</span>
                    <span className="text-sm font-black tabular-nums">{bestScore}/20</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">{t('dashboard.perf_last')}</span>
                    <div className="flex items-center gap-3">
                      {gap > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 font-mono font-bold">-{gap}pts</span>
                      )}
                      <span className="text-sm font-black tabular-nums">{lastGrade}/20</span>
                    </div>
                  </div>
                </div>

                {gap > 0 && (
                  <p className="text-[11px] text-zinc-600 font-medium font-mono mb-4 border-l-2 border-zinc-100 pl-3 italic">
                    {t('dashboard.perf_recoverable', { count: gap })}
                  </p>
                )}
              </div>
            )}

            {!hasSessionData && (
              <div className="mt-3 flex items-center gap-2 text-zinc-300 mb-4">
                <TrendingDown className="w-4 h-4" />
                <p className="text-[11px] font-mono">{t('dashboard.perf_no_session')}</p>
              </div>
            )}

            {/* CTA — Always visible */}
            <button
              onClick={handleSimulateClick}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-black text-white text-xs font-bold font-mono uppercase tracking-widest hover:bg-zinc-800 transition-all duration-200 cursor-pointer group mt-2"
            >
              <span>{t('dashboard.cta_simulate')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
      
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}
