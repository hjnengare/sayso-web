"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Phone, Globe, MapPin, Mail, CheckCircle, DollarSign } from "react-feather";

type Description = string | { raw: string; friendly: string } | null | undefined;

export interface BusinessInfo {
  name?: string;
  description?: Description;
  category?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  verified?: boolean;
}

interface BusinessInfoModalProps {
  businessInfo: BusinessInfo;
  buttonRef: React.RefObject<HTMLButtonElement>;
  isOpen: boolean;
  onClose: () => void;
}

export default function BusinessInfoModal({ 
  businessInfo, 
  buttonRef, 
  isOpen, 
  onClose 
}: BusinessInfoModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Subtle dark overlay */}
      <div
        className="fixed inset-0 z-[9999] bg-black/20 pointer-events-auto"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-[10000] flex items-start md:items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className={`relative w-full pointer-events-auto bg-off-white rounded-[20px] border border-white/60 shadow-xl max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out ${
            isClosing ? 'opacity-0 scale-95 translate-y-[-8px]' : 'opacity-100 scale-100 translate-y-0'
          }`}
          style={{
            maxWidth: 'min(680px, 100%)',
            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            animation: isClosing ? 'none' : 'fadeInScale 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="sticky top-0 bg-off-white border-b border-charcoal/10 px-5 sm:px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-charcoal" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
            Business Information
          </h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full border border-charcoal/10 bg-off-white/70 hover:bg-sage/10 hover:text-sage text-charcoal/80 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-sage/30 min-h-[44px] min-w-[44px]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-4 pb-6 space-y-4" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
          {/* Business Name */}
          <div>
            <h3 className="text-sm font-semibold text-charcoal mb-2" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
              {businessInfo.name || 'Business Name Not Available'}
            </h3>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2 text-sm text-charcoal/70" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
            <span className="font-medium text-charcoal/60">Category:</span>
            <span className={!businessInfo.category ? 'italic text-charcoal/40' : ''}>
              {businessInfo.category || 'Not specified'}
            </span>
          </div>

          {/* Description */}
          <div className="text-sm text-charcoal/70" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
            <p className="font-medium text-charcoal/60 mb-1">Description</p>
            <p className={`leading-relaxed ${!businessInfo.description ? 'italic text-charcoal/40' : ''}`}>
              {(() => {
                const desc = businessInfo.description;
                if (!desc) return 'No description available';
                if (typeof desc === 'string') return desc;
                if (typeof desc === 'object' && desc !== null) {
                  const descObj = desc as { friendly?: string; raw?: string };
                  return descObj.friendly || descObj.raw || 'No description available';
                }
                return 'No description available';
              })()}
            </p>
          </div>

          {/* Price Range */}
          <div className="flex items-center gap-2 text-sm text-charcoal/70" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
            <DollarSign className={`w-4 h-4 flex-shrink-0 ${businessInfo.price_range ? 'text-sage' : 'text-charcoal/30'}`} />
            <span className="font-medium text-charcoal/60">Price Range:</span>
            <span className={!businessInfo.price_range ? 'italic text-charcoal/40' : ''}>
              {businessInfo.price_range || 'Not specified'}
            </span>
          </div>

          {/* Verification Status */}
          <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${businessInfo.verified ? 'text-sage' : 'text-charcoal/40'}`} />
            <span className={`font-medium ${businessInfo.verified ? 'text-sage' : 'text-charcoal/60'}`}>
              {businessInfo.verified ? 'Verified Business' : 'Not Verified'}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${businessInfo.location ? 'text-sage' : 'text-charcoal/30'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal mb-0.5" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>Location</p>
              <p className={`text-sm ${businessInfo.location ? 'text-charcoal/70' : 'italic text-charcoal/40'}`} style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                {businessInfo.location || 'Location not provided'}
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${businessInfo.address ? 'text-sage' : 'text-charcoal/30'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal mb-0.5" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>Address</p>
              <p className={`text-sm ${businessInfo.address ? 'text-charcoal/70' : 'italic text-charcoal/40'}`} style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                {businessInfo.address || 'Address not provided'}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <Phone className={`w-4 h-4 mt-0.5 flex-shrink-0 ${businessInfo.phone ? 'text-sage' : 'text-charcoal/30'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal mb-0.5" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>Phone</p>
              {businessInfo.phone ? (
                <a href={`tel:${businessInfo.phone}`} className="text-sm text-sage hover:text-coral transition-colors" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  {businessInfo.phone}
                </a>
              ) : (
                <p className="text-sm italic text-charcoal/40" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  Phone number not provided
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail className={`w-4 h-4 mt-0.5 flex-shrink-0 ${businessInfo.email ? 'text-sage' : 'text-charcoal/30'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal mb-0.5" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>Email</p>
              {businessInfo.email ? (
                <a href={`mailto:${businessInfo.email}`} className="text-sm text-sage hover:text-coral transition-colors break-all" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  {businessInfo.email}
                </a>
              ) : (
                <p className="text-sm italic text-charcoal/40" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  Email not provided
                </p>
              )}
            </div>
          </div>

          {/* Website */}
          <div className="flex items-start gap-3">
            <Globe className={`w-4 h-4 mt-0.5 flex-shrink-0 ${businessInfo.website ? 'text-sage' : 'text-charcoal/30'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal mb-0.5" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>Website</p>
              {businessInfo.website ? (
                <a 
                  href={businessInfo.website.startsWith('http') ? businessInfo.website : `https://${businessInfo.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sage hover:text-coral transition-colors break-all"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  {businessInfo.website}
                </a>
              ) : (
                <p className="text-sm italic text-charcoal/40" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  Website not provided
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>,
    document.body
  );
}

