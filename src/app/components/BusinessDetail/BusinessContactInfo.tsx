// src/components/BusinessDetail/BusinessContactInfo.tsx
"use client";

import { motion } from "framer-motion";
import { Phone, Globe, MapPin, Mail } from "react-feather";

interface BusinessContactInfoProps {
  phone?: string;
  website?: string;
  address?: string;
  email?: string;
  location?: string;
  onViewMap?: () => void;
  showMapLink?: boolean;
}

export default function BusinessContactInfo({ phone, website, address, email, location, onViewMap, showMapLink = false }: BusinessContactInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] ring-1 ring-white/30 shadow-md p-4 sm:p-6 relative"
    >
      <div>
        <h3
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Contact Information
        </h3>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Phone className="text-navbar-bg" size={16} />
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="text-body-sm text-charcoal/70 hover:text-charcoal transition-colors"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {phone}
              </a>
            ) : (
              <span
                className="text-body-sm text-charcoal/50 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Phone number coming soon
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Mail className="text-navbar-bg" size={16} />
            {email ? (
              <a
                href={`mailto:${email}`}
                className="text-body-sm text-charcoal/70 hover:text-charcoal transition-colors break-all"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {email}
              </a>
            ) : (
              <span
                className="text-body-sm text-charcoal/50 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Email coming soon
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Globe className="text-navbar-bg" size={16} />
            {website ? (
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-body-sm text-charcoal/70 hover:text-charcoal transition-colors break-all"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {website}
              </a>
            ) : (
              <span
                className="text-body-sm text-charcoal/50 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Website coming soon
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="text-navbar-bg" size={16} />
            {address || location ? (
              <span
                className="text-body-sm text-charcoal/70"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {address || location}
              </span>
            ) : (
              <span
                className="text-body-sm text-charcoal/50 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Address coming soon
              </span>
            )}
          </div>
          {showMapLink && (address || location) && onViewMap && (
            <div className="pt-2 border-t border-charcoal/10 mt-2.5">
              <button
                onClick={onViewMap}
                className="flex items-center gap-2 text-body-sm font-semibold text-navbar-bg hover:text-coral transition-colors w-full"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                <MapPin className="text-navbar-bg" size={16} />
                View on map
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

