"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface SimulationData {
  id: string;
  final_grade: number;
  metrics: {
    technical: number;
    academic: number;
    market: number;
    fluency: number;
    stress: number;
  };
  behavioral_stats: {
    filler_count: number;
    avg_response_time: number;
    total_duration: number;
  };
  jury_feedback: {
    tech_quote: string;
    strict_quote: string;
    business_quote: string;
  };
  created_at: string;
}

interface AftermathDashboardProps {
  simulationId: string;
}

const JURY_MEMBERS = [
  {
    name: "Oliver",
    title: "Technical Expert",
    bgColor: "bg-cyan-100",
    imagePath: "/jury/technical-expert.png",
    quoteKey: "tech_quote" as const,
  },
  {
    name: "Abigail",
    title: "Strict Academic",
    bgColor: "bg-purple-100",
    imagePath: "/jury/strict-academic.png",
    quoteKey: "strict_quote" as const,
  },
  {
    name: "Jasper",
    title: "Business Strategist",
    bgColor: "bg-amber-100",
    imagePath: "/jury/business-strategist.png",
    quoteKey: "business_quote" as const,
  },
];

export function AftermathDashboard({ simulationId }: AftermathDashboardProps) {
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    async function fetchSimulation() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("simulations")
        .select("*")
        .eq("id", simulationId)
        .single();

      if (error) {
        console.error("Failed to fetch simulation:", error);
      } else {
        setSimulation(data);
      }
      setLoading(false);
    }

    fetchSimulation();
  }, [simulationId]);

  const handleDownloadCard = async () => {
    setDownloadingCard(true);
    try {
      const response = await fetch(
        `/api/survivor-card?simulation_id=${simulationId}`
      );
      if (!response.ok) throw new Error("Failed to generate card");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `latexo-survivor-${simulation?.final_grade}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download card:", error);
      alert("Failed to generate survivor card");
    } finally {
      setDownloadingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-mono uppercase tracking-widest">
            Loading Results...
          </div>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-mono uppercase tracking-widest">
            Simulation Not Found
          </div>
        </div>
      </div>
    );
  }

  const radarData = [
    { subject: "Technical", value: simulation.metrics.technical },
    { subject: "Academic", value: simulation.metrics.academic },
    { subject: "Market", value: simulation.metrics.market },
    { subject: "Fluency", value: simulation.metrics.fluency },
    { subject: "Stress", value: 100 - simulation.metrics.stress }, // Invert stress for visual consistency
  ];

  const isPassing = simulation.final_grade >= 12;

  return (
    <div className="w-full h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold font-mono uppercase tracking-wider mb-2">
            The Aftermath
          </h1>
          <p className="text-gray-600 text-sm">
            Your defense performance has been evaluated
          </p>
        </motion.div>

        {/* Verdict Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative border-4 border-black p-12 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)]"
        >
          <div className="text-center">
            <div className="text-8xl font-bold mb-4">
              {simulation.final_grade.toFixed(1)}
              <span className="text-4xl text-gray-600">/20</span>
            </div>
            <div className="text-sm uppercase tracking-widest text-gray-600 mb-2">
              Final Grade
            </div>
          </div>

          {/* Tilted Stamp */}
          <motion.div
            initial={{ opacity: 0, rotate: 0, scale: 0 }}
            animate={{ opacity: 1, rotate: 5, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className={`absolute top-8 right-8 px-6 py-3 border-4 ${
              isPassing ? "border-black" : "border-red-600"
            } font-bold text-2xl uppercase tracking-wider transform rotate-[5deg]`}
            style={{
              background: isPassing ? "black" : "#dc2626",
              color: "white",
            }}
          >
            {isPassing ? "DEFENSE READY ✓" : "REVISION NEEDED ⚠"}
          </motion.div>
        </motion.div>

        {/* Performance Radar + Behavioral Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="border-2 border-black p-6 bg-white"
          >
            <h3 className="text-xl font-bold uppercase tracking-wider mb-4 text-center">
              Performance Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#000" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#000", fontSize: 12, fontWeight: 600 }}
                />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#000"
                  strokeWidth={2}
                  fill="none"
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Behavioral Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="border-2 border-black p-6 bg-white"
          >
            <h3 className="text-xl font-bold uppercase tracking-wider mb-6 text-center">
              Behavioral Analysis
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Hesitations Detected
                </span>
                <span className="text-2xl font-bold">
                  {simulation.behavioral_stats.filler_count}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Avg Response Time
                </span>
                <span className="text-2xl font-bold">
                  {simulation.behavioral_stats.avg_response_time}s
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Total Duration
                </span>
                <span className="text-2xl font-bold">
                  {Math.floor(simulation.behavioral_stats.total_duration / 60)}:
                  {String(
                    simulation.behavioral_stats.total_duration % 60
                  ).padStart(2, "0")}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Jury Feedback Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-2xl font-bold uppercase tracking-wider mb-4 text-center">
            Jury Feedback
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {JURY_MEMBERS.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="border-2 border-black p-4 bg-white"
              >
                {/* Avatar */}
                <div className="flex flex-col items-center mb-4">
                  <div
                    className={`w-24 h-24 rounded-full ${member.bgColor} border-2 border-black flex items-center justify-center overflow-hidden mb-2`}
                  >
                    <img
                      src={member.imagePath}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-3xl font-bold">${member.name[0]}</span>`;
                      }}
                    />
                  </div>
                  <div className="font-bold text-sm uppercase tracking-wider">
                    {member.name}
                  </div>
                  <div className="text-xs text-gray-600">{member.title}</div>
                </div>

                {/* Quote */}
                <div className="bg-gray-50 border-l-4 border-black p-3 text-sm text-gray-700">
                  "{simulation.jury_feedback[member.quoteKey]}"
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Download Survivor Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center pt-8 border-t-2 border-black"
        >
          <button
            onClick={handleDownloadCard}
            disabled={downloadingCard}
            className="bg-black text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingCard
              ? "Generating..."
              : "📸 Download for Instagram"}
          </button>
          <p className="text-xs text-gray-600 mt-2">
            Share your achievement on social media
          </p>
        </motion.div>
      </div>
    </div>
  );
}
