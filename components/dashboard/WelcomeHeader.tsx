"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Sparkles } from "lucide-react";
import { useUser } from "@/lib/context/user-context";

interface WelcomeHeaderProps {
  userName?: string;
  defenseDate?: string; // ISO date string
}

const MOTIVATIONAL_QUOTES = [
  "The expert in anything was once a beginner.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Believe you can and you're halfway there.",
  "The only way to do great work is to love what you do.",
  "Your limitation—it's only your imagination.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
];

export function WelcomeHeader({ userName, defenseDate }: WelcomeHeaderProps) {
  const { t } = useUser();
  const [greetingKey, setGreetingKey] = useState("");
  const [quote, setQuote] = useState("");
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreetingKey("welcome.greeting_morning");
    } else if (hour >= 12 && hour < 18) {
      setGreetingKey("welcome.greeting_afternoon");
    } else if (hour >= 18 && hour < 22) {
      setGreetingKey("welcome.greeting_evening");
    } else {
      setGreetingKey("welcome.greeting_night");
    }

    // Set random quote
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  useEffect(() => {
    if (!defenseDate) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const defense = new Date(defenseDate).getTime();
      const difference = defense - now;

      if (difference < 0) {
        setTimeLeft(t('welcome.defense_passed'));
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      
      if (days >= 1) {
        setTimeLeft(`${days} ${t('welcome.days')}`);
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        setTimeLeft(`${hours} ${t('welcome.hours')}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [defenseDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 mb-4"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {t(greetingKey)}{userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-gray-500 italic text-sm md:text-base">"{quote}"</p>
          </div>

          {defenseDate && timeLeft && (
            <div className="flex flex-col items-end">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-semibold mb-1">{t('welcome.defense_in')}</p>
              <div className="flex items-center gap-2 text-black">
                <Calendar className="w-4 h-4" />
                <span className="text-xl font-black tracking-tighter italic">{timeLeft}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
