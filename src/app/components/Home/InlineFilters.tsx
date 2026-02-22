"use client";

import { m, AnimatePresence, useReducedMotion, Easing } from "framer-motion";
import { MapPin, Star } from "lucide-react";

interface InlineFiltersProps {
  show: boolean;
  filters: {
    minRating: number | null;
    distance: string | null;
  };
  onDistanceChange: (distance: string) => void;
  onRatingChange: (rating: number) => void;
}

const DISTANCE_OPTIONS = [
  { value: "1 km", label: "1 km" },
  { value: "5 km", label: "5 km" },
  { value: "10 km", label: "10 km" },
  { value: "20 km", label: "20 km" },
];

const RATING_OPTIONS = [
  { value: 3.0, label: "3.0+" },
  { value: 3.5, label: "3.5+" },
  { value: 4.0, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
];

// Cubic bezier easing functions
const easeOut: Easing = [0.25, 0.46, 0.45, 0.94];
const easeIn: Easing = [0.4, 0, 0.6, 1];

export default function InlineFilters({
  show,
  filters,
  onDistanceChange,
  onRatingChange,
}: InlineFiltersProps) {
  const prefersReducedMotion = useReducedMotion();

  // Sleek container animation with smooth spring physics
  const containerVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: {
          opacity: 0,
          y: -20,
          scale: 0.95,
        },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.4,
            ease: easeOut,
          },
        },
        exit: {
          opacity: 0,
          y: -15,
          scale: 0.96,
          transition: {
            duration: 0.25,
            ease: easeIn,
          },
        },
      };

  // Group animations with stagger for cascading effect
  const groupVariants: any = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1,
          },
        },
      };

  // Individual chip animations with spring physics for bouncy feel
  const chipVariants: any = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: {
          opacity: 0,
          scale: 0.85,
          y: 10,
        },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: "spring",
            damping: 20,
            stiffness: 300,
            mass: 0.8,
          },
        },
      };

  return (
    <AnimatePresence mode="wait">
      {show && (
        <m.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="overflow-hidden"
        >
          <div className="px-4 sm:px-6 pb-4 space-y-4">
            {/* Distance Filter Group */}
            <m.div
              variants={groupVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-charcoal/70">
                <MapPin className="w-4 h-4" />
                <span style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>Distance</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {DISTANCE_OPTIONS.map((option) => (
                  <m.button
                    key={option.value}
                    variants={chipVariants}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                    onClick={() => onDistanceChange(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                      filters.distance === option.value
                        ? "bg-card-bg text-white shadow-md"
                        : "bg-white/80 text-charcoal/70 border border-charcoal/20 hover:border-sage hover:bg-card-bg/10"
                    }`}
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    {option.label}
                  </m.button>
                ))}
              </div>
            </m.div>

            {/* Rating Filter Group */}
            <m.div
              variants={groupVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-charcoal/70">
                <Star className="w-4 h-4 fill-current" />
                <span style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>Minimum Rating</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {RATING_OPTIONS.map((option) => (
                  <m.button
                    key={option.value}
                    variants={chipVariants}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                    onClick={() => onRatingChange(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                      filters.minRating === option.value
                        ? "bg-coral text-white shadow-md"
                        : "bg-white/80 text-charcoal/70 border border-charcoal/20 hover:border-coral hover:bg-coral/10"
                    }`}
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {option.label}
                  </m.button>
                ))}
              </div>
            </m.div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
