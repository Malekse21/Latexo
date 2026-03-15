"use client";

import { ReportFrame } from "@/components/dashboard/ReportFrame";
import { Clock, ArrowRight, MessageCircle, TrendingDown } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

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
}

interface CardsViewProps {
  profile: any;
  activeReport: Report | null;
  greeting: string;
  daysUntilDefense: number;
  readinessScore: number | null;
  projectedScore: number | null;
  lastGrade: number | null;
  pastQuestion: string | null;
  onUploadClick: () => void;
  onNavigateToDefense: () => void;
  t: (key: string, params?: any) => any;
}

const JURIES = [
  { name: 'Malek', avatar: '/jury/technical-expert.png', role: 'Technical' },
  { name: 'Souad', avatar: '/jury/strict-academic.png', role: 'Academic' },
  { name: 'Amir', avatar: '/jury/business-strategist.png', role: 'Business' }
];

function getReadinessMention(score: number): string {
  if (score >= 85) return "Prêt";
  if (score >= 65) return "Presque prêt";
  if (score >= 40) return "En progression";
  if (score >= 20) return "Début prometteur";
  return "À commencer";
}

export function CardsView({
  profile,
  activeReport,
  greeting,
  daysUntilDefense,
  readinessScore,
  projectedScore,
  lastGrade,
  pastQuestion,
  onUploadClick,
  onNavigateToDefense,
  t
}: CardsViewProps) {
  const bestScore = profile?.best_score || 0;
  const gap = lastGrade !== null ? bestScore - lastGrade : 0;
  const hasSessionData = lastGrade !== null && bestScore > 0;

  // Randomize jury once based on the pastQuestion to stay stable during re-renders
  const selectedJury = useMemo(() => {
    if (!pastQuestion) return JURIES[0];
    const index = pastQuestion.length % JURIES.length;
    return JURIES[index];
  }, [pastQuestion]);

  return (
    <div className="flex flex-col h-auto md:h-[calc(100vh-200px)]">
      {/* Header Section */}
      <header className="w-full mb-6 px-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl lg:text-3xl font-black tracking-tight uppercase">
            {greeting}, {profile?.full_name?.split(' ')[0] || 'Scholar'}
          </h1>
          
          {daysUntilDefense > 0 && (
            <div className="flex items-center gap-2 text-zinc-600 font-mono text-sm uppercase tracking-widest font-bold">
              <Clock className="w-4 h-4" />
              <span>{t('welcome.defense_in')} <span className="text-black font-black">{daysUntilDefense} {t('welcome.days').toUpperCase()}</span></span>
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
            onUploadClick={onUploadClick}
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
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em] font-mono">Readiness</span>
                  <span className="text-xs text-zinc-600 font-bold font-mono uppercase">{getReadinessMention(readinessScore)}</span>
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
                  <p className="text-[9px] text-zinc-400 font-mono tracking-wide">cible: 85+</p>
                </div>
              </>
            ) : (
              <>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em] font-mono">Readiness</span>
                <div className="flex items-baseline gap-1.5 mt-2 mb-2">
                  <span className="text-3xl font-black tabular-nums tracking-tighter leading-none text-zinc-200">—</span>
                  <span className="text-lg font-black text-zinc-100">/100</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-50" />
                <p className="text-[10px] text-zinc-400 font-mono mt-3">Lance ta première simulation</p>
              </>
            )}
          </div>

          {/* ── Section 2: Past Question Flashcard ────────────── */}
          <div className="border border-t-0 border-zinc-200 p-4 bg-zinc-50/30">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-full border border-black overflow-hidden bg-white shrink-0 shadow-sm">
                <Image
                  src={selectedJury.avatar}
                  alt={selectedJury.name}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.2em] font-mono">Daily Review</span>
                <span className="text-[10px] text-zinc-400 font-mono italic">• {selectedJury.name} ({selectedJury.role})</span>
              </div>
            </div>

            {pastQuestion ? (
              <p className="text-sm font-serif italic text-zinc-800 leading-relaxed pl-3 border-l-2 border-black py-1">
                "{pastQuestion}"
              </p>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400">
                <MessageCircle className="w-4 h-4" />
                <p className="text-[11px] font-mono">Simule pour débloquer les questions flash</p>
              </div>
            )}
          </div>

          {/* ── Section 3: Session Gap Recovery ──────────────── */}
          <div className="border border-t-0 border-zinc-200 p-4">
            <span className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-[0.2em] font-mono">Performance</span>

            {hasSessionData ? (
              <div className="mt-4">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Meilleure</span>
                    <span className="text-sm font-black tabular-nums">{bestScore}/20</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Dernière session</span>
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
                    {gap === 1 ? 'Ce point est récupérable' : `Ces ${gap} points sont récupérables`}
                  </p>
                )}

                <button
                  onClick={onNavigateToDefense}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white text-[11px] font-bold font-mono uppercase tracking-widest hover:bg-zinc-800 transition-colors cursor-pointer group"
                >
                  <span>Simuler maintenant</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-zinc-300">
                <TrendingDown className="w-4 h-4" />
                <p className="text-[11px] font-mono">Aucune session enregistrée</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
