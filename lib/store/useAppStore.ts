import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Report {
  id: string;
  title: string;
  created_at: string;
  // Add other report fields as needed
}

interface AppState {
  // Report State
  selectedReportId: string | null;
  selectedReport: Report | null;
  setSelectedReport: (report: Report | null) => void;

  // Credits State (Synced with UserContext/DB generally, but good for local checks)
  credits: number;
  setCredits: (credits: number) => void;
  
  // UI State
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Report State
      selectedReportId: null,
      selectedReport: null,
      setSelectedReport: (report) => 
        set({ 
          selectedReport: report, 
          selectedReportId: report?.id ?? null 
        }),

      // Credits State
      credits: 0,
      setCredits: (credits) => set({ credits }),

      // UI State
      isSidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: 'latexo-app-storage', // unique name
      partialize: (state) => ({ 
        isSidebarCollapsed: state.isSidebarCollapsed,
        // We might choose NOT to persist selectedReport if we want fresh state on reload, 
        // but user asked for hydration/persistence. Persisting UI state is safe.
        // Credits should be fresh from DB usually.
      }),
    }
  )
);
