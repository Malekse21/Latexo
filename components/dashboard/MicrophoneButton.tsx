"use client";

import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";

interface MicrophoneButtonProps {
  isRecording: boolean;
  isProcessing?: boolean;
  onClick: () => void;
}

export function MicrophoneButton({
  isRecording,
  isProcessing = false,
  onClick,
}: MicrophoneButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isProcessing}
      className="relative focus:outline-none focus:ring-4 focus:ring-black/20 rounded-full"
    >
      <motion.div
        animate={
          isRecording
            ? {
                scale: [1, 1.1, 1],
              }
            : isProcessing
            ? {
                rotate: 360,
              }
            : {
                scale: [1, 1.02, 1],
              }
        }
        transition={
          isRecording
            ? {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : isProcessing
            ? {
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }
            : {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center ${
          isRecording ? "bg-red-600" : "bg-black"
        } ${isProcessing ? "opacity-70" : ""}`}
      >
        {isRecording ? (
          <Square className="w-8 h-8 md:w-10 md:h-10 text-white fill-white" />
        ) : (
          <Mic className="w-8 h-8 md:w-10 md:h-10 text-white" />
        )}
      </motion.div>

      {/* Waveform Ring (only when recording) */}
      {isRecording && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="absolute w-full h-full rounded-full border-2 border-red-600"
            />
          ))}
        </div>
      )}
    </button>
  );
}
