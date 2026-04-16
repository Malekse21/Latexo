import { Navbar } from "@/components/landing/Navbar";
import HeroV2 from "@/components/landing/HeroV2";
import MissionSection from "@/components/landing/MissionSection";
import FeaturesGridSection from "@/components/landing/FeaturesGridSection";
import PricingSection from "@/components/landing/PricingSection";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      <Navbar />
      
      <div className="flex flex-col gap-0">
        <HeroV2 />
        <MissionSection />
        <FeaturesGridSection />
        <PricingSection />
      </div>

      {/* ─── Professional Footer ─── */}
      <footer className="w-full border-t border-black bg-black text-white">
        <div className="container mx-auto px-4">
          
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-16">
            
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <Image 
                    src="/images/logo.png" 
                    alt="Latexo" 
                    fill 
                    className="object-contain brightness-0 invert" 
                  />
                </div>
                <span className="text-xl font-black tracking-tight uppercase">Latexo</span>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
                The first AI-powered soutenance simulation platform built for Tunisian university students.
              </p>
            </div>

            {/* Column 2: Navigation */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Navigation</h4>
              <nav className="flex flex-col gap-2.5">
                <Link href="#mission" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium">
                  How It Works
                </Link>
                <Link href="#pricing" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium">
                  Pricing
                </Link>
                <Link href="/login" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium">
                  Sign In
                </Link>
                <Link href="/signup" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium">
                  Get Started
                </Link>
              </nav>
            </div>

            {/* Column 3: Contact / CTA */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Get in Touch</h4>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Questions? Feedback? We&apos;d love to hear from you.
              </p>
              <a 
                href="mailto:latexo.students@gmail.com" 
                className="inline-block text-sm font-bold text-white border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors uppercase tracking-widest"
              >
                latexo.students@gmail.com
              </a>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-neutral-800 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-500 font-mono tracking-wider">
              © 2026 Latexo. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-xs text-neutral-600 font-mono tracking-wider">
                Made in Tunisia 🇹🇳
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
