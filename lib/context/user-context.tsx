"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  active_report_id: string | null;
  defense_date: string | null;
  university?: string | null;
  specialty?: string | null;
  total_sessions?: number;
  last_session?: string | null;
  best_score?: number;
  memory?: Record<string, any> | null;
  current_streak?: number;
  longest_streak?: number;
}

interface UserContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  language: "fr" | "en";
  setLanguage: (lang: "fr" | "en") => void;
  t: (key: string, variables?: Record<string, string | number>) => any;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const supabase = createClient();
  const router = useRouter();

  // Translation Logic
  const translations = {
    en: require("@/lib/i18n/en.json"),
    fr: require("@/lib/i18n/fr.json")
  };

  const t = (key: string, variables?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value = (translations[language] as any);
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Fallback to key if not found
      }
    }

    if (typeof value === 'string' && variables) {
      Object.entries(variables).forEach(([name, val]) => {
        value = (value as string).replace(`{{${name}}}`, String(val));
      });
    }

    return value;
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      
      // If the profile doesn't exist (PGRST116), the session is invalid for our app logic.
      // We should sign out the user to clean up the state.
      if (error?.code === 'PGRST116') {
        console.warn("Profile not found for user. Signing out...");
        await signOut();
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log("🔴 Logout initiated...");
    
    // 1. Clear application state IMMEDIATELY (synchronous)
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // 2. Clear storage IMMEDIATELY (synchronous)
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear failed:", e);
    }
    
    console.log("✅ Local state cleared, redirecting NOW...");
    
    // 3. Redirect IMMEDIATELY (don't wait for anything)
    window.location.href = "/";
    
    // 4. Sign out from Supabase in the background (this happens after redirect starts)
    supabase.auth.signOut().catch((err) => {
      console.error("Background signOut error (ignored):", err);
    });
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      isSidebarCollapsed, 
      toggleSidebar, 
      language,
      setLanguage,
      t,
      signOut, 
      refreshProfile 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
