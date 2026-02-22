"use client";

import { cn } from "@/lib/utils";

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
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as 'briefing' | 'defense' | 'aftermath')}
              className={cn(
                "pb-3 px-2 text-[10px] md:text-sm uppercase tracking-widest transition-all whitespace-nowrap",
                isActive 
                  ? "border-b-2 border-black font-bold text-black" 
                  : "border-b border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
