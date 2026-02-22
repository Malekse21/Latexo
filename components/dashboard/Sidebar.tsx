"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardCheck, ScanSearch, Mic2, FileText, ChevronLeft, ChevronRight, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";

const NAV_ITEMS = [
  { label: "Reports", href: "/dashboard", icon: LayoutDashboard },
  { label: "Structure Audit", href: "/dashboard/structure", icon: ClipboardCheck },
  { label: "Plagiarism Scan", href: "/dashboard/plagiarism", icon: ScanSearch },
  { label: "simulation", href: "/dashboard/simulation", icon: Mic2, labelDisplay: "Soutenance Simulation" },
  { label: "Text Extractor", href: "/dashboard/text-extractor", icon: FileType },
];

interface ActiveReport {
  name: string;
  hasProject: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile, isSidebarCollapsed, toggleSidebar, t } = useUser();
  const [activeReport, setActiveReport] = useState<ActiveReport>({ name: "", hasProject: false });
  
  useEffect(() => {
    if (profile?.active_report_id) {
      fetchActiveReportTitle(profile.active_report_id);
    } else {
      setActiveReport({ name: "", hasProject: false });
    }
  }, [profile?.active_report_id]);

  const fetchActiveReportTitle = async (id: string) => {
    try {
      const supabase = createClient();
      const { data: report } = await supabase
        .from('reports')
        .select('title')
        .eq('id', id)
        .single();

      if (report) {
        setActiveReport({ name: report.title, hasProject: true });
      }
    } catch (error) {
      console.error('Error fetching active report title:', error);
    }
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-64px)] border-r border-[#E5E5E5] bg-white flex flex-col z-40 transition-all duration-300 ease-in-out group",
        isSidebarCollapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Collapse Toggle Button - ChatGPT Style */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3 top-4 w-6 h-6 rounded-full border border-[#E5E5E5] bg-white shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all z-50",
          "opacity-0 group-hover:opacity-100"
        )}
        title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
      
      {/* Top Part: Active PDF Context */}
      <div className={cn("p-4 border-b border-[#E5E5E5] border-dashed overflow-hidden", isSidebarCollapsed && "p-3")}>
        <div className={cn("bg-gray-50 border border-[#E5E5E5] p-3 rounded-sm flex items-start gap-3 transition-all", isSidebarCollapsed && "p-2 gap-0 justify-center")}>
          <div className="mt-0.5 min-w-[24px]">
             <FileText className={cn("w-6 h-6", activeReport.hasProject ? "text-black" : "text-gray-300")} strokeWidth={1.5} />
          </div>
          <AnimatePresence>
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className={cn("text-xs font-bold truncate", activeReport.hasProject ? "text-black" : "text-gray-400")}>
                  {activeReport.hasProject ? activeReport.name : t('sidebar.no_project')}
                </p>
                {activeReport.hasProject && (
                  <p className="text-[10px] text-gray-500 mt-0.5">Last edited 2m ago</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 p-2 space-y-1 overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="relative block"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-tab"
                  className="absolute inset-0 bg-black rounded-[4px]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div 
                className={cn(
                  "relative z-10 flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded-[4px]",
                  isActive ? "text-white" : "text-gray-500 hover:bg-gray-50 hover:text-black",
                  isSidebarCollapsed && "justify-center px-0"
                )}
                title={isSidebarCollapsed ? (item.labelDisplay || item.label) : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                <AnimatePresence>
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="truncate whitespace-nowrap"
                    >
                      {item.label === "simulation" ? t('sidebar.simulation') : t(`sidebar.${item.label.toLowerCase().replace(' ', '_')}`)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* Footer / Extra Info could go here */}
    </aside>
  );
}
