"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";

export function Navbar() {
  const { user, loading } = useUser();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-black">
      <div className="container mx-auto relative flex h-20 items-center justify-between px-4">
        {/* Logo - Centered vertically with text */}
        <div className="flex items-center gap-3">
          <Link href="/" className="relative w-16 h-16 flex-shrink-0">
             <Image 
               src="/images/logo.png" 
               alt="Latexo Logo" 
               fill
               className="object-contain"
               priority
             /> 
          </Link>
        </div>

        {/* Center Links - Absolutely centered in the container */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-8 items-center">
          <Link href="#mission" className="text-sm font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors">
            Mission
          </Link>
          <Link href="#map" className="text-sm font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors">
            Live Map
          </Link>
          <Link href="#pricing" className="text-sm font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors">
            Pricing
          </Link>
        </div>

        {/* Right Actions - Centered vertically */}
        <div className="flex items-center gap-4">
          {!loading && user ? (
            <Link href="/dashboard">
              <Button className="bg-white text-black border-2 border-black hover:bg-neutral-100 rounded-none h-10 px-6 font-bold uppercase tracking-wide shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button className="bg-white text-black border-2 border-black hover:bg-neutral-100 rounded-none h-10 px-6 font-bold uppercase tracking-wide shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-black text-white border-2 border-black hover:bg-neutral-800 rounded-none h-10 px-6 font-bold uppercase tracking-wide shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
