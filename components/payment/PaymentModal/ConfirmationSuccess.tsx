"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { usePaymentModal, PACKS } from "@/lib/hooks/usePaymentModal";
import { useUser } from "@/lib/context/user-context";

// Confetti particle colors - Adjusted for B&W but keeping some monochrome/neutral hints, or just black/white/gray
const CONFETTI_COLORS = ["#000000", "#333333", "#666666", "#999999", "#cccccc"];

function ConfettiParticle({ index, total }: { index: number; total: number }) {
  const style = useMemo(() => {
    const angle = (index / total) * 360;
    const distance = 40 + Math.random() * 80;
    const x = Math.cos((angle * Math.PI) / 180) * distance;
    const delay = Math.random() * 0.3;
    const size = 4 + Math.random() * 6;
    const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    
    return {
      position: "absolute" as const,
      left: `calc(50% + ${x}px)`,
      top: "50%",
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      borderRadius: Math.random() > 0.5 ? "50%" : "0px",
      animation: `confetti-fall 1.5s ease-out ${delay}s forwards`,
      opacity: 0,
      animationFillMode: "forwards" as const,
    };
  }, [index, total]);

  return <div style={{ ...style, opacity: 1 }} />;
}

function CountUp({ target, duration = 800 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 800);

    return () => clearTimeout(timer);
  }, [target, duration]);

  return <span>+{current}</span>;
}

export function ConfirmationSuccess({
  currentCredits,
  onStartSimulation,
}: {
  currentCredits: number;
  onStartSimulation: () => void;
}) {
  const { selectedPack, close, reset } = usePaymentModal();
  const { t } = useUser();
  const pack = selectedPack ? PACKS[selectedPack] : null;
  const newBalance = currentCredits + (pack?.credits || 0);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    autoCloseRef.current = setTimeout(() => {
      close();
      reset();
    }, 8000);

    const confettiTimer = setTimeout(() => setShowConfetti(false), 2000);

    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
      clearTimeout(confettiTimer);
    };
  }, [close, reset]);

  const handleAction = (action: () => void) => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    close();
    reset();
    action();
  };

  return (
    <div className="flex flex-col items-center px-6 py-6 relative overflow-hidden bg-white text-black min-h-full justify-center">
      {/* ── Confetti ────────────────────────────────── */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 32 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} total={32} />
          ))}
        </div>
      )}

      {/* ── Circle burst + Checkmark ────────────────── */}
      <div className="relative w-20 h-20 flex items-center justify-center mb-6 z-10">
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-black"
        />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center z-10 bg-white border-4 border-black"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000000"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 48,
              strokeDashoffset: 48,
              animation: "draw-check 0.5s ease-out 0.4s forwards",
            }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
      </div>

      {/* ── Title ───────────────────────────────────── */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-xl md:text-2xl font-black text-black mb-1 text-center uppercase tracking-tight"
      >
        Paiement confirmé !
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xs mb-6 text-center text-neutral-500 font-medium"
      >
        Tes crédits ont été ajoutés à ton compte
      </motion.p>

      {/* ── Credits card ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="w-full max-w-sm rounded-none p-5 mb-6 text-center bg-zinc-50 border-2 border-black relative"
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-widest font-mono">
          Nouveau Solde
        </div>
        <span className="text-4xl font-black block mb-1 text-black font-mono tracking-tighter">
          <CountUp target={pack?.credits || 0} />
          <span className="text-lg ml-2 font-bold text-neutral-400">crédits</span>
        </span>
        <span className="text-[11px] text-neutral-500 font-mono font-bold uppercase tracking-wider">
          Total: {newBalance} crédits
        </span>
      </motion.div>

      {/* ── CTAs ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={() => handleAction(onStartSimulation)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-none text-white bg-black text-xs font-black uppercase tracking-widest transition-colors hover:bg-neutral-800 cursor-pointer font-mono"
        >
          {t('payment.start_sim') || "Commencer ma simulation"}
          <ArrowRight className="w-4 h-4" strokeWidth={3} />
        </button>
      </motion.div>
    </div>
  );
}
