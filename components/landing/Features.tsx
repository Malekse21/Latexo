"use client";

import { motion } from "framer-motion";
import { Check, User, FileText, AlertCircle } from "lucide-react";
import { useState } from "react";

const FeatureCard = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => {
  return (
    <motion.div 
      className={`bg-white border text-card-foreground p-6 flex flex-col h-[300px] relative overflow-hidden ${className}`}
      whileHover={{ y: -5, boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
      transition={{ duration: 0.2 }}
      style={{ boxShadow: "0px 0px 0px 0px rgba(0,0,0,0)" }}
    >
      <h3 className="text-xl font-bold mb-4 z-10">{title}</h3>
      <div className="flex-1 z-10">{children}</div>
      <div className="absolute inset-0 bg-dot-grid opacity-[0.4] z-0" />
    </motion.div>
  );
};

export function Features() {
  return (
    <section id="features" className="w-full max-w-6xl mx-auto py-24 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Compliance Scan Card */}
        <FeatureCard title="Compliance Scan">
          <div className="flex flex-col gap-3">
             <ComplianceItem label="Abstract format check" />
             <ComplianceItem label="Bibliography styling" delay={0.5} />
             <ComplianceItem label="Image captions" delay={1} />
             <ComplianceItem label="Font size & margins" delay={1.5} />
          </div>
        </FeatureCard>

        {/* Interactive Jury Card */}
        <FeatureCard title="Interactive Jury">
          <div className="flex items-center justify-center h-full gap-4">
            <JuryMember />
            <JuryMember delay={0.2} isHostile />
            <JuryMember delay={0.4} />
          </div>
        </FeatureCard>

        {/* Deep Report Card */}
        <FeatureCard title="Deep Report">
          <div className="flex flex-col items-center justify-center h-full gap-4">
             <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#E4E4E7" strokeWidth="8" fill="none" />
                  <motion.circle 
                    cx="64" cy="64" r="56" 
                    stroke="black" strokeWidth="8" 
                    fill="none" 
                    strokeLinecap="square"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 0.98 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">98%</span>
                  <span className="text-xs text-muted-foreground">Originality</span>
                </div>
             </div>
             <div className="flex items-center gap-2 text-sm border px-3 py-1 rounded-full bg-gray-50">
               <Check className="h-3 w-3" strokeWidth={1.5} />
               Grammar: Perfect
             </div>
          </div>
        </FeatureCard>
      
      </div>
    </section>
  );
}

function ComplianceItem({ label, delay = 0 }: { label: string, delay?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-5 h-5 border border-dashed border-gray-300 rounded-full">
        <motion.div
           initial={{ scale: 0, opacity: 0 }}
           whileInView={{ scale: 1, opacity: 1 }}
           transition={{ delay, type: "spring" }}
        >
          <Check className="w-3 h-3 text-black" strokeWidth={1.5} />
        </motion.div>
      </div>
      <span className="text-sm font-light text-gray-600">{label}</span>
      <motion.div 
        className="ml-auto w-12 h-2 bg-gray-100 rounded-sm"
        initial={{ width: 0 }}
        whileInView={{ width: 48 }}
        transition={{ delay: delay + 0.2, duration: 0.5 }}
      />
    </div>
  )
}

function JuryMember({ delay = 0, isHostile = false }: { delay?: number, isHostile?: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      className="relative group cursor-help"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ delay }}
        className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 group-hover:border-black group-hover:bg-white transition-colors"
      >
        <User className="w-8 h-8 text-gray-400 group-hover:text-black transition-colors" strokeWidth={1.5} />
      </motion.div>
      
      <motion.div
         className={`absolute -top-16 left-1/2 -translate-x-1/2 w-40 p-2 bg-black text-white text-[10px] rounded-sm pointer-events-none z-20 ${hovered ? 'block' : 'hidden'}`}
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 10 }}
      >
        {isHostile ? "How do you justify your technical choice?" : "Can you elaborate on the architecture?"}
        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45" />
      </motion.div>
    </div>
  )
}
