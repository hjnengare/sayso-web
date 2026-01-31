import React from "react";
import PercentileChip from "../../PercentileChip/PercentileChip";

interface BusinessCardPercentilesProps {
  percentiles?: {
    punctuality?: number;
    'cost-effectiveness'?: number;
    friendliness?: number;
    trustworthiness?: number;
  };
}

const BusinessCardPercentiles: React.FC<BusinessCardPercentilesProps> = ({ percentiles }) => (
  <div className="flex items-center justify-between sm:justify-center gap-2 md:gap-3 md:bg-off-white/60 rounded-full flex-nowrap min-h-[28px] sm:min-h-[28px] py-1 overflow-hidden w-[90%] mx-auto md:mb-2">
    <PercentileChip label="punctuality" value={percentiles?.punctuality || 0} />
    <PercentileChip label="cost-effectiveness" value={percentiles?.['cost-effectiveness'] || 0} />
    <PercentileChip label="friendliness" value={percentiles?.friendliness || 0} />
    <PercentileChip label="trustworthiness" value={percentiles?.trustworthiness || 0} />
  </div>
);

export default BusinessCardPercentiles;
