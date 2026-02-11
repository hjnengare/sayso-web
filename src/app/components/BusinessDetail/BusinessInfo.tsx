// src/components/BusinessDetail/BusinessInfo.tsx
"use client";

import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";

interface BusinessInfoProps {
  name: string;
  rating: number;
  location: string;
  category?: string;
  sharedTitleLayoutId?: string;
}

export default function BusinessInfo({ name, rating, location, category, sharedTitleLayoutId }: BusinessInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <motion.h1
        layoutId={sharedTitleLayoutId}
        className="text-h1 font-semibold text-charcoal mb-3"
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        {name}
      </motion.h1>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Rating Badge - matching BusinessCard style */}
        <div className="inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40">
          <Star className="w-3.5 h-3.5 text-coral fill-coral" aria-hidden />
          <span
            className="text-body-sm font-semibold text-charcoal"
            style={{ 
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 600
            }}
          >
            {Number(rating).toFixed(1)}
          </span>
        </div>
        {category && (
          <div className="inline-flex items-center gap-1.5 text-charcoal/70">
            <span
              className="text-body-sm font-medium"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {category}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-charcoal/70">
          <MapPin size={14} />
          <span
            className="text-body-sm font-medium"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {location}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

