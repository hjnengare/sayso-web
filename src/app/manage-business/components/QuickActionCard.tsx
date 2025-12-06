import React from "react";
import Link from "next/link";
import { Plus, BarChart3 } from "lucide-react";

interface QuickActionCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: "sage" | "coral";
  delay?: number;
}

export function QuickActionCard({ 
  href, 
  icon: Icon, 
  title, 
  description, 
  color, 
  delay = 0 
}: QuickActionCardProps) {
  const colorClasses = {
    sage: {
      icon: "text-sage",
      bg: "bg-sage/20",
      hover: "hover:bg-sage/30",
      gradient: "from-sage/10 to-transparent",
      hoverGradient: "hover:from-sage/5 hover:to-sage/10"
    },
    coral: {
      icon: "text-coral",
      bg: "bg-coral/20", 
      hover: "hover:bg-coral/30",
      gradient: "from-coral/10 to-transparent",
      hoverGradient: "hover:from-coral/5 hover:to-coral/10"
    }
  };

  const classes = colorClasses[color];

  return (
    <Link
      href={href}
      className={`bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-6 relative overflow-hidden ${classes.hoverGradient} transition-all duration-300 group animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${classes.gradient} rounded-full blur-lg`} />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ${classes.bg}`}>
            <Icon className={`w-5 h-5 ${classes.icon}`} />
          </div>
          <h4 className="font-urbanist font-600 text-charcoal">{title}</h4>
        </div>
        <p className="font-urbanist text-sm text-charcoal/70">{description}</p>
      </div>
    </Link>
  );
}
