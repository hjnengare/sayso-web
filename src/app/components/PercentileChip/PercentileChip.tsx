"use client";

import { Clock, DollarSign, Smile, Shield, CheckCircle } from "react-feather";
import { memo } from "react";

interface PercentileChipProps {
  label: string;
  value: number;
}

function PercentileChip({ label, value }: PercentileChipProps) {
  // Handle placeholder (0 value) with grayed out style
  const isPlaceholder = value === 0;
  const normalizedLabel = label.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
  
  // Get descriptive tooltip text for each percentile
  const getTooltipText = () => {
    if (isPlaceholder) {
      return `${label.charAt(0).toUpperCase() + label.slice(1).replace(/-/g, ' ')} insights coming soon`;
    }
    
    switch (normalizedLabel) {
      case 'punctuality':
        return `Punctuality: ${value}% - How well the business keeps appointments and meets deadlines`;
      case 'cost-effectiveness':
      case 'costeffectiveness':
      case 'cost':
        return `Cost Effectiveness: ${value}% - Value for money and fair pricing`;
      case 'friendliness':
        return `Friendliness: ${value}% - How welcoming and approachable the staff are`;
      case 'trustworthiness':
        return `Trustworthiness: ${value}% - Reliability, honesty, and credibility of the business`;
      default:
        return `${label.charAt(0).toUpperCase() + label.slice(1).replace(/-/g, ' ')}: ${value}%`;
    }
  };

  const tooltipText = getTooltipText();

  // Render icon based on label with coral stroke (outlined, not filled)
  const renderIcon = () => {
    const baseClasses = "w-2.5 h-2.5 flex-shrink-0 text-coral";

    switch (normalizedLabel) {
      case 'punctuality':
        return <Clock className={baseClasses} />;
      case 'cost-effectiveness':
      case 'costeffectiveness':
      case 'cost':
        return <DollarSign className={baseClasses} />;
      case 'friendliness':
        return <Smile className={baseClasses} />;
      case 'trustworthiness':
        return <Shield className={baseClasses} />;
      default:
        return <CheckCircle className={baseClasses} />;
    }
  };

  const icon = renderIcon();
  const percentageText = isPlaceholder ? '—' : `${value}%`;

  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltipText}
      aria-label={tooltipText}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 cursor-help group relative flex-shrink-0">
      <div 
        className="relative cursor-pointer"
        title={isPlaceholder ? tooltipText : `${value}%`}
      >
        {icon}
      </div>
      <span className={`text-[9px] sm:text-[10px] font-600 whitespace-nowrap leading-tight ${
        isPlaceholder ? 'text-charcoal/40' : 'text-charcoal'
      }`}>
        {percentageText}
      </span>
    </div>
  );
}

export default memo(PercentileChip);
