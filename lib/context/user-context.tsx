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
    let profileLoaded = false; // Dedup flag — prevent redundant fetches from rapid events
    console.log("[UserContext] ===== Provider Mounted. Starting auth listener =====");

    const handleAuthEvent = async (event: AuthChangeEvent, currentSession: Session | null) => {
      if (!mounted) return;

      console.log(`[UserContext] Auth Event: "${event}"`, {
        hasSession: !!currentSession,
        userId: currentSession?.user?.id?.substring(0, 8) ?? "none",
        tokenExpiry: currentSession?.expires_at 
          ? new Date(currentSession.expires_at * 1000).toISOString() 
          : "N/A",
      });

      // Skip TOKEN_REFRESHED — session user hasn't changed, profile is unchanged
      if (event === 'TOKEN_REFRESHED') {
        console.log("[UserContext] TOKEN_REFRESHED — skipping (profile unchanged)");
        return;
      }

      // On SIGNED_OUT, clear everything
      if (event === 'SIGNED_OUT' || !currentSession?.user) {
        console.log("[UserContext] No session/signed out. Clearing state.");
        setSession(null);
        setUser(null);
        setProfile(null);
        profileLoaded = false;
        if (mounted) setLoading(false);
        return;
      }

      // We have a valid session — update user/session state
      setSession(currentSession);
      setUser(currentSession.user);

      // Dedup: if profile is already loaded for this user, don't re-fetch
      // unless this is a SIGNED_IN event (which means new sign-in or page load)
      if (profileLoaded && event !== 'SIGNED_IN') {
        console.log(`[UserContext] Profile already loaded. Skipping fetch for event: "${event}"`);
        if (mounted) setLoading(false);
        return;
      }

      // Fetch profile
      try {
        console.log(`[UserContext] Fetching profile for user: ${currentSession.user.id}`);
        const data = await fetchProfile(currentSession.user.id);
        console.log(`[UserContext] fetchProfile result:`, {
          success: !!data,
          credits: data?.credits ?? "N/A",
          streak: data?.current_streak ?? "N/A",
          hasAvatar: !!data?.avatar_url,
          fullName: data?.full_name ?? "N/A",
        });

        if (mounted) {
          if (data) {
            setProfile(data);
            profileLoaded = true;
            console.log("[UserContext] ✅ Profile state SET. credits=%d streak=%d", data.credits, data.current_streak ?? 0);
          } else {
            console.warn("[UserContext] ⚠️ fetchProfile returned null — profile state NOT cleared (keeping previous).");
            // IMPORTANT: Do NOT clear profile here. If we already have a profile,
            // keep it. This prevents the "disappearing data" issue.
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("[UserContext] Profile fetch threw:", err);
        if (mounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthEvent);

    return () => {
      console.log("[UserContext] ===== Provider Unmounting =====");
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
