"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";

const CITIES = [
  { name: "Tunis", top: "15%", left: "55%", count: 14 },
  { name: "Sousse", top: "35%", left: "65%", count: 8 },
  { name: "Sfax", top: "50%", left: "62%", count: 12 },
  { name: "Gabes", top: "70%", left: "58%", count: 5 },
];

const ACTIVITY_LOGS = [
  "INSAT: 14 students practicing now",
  "ESPRIT: Highest average score this week: 18.2",
  "ENIT: 45 'Hostile' simulations survived",
  "ISG: Business Jury defeated by 3 students",
  "TBS: New defense strategy unlocked",
];

export default function LiveMapSection() {
  const [activeLogIndex, setActiveLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLogIndex((prev) => (prev + 1) % ACTIVITY_LOGS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="map" className="w-full py-24 bg-white border-t border-black overflow-hidden relative">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 -z-10" />

      <div className="container mx-auto px-4 flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">University Rivalry</h2>
           <div className="inline-flex items-center gap-2 border border-black px-3 py-1 bg-white shadow-[2px_2px_0px_#000000]">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold font-mono uppercase tracking-widest">Live Network Activity</span>
           </div>
        </div>

        {/* The Abstract Radar Container */}
        <div className="relative w-full max-w-lg h-[500px] flex items-center justify-center mb-12">
            <motion.div
                className="relative w-[400px] h-[400px] flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
            >
                {/* Radar Grid Circles */}
                <div className="absolute inset-0 border border-neutral-200 rounded-full" />
                <div className="absolute inset-[20%] border border-neutral-200 rounded-full" />
                <div className="absolute inset-[40%] border border-neutral-200 rounded-full" />
                <div className="absolute inset-[49%] w-[2px] h-[2px] bg-black rounded-full" /> {/* Center Dot */}

                {/* Crosshairs */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-neutral-100" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-neutral-100" />

                {/* Scanning Radar Line */}
                <motion.div 
                    className="absolute inset-0 pointer-events-none rounded-full will-change-transform" // Added will-change-transform for performance
                    style={{ background: "conic-gradient(from 0deg, transparent 70%, rgba(0,0,0,0.1) 100%)" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />

                {/* Floating Avatars acting as "Nodes" */}
                {CITIES.map((city, i) => {
                    // Repositioning cities to fit abstract circular layout
                    // Mapping standard map positions to approximate circle positions for visual flair
                    const positions = [
                        { top: "20%", left: "50%" }, // Tunis
                        { top: "40%", left: "70%" }, // Sousse
                        { top: "60%", left: "60%" }, // Sfax
                        { top: "80%", left: "45%" }, // Gabes
                    ];
                    const pos = positions[i] || { top: "50%", left: "50%" };

                    return (
                         <div 
                            key={city.name}
                            className="absolute z-20"
                            style={{ top: pos.top, left: pos.left }}
                        >
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 + i * 0.2 }}
                                className="relative group"
                            >
                                {/* Blip Effect */}
                                <div className="absolute -inset-4 bg-black/5 rounded-full animate-ping" /> {/* Increased size and reduced opacity for less expensive render */}
                                
                                <div className="w-14 h-14 rounded-full border-[3px] border-black bg-white shadow-sm overflow-hidden relative z-10 hover:scale-125 transition-transform cursor-crosshair">
                                    <img 
                                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${city.name}`}
                                        alt={city.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Label */}
                                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold uppercase tracking-wider bg-white px-1 border border-black/10">
                                    {city.name}
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
            </motion.div>
        </div>

        {/* Live Ticker Bar (B&W) */}
        <div className="w-full max-w-3xl border-y-2 border-black bg-white py-3 overflow-hidden relative group">
           {/* Scanline effect overlay */}
           <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] z-20 opacity-10" />
           
           <AnimatePresence mode="wait">
             <motion.div
                key={activeLogIndex}
                initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.4 }}
                className="text-center font-mono text-sm md:text-base font-bold uppercase tracking-tight"
             >
                {ACTIVITY_LOGS[activeLogIndex]}
             </motion.div>
           </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
