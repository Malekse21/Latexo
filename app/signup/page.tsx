"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (searchParams.get('error')) {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError(null);
    
    const siteUrl = window.location.origin;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* ─── LEFT PANEL: Brand Canvas ─── */}
      <div className="hidden lg:flex flex-col justify-between bg-black text-white p-12 relative overflow-hidden">
        {/* Subtle background shapes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-zinc-900 rounded-full blur-[120px] opacity-30 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-800 rounded-full blur-[100px] opacity-20 translate-y-1/3 -translate-x-1/3" />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Top: Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 relative bg-white p-1.5 rounded-sm shadow-lg">
              <Image 
                src="/images/logo.png" 
                alt="Latexo Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-black tracking-widest uppercase group-hover:tracking-[0.2em] transition-all">Latexo</span>
          </Link>
        </div>

        {/* Center: Headline + Jury Avatars */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-lg space-y-10"
        >
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-[1.1]">
              Ace your PFE<br />soutenance.
            </h2>
            <p className="text-zinc-400 text-lg font-light leading-relaxed max-w-sm">
              Join thousands of Tunisian students training with AI-powered jury simulation.
            </p>
          </div>

          {/* Jury Avatars */}
          <div className="flex items-center gap-4">
            {[
              { name: "Malek", image: "/jury/technical-expert.png" },
              { name: "Souad", image: "/jury/strict-academic.png" },
              { name: "Amir", image: "/jury/business-strategist.png" },
            ].map((jury, i) => (
              <motion.div
                key={jury.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="w-14 h-14 rounded-full border-2 border-zinc-700 overflow-hidden bg-zinc-800 shadow-lg"
              >
                <Image src={jury.image} alt={jury.name} width={56} height={56} className="w-full h-full object-cover" />
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-zinc-500 font-mono uppercase tracking-wider ml-1"
            >
              3 AI Jury<br />Personas
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom: Features list */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 space-y-3"
        >
          {[
            "Voice-to-voice AI soutenance simulation",
            "Personalized feedback from 3 jury personas",
            "Track your progress with streaks & leaderboard",
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0" />
              <span className="text-sm text-zinc-400">{feature}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ─── RIGHT PANEL: Signup Form ─── */}
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
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">Create Account</h1>
            <p className="text-zinc-500 text-sm sm:text-base">
              Join Latexo and start mastering your PFE soutenance.
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

          <div className="space-y-4">
            {/* Google Auth Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full h-14 bg-white text-black border-2 border-black hover:bg-neutral-50 disabled:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all font-bold text-sm shadow-[3px_3px_0px_#000000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-200" />
              <div className="flex-1 h-px bg-zinc-200" />
            </div>
          </div>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-black font-bold hover:underline underline-offset-4">
              Log in
            </Link>
          </p>
        </motion.div>

        <p className="absolute bottom-8 text-[10px] text-center text-zinc-400 max-w-xs">
          By continuing, you agree to Latexo&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <SignupContent />
    </Suspense>
  );
}
