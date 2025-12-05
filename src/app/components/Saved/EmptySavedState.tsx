"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EmptySavedState() {
  const router = useRouter();

  return (
    <div
      className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className="text-center w-full">
        <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
          <Bookmark className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
        </div>

        <h3 
          className="text-h2 font-semibold text-charcoal mb-2"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          No saved items yet
        </h3>

        <p 
          className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 500,
          }}
        >
          Tap the bookmark icon on any business to save it here
        </p>

        <button
          onClick={() => router.push("/home")}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage text-white text-body font-semibold rounded-full hover:bg-sage/90 transition-all duration-300"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          Discover Businesses
        </button>
      </div>
    </div>
  );
}
