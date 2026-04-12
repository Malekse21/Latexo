"use client";

import { motion } from "framer-motion";
import { Mic, Trophy, Flame, Award } from "lucide-react";
import Image from "next/image";

const JURY = [
  { name: "Malek", title: "Technical Expert", image: "/jury/technical-expert.png", quote: "Your methodology lacks clarity." },
  { name: "Souad", title: "Strict Academic", image: "/jury/strict-academic.png", quote: "Cite your sources properly." },
  { name: "Amir", title: "Business Strategist", image: "/jury/business-strategist.png", quote: "What's the market value?" },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } 
  },
};

export default function FeaturesGridSection() {
  return (
    <section id="features" className="w-full py-24 bg-white text-black border-t border-black">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
            Everything You Need<br/>to Succeed
          </h2>
          <p className="text-neutral-600 font-medium">
            Built for students who want to ace their PFE.
          </p>
        </div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto auto-rows-[minmax(200px,auto)]"
        >
          {/* ─── Card 1: AI Defense Simulation (Large — spans 2 rows) ─── */}
          <motion.div
            variants={cardVariants}
            className="md:row-span-2 border-[3px] border-black p-6 shadow-[6px_6px_0px_#000000] bg-white flex flex-col justify-between group hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000000] transition-all duration-300"
          >
            <div>
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center mb-4">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">
                AI Soutenance Simulation
              </h3>
              <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                Face three AI jury personas in a real-time voice-to-voice simulation. They&apos;ve read your report — and they&apos;re not going easy.
              </p>
            </div>

            {/* Mini Visual: The 3 Jury Members + chat */}
            <div className="mt-6 space-y-4">
              {/* Jury Avatars Row */}
              <div className="flex items-center justify-center gap-3 py-3">
                {JURY.map((j, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden bg-neutral-100 shadow-[3px_3px_0px_#000000]">
                      <Image src={j.image} alt={j.name} width={48} height={48} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider">{j.name}</span>
                    <span className="text-[7px] text-neutral-400 font-mono uppercase tracking-wider leading-none">{j.title}</span>
                  </div>
                ))}
              </div>

              {/* Chat bubbles from each jury */}
              <div className="space-y-2.5">
                {JURY.map((j, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full border border-black overflow-hidden shrink-0 bg-neutral-100">
                      <Image src={j.image} alt={j.name} width={24} height={24} className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-neutral-100 border border-neutral-200 px-2.5 py-1.5 flex-1">
                      <p className="text-[10px] text-neutral-700 font-medium">{j.quote}</p>
                    </div>
                  </div>
                ))}
                {/* Student reply */}
                <div className="flex items-start gap-2 justify-end">
                  <div className="bg-black text-white px-2.5 py-1.5">
                    <p className="text-[10px] font-medium">I chose this approach because...</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 border border-black">
                    <span className="text-[9px] font-black text-neutral-600">Y</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Card 2: Leaderboard ─── */}
          <motion.div
            variants={cardVariants}
            className="border-[3px] border-black p-6 shadow-[6px_6px_0px_#000000] bg-white flex flex-col justify-between group hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000000] transition-all duration-300"
          >
            <div>
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center mb-4">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">
                Leaderboard
              </h3>
              <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                Compete with students across universities. Filter by school or specialty.
              </p>
            </div>

            {/* Mini Visual: Fake leaderboard rows */}
            <div className="mt-5 space-y-0 border border-neutral-200 bg-neutral-50 divide-y divide-neutral-200">
              {[
                { rank: "🥇", name: "", score: "18.5", highlight: true },
                { rank: "🥈", name: "Sandra A.", score: "17.2", highlight: false },
                { rank: "🥉", name: "Malek S.", score: "16.8", highlight: false },
              ].map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 ${entry.highlight ? "bg-black text-white" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{entry.rank}</span>
                    <span className={`text-xs font-bold ${entry.highlight ? "text-white" : "text-neutral-800"}`}>
                      {entry.name}
                    </span>
                    {entry.highlight && (
                      <span className="text-[8px] bg-white text-black px-1 py-0.5 font-mono uppercase tracking-widest font-bold">
                        You
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-black font-mono ${entry.highlight ? "text-white" : "text-black"}`}>
                    {entry.score}<span className={`text-[9px] ${entry.highlight ? "text-neutral-400" : "text-neutral-400"}`}>/20</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─── Card 3: Streaks ─── */}
          <motion.div
            variants={cardVariants}
            className="border-[3px] border-black p-6 shadow-[6px_6px_0px_#000000] bg-black text-white flex flex-col justify-between group hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000000] transition-all duration-300"
          >
            <div>
              <div className="w-10 h-10 bg-white text-black flex items-center justify-center mb-4">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">
                Daily Streaks
              </h3>
              <p className="text-sm text-neutral-400 font-medium leading-relaxed">
                Build consistency. Maintain your streak and watch your readiness climb.
              </p>
            </div>

            {/* Mini Visual: Streak counter + day dots */}
            <div className="mt-5">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black font-mono tracking-tighter">7</span>
                <span className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Day Streak</span>
              </div>
              <div className="flex gap-2">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] transition-colors ${
                        i < 7
                          ? "border-white bg-white text-black font-black"
                          : "border-neutral-600 text-neutral-600"
                      }`}
                    >
                      {i < 7 ? "✓" : ""}
                    </div>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">
                      {day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ─── Card 4: Survivor Card ─── */}
          <motion.div
            variants={cardVariants}
            className="md:col-span-2 border-[3px] border-black p-6 shadow-[6px_6px_0px_#000000] bg-white flex flex-col md:flex-row gap-6 items-center group hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000000] transition-all duration-300"
          >
            {/* Text */}
            <div className="flex-1">
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">
                Survivor Card
              </h3>
              <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                Earn your grade, get a shareable card for LinkedIn and Instagram. Prove you survived the arena.
              </p>
            </div>

            {/* Mini Visual: Fake survivor card */}
            <div className="shrink-0 w-[200px] border-[3px] border-black p-4 bg-neutral-50 shadow-[4px_4px_0px_#000000] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] font-mono">Latexo</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 font-mono">2026</span>
              </div>
              <div className="border-t border-black pt-3 text-center">
                <div className="w-10 h-10 rounded-full bg-neutral-200 mx-auto mb-2 border border-black" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Ahmed T.</p>
                <p className="text-[8px] text-neutral-400 font-mono uppercase">INSAT • GL</p>
              </div>
              <div className="border-t border-dashed border-neutral-300 pt-2 text-center">
                <span className="text-2xl font-black tracking-tighter">17.5</span>
                <span className="text-[10px] font-bold text-neutral-400">/20</span>
                <div className="mt-1">
                  <span className="text-[8px] bg-black text-white px-2 py-0.5 uppercase font-bold tracking-widest">
                    Très Bien
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
