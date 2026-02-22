"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// Mock Data for Survivors
const SURVIVORS = [
  { name: "Ahmed B.", uni: "INSAT", score: "17/20", review: "Technical Jury was brutal but accurate." },
  { name: "Sarra K.", uni: "ESPRIT", score: "18.5/20", review: "The questions were exactly what I got." },
  { name: "Youssef M.", uni: "ENIT", score: "16/20", review: "Saved my methodology section." },
  { name: "Myriam H.", uni: "TBS", score: "19/20", review: "Worth every dinar." },
  { name: "Karim L.", uni: "IHEC", score: "17.5/20", review: "I wasn't ready until I used this." },
  { name: "Nour E.", uni: "ISG", score: "18/20", review: "Felt like a real defense." },
];

export default function SurvivorWallSection() {
  return (
    <section className="w-full py-20 bg-black text-white overflow-hidden border-t border-white">
      <div className="container mx-auto px-4 mb-12 text-center">
        <h2 className="text-3xl font-black uppercase tracking-widest mb-2 text-white">
          Survivor Wall
        </h2>
        <p className="text-neutral-400 text-sm font-mono uppercase">
          Join 1,000+ students from Tunisia's top universities
        </p>
      </div>

      {/* Infinite Scroll Marquee */}
      <div className="relative w-full overflow-hidden">
        {/* Gradients to fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10" />

        <div className="flex w-max animate-infinite-scroll hover:pause-animation">
          {/* Double the list for seamless loop */}
          {[...SURVIVORS, ...SURVIVORS, ...SURVIVORS].map((survivor, i) => (
            <SurvivorCard key={`${survivor.name}-${i}`} survivor={survivor} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SurvivorCard({ survivor }: { survivor: { name: string, uni: string, score: string, review: string } }) {
  return (
    <div className="w-[300px] h-48 bg-neutral-900 border border-neutral-800 mx-4 p-6 flex flex-col justify-between shrink-0 hover:bg-neutral-800 transition-colors cursor-default group relative overflow-hidden">
        {/* Stamp */}
        <div className="absolute top-2 right-2 border-2 border-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white/40 group-hover:text-white/80 group-hover:border-white transition-all -rotate-12">
            Defense Ready
        </div>

        <div>
            <div className="flex items-center gap-3 mb-4">
                 {/* B&W Avatar Placeholder */}
                <div className="w-10 h-10 bg-neutral-800 rounded-full overflow-hidden grayscale">
                   <img 
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${survivor.name}`}
                      alt={survivor.name}
                      className="w-full h-full object-cover opacity-80"
                   />
                </div>
                <div>
                    <h4 className="font-bold text-sm text-white leading-none">{survivor.name}</h4>
                    <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">{survivor.uni}</span>
                </div>
            </div>
            
            <p className="text-neutral-400 text-sm italic line-clamp-2">
                "{survivor.review}"
            </p>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex justify-between items-center">
             <span className="text-[10px] uppercase text-neutral-600 font-bold">Predicted Score</span>
             <span className="text-lg font-black text-white">{survivor.score}</span>
        </div>
    </div>
  )
}
