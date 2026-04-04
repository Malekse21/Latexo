"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, User, LogOut, Languages, Trophy } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import { motion } from "framer-motion";
import { usePaymentModal } from "@/lib/hooks/usePaymentModal";
import { PaymentModal } from "@/components/payment/PaymentModal";

export function DashboardNavbar() {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { profile, user, loading, signOut, language, setLanguage, t } = useUser();
  const avatarUrl = profile?.avatar_url;
  
  // Debug Log
  useEffect(() => {
    console.log("[DashboardNavbar] Render state:", { loading, hasUser: !!user, profile });
  }, [loading, user, profile]);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { open: openPaymentModal } = usePaymentModal();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [highlightCredits, setHighlightCredits] = useState(false);

  useEffect(() => {
    const triggerShake = () => {
      setHighlightCredits(true);
      setTimeout(() => setHighlightCredits(false), 1000);
    };

    window.addEventListener('lto_shake_credits', triggerShake);
    
    if (profile && profile.credits < 10 && !highlightCredits) {
      // Trigger once on load if credits are insufficient for any action
      const timer = setTimeout(triggerShake, 1000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('lto_shake_credits', triggerShake);
      };
    }
    
    return () => window.removeEventListener('lto_shake_credits', triggerShake);
  }, [profile?.credits]);

  const handleLogout = async () => {
    console.log("[DashboardNavbar] handleLogout triggered");
    setIsProfileOpen(false);
    await signOut();
    console.log("[DashboardNavbar] handleLogout finished");
  };

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-[#E5E5E5] bg-white z-50 flex items-center justify-between px-3 md:px-6">
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="relative w-12 h-12">
          <Image 
            src="/images/logo.png" 
            alt="Latexo Logo" 
            fill
            className="object-contain"
            priority
          /> 
        </div>
        <span className="font-serif font-bold text-xl md:text-2xl tracking-tight text-gray-900">Latexo</span>
      </Link>

      {/* Center: Credits Pill */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
        <motion.div 
          animate={
            highlightCredits 
              ? { x: [-4, 4, -4, 4, -2, 2, 0], scale: 1.05 } 
              : { x: 0, scale: 1 }
          }
          transition={{ duration: 0.4 }}
          className={`flex items-center gap-1 md:gap-2 border-2 rounded-full px-2 md:px-3 py-1 md:py-1.5 transition-colors ${
            highlightCredits 
              ? 'bg-black border-black shadow-[4px_4px_0px_0px_#635f5c]' 
              : 'bg-white border-black'
          }`}
        >
          <Image 
            src="/images/favicon.jpeg" 
            alt="Credits" 
            width={14} 
            height={14} 
            className="rounded-full object-cover w-3.5 h-3.5 md:w-4 md:h-4 grayscale brightness-150"
          />
          <span className={`text-xs md:text-[13px] font-black uppercase tracking-widest ${highlightCredits ? 'text-white' : 'text-black'}`}>
            {loading ? '...' : profile?.credits || 0} <span className="hidden sm:inline ml-1 font-bold">{t('common.credits')}</span>
          </span>
          <button 
            onClick={() => openPaymentModal('pack-selection')}
            className={`flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full ml-1 transition-colors cursor-pointer ${
            highlightCredits ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'
          }`}>
            <Plus className="w-2 md:w-3 h-2 md:h-3" strokeWidth={3} />
          </button>
        </motion.div>
      </div>

      {/* Right: Profile */}
      <div className="flex items-center gap-3">
        {/* Streak Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black rounded-sm shadow-sm">
          <span className="text-white text-xs">🔥</span>
          <span className="text-sm font-black text-white font-mono leading-none tracking-widest">{profile?.current_streak ?? 0}</span>
        </div>

        <div className="relative" ref={profileMenuRef}>
        <button 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center justify-center w-11 h-11 border-[1.5px] border-[#E5E5E5] rounded-full hover:border-black transition-colors overflow-hidden bg-gray-50"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-gray-700" />
          )}
        </button>

        {isProfileOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E5E5E5] shadow-lg rounded-none py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
             <div className="px-4 py-2 border-b border-[#E5E5E5]">
               <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
             </div>
             <button 
               onClick={() => {
                 setIsProfileOpen(false);
                 router.push('/dashboard/leaderboard');
               }}
               className="w-full text-left px-4 py-2 text-sm hover:bg-black hover:text-white flex items-center gap-2 transition-colors"
             >
               <Trophy className="w-4 h-4" /> {t('Leaderboard') || 'Leaderboard'}
             </button>
              <div className="px-4 py-2 text-sm border-b border-[#E5E5E5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  <span>{t('common.language')}</span>
                </div>
                <div className="flex border border-black rounded-sm overflow-hidden h-7">
                  <button 
                    onClick={() => setLanguage("fr")}
                    className={`px-2 text-[10px] font-bold transition-colors ${language === "fr" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                  >
                    FR
                  </button>
                  <button 
                    onClick={() => setLanguage("en")}
                    className={`px-2 text-[10px] font-bold transition-colors ${language === "en" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                  >
                    EN
                  </button>
                </div>
              </div>
             <button 
               onClick={handleLogout}
               className="w-full text-left px-4 py-2 text-sm hover:bg-black hover:text-white flex items-center gap-2 transition-colors"
             >
               <LogOut className="w-4 h-4" /> {t('common.logout')}
             </button>
          </div>
        )}
        </div>
      </div>
    </nav>
    <PaymentModal />
    </>
  );
}
