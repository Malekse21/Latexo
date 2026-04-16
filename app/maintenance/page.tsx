"use client"

import { motion } from "framer-motion"
import { Mail, Instagram, Music } from "lucide-react"

export default function MaintenancePage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-white text-black overflow-hidden relative selection:bg-black selection:text-white">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl w-full z-10 flex flex-col items-center text-center space-y-16"
      >
        <div className="space-y-6">
          <div className="inline-block border border-black/20 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4 bg-black/5 backdrop-blur-sm">
            Statut : Maintenance
          </div>
          <h1 className="text-6xl md:text-[6.5rem] leading-none font-bold tracking-tighter uppercase">
            Système<br />Hors Ligne
          </h1>
          <p className="text-neutral-500 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
            Latexo est actuellement en maintenance programmée. Les membres de notre jury font une courte pause pour mettre à jour le système.
          </p>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-black/20 to-transparent" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
           <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
             className="group border border-black/10 p-6 bg-black/[0.02] hover:bg-black/[0.05] transition-colors relative overflow-hidden"
           >
              <div className="absolute top-0 left-0 w-full h-1 bg-black/10 group-hover:bg-black transition-colors" />
              <p className="text-xs text-neutral-400 font-mono uppercase tracking-widest mb-3">Jury 01</p>
              <h3 className="text-2xl font-bold tracking-tight">Souad</h3>
              <p className="text-neutral-400 text-sm mt-2">Rigueur académique hors ligne.</p>
           </motion.div>
           
           <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
             className="group border border-black/10 p-6 bg-black/[0.02] hover:bg-black/[0.05] transition-colors relative overflow-hidden"
           >
              <div className="absolute top-0 left-0 w-full h-1 bg-black/10 group-hover:bg-black transition-colors" />
              <p className="text-xs text-neutral-400 font-mono uppercase tracking-widest mb-3">Jury 02</p>
              <h3 className="text-2xl font-bold tracking-tight">Malek</h3>
              <p className="text-neutral-400 text-sm mt-2">Recalibrage de la méthodologie.</p>
           </motion.div>
           
           <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
             className="group border border-black/10 p-6 bg-black/[0.02] hover:bg-black/[0.05] transition-colors relative overflow-hidden"
           >
              <div className="absolute top-0 left-0 w-full h-1 bg-black/10 group-hover:bg-black transition-colors" />
              <p className="text-xs text-neutral-400 font-mono uppercase tracking-widest mb-3">Jury 03</p>
              <h3 className="text-2xl font-bold tracking-tight">Amir</h3>
              <p className="text-neutral-400 text-sm mt-2">Les métriques business se reposent.</p>
           </motion.div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-mono tracking-tight pt-4">
          <a href="mailto:latexo.students@gmail.com" className="group flex items-center justify-center gap-3 px-6 py-3 border border-black/10 hover:border-black/40 bg-black/5 hover:bg-black/10 transition-all text-neutral-700 hover:text-black rounded-full">
            <Mail className="w-4 h-4" />
            <span>latexo.students@gmail.com</span>
          </a>
          <a href="https://www.instagram.com/latexo.tn/" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center gap-3 px-6 py-3 border border-black/10 hover:border-black/40 bg-black/5 hover:bg-black/10 transition-all text-neutral-700 hover:text-black rounded-full">
            <Instagram className="w-4 h-4" />
            <span>@latexo.tn</span>
          </a>
          <a href="https://www.tiktok.com/@latexo.tn" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center gap-3 px-6 py-3 border border-black/10 hover:border-black/40 bg-black/5 hover:bg-black/10 transition-all text-neutral-700 hover:text-black rounded-full">
            <Music className="w-4 h-4" />
            <span>@latexo.tn</span>
          </a>
        </div>
      </motion.div>
    </div>
  )
}
