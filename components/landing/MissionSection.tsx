"use client";

import { motion } from "framer-motion";
import { Search, Mic, Award, ArrowRight } from "lucide-react";

const STEPS = [
  {
    id: "01",
    title: "The Briefing",
    description: "AI scouts your report. We identify your tech stack and predict exactly where the jury will attack your methodology.",
    icon: Search,
    rotation: "rotate-2",
  },
  {
    id: "02",
    title: "The Arena",
    description: "Interactive voice-to-voice simulation. Face three distinct jury personas (Technical, Strict, Business) who have read your specific report.",
    icon: Mic,
    rotation: "-rotate-1",
  },
  {
    id: "03",
    title: "The Aftermath",
    description: "Get your final grade, performance radar, and a B&W 'Survivor Card' to prove your readiness on LinkedIn and Instagram.",
    icon: Award,
    rotation: "rotate-3",
  },
];

export default function MissionSection() {
  return (
    <section id="mission" className="w-full py-24 bg-neutral-50 border-t border-black">
      <div className="container mx-auto px-4">
        
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
                Your Path to<br/>Excellence
            </h2>
            <p className="text-neutral-600 font-medium">
                A military-grade training protocol designed for academic survival.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-[100px] left-10 right-10 h-[2px] bg-black/10 border-t border-dashed border-black z-0 pointer-events-none" />

            {STEPS.map((step, index) => (
                <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2, duration: 0.6 }}
                    className={`relative z-10 flex flex-col group ${step.rotation} hover:rotate-0 transition-transform duration-300`}
                >
                    {/* Card */}
                    <div className="bg-white border-[3px] border-black p-8 min-h-[320px] shadow-[8px_8px_0px_#000000] group-hover:shadow-[12px_12px_0px_#000000] group-hover:-translate-y-1 transition-all">
                        {/* Icon Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                                <step.icon className="w-6 h-6" />
                            </div>
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-neutral-400 to-white opacity-40 font-mono">
                                {step.id}
                            </span>
                        </div>

                        {/* Content */}
                        <h3 className="text-2xl font-bold mb-4 uppercase tracking-tight">{step.title}</h3>
                        <p className="text-sm font-medium text-neutral-600 leading-relaxed">
                            {step.description}
                        </p>

                        {/* Fake functional UI element */}
                        <div className="mt-8 pt-4 border-t-2 border-neutral-100 flex items-center text-xs font-bold uppercase tracking-widest text-black">
                             <span>Initialize</span> <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>

      </div>
    </section>
  );
}
