"use client";

import { Button } from "@/components/ui/button";

export default function PricingSection() {
  return (
    <section id="pricing" className="w-full py-24 bg-white text-black border-t border-black">
      <div className="container mx-auto px-4">
        
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-black uppercase tracking-tighter">Choose Your Arsenal</h2>
          <p className="text-lg text-neutral-600 font-medium">Simple credit packs. No subscriptions. Pay as you go.</p>
          
          <div className="max-w-4xl mx-auto pt-8">
            <div className="flex flex-col md:flex-row items-stretch justify-center border-[3px] border-black bg-white shadow-[8px_8px_0px_#000000]">
              <div className="flex-1 flex items-center justify-center gap-3 px-6 py-4 border-b-[3px] md:border-b-0 md:border-r-[3px] border-black bg-neutral-50 hover:bg-neutral-100 transition-colors">
                <span className="text-lg font-black uppercase tracking-tighter">10 CREDITS</span>
                <span className="text-neutral-400 font-mono font-bold">→</span>
                <span className="text-sm font-bold uppercase tracking-widest text-neutral-600">5 MIN SIMULATION</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-3 px-6 py-4 border-b-[3px] md:border-b-0 md:border-r-[3px] border-black bg-neutral-50 hover:bg-neutral-100 transition-colors">
                <span className="text-lg font-black uppercase tracking-tighter">20 CREDITS</span>
                <span className="text-neutral-400 font-mono font-bold">→</span>
                <span className="text-sm font-bold uppercase tracking-widest text-neutral-600">15 MIN SIMULATION</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-neutral-50 hover:bg-neutral-100 transition-colors">
                <span className="text-lg font-black uppercase tracking-tighter">30 CREDITS</span>
                <span className="text-neutral-400 font-mono font-bold">→</span>
                <span className="text-sm font-bold uppercase tracking-widest text-neutral-600">30 MIN SIMULATION</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          
          {/* Starter Pack */}
          <PricingCard 
             title="Starter"
             credits="30"
             price="9 DT"
          />

          {/* Defense Pack - Most Popular */}
          <PricingCard 
             title="Defense"
             credits="80"
             price="19 DT"
             highlight
             badge="Most Popular"
          />

           {/* Serious Pack */}
          <PricingCard 
             title="Serious"
             credits="200"
             price="39 DT"
          />

        </div>

      </div>
    </section>
  );
}

function PricingCard({ 
  title, 
  credits, 
  price,  
  highlight = false,
  badge
}: { 
  title: string, 
  credits: string, 
  price: string, 
  highlight?: boolean,
  badge?: string
}) {
    return (
        <div className={`border-[3px] border-black p-8 flex flex-col justify-between shadow-[8px_8px_0px_#000000] relative transition-transform duration-200 ${highlight ? 'bg-black text-white md:scale-105 z-10' : 'bg-white text-black hover:-translate-y-1'}`}>
            
            {badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black border-2 border-black text-xs uppercase font-black px-4 py-1 tracking-wider whitespace-nowrap">
                  {badge}
              </div>
            )}

            <div className="space-y-4 text-center">
                <h3 className="text-2xl font-black uppercase tracking-tight">{title}</h3>
                <div className="text-5xl font-black tracking-tighter">
                   {credits} <span className="text-lg font-bold">Credits</span>
                </div>
                <div className={`text-3xl font-black ${highlight ? 'text-white' : 'text-black'}`}>
                    {price}
                </div>
            </div>

            <div className="mt-8">
                <Button className={`w-full h-12 font-bold uppercase tracking-wide rounded-none border-2 border-black transition-transform active:translate-y-1 ${highlight ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>
                    {'Choose Pack'}
                </Button>
            </div>
        </div>
    )
}
