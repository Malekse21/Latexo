"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface TalkingAvatarProps {
  name: string;
  imagePath: string;
  bgColor: string;
  isSpeaking: boolean;
  isInactive?: boolean;
  isThinking?: boolean;
  size?: "small" | "medium" | "large";
}

export function TalkingAvatar({
  name,
  imagePath,
  bgColor,
  isSpeaking,
  isInactive = false,
  isThinking = false,
  size = "medium",
}: TalkingAvatarProps) {
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32",
  };

  const nameSizeClasses = {
    small: "text-2xl",
    medium: "text-4xl",
    large: "text-5xl",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar Circle with Animations */}
      <motion.div
        animate={
          isSpeaking
            ? {
                scale: [1, 1.02, 1],
                y: [-2, 2, -2],
              }
            : {
                scale: 1,
                y: 0,
              }
        }
        transition={
          isSpeaking
            ? {
                duration: 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {
                type: "spring",
                stiffness: 200,
                damping: 20,
              }
        }
        className={`${sizeClasses[size]} rounded-full ${bgColor} border-4 border-black shadow-lg flex items-center justify-center overflow-hidden relative transition-all duration-500 ${
          isInactive ? "opacity-40 grayscale-[50%]" : ""
        } ${isSpeaking ? "ring-4 ring-offset-2 ring-black" : ""}`}
      >
        {/* Avatar Image */}
        <Image
          src={imagePath}
          alt={name}
          width={200}
          height={200}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initial letter if image fails to load
            e.currentTarget.style.display = "none";
            const parent = e.currentTarget.parentElement;
            if (parent && !parent.querySelector(".fallback-initial")) {
              const span = document.createElement("span");
              span.className = `fallback-initial ${nameSizeClasses[size]} font-bold text-black`;
              span.textContent = name[0];
              parent.appendChild(span);
            }
          }}
        />

        {/* Vocal Waveform Overlay (appears when speaking) */}
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{
                  height: ["4px", "12px", "4px"],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
                className="w-1 bg-black rounded-full"
              />
            ))}
          </motion.div>
        )}

        {/* Thinking Indicator (appears when AI is processing) */}
        {isThinking && !isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1 bg-white/80 px-2 py-1 rounded-full border border-black shadow-sm"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
                className="w-1.5 h-1.5 bg-black rounded-full"
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Name Label */}
      <span className="text-xs uppercase tracking-widest text-gray-600 font-semibold">
        {name}
      </span>
    </div>
  );
}
