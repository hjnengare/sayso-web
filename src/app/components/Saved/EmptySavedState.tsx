"use client";

import { Bookmark } from "lucide-react";

export default function EmptySavedState() {
  return (
    <div
      className="mx-auto w-full max-w-[2000px] px-2 font-urbanist flex flex-1 items-center justify-center"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className="text-center w-full">
        <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
          <Bookmark className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} aria-hidden />
        </div>

        <h3 className="text-h2 font-semibold text-charcoal mb-2">
          No saved items yet
        </h3>

        <p className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto font-medium">
          Tap the bookmark icon on any business to save it here
        </p>
      </div>
    </div>
  );
}
