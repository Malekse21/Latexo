"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Clock, Copy, Check, X } from "lucide-react";
import { usePaymentModal, PACKS } from "@/lib/hooks/usePaymentModal";
import { useUser } from "@/lib/context/user-context";

const POLL_INTERVAL_MS = 15_000; // Poll every 15s
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 min max

export function WaitingConfirmation() {
  const {
    selectedPack,
    d17Phone,
    orderId,
    orderReference,
    goTo,
  } = usePaymentModal();
  const { refreshProfile } = useUser();

  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef(Date.now());

  const pack = selectedPack ? PACKS[selectedPack] : null;
  const reference = orderReference || "#LAT-0000";

  const handleCopyRef = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [reference]);

  // Polling logic — calls GET /api/payments/status/[orderId]
  useEffect(() => {
    if (!orderId) return;

    startTime.current = Date.now();

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/payments/status/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'COMPLETED') {
            if (pollRef.current) clearInterval(pollRef.current);
            await refreshProfile();
            goTo('success');
            return;
          }
        } else if (res.status === 404) {
          if (pollRef.current) clearInterval(pollRef.current);
          setRejected(true);
          return;
        }
      } catch {
        // Network error — will retry on next interval
      }
      setPollCount((c) => c + 1);
    };

    // Initial poll after a short delay
    const initialTimer = setTimeout(pollStatus, 3000);

    pollRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setTimedOut(true);
    }, POLL_TIMEOUT_MS);

    return () => {
      clearTimeout(initialTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [orderId, goTo]);

  return (
    <div className="flex flex-col items-center px-5 py-6 bg-white text-black min-h-full">
      {/* ── Header ──────────────────────────────────── */}
      <div className="w-full flex items-center justify-between mb-6 border-b border-neutral-100 pb-3">
        <h2 className="text-xl font-bold text-black">
          Paiement en attente
        </h2>
        <button
          onClick={() => usePaymentModal.getState().close()}
          className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-black" />
        </button>
      </div>

      {/* ── Pulsing Rings ───────────────────────────── */}
      <div className="relative w-24 h-24 flex items-center justify-center mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-black"
            style={{
              animation: `pulse-ring 2s ease-out infinite`,
              animationDelay: `${i * 0.6}s`,
            }}
          />
        ))}
        <div className="w-10 h-10 rounded-full flex items-center justify-center z-10 bg-black">
          <Clock className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* ── Status text ─────────────────────────────── */}
      {rejected ? (
        <p className="text-base font-bold text-red-600 mb-2 font-mono uppercase tracking-widest text-center">
          Commande rejetée ou annulée par l'administrateur.
        </p>
      ) : !timedOut ? (
        <p
          className="text-lg font-black text-black mb-2 font-mono uppercase tracking-widest text-center"
          style={{
            animation: "fade-pulse 2.5s ease-in-out infinite",
          }}
        >
          Vérification en cours...
        </p>
      ) : (
        <p className="text-base font-bold text-red-600 mb-2 font-mono uppercase tracking-widest text-center">
          La confirmation prend plus de temps que prévu.
        </p>
      )}

      {/* Reference */}
      <button
        onClick={handleCopyRef}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-sm mb-2 transition-colors hover:bg-neutral-100 cursor-pointer border-2 border-transparent hover:border-black"
      >
        <span className="text-sm font-bold font-mono text-neutral-600">
          #{reference}
        </span>
        {copied ? (
          <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
        ) : (
          <Copy className="w-4 h-4 text-neutral-600" />
        )}
      </button>

      {!timedOut && !rejected && (
        <p className="text-[11px] mb-5 text-neutral-500 font-medium text-center">
          Confirmation généralement en moins de 30 min
        </p>
      )}

      {/* ── Poll indicator ──────────────────────────── */}
      {!timedOut && !rejected && (
        <div className="flex items-center gap-2 mb-6 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
          <div
            className="w-2 h-2 rounded-full bg-black"
            style={{ animation: "poll-dot 1.5s ease-in-out infinite" }}
          />
          <span className="text-[10px] font-bold text-neutral-600 font-mono uppercase tracking-widest">
            Vérification automatique active
          </span>
        </div>
      )}

      {/* ── Order Recap ─────────────────────────────── */}
      <div className="w-full max-w-sm rounded-none p-5 mb-6 bg-zinc-50 border-2 border-black">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest font-bold text-neutral-500 font-mono">Pack</span>
            <span className="text-xs font-black text-black font-mono">
              {pack?.name || "—"} — {pack?.credits || 0} crédits
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest font-bold text-neutral-500 font-mono">Montant envoyé</span>
            <span className="text-xs font-black text-black font-mono">
              {pack?.price || 0} DT
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest font-bold text-neutral-500 font-mono">Ton numéro D17</span>
            <span className="text-xs font-black text-black font-mono">
              +216 {d17Phone}
            </span>
          </div>
          <div className="h-px w-full bg-neutral-200 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest font-bold text-neutral-500 font-mono">Statut</span>
            {rejected ? (
              <span className="text-[10px] uppercase tracking-widest font-black px-2 py-1 bg-red-100 text-red-800 font-mono border border-red-300">
                REJETÉE
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-widest font-black px-2 py-1 bg-yellow-100 text-yellow-800 font-mono border border-yellow-300">
                EN ATTENTE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Close note ──────────────────────────────── */}
      <p className="text-center text-xs text-neutral-500 font-medium">
        Tu peux fermer cette fenêtre.<br/>Tes crédits seront ajoutés automatiquement dès confirmation.
      </p>
    </div>
  );
}
