"use client";


import Link from "next/link";

export default function SelectAccountTypePage() {
  return (
    <div className="min-h-[100svh] md:  bg-off-white flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full mx-auto max-w-2xl flex flex-col items-center">
        <h1 className="font-urbanist text-3xl sm:text-4xl md:text-5xl font-700 leading-[1.2] tracking-tight text-charcoal mb-8" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 700 }}>
          Welcome! Please choose an option:
        </h1>
        <div className="flex flex-col gap-6 w-full max-w-md">
          <Link href="/login" className="w-full py-3 px-4 rounded-full font-semibold bg-card-bg text-white text-center hover:bg-card-bg/90 transition-all duration-300" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
            Personal Login
          </Link>
          <Link href="/register" className="w-full py-3 px-4 rounded-full font-semibold bg-charcoal text-white text-center hover:bg-charcoal/90 transition-all duration-300" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
            Personal Register
          </Link>
          <Link href="/business/login" className="w-full py-3 px-4 rounded-full font-semibold bg-coral text-white text-center hover:bg-coral/90 transition-all duration-300" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
            Business Login
          </Link>
          <Link href="/business/register" className="w-full py-3 px-4 rounded-full font-semibold bg-coral/80 text-white text-center hover:bg-coral transition-all duration-300" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
            Business Register
          </Link>
        </div>
      </div>
    </div>
  );
}
