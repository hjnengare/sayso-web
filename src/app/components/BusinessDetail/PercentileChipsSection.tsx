"use client";

import { Clock, Smile, Shield } from "lucide-react";
import { memo } from "react";
import { motion } from "framer-motion";

interface PercentileChipsSectionProps {
  punctuality?: number;
  costEffectiveness?: number;
  friendliness?: number;
  trustworthiness?: number;
}

function PercentileChipsSection({
  punctuality = 0,
  costEffectiveness = 0,
  friendliness = 0,
  trustworthiness = 0,
}: PercentileChipsSectionProps) {
  const metrics = [
    {
      label: "Punctuality",
      value: punctuality,
      icon: Clock,
      tooltip: "How well the business keeps appointments and meets deadlines",
    },
    {
      label: "Value for Money",
      value: costEffectiveness,
      icon: null, // Custom "R" icon for Rands
      tooltip: "Fair pricing and value for the service provided",
    },
    {
      label: "Friendliness",
      value: friendliness,
      icon: Smile,
      tooltip: "How welcoming and approachable the staff are",
    },
    {
      label: "Trustworthiness",
      value: trustworthiness,
      icon: Shield,
      tooltip: "Reliability, honesty, and credibility of the business",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full rounded-[20px] border border-white/60 backdrop-blur-xl bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 shadow-md p-5 sm:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-charcoal flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
          Performance Insights
        </h3>
        <span className="text-xs text-charcoal/50 font-medium">Based on reviews</span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPlaceholder = metric.value === 0;
          
          // Calculate color intensity based on value
          const getColor = (value: number) => {
            if (value === 0) return "text-charcoal/30";
            if (value >= 80) return "text-green-600";
            if (value >= 60) return "text-sage";
            if (value >= 40) return "text-amber-600";
            return "text-coral";
          };

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              title={
                isPlaceholder
                  ? `${metric.label} insights coming soon`
                  : metric.tooltip
              }
              className="group relative flex flex-col items-center justify-center gap-2 p-4 sm:p-3.5 rounded-[16px] bg-white/40 hover:bg-white/60 transition-all duration-200 cursor-help border border-white/30"
            >
              {Icon ? (
                <Icon
                  className={`w-6 h-6 sm:w-5 sm:h-5 transition-colors ${
                    getColor(metric.value)
                  }`}
                />
              ) : (
                <span className={`text-2xl sm:text-xl font-bold transition-colors ${
                  getColor(metric.value)
                }`}>
                  R
                </span>
              )}
              <div className="text-center">
                <p className="text-xs font-medium text-charcoal/70 line-clamp-2 h-5">
                  {metric.label}
                </p>
                <p
                  className={`text-base sm:text-lg font-bold tracking-tight ${
                    isPlaceholder ? "text-charcoal/30" : "text-charcoal"
                  }`}
                >
                  {isPlaceholder ? "—" : `${metric.value}%`}
                </p>
              </div>

              {/* Premium Tooltip */}
              {!isPlaceholder && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 bg-charcoal text-white text-xs font-medium rounded-lg px-2.5 py-1.5 whitespace-nowrap pointer-events-none shadow-lg">
                  {metric.tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-charcoal transform rotate-45" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center pt-2 border-t border-white/30">
        <p className="text-xs text-charcoal/60 font-medium">
          ✓ Community verified metrics from verified reviews
        </p>
      </div>
    </motion.div>
  );
}

export default memo(PercentileChipsSection);
