"use client";

import { m } from "framer-motion";
import { Trophy } from "lucide-react";

export default function LeaderboardTitle() {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.15 }}
      className="mb-6 sm:mb-8 text-center px-4"
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-white/30">
        <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-charcoal" />
      </div>
      <h2 className="font-urbanist text-h2 sm:text-h1 font-600 text-charcoal mb-2">
        Top Contributors This Month
      </h2>
      <p className="font-urbanist text-charcoal/70 text-caption sm:text-body-sm max-w-md mx-auto px-2">
        Celebrating our community&apos;s most valued reviewers and featured businesses
      </p>
    </m.div>
  );
}
