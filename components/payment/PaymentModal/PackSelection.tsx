"use client";

import { X, Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { usePaymentModal, PACKS, type PackType } from "@/lib/hooks/usePaymentModal";

interface PackSelectionProps {
  currentCredits: number;
  onClose: () => void;
}

const PACK_ORDER: PackType[] = ["starter", "defense", "serious"];

function PackCard({
  packId,
  isSelected,
  onSelect,
}: {
  packId: PackType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const pack = PACKS[packId];
  const isBlack = packId === "defense";

  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={`relative flex flex-col text-left cursor-pointer transition-all duration-200 border-2 ${
        isBlack ? "bg-black text-white" : "bg-white text-black"
      } ${
        isSelected
          ? isBlack
            ? "border-white p-[23px] shadow-[8px_8px_0px_0px_#000]"
            : "border-black p-[23px] shadow-[8px_8px_0px_0px_#000]"
          : isBlack
            ? "border-black p-[24px] shadow-[8px_8px_0px_0px_#000]"
            : "border-black p-[24px] shadow-[6px_6px_0px_0px_#000]"
      }`}
      style={{
        borderRadius: "2px",
        minHeight: isBlack ? "220px" : "200px",
      }}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
            isBlack ? "bg-white" : "bg-black"
          }`}
        >
          <Check
            className={`w-3.5 h-3.5 ${isBlack ? "text-black" : "text-white"}`}
            strokeWidth={3}
          />
        </motion.div>
      )}

      {/* Credits */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-4xl md:text-5xl font-black leading-none tracking-tighter">
          {pack.credits}
        </span>
        <span className={`text-[10px] md:text-xs uppercase tracking-wider font-bold ${isBlack ? "text-white/60" : "text-black/50"}`}>
          Credits
        </span>
      </div>

      {/* Pack name */}
      <span className={`text-[11px] uppercase tracking-[0.2em] mb-2 font-black font-mono ${isBlack ? "text-white/50" : "text-black/40"}`}>
        {pack.name}
      </span>

      {/* Hint */}
      <span className={`text-[11px] mb-4 font-mono ${isBlack ? "text-white/45" : "text-black/50"}`}>
        {pack.hint}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Price */}
      <span className="text-2xl md:text-3xl font-black leading-none mb-3 font-mono">
        {pack.price}{" "}
        <span className="text-xs font-bold opacity-60">DT</span>
      </span>

      {/* Button */}
      <div
        className={`w-full py-2.5 text-center text-[11px] font-black uppercase tracking-[0.15em] transition-colors duration-200 ${
          isBlack ? "bg-white text-black" : "bg-black text-white"
        }`}
      >
        CHOOSE PACK
      </div>
    </motion.button>
  );
}

export function PackSelection({ currentCredits, onClose }: PackSelectionProps) {
  const { selectedPack, setSelectedPack, goTo } = usePaymentModal();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ──────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between border-b border-neutral-100">
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-1">
            Recharge tes crédits
          </h2>
          <p className="text-xs text-neutral-500">
            Choisis le pack qui correspond à ta soutenance
          </p>
        </div>

        {/* Credit pill */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border border-neutral-200 text-black font-mono font-bold">
            {currentCredits} cr
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-sm transition-colors hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>

      {/* ── Secondary title & cards ──────────────── */}
      <div className="px-5 py-6 md:py-8 bg-white">
        <h3 className="text-center text-lg md:text-2xl uppercase tracking-tight mb-2 font-black text-black">
          CHOOSE YOUR ARSENAL
        </h3>
        <p className="text-center text-[11px] md:text-xs mb-6 text-neutral-500 font-medium">
          Simple credit packs. No subscriptions. Pay as you go.
        </p>

        <div className="w-full mb-8">
          <div className="flex flex-col md:flex-row items-stretch justify-center border-2 border-black bg-white shadow-[4px_4px_0px_#000000]">
            <div className="flex-1 flex items-center justify-center gap-2 px-3 py-3 border-b-2 md:border-b-0 md:border-r-2 border-black bg-neutral-50 hover:bg-neutral-100 transition-colors">
              <span className="text-[11px] md:text-[12px] font-black uppercase tracking-tighter">10 CREDITS</span>
              <span className="text-neutral-400 font-mono font-bold">→</span>
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-neutral-600">5 MIN SIMULATION</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-2 px-3 py-3 border-b-2 md:border-b-0 md:border-r-2 border-black bg-neutral-50 hover:bg-neutral-100 transition-colors">
              <span className="text-[11px] md:text-[12px] font-black uppercase tracking-tighter">20 CREDITS</span>
              <span className="text-neutral-400 font-mono font-bold">→</span>
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-neutral-600">15 MIN SIMULATION</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors">
              <span className="text-[11px] md:text-[12px] font-black uppercase tracking-tighter">30 CREDITS</span>
              <span className="text-neutral-400 font-mono font-bold">→</span>
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-neutral-600">30 MIN SIMULATION</span>
            </div>
          </div>
        </div>

        {/* MOST POPULAR badge */}
        <div className="flex justify-center mb-4">
          <span className="text-[10px] uppercase tracking-[0.15em] font-black px-3 py-1 border-2 border-black text-black bg-white font-mono">
            MOST POPULAR
          </span>
        </div>

        {/* Pack cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {PACK_ORDER.map((packId) => (
            <PackCard
              key={packId}
              packId={packId}
              isSelected={selectedPack === packId}
              onSelect={() => setSelectedPack(packId)}
            />
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50">
        <p className="text-center text-[10px] mb-3 text-neutral-500 font-mono">
          Les crédits n&apos;expirent jamais · Paiement sécurisé via D17
        </p>

        <button
          disabled={!selectedPack}
          onClick={() => goTo("payment-instructions")}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-sm text-[13px] font-bold uppercase tracking-wider transition-all duration-200 font-mono ${
            selectedPack
              ? "bg-black text-white hover:bg-neutral-800 cursor-pointer"
              : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
          }`}
        >
          Continuer
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
