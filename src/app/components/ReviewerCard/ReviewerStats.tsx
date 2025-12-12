import { MapPin } from "lucide-react";

interface ReviewerStatsProps {
  reviewCount: number;
  location: string;
}

export default function ReviewerStats({
  reviewCount,
  location,
}: ReviewerStatsProps) {
  return (
    <div className="text-sm sm:text-xs text-charcoal/70 space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="font-urbanist font-semibold" style={{ fontWeight: 600 }}>{reviewCount} reviews</span>
      </div>

      <div className="flex items-center gap-1.5">
        <MapPin
          size={12}
          className="text-charcoal/60"
          strokeWidth={2.5}
          aria-hidden="true"
        />
        <span className="font-urbanist font-semibold" style={{ fontWeight: 600 }}>{location}</span>
      </div>
    </div>
  );
}
