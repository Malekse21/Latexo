"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (searchParams.get('error')) {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* ─── LEFT PANEL: Brand Canvas (Hidden on mobile) ─── */}
      <div className="hidden lg:flex flex-col justify-between bg-black text-white p-12 relative overflow-hidden">
        {/* Abstract geometric background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-900 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-zinc-800 rounded-full blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 relative bg-white p-1 rounded-sm">
              <Image 
                src="/images/logo.png" 
                alt="Latexo Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-black tracking-widest uppercase">Latexo</span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-lg"
        >
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">
            Master your thesis defense.
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl font-light leading-relaxed">
            Interactive AI Jury Simulation.<br />
            Real-time feedback. Build your confidence.
          </p>
        </motion.div>

        <div className="relative z-10 text-sm text-zinc-600 font-mono uppercase tracking-widest">
          V4 System Online
        </div>
      </div>

      {/* ─── RIGHT PANEL: Interactive Form ─── */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative">
        {/* Mobile Logo */}
        <Link href="/" className="lg:hidden absolute top-8 left-8 w-12 h-12">
          <Image 
            src="/images/logo.png" 
            alt="Latexo Logo" 
            fill
            className="object-contain"
            priority
          />
        </Link>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-10"
        >
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">Welcome Back</h1>
            <p className="text-zinc-500 text-sm sm:text-base font-mono">
              Enter the arena to continue your preparation.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border-l-4 border-red-600 text-red-900 px-4 py-3 text-sm font-medium"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-6">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-14 bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors uppercase tracking-widest font-bold text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
                  </svg>
                  Login with Google
                </>
              )}
            </motion.button>
          </div>

          <p className="text-center text-sm font-mono text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-black font-bold uppercase tracking-wide hover:underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </motion.div>

        <p className="absolute bottom-8 text-xs text-center text-zinc-400 max-w-xs font-mono">
          By continuing, you agree to Latexo's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
