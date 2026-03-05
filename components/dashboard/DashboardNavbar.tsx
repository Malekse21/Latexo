"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, User, LogOut, Languages, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";

export function DashboardNavbar() {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { profile, user, loading, signOut, language, setLanguage, t } = useUser();
  const avatarUrl = profile?.avatar_url?.includes('dicebear.com')
    ? (user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null)
    : profile?.avatar_url;

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await signOut();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-[#E5E5E5] bg-white z-50 flex items-center justify-between px-6">
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
        <span className="font-extrabold text-2xl tracking-tighter">Latexo</span>
      </Link>

      {/* Center: Credits Pill (Hidden on Mobile) */}
      <div className="absolute left-1/2 transform -translate-x-1/2 items-center hidden md:flex">
        <div className="flex items-center gap-2 border-[1.5px] border-black rounded-full px-3 py-1.5 bg-white">
          <Image 
            src="/images/favicon.jpeg" 
            alt="Credits" 
            width={16} 
            height={16} 
            className="rounded-full"
          />
          <span className="text-sm font-bold text-black">
            {loading ? '...' : profile?.credits || 0} {t('common.credits')}
          </span>
          <button className="flex items-center justify-center w-5 h-5 bg-black text-white rounded-full ml-1 hover:bg-neutral-800 transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right: Profile */}
      <div className="flex items-center gap-3">
        <div className="relative">
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
  );
}
