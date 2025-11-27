// src/components/BusinessDetail/BusinessDetailsCard.tsx
"use client";

import { motion } from "framer-motion";
import { Clock, DollarSign, CheckCircle } from "react-feather";

interface BusinessDetailsCardProps {
  priceRange?: string;
  verified?: boolean;
  hours?: string;
}

export default function BusinessDetailsCard({ priceRange, verified, hours }: BusinessDetailsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] ring-1 ring-white/30 p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
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
            {priceRange ? (
              <p
                className="text-body-sm font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {priceRange}
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
            {hours ? (
              <p
                className="text-body-sm font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {hours}
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
      </div>
    </motion.div>
  );
}

