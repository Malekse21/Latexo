"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative w-full max-w-5xl mx-auto pt-24 pb-32 px-4 flex flex-col items-center text-center">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6"
      >
        Your PFE, Perfected.
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed font-light"
      >
        Academic compliance, Plagiarism/AI detection, and an interactive Jury Simulation—all from your PDF.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Link href="/signup">
          <Button className="h-14 px-10 text-lg bg-black text-white hover:bg-gray-800 rounded-none transform transition-all active:scale-95 shadow-xl">
            Start Perfecting Your PFE
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}
