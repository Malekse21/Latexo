"use client";

import { motion } from "framer-motion";

interface VoiceWaveformProps {
  isActive: boolean;
  barCount?: number;
}

export function VoiceWaveform({ isActive, barCount = 7 }: VoiceWaveformProps) {
  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: ["20%", "100%", "20%"],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
          className="w-1 bg-black rounded-full"
        />
      ))}
    </div>
  );
}
