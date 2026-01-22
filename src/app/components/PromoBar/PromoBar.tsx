"use client";

import Link from "next/link";

const urbanist = {
  fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
} as const;

export default function PromoBar() {
  return (
    <div className="hidden md:block fixed top-0 left-0 right-0 z-[60] bg-navbar-bg text-white">
      <div className="mx-auto w-full max-w-[2000px] px-2">
        <div className="h-10 sm:h-11 flex items-center justify-center text-center">
          <p className="text-xs sm:text-sm font-medium" style={urbanist}>
            Reach more customers with sayso. <Link href="/claim-business" className="underline underline-offset-2 hover:text-sage transition-colors font-semibold" style={urbanist}>Claim your listing</Link>
          </p>
        </div>
      </div>
    </div>
  );
}


