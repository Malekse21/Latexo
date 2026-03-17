"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DashboardTabsProps {
  activeTab: 'briefing' | 'defense' | 'aftermath' | null;
  onTabChange: (tab: 'briefing' | 'defense' | 'aftermath') => void;
  t: (key: string) => string;
}

export function DashboardTabs({ activeTab, onTabChange, t }: DashboardTabsProps) {
  const tabs = [
    { id: 'briefing', label: t('dashboard.tabs.briefing') },
    { id: 'defense', label: t('dashboard.tabs.defense') },
    { id: 'aftermath', label: t('dashboard.tabs.aftermath') },
  ];

  return (
    <div className="w-full flex justify-center border-b border-gray-200 bg-white">
      <div className="flex items-center gap-6 md:gap-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id || (tab.id === 'briefing' && activeTab === null);
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as 'briefing' | 'defense' | 'aftermath')}
              className={cn(
                "relative pb-3 px-2 text-[10px] md:text-sm uppercase tracking-widest transition-colors whitespace-nowrap",
                isActive 
                  ? "font-bold text-black" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
