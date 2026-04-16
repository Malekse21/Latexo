"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Copy, Check, AlertTriangle, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import {
  usePaymentModal,
  PACKS,
} from "@/lib/hooks/usePaymentModal";

const D17_NUMBER = "+216 51 133 796"; 

function validateTunisianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-]/g, "").replace(/^\+216/, "");
  return /^[2459]\d{7}$/.test(cleaned);
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("216") ? digits.slice(3) : digits;
  const limited = local.slice(0, 8);

  if (limited.length <= 2) return limited;
  if (limited.length <= 5) return `${limited.slice(0, 2)} ${limited.slice(2)}`;
  return `${limited.slice(0, 2)} ${limited.slice(2, 5)} ${limited.slice(5)}`;
}

export function PaymentInstructions() {
  const {
    selectedPack,
    d17Phone,
    setD17Phone,
    goTo,
    goBack,
    setOrder,
    isSubmitting,
    setSubmitting,
    error,
    setError,
  } = usePaymentModal();

  const [copied, setCopied] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const pack = selectedPack ? PACKS[selectedPack] : null;
  const isPhoneValid = validateTunisianPhone(d17Phone);
  const showPhoneError = phoneTouched && d17Phone.length > 0 && !isPhoneValid;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(D17_NUMBER.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setD17Phone(formatted);
  };

  const handleSubmit = async () => {
    if (!isPhoneValid || !pack) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: selectedPack,
          d17Phone: `+216${d17Phone.replace(/\s/g, "")}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la création de la commande.");
        return;
      }

      setOrder(data.orderId, data.reference);
      goTo("waiting");
    } catch {
      setError("Erreur de connexion. Vérifie ta connexion et réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!pack) return null;

  return (
    <div className="flex flex-col bg-white text-black min-h-full">
      {/* ── Header ──────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-neutral-100">
        <button
          onClick={goBack}
          className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-black" />
        </button>
        <div className="flex-1 px-4 text-center">
          <h2 className="text-xl font-bold text-black">
            Effectuer le paiement
          </h2>
        </div>
        <button
          onClick={() => usePaymentModal.getState().close()}
          className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-black" />
        </button>
      </div>

      {/* ── Scrollable Body ───────────────────────── */}
      <div className="flex-1 overflow-y-auto w-full max-w-lg mx-auto py-4">
        {/* ── Order Summary ───────────────────────────── */}
        <div className="mx-5 mb-4 rounded-sm p-4 bg-neutral-50 border-2 border-black relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-widest font-mono">
            Résumé de la commande
          </div>
          <div className="flex flex-col items-center justify-center mt-1 mb-3">
            <span className="text-[11px] uppercase tracking-widest text-neutral-500 font-mono font-bold mb-1">
              Pack {pack.name} — {pack.credits} crédits
            </span>
            <span className="text-3xl font-black text-black font-mono">
              {pack.price.toFixed(3)} DT
            </span>
          </div>
          
          <div className="flex items-start gap-2.5 px-3 py-2 rounded-sm bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="text-[11px] text-red-600 font-medium leading-relaxed">
              Envoie EXACTEMENT ce montant. Le processus est automatisé, tout autre montant sera rejeté.
            </span>
          </div>
        </div>

        {/* ── Steps ───────────────────────────────────── */}
        <div className="mx-5 mb-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-xs font-black bg-black text-white font-mono">
              1
            </div>
            <div className="pt-1 text-sm text-neutral-800 font-medium">
              Ouvre ton application D17
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-xs font-black bg-black text-white font-mono">
              2
            </div>
            <div className="pt-0.5 text-[13px] text-neutral-800 font-medium w-full">
              Envoie l&apos;argent au numéro ci-dessous:
              
              <div className="mt-2 p-3 bg-zinc-50 border-2 border-black flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono font-bold block mb-0.5">
                    Numéro D17 Latexo
                  </span>
                  <span className="text-lg text-black font-black tracking-widest font-mono">
                    {D17_NUMBER}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center justify-center w-8 h-8 border-2 transition-colors ${
                    copied ? "bg-black text-white border-black" : "bg-white text-black border-black hover:bg-neutral-100"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-xs font-black bg-black text-white font-mono">
              3
            </div>
            <div className="pt-0.5 text-[13px] text-neutral-800 font-medium">
              Reviens ici et valide avec ton numéro D17
            </div>
          </div>
        </div>

        {/* ── Phone Input ─────────────────────────────── */}
        <div className="mx-5 mb-5">
          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 mb-1.5 block font-mono">
            Ton numéro D17 (pour valider)
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-black font-mono">
              +216
            </div>
            <input
              type="tel"
              value={d17Phone}
              onChange={handlePhoneChange}
              onBlur={() => setPhoneTouched(true)}
              placeholder="XX XXX XXX"
              className={`w-full pl-14 pr-10 py-3 rounded-none text-sm text-black font-black placeholder:text-neutral-300 outline-none transition-colors border-2 font-mono ${
                showPhoneError ? "border-red-500" : isPhoneValid ? "border-black" : "border-neutral-300 focus:border-black"
              }`}
            />
            {/* Validation icon */}
            {d17Phone.length > 0 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {isPhoneValid ? (
                  <Check className="w-5 h-5 text-black" strokeWidth={3} />
                ) : phoneTouched ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : null}
              </div>
            )}
          </div>
          {showPhoneError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] mt-2 text-red-500 font-bold font-mono uppercase"
            >
              Numéro invalide. Format attendu: 8 chiffres
            </motion.p>
          )}
        </div>

        {/* ── Submit CTA ──────────────────────────────── */}
        <div className="px-5 pb-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 px-3 py-2 rounded-sm bg-red-50 border border-red-200 mb-3"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="text-[11px] text-red-600 font-medium">
                {error}
              </span>
            </motion.div>
          )}

          <button
            disabled={!isPhoneValid || isSubmitting}
            onClick={handleSubmit}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-none text-xs font-black uppercase tracking-widest transition-all duration-200 font-mono ${
              isPhoneValid && !isSubmitting
                ? "bg-black text-white hover:bg-neutral-800 cursor-pointer"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                J&apos;ai effectué le paiement
                <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
