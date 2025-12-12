import { Star } from "react-feather";

interface StarsProps {
  value?: number;
  color?: string;
  size?: number;
  spacing?: number;
}

export default function Stars({ value = 5, color = "amber", size = 15, spacing = 2 }: StarsProps) {
  const full = value !== undefined ? Math.max(0, Math.min(5, Math.floor(value))) : 0;
  const gradientId = "starGradient";

  return (
    <div
      className="flex items-center transition-transform duration-200"
      style={{ gap: `${spacing}px`, fontSize: size }}
      aria-label={`Rating: ${value !== undefined ? value.toFixed(1) : 'No rating'} out of 5`}
    >
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>
      {Array.from({ length: 5 }).map((_, i) => {
        const active = i < full;
        const starColor = color === "navbar-bg" ? "#722F37" : color === "coral/90" ? "#f87171" : "#f59e0b";
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center"
            style={{ width: size, height: size }}
            aria-hidden
          >
            <Star
              className="transition-all duration-200 shadow-md"
              style={{
                width: size,
                height: size,
                stroke: starColor,
                fill: active ? starColor : "transparent"
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
