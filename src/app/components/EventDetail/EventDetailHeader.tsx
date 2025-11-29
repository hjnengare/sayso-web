"use client";

import Link from "next/link";
import { ArrowLeft, Share2, Bookmark } from "react-feather";

interface EventDetailHeaderProps {
  isBookmarked: boolean;
  onBookmark: () => void;
  onShare: () => void;
}

export default function EventDetailHeader({
  isBookmarked,
  onBookmark,
  onShare,
}: EventDetailHeaderProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg backdrop-blur-xl border-b border-white/30 shadow-md md:shadow-none"
    >
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/events-specials" className="group flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-charcoal/10 to-charcoal/5 hover:from-sage/20 hover:to-sage/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-charcoal/5 hover:border-sage/20 mr-3">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-sage transition-colors duration-300" />
            </div>
            <span className="text-base font-bold text-white transition-all duration-300 group-hover:text-white/80" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Back to Events
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={onShare}
              className="w-10 h-10 bg-gradient-to-br from-sage/10 to-sage/5 hover:from-sage/20 hover:to-sage/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-sage/5 hover:border-sage/20"
              aria-label="Share event"
            >
              <Share2 className="text-white w-6 h-6 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onBookmark}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border ${
                isBookmarked
                  ? "bg-coral text-white border-coral"
                  : "bg-gradient-to-br from-charcoal/10 to-charcoal/5 hover:from-coral/20 hover:to-coral/10 border-charcoal/5 hover:border-coral/20"
              }`}
              aria-label="Bookmark event"
            >
              <Bookmark className="text-white w-6 h-6 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
