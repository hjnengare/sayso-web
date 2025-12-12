// src/components/EventDetail/EventContactInfo.tsx
"use client";

import { motion } from "framer-motion";
import { Phone, Globe, MapPin } from "react-feather";
import { Event } from "../../data/eventsData";

interface EventContactInfoProps {
  event: Event;
}

export default function EventContactInfo({ event }: EventContactInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/40 rounded-[12px] ring-1 ring-white/30 shadow-md p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
        <h3
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Contact Information
        </h3>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Phone className="text-navbar-bg" size={16} />
            <span
              className="text-body-sm text-charcoal/70"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              +44 20 1234 5678
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Globe className="text-navbar-bg" size={16} />
            <span
              className="text-body-sm text-charcoal/70"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              www.example.com
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="text-navbar-bg" size={16} />
            <span
              className="text-body-sm text-charcoal/70"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {event.location}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
