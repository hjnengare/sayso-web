import React from "react";
import { getCategoryIcon } from "../../../components/BusinessCard/BusinessCard";

interface BusinessCardCategoryProps {
  category: string;
  subInterestId?: string;
  subInterestLabel?: string;
  displayCategoryLabel: string;
}

const BusinessCardCategory: React.FC<BusinessCardCategoryProps> = ({
  category,
  subInterestId,
  subInterestLabel,
  displayCategoryLabel,
}) => {
  const CategoryIcon = getCategoryIcon(category, subInterestId, subInterestLabel);
  return (
    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5">
      <div className="w-8 h-8 rounded-full bg-off-white/20 flex items-center justify-center flex-shrink-0">
        <CategoryIcon className="w-4 h-4 text-charcoal/70" strokeWidth={2.5} />
      </div>
      <span
        className="truncate text-caption sm:text-xs text-charcoal/80 font-semibold"
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          fontWeight: 600,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
          letterSpacing: '0.01em',
        }}
      >
        {displayCategoryLabel}
      </span>
    </div>
  );
};

export default BusinessCardCategory;
