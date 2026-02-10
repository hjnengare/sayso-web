"use client";

import Link from "next/link";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { useEffect } from "react";
import { Loader } from "../Loader/Loader";
import { 
  Utensils, 
  Sparkles, 
  Home, 
  Plane,
  Mountain, 
  Music, 
  Palette, 
  Heart, 
  ShoppingBag 
} from "lucide-react";

// Map interest IDs to Lucide React icons
const INTEREST_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'food-drink': Utensils,
  'beauty-wellness': Sparkles,
  'professional-services': Home,
  travel: Plane,
  'outdoors-adventure': Mountain,
  'experiences-entertainment': Music,
  'arts-culture': Palette,
  'family-pets': Heart,
  'shopping-lifestyle': ShoppingBag,
};

interface CategoryGridProps {
  onCategoryClick?: (categoryId: string) => void;
}

export default function CategoryGrid({ onCategoryClick }: CategoryGridProps) {
  const { interests, loadInterests } = useOnboarding();

  useEffect(() => {
    if (interests.length === 0) {
      loadInterests();
    }
  }, [interests.length, loadInterests]);

  if (interests.length === 0) {
    return (
      <div className="text-center py-12 text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        No categories available
      </div>
    );
  }

  const handleClick = (categoryId: string, e: React.MouseEvent) => {
    if (onCategoryClick) {
      e.preventDefault();
      onCategoryClick(categoryId);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
      {interests.map((interest) => (
        <Link
          key={interest.id}
          href={`/explore/category/${interest.id}`}
          onClick={(e) => handleClick(interest.id, e)}
          className="group relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md border border-white/60 ring-1 ring-white/30 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] text-center">
            {/* Lucide Icon */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 rounded-full bg-off-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300 p-2">
              {INTEREST_ICON_MAP[interest.id] ? (
                (() => {
                  const IconComponent = INTEREST_ICON_MAP[interest.id];
                  return <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-charcoal" />;
                })()
              ) : (
                <span className="text-2xl sm:text-3xl">📍</span>
              )}
            </div>
            
            <h3 
              className="text-body font-semibold text-charcoal mb-2 group-hover:text-navbar-bg transition-colors duration-300"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {interest.name}
            </h3>
            
            {interest.description && (
              <p 
                className="text-body-sm text-charcoal/60 line-clamp-2"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {interest.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

