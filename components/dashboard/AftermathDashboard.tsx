"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import NextImage from "next/image";
import Link from "next/link";
import { ArrowRight, RefreshCw, Code2, GraduationCap, Briefcase, Download, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface SimulationData {
  id: string;
  final_grade: number;
  mention?: string;
  evaluation: {
    score: number;
    proficiency: { tech: number; acad: number; biz: number };
  };
  jury_feedback?: {
    tech_quote?: string;
    strict_quote?: string;
    business_quote?: string;
    tech?: { comment: string; tip: string };
    strict?: { comment: string; tip: string };
    business?: { comment: string; tip: string };
  };
  feedback?: {
    tech: { comment: string; tip: string };
    strict: { comment: string; tip: string };
    business: { comment: string; tip: string };
  };
  created_at: string;
}

interface AftermathDashboardProps {
  simulationId: string;
}

// ─── Jury Data ────────────────────────────────────────────────
const JURY_MEMBERS = [
  {
    key: "tech" as const,
    name: "Malek",
    title: "Technical Expert",
    bgColor: "bg-cyan-100",
    imagePath: "/jury/technical-expert.png",
    legacyKey: "tech_quote" as const,
  },
  {
    key: "strict" as const,
    name: "Souad",
    title: "Strict Academic",
    bgColor: "bg-purple-100",
    imagePath: "/jury/strict-academic.png",
    legacyKey: "strict_quote" as const,
  },
  {
    key: "business" as const,
    name: "Amir",
    title: "Business Strategist",
    bgColor: "bg-amber-100",
    imagePath: "/jury/business-strategist.png",
    legacyKey: "business_quote" as const,
  },
];

// ─── Component ────────────────────────────────────────────────
export function AftermathDashboard({ simulationId }: AftermathDashboardProps) {
  const { profile, user } = useUser();
  const avatarUrl = profile?.avatar_url;
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch current simulation
      const { data, error } = await supabase
        .from("simulations")
        .select("*")
        .eq("id", simulationId)
        .single();

      if (error) {
        console.error("Failed to fetch simulation:", error);
        setLoading(false);
        return;
      }

      setSimulation(data);

      // Fetch previous simulation for "last score"
      if (data) {
        const { data: prevSims } = await supabase
          .from("simulations")
          .select("final_grade")
          .eq("user_id", data.user_id || profile?.id)
          .lt("created_at", data.created_at)
          .order("created_at", { ascending: false })
          .limit(1);

        if (prevSims && prevSims.length > 0) {
          setLastScore(prevSims[0].final_grade);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [simulationId, profile?.id]);

  // ─── Animated Score Counter ───────────────────────────────
  const animatedScore = useSpring(0, { duration: 2400, bounce: 0 });
  const displayScore = useTransform(animatedScore, (v) => v.toFixed(1));

  useEffect(() => {
    if (simulation?.final_grade) {
      // Small delay before starting the count
      const timer = setTimeout(() => {
        animatedScore.set(simulation.final_grade);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [simulation?.final_grade, animatedScore]);

  // ─── Handlers ───────────────────────────────────────────────
  const handleDownloadReceipt = async () => {
    if (!simulationId) return;
    try {
      setIsDownloading(true);
      const url = `/api/flex-receipt?simulation_id=${simulationId}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error("Failed to generate receipt");
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `latexo-receipt-${(simulation?.final_grade || 0).toFixed(1)}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading receipt:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── Loading / Error States ───────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-xl font-mono uppercase tracking-widest animate-pulse">
          Loading Results...
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-xl font-mono uppercase tracking-widest">
          Simulation Not Found
        </div>
      </div>
    );
  }

  // ─── Derived Data ─────────────────────────────────────────
  const proficiency = simulation.evaluation?.proficiency || {
    tech: 0,
    acad: 0,
    biz: 0,
  };

  const mention =
    simulation.mention ||
    (simulation.final_grade >= 16
      ? "Très Bien"
      : simulation.final_grade >= 14
      ? "Bien"
      : simulation.final_grade >= 12
      ? "Assez Bien"
      : simulation.final_grade >= 10
      ? "Passable"
      : "Ajourné");

  const isPassing = simulation.final_grade >= 10;
  const scoreDelta = lastScore !== null ? simulation.final_grade - lastScore : null;

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ══════════════════════════════════════════════════════
            SECTION 1 — Score Card
            ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative border border-gray-200 rounded-2xl p-6 md:p-8 bg-white shadow-sm"
        >
          {/* Latexo Branding — top right */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <NextImage
              src="/images/favicon.jpeg"
              alt="Latexo"
              width={22}
              height={22}
              className="rounded-full"
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Latexo
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Profile Picture */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full ring-1 ring-gray-200 shadow-sm bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-gray-400">
                  {profile?.full_name?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>

            {/* Score Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-600 truncate">
                {profile?.full_name || "Student"}
              </p>

              <div className="flex items-baseline gap-2 mt-1">
                <motion.span className="text-6xl md:text-8xl font-serif font-semibold leading-none tracking-tight text-gray-900">
                  {displayScore}
                </motion.span>
                <span className="text-2xl md:text-4xl text-gray-400 font-medium font-serif">/20</span>
              </div>

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {/* Mention Badge */}
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    isPassing
                      ? "bg-gray-900 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {mention}
                </span>

                {/* Last Score Comparison */}
                {scoreDelta !== null && (
                  <span className="text-xs text-gray-500 font-mono">
                    Last: {lastScore?.toFixed(1)}{" "}
                    <span
                      className={
                        scoreDelta > 0
                          ? "text-green-600"
                          : scoreDelta < 0
                          ? "text-red-500"
                          : "text-gray-400"
                      }
                    >
                      ({scoreDelta > 0 ? "+" : ""}
                      {scoreDelta.toFixed(1)})
                    </span>
                  </span>
                )}
                {scoreDelta === null && (
                  <span className="text-[11px] text-gray-400 font-mono">
                    First session
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════
            SECTION 2 — Proficiency Bars
            ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-gray-200 rounded-2xl p-6 md:p-8 bg-white shadow-sm"
        >
          <h3 className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-[0.2em]">
            Performance Axes
          </h3>
          <div className="space-y-6">
            {[
              { label: "Technical", value: proficiency.tech, Icon: Code2 },
              { label: "Academic", value: proficiency.acad, Icon: GraduationCap },
              { label: "Market", value: proficiency.biz, Icon: Briefcase },
            ].map((axis) => (
              <div key={axis.label} className="group cursor-default">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2.5">
                    <axis.Icon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      {axis.label}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-bold text-gray-900">{axis.value}%</span>
                </div>
                {/* Brutalist Progress Bar */}
                <div className="w-full h-3 bg-gray-100 border border-gray-200 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${axis.value}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gray-900 transition-all border-r border-gray-900"
                  />
                  {/* Tick marks for scale */}
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {[25, 50, 75].map((mark) => (
                      <div 
                        key={mark} 
                        className="absolute top-0 h-full w-px bg-gray-400/30" 
                        style={{ left: `${mark}%` }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>


        {/* ══════════════════════════════════════════════════════
            SECTION 3 — Jury Feedback & Tips
            ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden"
        >
          <h3 className="text-lg font-serif font-semibold text-gray-900 p-6 pb-0">
            Jury Feedback
          </h3>

          <div className="divide-y divide-gray-200">
            {JURY_MEMBERS.map((member, index) => {
              const fb = simulation.feedback?.[member.key];
              const comment =
                fb?.comment ||
                simulation.jury_feedback?.[member.legacyKey] ||
                "No feedback available.";
              const tip = fb?.tip || "Keep practicing.";

              return (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="p-6 flex gap-4"
                >
                  {/* Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full ${member.bgColor} ring-1 ring-gray-200 shadow-sm shrink-0 overflow-hidden flex items-center justify-center`}
                  >
                    <img
                      src={member.imagePath}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-lg font-bold">${member.name[0]}</span>`;
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{member.name}</span>
                      <span className="text-xs text-gray-500">
                        {member.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      "{comment}"
                    </p>
                    <div className="bg-gray-50/50 rounded-lg border border-gray-100 p-3">
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                        Tip
                      </span>
                      <p className="text-xs text-gray-600">{tip}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════
            SECTION 4 — Share Receipt
            ══════════════════════════════════════════════════════ */}
        <motion.div
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.55 }}
        >
          <button
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest text-sm transition-all hover:bg-black focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed group shadow-sm"
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            )}
            {isDownloading ? "GENERATING RECEIPT..." : "DOWNLOAD FLEX RECEIPT"}
          </button>
        </motion.div>

        {/* ══════════════════════════════════════════════════════
            SECTION 5 — Compact CTA to Re-run Simulation
            ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="border border-gray-200 rounded-xl p-4 bg-gray-900 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Ready for another round?</span>
          </div>
          <Link
            href="/dashboard?tab=defense"
            className="group inline-flex items-center gap-1.5 bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-xs transition-all hover:bg-gray-100 hover:scale-[1.02] active:scale-95"
          >
            Retry
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
