import { Navbar } from "@/components/landing/Navbar";
import HeroV2 from "@/components/landing/HeroV2";
import LiveMapSection from "@/components/landing/LiveMapSection";
import MissionSection from "@/components/landing/MissionSection";
import SurvivorWallSection from "@/components/landing/SurvivorWallSection";
import PricingSection from "@/components/landing/PricingSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      <Navbar />
      
      <div className="flex flex-col gap-0">
        <HeroV2 />
        <LiveMapSection />
        <MissionSection />
        <SurvivorWallSection />
        <PricingSection />
      </div>

      <footer className="w-full py-12 border-t border-black bg-black text-white text-center text-sm font-mono mt-0">
        <p>© 2026 Latexo. The Arena Awaits.</p>
      </footer>
    </main>
  );
}
