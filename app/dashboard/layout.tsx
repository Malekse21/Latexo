"use client";

import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
// import { useUser } from "@/lib/context/user-context"; // Keep if needed for other things, but removing sidebar usage
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return (
    <div className="min-h-screen bg-white">
      <DashboardNavbar />
      {/* Main Content Area */}
      <main 
        className="pt-16 min-h-screen bg-white transition-all duration-300 ease-in-out"
      >
        <div className="px-4 md:px-8 pt-2 pb-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
