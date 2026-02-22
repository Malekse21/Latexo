"use client";

import { motion } from "framer-motion";

interface StressMeterProps {
  level: number; // 0-100
}

export function StressMeter({ level }: StressMeterProps) {
  const shouldPulse = level > 80;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-widest text-gray-600">Stress</span>
      <div className="w-32 md:w-48 h-2 border border-black bg-white relative overflow-hidden">
        <motion.div
          animate={{
            width: `${level}%`,
            scale: shouldPulse ? [1, 1.02, 1] : 1,
          }}
          transition={{
            width: { duration: 0.3, ease: "easeOut" },
            scale: shouldPulse
              ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
              : {},
          }}
          className="h-full bg-black"
        />
      </div>
      <span className="text-xs font-mono font-bold">{level}%</span>
    </div>
  );
}
