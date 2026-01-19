"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Sparkles } from "lucide-react";

interface TagSelectorProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  availableTags: string[];
}

// Extended tags with categories for smart suggestions
const tagCategories = {
  service: ["Friendly", "Professional", "Helpful", "Attentive", "Responsive"],
  quality: ["Trustworthy", "Good Value", "High Quality", "Clean", "Well-maintained"],
  experience: ["On Time", "Quick Service", "Relaxing", "Fun", "Memorable"],
  recommend: ["Would Return", "Highly Recommend", "Worth the Price"],
};

// Flatten all tags for display
const allTags = Object.values(tagCategories).flat();

export default function TagSelector({ selectedTags, onTagToggle, availableTags }: TagSelectorProps) {
  // Use availableTags if provided, otherwise show defaults (limited to 4)
  const displayTags = useMemo(() => {
    if (availableTags.length > 0) {
      return availableTags.slice(0, 4);
    }
    return allTags.slice(0, 4);
  }, [availableTags]);

  const canSelectMore = selectedTags.length < 4;
  const selectedCount = selectedTags.length;

  return (
    <div className="mb-6">
      {/* Header with counter */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-coral/80" />
          <h3
            className="text-base font-semibold text-charcoal"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          >
            Quick tags
          </h3>
        </div>

        {/* Selected counter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-sm px-2.5 py-1 rounded-full ${
            selectedCount > 0
              ? 'bg-coral/20 text-coral'
              : 'bg-charcoal/10 text-charcoal/60'
          }`}
          style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
        >
          {selectedCount}/4 selected
        </motion.div>
      </div>

      {/* Tags Grid - Mobile optimized with wrap */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {displayTags.map((tag, index) => {
            const isSelected = selectedTags.includes(tag);
            const isDisabled = !isSelected && !canSelectMore;

            return (
              <motion.button
                key={tag}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                onClick={() => !isDisabled && onTagToggle(tag)}
                whileHover={!isDisabled ? { scale: 1.03 } : {}}
                whileTap={!isDisabled ? { scale: 0.97 } : {}}
                disabled={isDisabled}
                className={`
                  relative flex items-center gap-1.5 px-4 py-2.5 rounded-full border-2
                  text-base font-semibold transition-all duration-200 touch-manipulation
                  ${isSelected
                    ? "bg-coral/20 border-coral text-charcoal shadow-sm"
                    : isDisabled
                      ? "bg-charcoal/5 border-charcoal/10 text-charcoal/40 cursor-not-allowed"
                      : "bg-charcoal/5 border-charcoal/20 text-charcoal/70 hover:border-charcoal/40 hover:bg-charcoal/10"
                  }
                `}
                style={{
                  fontFamily: 'Urbanist, system-ui, sans-serif',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Selection indicator */}
                <AnimatePresence mode="wait">
                  {isSelected ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="w-3.5 h-3.5 text-coral" strokeWidth={3} />
                    </motion.span>
                  ) : !isDisabled ? (
                    <motion.span
                      key="plus"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                {tag}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Helper text */}
      {!canSelectMore && (
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-charcoal/60 text-center"
          style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
        >
          Tap a selected tag to remove it
        </motion.p>
      )}
    </div>
  );
}
