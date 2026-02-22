"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

interface RatingSelectorProps {
  overallRating: number;
  onRatingChange: (rating: number) => void;
}

// Rating feedback messages
const ratingLabels: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: "Poor", emoji: "", color: "text-charcoal" },
  2: { text: "Fair", emoji: "", color: "text-charcoal" },
  3: { text: "Good", emoji: "", color: "text-charcoal" },
  4: { text: "Great", emoji: "", color: "text-charcoal" },
  5: { text: "Excellent", emoji: "", color: "text-charcoal" },
};

export default function RatingSelector({ overallRating, onRatingChange }: RatingSelectorProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating ?? overallRating;
  const currentLabel = displayRating > 0 ? ratingLabels[displayRating] : null;

  return (
    <div className="mb-6">
      {/* Header with smart feedback */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <h3
          className="text-base font-semibold text-charcoal"
          style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
        >
          How was your experience?
        </h3>

        {/* Smart rating feedback */}
        <AnimatePresence mode="wait">
          {currentLabel ? (
            <m.div
              key={displayRating}
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-charcoal/10 backdrop-blur-sm ${currentLabel.color}`}
            >
              <span className="text-lg">{currentLabel.emoji}</span>
              <span
                className="text-base font-bold"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                {currentLabel.text}
              </span>
            </m.div>
          ) : (
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-charcoal/60"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              Tap a star to rate
            </m.p>
          )}
        </AnimatePresence>
      </div>

      {/* Star Rating - Large touch targets for mobile */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= displayRating;
          const isSelected = star <= overallRating;

          return (
            <m.button
              key={star}
              onClick={() => onRatingChange(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              onTouchStart={() => setHoverRating(star)}
              onTouchEnd={() => {
                setHoverRating(null);
                onRatingChange(star);
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 sm:p-3 focus:outline-none rounded-full transition-colors duration-200 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              {/* Glow effect for selected stars */}
              {isSelected && (
                <m.div
                  layoutId={`star-glow-${star}`}
                  className="absolute inset-0 rounded-full blur-md"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                />
              )}

              <m.div
                animate={{
                  scale: isActive ? 1 : 0.9,
                  rotate: isActive && star === displayRating ? [0, -10, 10, 0] : 0,
                }}
                transition={{
                  scale: { duration: 0.2 },
                  rotate: { duration: 0.3, delay: 0.1 }
                }}
              >
                <Star
                  size={36}
                  className={`transition-colors duration-200 drop-shadow-sm ${
                    isActive ? 'text-coral' : 'text-charcoal/50'
                  }`}
                  style={{
                    fill: isActive ? "currentColor" : "none",
                    stroke: isActive ? "currentColor" : "currentColor",
                    strokeWidth: isActive ? 0 : 2,
                  }}
                />
              </m.div>
            </m.button>
          );
        })}
      </div>
    </div>
  );
}
