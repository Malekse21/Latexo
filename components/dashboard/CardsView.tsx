"use client";

import { ReportFrame } from "@/components/dashboard/ReportFrame";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import Image from "next/image";
import { Clock } from "lucide-react";

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
  dynamicGreeting: string;
  dynamicQuote: string;
  daysUntilDefense: number;
  onUploadClick: () => void;
  t: (key: string, params?: any) => any;
}

export function CardsView({
  profile,
  activeReport,
  dynamicGreeting,
  dynamicQuote,
  daysUntilDefense,
  onUploadClick,
  t
}: CardsViewProps) {
  return (
    <div className="flex flex-col h-auto md:h-[calc(100vh-200px)]">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-center md:items-start w-full mb-4 gap-4 px-2">
        {/* Left: Supervisor Avatar & Welcome & Quote */}
        <div className="flex items-center md:items-start gap-4 text-center md:text-left max-w-2xl w-full">
          {/* Supervisor Avatar Image */}
          <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 border-[3px] border-black rounded-full overflow-hidden bg-white shadow-[4px_4px_0px_#000000]">
            <Image 
              src="/jury/supervisor.png" 
              alt="Supervisor" 
              width={64} 
              height={64} 
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col space-y-1">
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
              {dynamicGreeting}, {profile?.full_name?.split(' ')[0] || 'Scholar'}
            </h1>
            <div className="bg-gray-50 border border-gray-100 px-3 py-1.5 italic text-gray-600 font-serif border-l-4 border-l-black text-xs">
              "{dynamicQuote}"
            </div>
          </div>
        </div>

        {/* Right: Brutalist Countdown Timer */}
        {daysUntilDefense > 0 && (
          <div className="flex flex-col items-end">
            <div className="bg-white border-[3px] border-black p-2 md:p-3 shadow-[4px_4px_0px_#000000] flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">{t('welcome.defense_in')}</p>
              </div>
              <div className="flex items-center gap-2 bg-black text-white px-3 py-1.5">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-lg md:text-xl font-black font-mono tracking-widest">{daysUntilDefense} {t('welcome.days').toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Project Area - Centered & Expanded */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Column: Artifact (Golden Frame) */}
        <div className="w-full flex justify-center md:justify-center p-2">
          <ReportFrame 
            isEmpty={!activeReport}
            thumbnailUrl={activeReport?.thumbnail_url}
            onUploadClick={onUploadClick}
            className="shadow-xl max-w-[300px]"
          />
        </div>

        {/* Right Column: Stats */}
        <div className="w-full flex justify-center md:justify-start h-full max-h-[500px] items-center">
          {activeReport ? (
            <StatsPanel 
              filename={activeReport.name || activeReport.title}
              pageCount={activeReport.page_count}
              wordCount={activeReport.word_count}
              createdAt={activeReport.created_at}
              language={activeReport.detected_language}
            />
          ) : (
            <div className="p-8 text-gray-400 font-mono border-l-2 border-gray-100 h-fit">
              <p className="text-lg">{t('dashboard.no_file')}</p>
              <p className="text-sm mt-2">{t('dashboard.upload_sequence')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
