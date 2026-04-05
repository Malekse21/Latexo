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

  const fetchProfile = async (userId: string, retryOnNull = true): Promise<Profile | null> => {
    try {
      console.log(`[UserContext] fetchProfile called for ${userId} (retry=${retryOnNull})`);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Supabase wraps AbortError in its error response — silently ignore
        if (error.message?.includes('aborted')) return null;

        console.error(
          "[UserContext] fetchProfile error:",
          error.message ?? "Unknown error",
          `(code: ${error.code ?? "N/A"}, status: ${(error as any).status ?? "N/A"})`
        );

        if (error.code === 'PGRST116') {
          console.warn("[UserContext] Profile not found for user. Signing out...");
          await signOut();
        }
        return null;
      }

      if (!data && retryOnNull) {
        console.warn("[UserContext] fetchProfile returned null. Retrying in 500ms...");
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchProfile(userId, false);
      }

      console.log("[UserContext] fetchProfile result:", data ? "OK" : "null");
      return data;
    } catch (error: any) {
      // Silently ignore AbortError — React unmounted while fetch was in-flight
      if (isAbortError(error)) return null;
      console.error("[UserContext] Unexpected fetchProfile error:", error?.message ?? error);
      return null;
    }
  };

  const refreshProfile = React.useCallback(async () => {
    if (user) {
      console.log("[UserContext] refreshProfile called for", user.id);
      const data = await fetchProfile(user.id, false);
      if (data) {
        setProfile(data);
        console.log("[UserContext] refreshProfile: profile updated. credits=", data.credits, "streak=", data.current_streak);
      }
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    console.log("[UserContext] Provider Mounted. Starting init.");

    // Phase 1: Eagerly load the session from cache/cookies (synchronous from Supabase's perspective)
    const initSession = async () => {
      try {
        const { data: { session: cachedSession } } = await supabase.auth.getSession();
        console.log("[UserContext] Eager getSession result:", { hasSession: !!cachedSession });

        if (!mounted) return;

        setSession(cachedSession);
        setUser(cachedSession?.user ?? null);

        if (cachedSession?.user) {
          const data = await fetchProfile(cachedSession.user.id);
          if (mounted) {
            if (data) {
              setProfile(data);
              console.log("[UserContext] Initial profile loaded. credits=", data.credits, "streak=", data.current_streak);
            } else {
              console.warn("[UserContext] Initial fetchProfile returned null.");
            }
            setLoading(false);
          }
        } else {
          console.log("[UserContext] No cached session. User is logged out.");
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error("[UserContext] Eager init error:", err);
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // Phase 2: Subscribe to auth changes for subsequent events (sign-in, sign-out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        if (!mounted) return;
        console.log(`[UserContext] Auth Event: ${event}`, { hasSession: !!currentSession });

        // Skip TOKEN_REFRESHED — session is unchanged, no need to re-fetch profile
        if (event === 'TOKEN_REFRESHED') return;
        // Skip INITIAL_SESSION — we already handled it eagerly above
        if (event === 'INITIAL_SESSION') return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          console.log(`[UserContext] Auth change: fetching profile for ${currentSession.user.id}`);
          const data = await fetchProfile(currentSession.user.id);
          if (mounted && data) {
            setProfile(data);
            console.log("[UserContext] Profile updated from auth change. credits=", data.credits);
          }
        } else {
          console.log("[UserContext] Auth change: user signed out. Clearing profile.");
          setProfile(null);
        }
      }
    );

    return () => {
      console.log("[UserContext] Provider Unmounting.");
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    console.log("[UserContext] signOut started");
    try {
      await supabase.auth.signOut();
      console.log("[UserContext] supabase.auth.signOut() SUCCESS");
    } catch (err) {
      console.error("[UserContext] Supabase signOut error:", err);
    }
    
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Only clear our app's storage key — NOT localStorage.clear()
    // which destroys Supabase's internal auth state in the singleton client
    try {
      localStorage.removeItem('latexo-app-storage');
      console.log("[UserContext] App storage cleared");
    } catch (e) {
      // silent
    }

    console.log("[UserContext] Redirecting to '/'");
    router.push("/");
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
