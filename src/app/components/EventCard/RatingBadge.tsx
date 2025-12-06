import { Star } from "react-feather";

interface RatingBadgeProps {
  rating: number;
}

export default function RatingBadge({ rating }: RatingBadgeProps) {
  return (
    <span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-[12px] bg-gradient-to-br from-off-white via-off-white to-off-white/90 backdrop-blur-xl px-2.5 py-1 text-charcoal border border-white/60 ring-1 ring-white/30">
      <Star className="w-3 h-3 text-coral fill-coral" />
      <span className="text-sm sm:text-xs font-semibold" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}
