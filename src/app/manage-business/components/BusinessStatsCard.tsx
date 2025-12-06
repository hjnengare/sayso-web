import React from "react";
import { Store, MessageSquare, BarChart3 } from "lucide-react";

interface BusinessStatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: "sage" | "coral";
  delay?: number;
}

export function BusinessStatsCard({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  delay = 200 
}: BusinessStatsCardProps) {
  const colorClasses = {
    sage: {
      icon: "text-sage",
      bg: "bg-sage/20",
      gradient: "from-sage/10 to-transparent"
    },
    coral: {
      icon: "text-coral", 
      bg: "bg-coral/20",
      gradient: "from-coral/10 to-transparent"
    }
  };

  const classes = colorClasses[color];

  return (
    <div
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${classes.gradient} rounded-full blur-lg`} />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${classes.bg}`}>
            <Icon className={`w-4 h-4 ${classes.icon}`} />
          </div>
          <span className="font-urbanist text-sm font-600 text-charcoal">{label}</span>
        </div>
        <p className="font-urbanist text-2xl font-700 text-charcoal">{value}</p>
      </div>
    </div>
  );
}
