"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

/** Detect AbortError thrown when React unmounts mid-fetch */
function isAbortError(err: unknown): boolean {
  return (
    err instanceof DOMException && err.name === 'AbortError' ||
    (err instanceof Error && err.message?.includes('aborted'))
  );
}

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

  const t = React.useCallback((key: string, variables?: Record<string, string | number>) => {
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
  }, [language]); // translations are purely derived from language

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Supabase wraps AbortError in its error response — silently ignore
        if (error.message?.includes('aborted')) return null;

        console.error(
          "Error fetching profile:",
          error.message ?? "Unknown error",
          `(code: ${error.code ?? "N/A"}, status: ${(error as any).status ?? "N/A"})`
        );

        if (error.code === 'PGRST116') {
          console.warn("Profile not found for user. Signing out...");
          await signOut();
        }
        return null;
      }
      return data;
    } catch (error: any) {
      // Silently ignore AbortError — React unmounted while fetch was in-flight
      if (isAbortError(error)) return null;
      console.error("Unexpected error fetching profile:", error?.message ?? error);
      return null;
    }
  };

  const refreshProfile = React.useCallback(async () => {
    if (user) {
      const data = await fetchProfile(user.id);
      if (data) setProfile(data);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
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
            setLoading(false);
          }
        } else {
          if (mounted) {
            setLoading(false);
          }
        }
      } catch (err) {
        // AbortError fires when React unmounts during navigation — harmless
        if (isAbortError(err)) return;
        console.error("[UserContext] initializeSession error:", err);
        if (mounted) setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        if (!mounted) return;
        
        // Skip events that don't require UI updates — TOKEN_REFRESHED and
        // INITIAL_SESSION fire when the tab regains focus or on hydration.
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          return;
        }
        
        console.log(`[UserContext] Processing event: ${event}`);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            try {
              const data = await fetchProfile(currentSession.user.id);
              if (mounted) {
                if (data) setProfile(data);
                setLoading(false);
              }
            } catch (err) {
              if (!isAbortError(err)) {
                console.error("[UserContext] Profile fetch in auth callback:", err);
              }
              if (mounted) setLoading(false);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
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
  }, [router, supabase]);

  const value = React.useMemo(() => ({
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
  }), [user, session, profile, loading, isSidebarCollapsed, language, t, signOut, refreshProfile]);

  return (
    <UserContext.Provider value={value}>
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
