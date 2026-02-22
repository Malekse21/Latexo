"use client";

import { GoldenFrame } from "@/components/dashboard/GoldenFrame";
import { StatsPanel } from "@/components/dashboard/StatsPanel";

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
        {/* Left: Welcome & Quote */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2 max-w-2xl w-full">
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            {dynamicGreeting}, {profile?.full_name?.split(' ')[0] || 'Scholar'}
          </h1>
          <div className="bg-gray-50 border border-gray-100 px-4 py-2 italic text-gray-600 font-serif border-l-4 border-l-black text-xs md:text-sm">
            "{dynamicQuote}"
          </div>
        </div>

        {/* Right: Countdown */}
        {daysUntilDefense > 0 && (
          <div className="bg-black text-white px-4 py-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] border border-black w-full md:w-auto text-center md:text-left">
            <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">{t('welcome.defense_in')}</span>
            <span className="font-mono text-xl md:text-2xl font-bold">{daysUntilDefense} {t('welcome.days').toUpperCase()}</span>
          </div>
        )}
      </header>

      {/* Project Area - Centered & Expanded */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Column: Artifact (Golden Frame) */}
        <div className="w-full flex justify-center md:justify-center p-2">
          <GoldenFrame 
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
