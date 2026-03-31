"use client";

import { Lock, ArrowRight, X } from "lucide-react";
import { motion } from "framer-motion";
import { usePaymentModal } from "@/lib/hooks/usePaymentModal";

interface CreditsWallProps {
  currentCredits: number;
  requiredCredits: number;
}

export function CreditsWall({
  currentCredits,
  requiredCredits,
}: CreditsWallProps) {
  const { goTo, close } = usePaymentModal();
  const deficit = requiredCredits - currentCredits;

  return (
    <div className="flex flex-col items-center px-6 py-8 text-center relative bg-white text-black">
      {/* Close button */}
      <button
        onClick={close}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-sm hover:bg-neutral-100 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4 text-neutral-500" />
      </button>

      {/* Lock Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-red-50 border-4 border-red-100"
      >
        <Lock className="w-8 h-8 text-red-500" strokeWidth={2.5} />
      </motion.div>

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-black text-black mb-2 tracking-tight">
        Crédits insuffisants
      </h2>

      {/* Body */}
      <p className="text-[13px] mb-6 text-neutral-500 font-medium">
        Tu as besoin de{" "}
        <span className="text-black font-black">{requiredCredits} crédits</span>{" "}
        pour cette session. Ton solde actuel:{" "}
        <span className="text-black font-black">{currentCredits} crédits</span>.
      </p>

      {/* Gap card */}
      <div className="w-full max-w-sm rounded-none px-5 py-4 mb-6 bg-zinc-50 border-2 border-black relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-widest font-mono">
          Détails
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-widest text-neutral-500 font-bold font-mono">
            Session
          </span>
          <span className="text-xs text-neutral-500 font-bold font-mono">
            {requiredCredits} cr nécess.
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-neutral-500 font-bold font-mono">
            Manquant
          </span>
          <span className="text-sm font-black text-red-600 font-mono">
            {deficit > 0 ? deficit : 0} cr
          </span>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="w-full max-w-sm">
        <button
          onClick={() => goTo("pack-selection")}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-none text-white bg-black text-xs font-black uppercase tracking-widest transition-colors hover:bg-neutral-800 cursor-pointer font-mono"
        >
          Recharger maintenant
          <ArrowRight className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
