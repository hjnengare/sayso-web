"use client";

import { Star } from "react-feather";

interface RatingSelectorProps {
  overallRating: number;
  onRatingChange: (rating: number) => void;
}

export default function RatingSelector({ overallRating, onRatingChange }: RatingSelectorProps) {
  return (
    <div className="mb-3 px-4">
      <h3 className="text-sm font-bold text-charcoal mb-3 text-center md:text-left">
        Overall rating
      </h3>
      <div className="flex items-center justify-center space-x-1 md:space-x-2 mb-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= overallRating;
          return (
            <button
              key={star}
              onClick={() => onRatingChange(star)}
              className="p-1 md:p-2 focus:outline-none transition-all duration-300 rounded-full hover:bg-navbar-bg/10"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                size={32}
                className="text-coral shadow-md"
                style={{ fill: active ? "currentColor" : "none", stroke: "currentColor" }}
              />
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm font-600 text-charcoal">Tap to select rating</p>
    </div>
  );
}
