"use client";

import type { CSSProperties, ReactNode } from "react";
import { CheckCircle, DollarSign, Globe, Mail, MapPin, Phone, Clock, Award, Star } from "react-feather";
import type { BusinessInfo } from "./BusinessInfoModal";

interface BusinessInfoAsideProps {
  businessInfo: BusinessInfo;
  className?: string;
  stacked?: boolean; // If true, items stack vertically instead of grid
}

const sectionTitleStyle: CSSProperties = {
  fontFamily: '"Urbanist", system-ui, sans-serif',
};

export default function BusinessInfoAside({ businessInfo, className = "", stacked = false }: BusinessInfoAsideProps) {
  const infoRows: Array<{
    icon: ReactNode;
    label: string;
    value?: string | null;
    render?: () => React.ReactNode;
  }> = [
    {
      icon: (
        <CheckCircle
          className={`w-5 h-5 flex-shrink-0 ${
            businessInfo.verified ? "text-navbar-bg" : "text-navbar-bg/40"
          }`}
          strokeWidth={2.5}
        />
      ),
      label: "Verification",
      render: () => (
        <span className={`text-sm font-semibold ${businessInfo.verified ? "text-sage" : "text-charcoal/60"}`}>
          {businessInfo.verified ? "Verified Business" : "Not Verified"}
        </span>
      ),
    },
    {
      icon: <MapPin className="w-5 h-5 flex-shrink-0 text-navbar-bg" strokeWidth={2.5} />,
      label: "Location",
      value: businessInfo.location,
    },
    {
      icon: <MapPin className="w-5 h-5 flex-shrink-0 text-navbar-bg" strokeWidth={2.5} />,
      label: "Address",
      value: businessInfo.address,
    },
    {
      icon: <Phone className="w-5 h-5 flex-shrink-0 text-navbar-bg" strokeWidth={2.5} />,
      label: "Phone",
      render: () =>
        businessInfo.phone ? (
          <a
            href={`tel:${businessInfo.phone}`}
            className="text-sm font-semibold text-charcoal/90"
          >
            {businessInfo.phone}
          </a>
        ) : (
          <span className="text-sm italic text-charcoal/40">Phone number not provided</span>
        ),
    },
    {
      icon: <Mail className="w-5 h-5 flex-shrink-0 text-navbar-bg" strokeWidth={2.5} />,
      label: "Email",
      render: () =>
        businessInfo.email ? (
          <a
            href={`mailto:${businessInfo.email}`}
            className="text-sm font-semibold text-charcoal/90 break-all"
          >
            {businessInfo.email}
          </a>
        ) : (
          <span className="text-sm italic text-charcoal/40">Email not provided</span>
        ),
    },
    {
      icon: <Globe className="w-5 h-5 flex-shrink-0 text-navbar-bg" strokeWidth={2.5} />,
      label: "Website",
      render: () =>
        businessInfo.website ? (
          <a
            href={
              businessInfo.website.startsWith("http")
                ? businessInfo.website
                : `https://${businessInfo.website}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-charcoal/90 break-all"
          >
            {businessInfo.website}
          </a>
        ) : (
          <span className="text-sm italic text-charcoal/40">Website not provided</span>
        ),
    },
    {
      icon: <DollarSign className="w-5 h-5 flex-shrink-0 text-navbar-bg" strokeWidth={2.5} />,
      label: "Price Range",
      value: businessInfo.price_range,
    },
  ];

  const sectionClasses =
    "rounded-[20px] bg-gradient-to-br from-card-bg via-card-bg/98 to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[24px] p-6 sm:p-8 md:p-10 space-y-8 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]";

  return (
    <section
      className={`${sectionClasses} ${className}`}
      aria-labelledby="business-info-heading"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* Premium gradient overlays */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sage/20 via-sage/10 to-transparent rounded-full blur-3xl opacity-70"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-coral/20 via-coral/10 to-transparent rounded-full blur-3xl opacity-70"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-sage/8 to-coral/8 rounded-full blur-3xl opacity-50"></div>
      
      <div className="relative z-10">
        {/* Premium Header */}
        <header className="space-y-4 pb-6 border-b border-white/30 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-sage" strokeWidth={2.5} />
              <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal/60 font-bold">Business Information</p>
            </div>
            {businessInfo.verified && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-sage/20 to-sage/10 border border-sage/30">
                <CheckCircle className="w-4 h-4 text-sage" strokeWidth={2.5} />
                <span className="text-xs font-bold text-sage">Verified</span>
              </div>
            )}
          </div>
          <h2 id="business-info-heading" className="text-2xl sm:text-3xl font-bold text-charcoal leading-tight" style={sectionTitleStyle}>
            {businessInfo.name || "Business Information"}
          </h2>
          {businessInfo.category && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-sage/40 bg-gradient-to-r from-sage/15 via-sage/8 to-transparent">
              <span className="text-sm font-bold text-sage">{businessInfo.category}</span>
            </div>
          )}
          {businessInfo.description && (
            <p className="text-sm sm:text-base text-charcoal/80 leading-relaxed pt-2">
              {(() => {
                const desc = businessInfo.description;
                if (!desc) return null;
                if (typeof desc === 'string') return desc;
                if (typeof desc === 'object' && desc !== null) {
                  const descObj = desc as { friendly?: string; raw?: string };
                  return descObj.friendly || descObj.raw || '';
                }
                return '';
              })()}
            </p>
          )}
        </header>

        {/* Premium Info Grid - Stacked on write-review page */}
        <div className={stacked ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
          {infoRows.map((row, index) => (
            <div 
              key={row.label} 
              className="group relative p-4 rounded-[20px] bg-gradient-to-br from-white/30 via-white/20 to-white/10 border border-white/40 backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:shadow-lg hover:scale-[1.02]"
              style={{
                animationDelay: `${index * 0.05}s`,
              }}
            >
              {/* Card gradient overlay on hover */}
              <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-sage/5 to-coral/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex gap-4">
                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-white/60 via-white/40 to-white/30 border border-white/70 shadow-md grid place-items-center flex-shrink-0 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-charcoal/70 mb-2 uppercase tracking-wider" style={sectionTitleStyle}>
                    {row.label}
                  </p>
                  {row.render ? (
                    <div className="text-sm font-semibold">
                      {row.render()}
                    </div>
                  ) : (
                    <p
                      className={`text-sm sm:text-base font-semibold ${
                        row.value ? "text-charcoal" : "italic text-charcoal/50"
                      }`}
                    >
                      {row.value || "Not provided"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

