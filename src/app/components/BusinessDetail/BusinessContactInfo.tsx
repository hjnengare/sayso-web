// src/components/BusinessDetail/BusinessContactInfo.tsx
"use client";

import { m } from "framer-motion";
import { Phone, Globe, MapPin, Mail } from "lucide-react";

interface BusinessContactInfoProps {
  phone?: string;
  website?: string;
  address?: string;
  email?: string;
  location?: string;
  onViewMap?: () => void;
  showMapLink?: boolean;
}

export default function BusinessContactInfo({ phone, website, address, email, location }: BusinessContactInfoProps) {
  const websiteHref = website ? (website.startsWith("http") ? website : `https://${website}`) : "";

  return (
    <m.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px]  shadow-md p-4 sm:p-6 relative"
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
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
              <Phone className="w-3 h-3 text-charcoal/85" />
            </span>
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
                className="text-body-sm text-charcoal/70 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Phone number coming soon
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
              <Mail className="w-3 h-3 text-charcoal/85" />
            </span>
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
                className="text-body-sm text-charcoal/70 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Email coming soon
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
              <Globe className="w-3 h-3 text-charcoal/85" />
            </span>
            {website ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-navbar-bg px-3 py-1.5 text-body-sm text-white hover:bg-navbar-bg/90 transition-colors"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                aria-label="View business website (opens in a new tab)"
              >
                View Website
              </a>
            ) : (
              <span
                className="text-body-sm text-charcoal/70 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Website coming soon
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
              <MapPin className="w-3 h-3 text-charcoal/85" />
            </span>
            {address || location ? (
              <span
                className="text-body-sm text-charcoal/70"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {address || location}
              </span>
            ) : (
              <span
                className="text-body-sm text-charcoal/70 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Address coming soon
              </span>
            )}
          </div>
        </div>
      </div>
    </m.div>
  );
}

