"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useUser } from "@/lib/context/user-context";

export interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const { t } = useUser();

  const tabs = [
    { id: 'briefing', label: t('dashboard.tabs.briefing') },
    { id: 'defense', label: t('dashboard.tabs.defense') },
    { id: 'aftermath', label: t('dashboard.tabs.aftermath') },
  ];

  return (
    <div className="w-full flex justify-center border-b border-gray-200 bg-white">
      <div className="flex items-center gap-6 md:gap-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative pb-3 px-2 text-[10px] md:text-sm uppercase tracking-widest transition-colors whitespace-nowrap cursor-pointer",
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
