"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function HeroV2() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center bg-white text-black overflow-hidden pt-20 pb-12">
      <div className="container mx-auto px-4 flex flex-col items-center z-10">
        
        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-center leading-[0.9] text-black mb-6"
        >
          MASTER YOUR<br/>PFE DEFENSE.
        </motion.h1>

        {/* Subhighway */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg md:text-xl text-neutral-600 text-center max-w-2xl font-medium tracking-tight mb-10"
        >
          The first AI-powered training ground for Tunisian students. Upload
          your report once, face the hostile jury, and secure your 'Très Bien'.
        </motion.p>

        {/* CTA */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button 
            size="lg" 
            className="bg-black text-white hover:bg-neutral-800 text-lg px-8 py-6 h-auto rounded-none shadow-[4px_4px_0px_#000000] border border-black transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Enter the Arena <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>

        {/* Visual Artifact (3D Tilted Mockup) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 10 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 relative w-full max-w-4xl perspective-[2000px]"
        >
             {/* The Artifact Container */}
            <div 
              className="relative aspect-[16/10] bg-neutral-100 border-[3px] border-black rounded-lg shadow-[8px_8px_0px_#000000] overflow-hidden transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out"
              style={{ transformStyle: 'preserve-3d', transform: 'rotateX(10deg)' }}
            >
                {/* Mockup Internal Content */}
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 border-b border-black">
                     {/* Placeholder for PFE Cover Preview - Replacing with a schematic look */}
                     <div className="w-full h-full border-2 border-dashed border-neutral-300 rounded flex flex-col items-center justify-center bg-neutral-50 p-6 space-y-4">
                        <div className="w-24 h-24 bg-neutral-200 rounded-full mb-4 animate-pulse"></div>
                        <div className="h-4 bg-neutral-200 w-3/4 rounded animate-pulse"></div>
                        <div className="h-4 bg-neutral-200 w-1/2 rounded animate-pulse"></div>
                        <div className="h-32 bg-neutral-100 w-full rounded mt-8 border border-neutral-200"></div>
                     </div>
                </div>
                
                {/* Overlay Text/UI to make it look like the app */}
                 <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-black"></div>
                        <div className="w-3 h-3 rounded-full border border-black"></div>
                        <div className="w-3 h-3 rounded-full border border-black"></div>
                    </div>
                    <div className="bg-black text-white text-[10px] px-2 py-1 uppercase tracking-widest font-bold">
                        Simulation Active
                    </div>
                </div>
            </div>
            
            {/* Ambient Back Glow - Subtle */}
            <div className="absolute -inset-4 bg-black/5 blur-3xl -z-10 rounded-[50%]" />
        </motion.div>

      </div>
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none -z-10" />
    </section>
  );
}
