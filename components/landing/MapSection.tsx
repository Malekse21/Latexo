"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const CITIES = [
  { name: "Tunis", top: "15%", left: "55%" },
  { name: "Sousse", top: "35%", left: "65%" },
  { name: "Sfax", top: "50%", left: "62%" },
  { name: "Gabes", top: "70%", left: "58%" },
  { name: "Monastir", top: "38%", left: "70%" },
];

const ACTIVITY_LOGS = [
  "12:01 - New scan from INSAT",
  "11:58 - Simulation completed in ENIS",
  "11:55 - Plagiarism detected in IHEC Report",
  "11:42 - Defense scheduled at ENIT",
  "11:30 - Abstract validated at ISG",
];

export function MapSection() {
  const [activeLogIndex, setActiveLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLogIndex((prev) => (prev + 1) % ACTIVITY_LOGS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="map" className="w-full py-24 bg-gray-50 border-y border-border overflow-hidden">
      <div className="container mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
        
        {/* Text Side (Mobile mainly, or left side) */}
        <div className="flex-1 space-y-8 z-10 w-full md:w-auto">
          <h2 className="text-4xl font-bold tracking-tight">Real-time PFE Activity</h2>
          <p className="text-muted-foreground text-lg max-w-md">
            Watch students across Tunisia perfecting their final projects in real-time.
          </p>
          
          {/* Live Ticker Box */}
          <div className="bg-white border text-sm p-4 w-full max-w-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Live Feed</span>
            </div>
            <div className="h-6 overflow-hidden relative">
               <motion.div
                 key={activeLogIndex}
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: -20, opacity: 0 }}
                 className="absolute inset-0"
               >
                 {ACTIVITY_LOGS[activeLogIndex]}
               </motion.div>
            </div>
          </div>
        </div>

        {/* Map Side */}
        <div className="flex-1 w-full h-[500px] relative perspective-1000 flex items-center justify-center">
          <motion.div 
            className="relative w-[300px] h-[500px]"
            style={{ 
              rotateX: 20, 
              rotateZ: -2,
              transformStyle: "preserve-3d" 
            }}
            initial={{ rotateX: 0, opacity: 0 }}
            whileInView={{ rotateX: 20, opacity: 1 }}
            transition={{ duration: 1 }}
          >
             {/* Map Placeholder Graphic */}
             {/* This is a simplified Tunisia shape constructed with SVG paths */}
             <svg 
               viewBox="0 0 200 400" 
               className="w-full h-full drop-shadow-2xl"
               style={{ filter: "drop-shadow(0px 20px 10px rgba(0,0,0,0.1))" }}
             >
               <path 
                 d="M80,10 C90,5 110,5 120,20 C130,40 140,50 140,80 C150,100 160,120 150,150 C145,180 155,200 150,220 C140,260 120,300 100,350 C90,380 80,390 70,380 C60,350 40,300 40,250 C30,200 40,150 50,100 C60,50 70,30 80,10 Z" 
                 fill="white" 
                 stroke="#E4E4E7" 
                 strokeWidth="2"
               />
               {/* Grid lines on map */}
               <path d="M40,100 L150,100 M40,200 L150,200 M40,300 L120,300" stroke="#F4F4F5" strokeWidth="1" />
               <path d="M100,20 L100,380" stroke="#F4F4F5" strokeWidth="1" />
             </svg>

             {/* Cities / Avatars */}
             {CITIES.map((city, i) => (
               <AvatarPin key={city.name} city={city} index={i} />
             ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}

function AvatarPin({ city, index }: { city: {name: string, top: string, left: string}, index: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ top: city.top, left: city.left }}
      initial={{ y: -20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.1 + 0.5 }}
    >
      <div className="relative group">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: index * 0.5 }}
          className="relative z-10"
        >
          {/* Avatar Placeholder */}
          <div className="w-8 h-8 rounded-full bg-black border-2 border-white overflow-hidden shadow-lg">
            <img 
               src={`https://api.dicebear.com/7.x/notionists/svg?seed=${city.name}`} 
               alt={city.name}
               className="w-full h-full bg-gray-100"
            />
          </div>
        </motion.div>
        
        {/* Pulse Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black/20 rounded-full animate-ping" />

        {/* Tooltip */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max hidden group-hover:block z-50">
           <div className="bg-black text-white text-[10px] px-2 py-1 rounded-sm shadow-xl">
             Student in {city.name} just active
           </div>
        </div>
      </div>
    </motion.div>
  )
}
