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
          MASTER YOUR<br/>PFE SOUTENANCE.
        </motion.h1>

        {/* Subhighway */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg md:text-xl text-neutral-600 text-center max-w-2xl font-medium tracking-tight mb-10"
        >
          The first AI-powered training ground for Tunisian students. Upload
          your report once, face the jury, and secure your 'Très Bien'.
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
      </div>
    </section>
  );
}
