"use client";

import { CheckCircle } from "lucide-react";

interface DealBreaker {
  id: string;
  label: string;
  description: string;
  icon: string;
}

interface DealBreakerCardProps {
  dealbreaker: DealBreaker;
  isSelected: boolean;
  isDisabled?: boolean;
  onToggle: (id: string) => void;
  index: number;
  IconComponent: React.ComponentType<{ className?: string }>;
}

export default function DealBreakerCard({ 
  dealbreaker, 
  isSelected, 
  isDisabled = false,
  onToggle, 
  index, 
  IconComponent 
}: DealBreakerCardProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  return (
    <div
      className={`
        enter-stagger
        perspective-1000
        ${isSelected ? 'scale-105' : 'scale-100'}
        transition-transform duration-300 ease-out
      `}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div
        className={`
          relative w-full h-32
          ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${isSelected ? 'flip' : ''}
        `}
        onClick={() => !isDisabled && onToggle(dealbreaker.id)}
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s',
          transform: isSelected ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front of card - Text only */}
        <div
          className={`
            absolute inset-0 w-full h-full rounded-lg border-2 p-4 flex flex-col justify-center items-center text-center
            ${isDisabled 
              ? 'bg-charcoal/5 border-charcoal/10 ring-1 ring-charcoal/10' 
              : 'bg-gradient-to-br from-sage/10 to-sage/5 border-sage/30 hover:border-sage/50 ring-1 ring-sage/20 hover:ring-sage/30'
            }
            backdrop-blur-sm
            transition-all duration-200
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <h3 className="text-base font-semibold text-charcoal mb-2" style={sfPro}>
            {dealbreaker.label}
          </h3>
          <p className="text-sm sm:text-xs text-charcoal/60 leading-relaxed px-2" style={sfPro}>
            {dealbreaker.description}
          </p>
        </div>

        {/* Back of card - Icon only */}
        <div
          className={`
            absolute inset-0 w-full h-full rounded-lg border-2 p-4 flex flex-col justify-center items-center text-center
            bg-gradient-to-br from-coral to-coral/90 border-coral ring-1 ring-coral/30 backdrop-blur-sm
          `}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/20 mb-3">
            <IconComponent className="h-8 w-8 text-white" />
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
            <CheckCircle className="h-4 w-4 text-coral" />
          </div>
        </div>
      </div>
    </div>
  );
}
