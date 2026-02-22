"use client";

import { useRef } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, X, CheckCircle } from "lucide-react";
import { useUser } from "@/lib/context/user-context";
import Image from "next/image";

interface PassportCardProps {
  onClose: () => void;
}

export function PassportCard({ onClose }: PassportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { profile, t } = useUser();

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High resolution
        backgroundColor: '#FFFFFF',
        logging: false,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `latexo-passport-${profile?.full_name?.replace(/\s/g, '-').toLowerCase() || 'student'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download passport:', error);
    }
  };
  
  const formatTime = (seconds: number) => {
    if (!seconds) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getBestScoreColor = (score: number) => {
    if (score >= 16) return "text-emerald-600";
    if (score >= 12) return "text-yellow-600";
    return "text-neutral-600";
  };
  


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-10 rounded-none border-2 border-black shadow-[8px_8px_0px_#000000] w-fit relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-xl font-black uppercase tracking-tight mb-6">Your Student Passport</h2>

        {/* The Passport Card */}
        <div
          id="passport-card"
          ref={cardRef}
          className="w-[600px] h-[340px] bg-white relative overflow-hidden"
          style={{
            backgroundImage: `radial-gradient(circle, #f0f0f0 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0',
          }}
        >
          {/* Border */}
          <div className="absolute inset-0 border-[4px] border-black" />

          {/* Content Container */}
          <div className="flex h-full p-10 gap-10">
            {/* Left Column (30%) - Avatar */}
            <div className="w-[30%] flex flex-col items-center justify-center relative">
              <div className="relative">
                {/* Avatar Circle */}
                <div className="w-28 h-28 rounded-full border-[4px] border-black bg-white overflow-hidden shadow-[4px_4px_0px_#000000]">
                  <ProfileImage
                    src={profile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.full_name || 'User'}`}
                    alt="Avatar"
                  />
                </div>
              </div>
            </div>

            {/* Right Column (70%) - Info */}
            <div className="w-[70%] flex flex-col justify-between py-2">
              {/* Header */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <p style={{ color: "#737373" }} className="text-[10px] font-mono font-bold uppercase tracking-widest">
                    IDENTITY CARD // LATEXO.TN
                  </p>
                  <div className="w-12 h-12 relative -mt-2">
                    <Image
                      src="/images/logo.png"
                      alt="Logo"
                      fill
                      className="object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-3xl font-black uppercase tracking-tight leading-tight text-black">
                    {profile?.full_name || 'STUDENT NAME'}
                  </h3>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-black uppercase">
                      INSAT - TUNIS
                    </p>
                    <p style={{ color: "#737373" }} className="text-[11px] font-bold uppercase tracking-wide">
                      Genie Logiciel
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mt-6 border-t border-dashed border-neutral-300 pt-5">
                   {/* Sessions */}
                   <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase text-neutral-500 tracking-wider mb-0.5" style={{ color: "#737373" }}>
                        {t('common.sessions')}
                      </span>
                      <span className="text-lg font-black leading-none">
                        {profile?.total_sessions || 0}
                      </span>
                   </div>

                   {/* Time */}
                   <div className="flex flex-col border-l border-dashed border-neutral-300 pl-3">
                      <span className="text-[9px] font-bold uppercase text-neutral-500 tracking-wider mb-0.5" style={{ color: "#737373" }}>
                        {t('common.total_time')}
                      </span>
                      <span className="text-lg font-black leading-none">
                        {formatTime(profile?.total_time_seconds || 0)}
                      </span>
                   </div>

                   {/* Best Score */}
                   <div className="flex flex-col border-l border-dashed border-neutral-300 pl-3">
                      <span className="text-[9px] font-bold uppercase text-neutral-500 tracking-wider mb-0.5" style={{ color: "#737373" }}>
                         {t('common.best_score')}
                      </span>
                      <span className={`text-lg font-black leading-none ${getBestScoreColor(profile?.best_score || 0)}`}>
                        {profile?.best_score ? profile.best_score.toFixed(1) : "-"}
                      </span>
                   </div>
                </div>
              </div>

              {/* Verified Text at bottom */}
              <div className="flex items-center gap-2 mt-auto">
                 <div className="w-2 h-2 bg-black rounded-full" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black">
                   OFFICIALLY VERIFIED
                 </span>
              </div>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          className="w-full mt-6 bg-black text-white hover:bg-neutral-800 rounded-none h-12 font-bold uppercase tracking-wide shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus:ring-0"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Passport
        </Button>
      </div>
    </div>
  );
}

function ProfileImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      crossOrigin="anonymous"
    />
  );
}

