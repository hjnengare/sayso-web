// src/components/EventDetail/EventDetailsCard.tsx
"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, Users } from "react-feather";
import { Event } from "../../data/eventsData";

interface EventDetailsCardProps {
  event: Event;
}

export default function EventDetailsCard({ event }: EventDetailsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] ring-1 ring-white/30 shadow-md p-4 sm:p-6 relative overflow-hidden"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
            <Calendar className="text-navbar-bg" size={18} />
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
              {event.startDate}
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

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
            <Clock className="text-navbar-bg" size={18} />
          </div>
          <div>
            <p
              className="text-caption text-charcoal/60"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Duration
            </p>
            <p
              className="text-body-sm font-semibold text-charcoal"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              2-3 hours
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
            <Users className="text-navbar-bg" size={18} />
          </div>
          <div>
            <p
              className="text-caption text-charcoal/60"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Capacity
            </p>
            <p
              className="text-body-sm font-semibold text-charcoal"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Up to 20 people
            </p>
          </div>
        </div>

        {event.price && (
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
              <span className="text-navbar-bg font-bold text-base">£</span>
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
    </motion.div>
  );
}
