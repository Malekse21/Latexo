"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";

function FeedbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const result = searchParams.get('result');
    const source = searchParams.get('utm_source') || 'email';
    
    // Fire the API call once if we have a result
    if (result && !submitted) {
      setSubmitted(true);
      fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, source })
      }).catch(err => console.error("Failed to submit feedback", err));
    }
  }, [searchParams, submitted]);

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black flex flex-col items-center justify-center p-6 selection:bg-black selection:text-white font-serif">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full border-[1.5px] border-black p-10 shadow-[6px_6px_0_0_rgba(0,0,0,1)] bg-white text-center space-y-8"
      >
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white">
            <CheckCircle className="w-8 h-8" strokeWidth={2.5} />
          </div>
          
          <div className="space-y-3">
            <p className="font-mono text-[10px] tracking-[3px] uppercase text-neutral-500">
              Retour enregistré
            </p>
            <h1 className="text-4xl font-black tracking-tighter text-black leading-none">
              C'est noté !
            </h1>
          </div>
        </div>

        <p className="text-neutral-700 leading-relaxed text-[15px]">
          Merci pour ton retour. C'est grâce à ça que Latexo s'améliore pour les prochains étudiants.
        </p>
        
        <div className="pt-2">
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-black text-white hover:bg-neutral-800 transition-colors uppercase tracking-[2px] font-mono text-[11px] font-bold h-14 flex items-center justify-center border-2 border-black"
          >
            Retourner à Latexo
            <ArrowRight className="ml-3 w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f4f0]" />}>
      <FeedbackContent />
    </Suspense>
  )
}
