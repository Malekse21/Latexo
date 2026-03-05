"use client";

import { motion } from "framer-motion";
import { Upload, Plus } from "lucide-react";
import Image from "next/image";

interface ReportFrameProps {
  isEmpty: boolean;
  thumbnailUrl?: string | null;
  onUploadClick: () => void;
  className?: string; // Allow external class injection
}

export function ReportFrame({ isEmpty, thumbnailUrl, onUploadClick, className }: ReportFrameProps) {
  return (
    <div className={`relative w-full aspect-[1/1.414] mx-auto ${className || ''}`}>
      {/* The Frame Container (Now Minimalist Black) */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          boxShadow: '0 20px 50px -15px rgba(0,0,0,0.1)',
          border: '1px solid black',
        }}
      >
      </div>

      {/* Inner Content Area */}
      <div className="relative z-10 w-full h-full p-4 flex items-center justify-center bg-[#F9F9F9]">
        {isEmpty ? (
          <button 
            onClick={onUploadClick}
            className="w-full h-full border-2 border-dashed border-gray-300 rounded-sm flex flex-col items-center justify-center gap-4 hover:bg-gray-50 hover:border-black transition-all group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
               <Upload className="w-6 h-6 text-gray-400 group-hover:text-black" />
            </div>
            <div className="text-center">
              <p className="font-serif text-lg font-medium text-gray-800">Upload Manuscript</p>
              <p className="text-sm text-gray-500 mt-1">PDF format only</p>
            </div>
          </button>
        ) : (
          <div className="w-full h-full relative shadow-inner overflow-hidden">
             {thumbnailUrl ? (
                <Image 
                  src={thumbnailUrl} 
                  alt="Document Cover" 
                  fill 
                  className="object-cover"
                />
             ) : (
                <div className="w-full h-full bg-white flex items-center justify-center text-gray-400">
                  <span className="font-serif italic">Preview Unavailable</span>
                </div>
             )}
             
             {/* Edit/Replace Overlay */}
             <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                <button 
                  onClick={onUploadClick}
                  className="bg-white text-black px-4 py-2 rounded shadow-lg font-medium text-sm flex items-center gap-2 transform translate-y-2 hover:translate-y-0 transition-all"
                >
                  <Upload className="w-4 h-4" /> Replace
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
