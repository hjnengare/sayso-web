// src/components/BusinessDetail/BusinessDetailsCard.tsx
"use client";

import { motion } from "framer-motion";
import { Clock, DollarSign, CheckCircle } from "react-feather";

type Hours = string | Record<string, string> | { raw?: string; friendly?: string } | null | undefined;

interface BusinessDetailsCardProps {
  priceRange?: string | { raw?: string; friendly?: string };
  verified?: boolean;
  hours?: Hours;
}

// Helper to format hours object to string
const formatHours = (hours: Hours): string | null => {
  if (!hours) return null;
  
  // Handle string
  if (typeof hours === 'string') {
    return hours.trim() || null;
  }
  
  // Handle object with raw/friendly (description-like format)
  if (typeof hours === 'object' && ('raw' in hours || 'friendly' in hours)) {
    const friendly = (hours as any).friendly?.trim();
    const raw = (hours as any).raw?.trim();
    if (friendly) return friendly;
    if (raw) return raw;
    return null;
  }
  
  // Handle hours object like { monday: "9-5", tuesday: "9-5", ... }
  if (typeof hours === 'object') {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const formattedDays = dayNames
      .map(day => {
        const dayHours = (hours as Record<string, string>)[day];
        if (!dayHours || dayHours.trim() === '') return null;
        const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
        return `${dayLabel}: ${dayHours}`;
      })
      .filter(Boolean);
    
    if (formattedDays.length > 0) {
      return formattedDays.join(', ');
    }
  }
  
  return null;
};

// Helper to extract price range text
const getPriceRangeText = (priceRange: string | { raw?: string; friendly?: string } | undefined): string | null => {
  if (!priceRange) return null;
  
  if (typeof priceRange === 'string') {
    return priceRange.trim() || null;
  }
  
  if (typeof priceRange === 'object') {
    const friendly = priceRange.friendly?.trim();
    const raw = priceRange.raw?.trim();
    if (friendly) return friendly;
    if (raw) return raw;
  }
  
  return null;
};

export default function BusinessDetailsCard({ priceRange, verified, hours }: BusinessDetailsCardProps) {
  const formattedHours = formatHours(hours);
  const priceRangeText = getPriceRangeText(priceRange);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] ring-1 ring-white/30 shadow-md p-4 sm:p-6"
    >
        <h2
          className="text-h3 font-semibold text-charcoal mb-4"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Business Details
        </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
            <DollarSign className="text-navbar-bg" size={18} />
          </div>
          <div>
            <p
              className="text-caption text-charcoal/60"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Price Range
            </p>
            {priceRangeText ? (
              <p
                className="text-body-sm font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {priceRangeText}
              </p>
            ) : (
              <p
                className="text-body-sm font-semibold text-charcoal/50 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Coming soon
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
            <Clock className="text-navbar-bg" size={18} />
          </div>
          <div>
            <p
              className="text-caption text-charcoal/60"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Hours
            </p>
            {formattedHours ? (
              <p
                className="text-body-sm font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {formattedHours}
              </p>
            ) : (
              <p
                className="text-body-sm font-semibold text-charcoal/50 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Hours coming soon
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
            <CheckCircle className="text-navbar-bg" size={18} />
          </div>
          <div>
            <p
              className="text-caption text-charcoal/60"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Status
            </p>
            <p
              className="text-body-sm font-semibold text-charcoal"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {verified ? "Verified" : "Not Verified"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

