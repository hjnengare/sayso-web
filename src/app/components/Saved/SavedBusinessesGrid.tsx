"use client";

import { memo, useMemo, useState } from "react";
import { BookmarkCheck, Filter } from "lucide-react";
import BusinessCard, { Business } from "../BusinessCard/BusinessCard";

interface SavedBusinessesGridProps {
  savedBusinesses: Business[];
}

function SavedBusinessesGrid({ savedBusinesses }: SavedBusinessesGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ["All", ...new Set(savedBusinesses.map(b => b.category))];
    return cats;
  }, [savedBusinesses]);

  // Filter businesses by category
  const filteredBusinesses = useMemo(() => {
    if (selectedCategory === "All") return savedBusinesses;
    return savedBusinesses.filter(b => b.category === selectedCategory);
  }, [savedBusinesses, selectedCategory]);

  // Memoize the business cards to prevent unnecessary re-renders
  const businessCards = useMemo(() => {
    return filteredBusinesses.map((business, index) => (
      <div
        key={business.id}
        className="relative group"
        style={{
          animationDelay: `${index * 50}ms`,
        }}
      >
        <BusinessCard business={business} inGrid={true} />
        {/* Saved indicator - more subtle */}
        <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-br from-sage to-sage/80 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/40 z-10 opacity-90 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
          <BookmarkCheck className="w-4 h-4 text-white" fill="white" />
        </div>
      </div>
    ));
  }, [filteredBusinesses]);

  return (
    <div className="space-y-6">
      {/* Category filters */}
      {categories.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="w-4 h-4 text-charcoal/50 flex-shrink-0" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-4 py-2 rounded-full font-urbanist text-sm font-500 whitespace-nowrap
                transition-all duration-300 flex-shrink-0
                ${selectedCategory === category
                  ? "bg-gradient-to-r from-sage to-sage/80 text-white scale-105 border border-white/30"
                  : "bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal"
                }
              `}
            >
              {category}
              {category !== "All" && (
                <span className="ml-2 text-sm sm:text-xs opacity-70">
                  ({savedBusinesses.filter(b => b.category === category).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 list-none">
        {businessCards}
      </div>

      {filteredBusinesses.length === 0 && selectedCategory !== "All" && (
        <div className="text-center py-12">
          <p className="font-urbanist text-sm text-charcoal/60">
            No saved businesses in this category yet
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(SavedBusinessesGrid);
