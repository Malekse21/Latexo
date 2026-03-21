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
      return data;
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      
      if (error?.code === 'PGRST116') {
        console.warn("Profile not found for user. Signing out...");
        await signOut();
      }
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const data = await fetchProfile(user.id);
      if (data) setProfile(data);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log("[UserContext] initializeSession on mount:", { user, session, userError, sessionError });
      
      if (!mounted) return;
      
      setSession(session);
      setUser(user ?? null);
      
      if (user) {
        const data = await fetchProfile(user.id);
        if (mounted) {
          if (data) setProfile(data);
          console.log('setLoading false called (initializeSession success)');
          setLoading(false);
        }
      } else {
        if (mounted) {
          console.log('setLoading false called (initializeSession no user)');
          setLoading(false);
        }
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          if (event === 'SIGNED_IN') {
            
            // Only re-trigger the loading/fetch sequence explicitly on SIGNED_IN
            setLoading(true);
            const data = await fetchProfile(currentSession.user.id);
            if (mounted) {
              if (data) setProfile(data);
              console.log('setLoading false called (SIGNED_IN)');
              setLoading(false);
            }
          } else if (event === 'USER_UPDATED') {
            // Background refresh, no loading UI needed
            const data = await fetchProfile(currentSession.user.id);
            if (mounted && data) setProfile(data);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          if (mounted) {
             console.log('setLoading false called (SIGNED_OUT)');
             setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // 1. Optimistic UI updates for immediate feedback
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // 2. Instant client-side navigation to landing page
    router.push("/");
    
    // 3. Perform the actual logout in the background
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Supabase signOut error (background):", err);
    }
    
    // 4. Ensure all stale storage is nuked
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // silent
    }

    // 5. Refresh the router to update any Server Components mapped to the auth state
    router.refresh();
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
