"use client";

import type { CSSProperties, ReactNode } from "react";
import { CheckCircle, DollarSign, Globe, Mail, MapPin, Phone } from "react-feather";
import type { BusinessInfo } from "./BusinessInfoModal";

interface BusinessInfoAsideProps {
  businessInfo: BusinessInfo;
  className?: string;
}

const sectionTitleStyle: CSSProperties = {
  fontFamily: '"Urbanist", system-ui, sans-serif',
};

export default function BusinessInfoAside({ businessInfo, className = "" }: BusinessInfoAsideProps) {
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

  const asideClasses =
    "rounded-2xl bg-gradient-to-br from-card-bg via-card-bg/98 to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[24px] p-6 sm:p-7 space-y-6 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]";

  return (
    <aside
      className={`${asideClasses} ${className}`}
      aria-labelledby="business-info-heading"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* Premium gradient overlays */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-sage/15 via-sage/8 to-transparent rounded-full blur-2xl opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-coral/15 via-coral/8 to-transparent rounded-full blur-2xl opacity-60"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-sage/5 to-coral/5 rounded-full blur-3xl opacity-40"></div>
      
      <div className="relative z-10">
      <header className="space-y-3 pb-4 border-b border-white/20 mb-4">
        <div className="flex items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/50 font-bold letter-spacing-wide">Business Info</p>
        </div>
        <h2 id="business-info-heading" className="text-xl sm:text-2xl font-bold text-charcoal leading-tight" style={sectionTitleStyle}>
          {businessInfo.name || "Business Information"}
        </h2>
        <p className={`text-sm text-charcoal/75 leading-relaxed ${businessInfo.description ? "" : "italic text-charcoal/40"}`}>
          {businessInfo.description || "No description available."}
        </p>
        {businessInfo.category && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sage/30 bg-gradient-to-r from-sage/10 via-sage/5 to-transparent text-xs font-bold text-white shadow-sm">
            <span>{businessInfo.category}</span>
          </div>
        )}
      </header>

      <ul className="space-y-3">
        {infoRows.map((row, index) => (
          <li 
            key={row.label} 
            className="flex gap-4 p-3 rounded-xl bg-white/20 border border-white/30"
            style={{
              animationDelay: `${index * 0.05}s`,
            }}
          >
            <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/50 via-white/30 to-white/20 border border-white/60 shadow-sm grid place-items-center flex-shrink-0 backdrop-blur-sm">
              {row.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-charcoal/60 mb-1 uppercase tracking-wide" style={sectionTitleStyle}>
                {row.label}
              </p>
              {row.render ? (
                <div>
                  {row.render()}
                </div>
              ) : (
                <p
                  className={`text-sm font-medium ${
                    row.value ? "text-charcoal/90" : "italic text-charcoal/40"
                  }`}
                >
                  {row.value || "Not provided"}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      </div>
    </aside>
  );
}

