"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function PricingSection() {
  return (
    <section id="pricing" className="w-full py-24 bg-white text-black border-t border-black">
      <div className="container mx-auto px-4">
        
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-black uppercase tracking-tighter">Load Your Arsenal</h2>
          <p className="text-lg text-neutral-600 font-medium">Simple credit packs. No subscriptions. Pay as you go.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          
          {/* Pack 1 */}
          <PricingCard 
             title="Starter Pack"
             credits="150"
             price="15 TND"
             description="Perfect for a quick dry run."
             features={["1 Full Simulation", "Basic Report Analysis", "Standard Jury Persona"]}
          />

          {/* Pack 2 - Featured */}
          <PricingCard 
             title="Pro Survival"
             credits="350"
             price="30 TND"
             description="The complete training protocol."
             features={["3 Full Simulations", "Deep Methodology Audit", "All 3 Jury Personas", "Recording & Transcript"]}
             highlight
          />

           {/* Referral Pack */}
           <div className="border-[3px] border-black p-8 bg-neutral-100 flex flex-col justify-between shadow-[8px_8px_0px_#000000] relative overflow-hidden">
             {/* Diagonal Banner */}
             <div className="absolute top-6 -right-8 bg-black text-white text-[10px] uppercase font-bold px-8 py-1 rotate-45 w-40 text-center">
                Free
             </div>

             <div className="space-y-4">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Referral Protocol</h3>
                 <div className="text-5xl font-black tracking-tighter">
                    +10 <span className="text-lg font-bold">Credits</span>
                 </div>
                 <p className="text-sm font-medium text-neutral-600 leading-relaxed">
                    Recruit a fellow student to the platform.
                 </p>
                 <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-sm font-medium">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>They get 10 credits</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm font-medium">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>You get 10 credits</span>
                    </li>
                 </ul>
             </div>
             
             <div className="mt-8">
                 <Button className="w-full bg-white text-black border-2 border-black hover:bg-neutral-50 rounded-none h-12 font-bold uppercase tracking-wide">
                    Get Referral Link
                 </Button>
             </div>
           </div>

        </div>

      </div>
    </section>
  );
}

function PricingCard({ title, credits, price, features, description, highlight = false }: { title: string, credits: string, price: string, features: string[], description: string, highlight?: boolean }) {
    return (
        <div className={`border-[3px] border-black p-8 flex flex-col justify-between shadow-[8px_8px_0px_#000000] relative ${highlight ? 'bg-black text-white' : 'bg-white text-black'}`}>
            <div className="space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tight">{title}</h3>
                <div className="text-5xl font-black tracking-tighter">
                   {credits} <span className="text-lg font-bold">Credits</span>
                </div>
                <div className={`text-xl font-bold font-mono ${highlight ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {price}
                </div>
                <p className={`text-sm font-medium leading-relaxed ${highlight ? 'text-neutral-400' : 'text-neutral-600'}`}>
                   {description}
                </p>

                <ul className="space-y-3 mt-8">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm font-medium">
                            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${highlight ? 'text-white' : 'text-black'}`} />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-8">
                <Button className={`w-full h-12 font-bold uppercase tracking-wide rounded-none border-2 border-black transition-transform active:translate-y-1 ${highlight ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>
                    Choose Pack
                </Button>
            </div>
        </div>
    )
}
