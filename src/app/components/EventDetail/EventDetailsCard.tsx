// src/components/EventDetail/EventDetailsCard.tsx
"use client";

import { m } from "framer-motion";
import { Calendar, Clock, Users } from "lucide-react";
import type { Event } from "../../lib/types/Event";

interface EventDetailsCardProps {
  event: Event;
}

export default function EventDetailsCard({ event }: EventDetailsCardProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px]  shadow-md p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
        <h2
          className="text-h3 font-semibold text-charcoal mb-4"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Event Details
        </h2>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-off-white/70 rounded-full flex items-center justify-center text-charcoal/85 hover:bg-off-white/90 transition-colors">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p
              className="text-caption text-charcoal/60"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Date
            </p>
            <p
              className="text-body-sm font-semibold text-charcoal"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {event.startDate || "Date TBA"}
            </p>
            {event.endDate && (
              <p
                className="text-caption text-charcoal/60"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                to {event.endDate}
              </p>
            )}
          </div>
        </div>

        {event.segment && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-off-white/70 rounded-full flex items-center justify-center text-charcoal/85 hover:bg-off-white/90 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p
                className="text-caption text-charcoal/60"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Category
              </p>
              <p
                className="text-body-sm font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {[event.segment, event.genre].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        )}

        {event.venueName && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-off-white/70 rounded-full flex items-center justify-center text-charcoal/85 hover:bg-off-white/90 transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p
                className="text-caption text-charcoal/60"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Venue
              </p>
              <p
                className="text-body-sm font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {[event.venueName, event.venueAddress].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
        )}

        {event.price && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-off-white/70 rounded-full flex items-center justify-center text-charcoal/85 hover:bg-off-white/90 transition-colors">
              <span className="font-bold text-sm">R</span>
            </div>
            <div>
              <p
                className="text-caption text-charcoal/60"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Price
              </p>
              <p
                className="text-body-sm font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {event.price}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </m.div>
  );
}
