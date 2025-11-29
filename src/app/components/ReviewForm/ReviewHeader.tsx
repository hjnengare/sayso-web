"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { ArrowLeft, Info } from "react-feather";
import BusinessInfoModal, { BusinessInfo } from "../BusinessInfo/BusinessInfoModal";

interface ReviewHeaderProps {
  businessInfo?: BusinessInfo;
}

export default function ReviewHeader({ businessInfo }: ReviewHeaderProps) {
  const router = useRouter();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg backdrop-blur-sm border-b border-charcoal/10 shadow-md md:shadow-none animate-slide-in-top"
        role="banner"
        style={{
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-4">
          <nav className="flex items-center justify-between" aria-label="Write review navigation">
            <button
              onClick={() => router.back()}
              className="group flex items-center focus:outline-none rounded-lg px-1 -mx-1"
              aria-label="Go back to previous page"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 mr-2 sm:mr-3" aria-hidden="true">
                <ArrowLeft className="w-6 h-6 text-white group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
              </div>
              <h1 className="font-urbanist text-sm sm:text-base font-700 text-white animate-delay-100 animate-fade-in" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                Write a Review
              </h1>
            </button>

            {businessInfo && (
              <button
                ref={infoButtonRef}
                onClick={() => {
                  if (isInfoModalOpen) {
                    setIsInfoModalOpen(false);
                  } else {
                    setIsInfoModalOpen(true);
                  }
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 min-h-[44px] min-w-[44px]"
                style={{ animation: 'gentlePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                aria-label="View business information"
              >
                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Business Info Modal */}
      {businessInfo && (
        <BusinessInfoModal
          businessInfo={businessInfo}
          buttonRef={infoButtonRef}
          isOpen={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
        />
      )}
    </>
  );
}
