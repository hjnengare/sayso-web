"use client";

import type { CSSProperties, ReactNode } from "react";
import { CheckCircle, DollarSign, Globe, Mail, MapPin, Phone, Clock, Award, Star } from "lucide-react";
import { Text } from '@/components/atoms/Text';
import type { BusinessInfo } from "./BusinessInfoModal";

interface BusinessInfoAsideProps {
  businessInfo: BusinessInfo;
  className?: string;
  stacked?: boolean; // If true, items stack vertically instead of grid
}

const sectionTitleStyle: CSSProperties = {
  fontFamily: '"Urbanist", system-ui, sans-serif',
};

const formatPriceRangeDisplay = (priceRange?: string | null): string => {
  if (!priceRange) return "";
  return priceRange.includes("$") ? priceRange.replace(/\$/g, "R") : priceRange;
};

export default function BusinessInfoAside({ businessInfo, className = "", stacked = false }: BusinessInfoAsideProps) {
  const infoRows: Array<{
    icon: ReactNode;
    label: string;
    value?: string | null;
    render?: () => React.ReactNode;
  }> = [
    {
      icon: <CheckCircle className="w-4 h-4 text-charcoal/85" />,
      label: "Verification",
      render: () => (
        <Text variant="body-sm" color={businessInfo.verified ? "sage" : "secondary"} className="font-semibold">
          {businessInfo.verified ? "Verified Business" : "Not Verified"}
        </Text>
      ),
    },
    {
      icon: <MapPin className="w-4 h-4 text-charcoal/85" />,
      label: "Location",
      value: businessInfo.location,
    },
    {
      icon: <MapPin className="w-4 h-4 text-charcoal/85" />,
      label: "Address",
      value: businessInfo.address,
    },
    {
      icon: <Phone className="w-4 h-4 text-charcoal/85" />,
      label: "Phone",
      render: () =>
        businessInfo.phone ? (
          <a
            href={`tel:${businessInfo.phone}`}
            className="hover:text-coral transition-colors"
          >
            <Text variant="body-sm" color="primary" className="font-semibold">
              {businessInfo.phone}
            </Text>
          </a>
        ) : (
          <Text variant="body-sm" color="secondary" className="italic">Phone number not provided</Text>
        ),
    },
    {
      icon: <Mail className="w-4 h-4 text-charcoal/85" />,
      label: "Email",
      render: () =>
        businessInfo.email ? (
          <a
            href={`mailto:${businessInfo.email}`}
            className="break-all hover:text-coral transition-colors"
          >
            <Text variant="body-sm" color="primary" className="font-semibold">
              {businessInfo.email}
            </Text>
          </a>
        ) : (
          <Text variant="body-sm" color="secondary" className="italic">Email not provided</Text>
        ),
    },
    {
      icon: <Globe className="w-4 h-4 text-charcoal/85" />,
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
            className="inline-flex items-center rounded-full bg-navbar-bg px-3 py-1.5 text-body-sm text-white hover:bg-navbar-bg/90 transition-colors font-urbanist"
            aria-label="View business website (opens in a new tab)"
          >
            View Website
          </a>
        ) : (
          <Text variant="body-sm" color="secondary" className="italic">Website not provided</Text>
        ),
    },
    {
      icon: <DollarSign className="w-4 h-4 text-charcoal/85" />,
      label: "Price Range",
      value: formatPriceRangeDisplay(businessInfo.price_range),
    },
  ];

  const sectionClasses =
    "rounded-[12px] bg-gradient-to-br from-card-bg via-card-bg/98 to-card-bg/95 backdrop-blur-xl border-none p-6 sm:p-8 md:p-10 space-y-8 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]";

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
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                <Award className="w-3 h-3 text-charcoal/85" />
              </span>
              <Text variant="caption" color="secondary" className="uppercase tracking-[0.2em] font-bold">Business Information</Text>
            </div>
            {businessInfo.verified && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-sage/20 to-sage/10 border border-sage/30">
                <CheckCircle size={16} className="text-sage" />
                <Text variant="caption" color="sage" className="font-bold">Verified</Text>
              </div>
            )}
          </div>
          <div style={sectionTitleStyle}>
            <Text variant="h2" color="primary" className="leading-tight">
              {businessInfo.name || "Business Information"}
            </Text>
          </div>
          {businessInfo.category && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-sage/40 bg-gradient-to-r from-sage/15 via-sage/8 to-transparent">
              <Text variant="body-sm" color="sage" className="font-bold">{businessInfo.category}</Text>
            </div>
          )}
          {businessInfo.description && (
            <Text variant="body" color="secondary" className="leading-relaxed pt-2">
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
            </Text>
          )}
        </header>

        {/* Premium Info Grid - Stacked on write-review page */}
        <div className={stacked ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
          {infoRows.map((row, index) => (
            <div 
              key={row.label} 
              className="group relative p-4 rounded-[12px] bg-gradient-to-br from-white/30 via-white/20 to-white/10 border-none backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:shadow-lg hover:scale-[1.02]"
              style={{
                animationDelay: `${index * 0.05}s`,
              }}
            >
              {/* Card gradient overlay on hover */}
              <div className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-sage/5 to-coral/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex gap-4">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                  {row.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <Text variant="caption" color="secondary" className="font-bold uppercase tracking-wider mb-2">
                    {row.label}
                  </Text>
                  {row.render ? (
                    <div>
                      {row.render()}
                    </div>
                  ) : (
                    <Text
                      variant="body-sm"
                      color={row.value ? "primary" : "secondary"}
                      className={row.value ? "font-semibold" : "italic"}
                    >
                      {row.value || "Not provided"}
                    </Text>
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

