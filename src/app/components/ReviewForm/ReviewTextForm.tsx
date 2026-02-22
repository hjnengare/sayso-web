"use client";

import { useState, useRef, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Type, MessageSquare, Lightbulb } from "lucide-react";

interface ReviewTextFormProps {
  reviewTitle: string;
  reviewText: string;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
}

// Smart writing prompts based on what's missing
const writingPrompts = [
  "What did you enjoy most?",
  "How was the service?",
  "Would you recommend this place?",
  "Any tips for others?",
];

export default function ReviewTextForm({
  reviewTitle,
  reviewText,
  onTitleChange,
  onTextChange,
}: ReviewTextFormProps) {
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isTextFocused, setIsTextFocused] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate prompts every 4 seconds when textarea is empty
  useEffect(() => {
    if (reviewText.length === 0 && !isTextFocused) {
      const interval = setInterval(() => {
        setCurrentPrompt((prev) => (prev + 1) % writingPrompts.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [reviewText.length, isTextFocused]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [reviewText]);

  const charCount = reviewText.length;
  const minChars = 10;
  const maxChars = 5000;
  const isValid = charCount >= minChars;
  const isNearLimit = charCount > 4500;

  return (
    <div className="mb-6 space-y-4">
      {/* Review Title */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Type className="w-4 h-4 text-charcoal/60" />
          <label
            className="text-base font-semibold text-charcoal"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          >
            Title
            <span className="ml-1 text-sm font-normal text-charcoal/40">(optional)</span>
          </label>
        </div>

        <m.div
          animate={{
            scale: isTitleFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <input
            type="text"
            value={reviewTitle}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 200) {
                onTitleChange(value);
              }
            }}
            onFocus={() => setIsTitleFocused(true)}
            onBlur={() => setIsTitleFocused(false)}
            placeholder="Summarize your experience..."
            maxLength={200}
            className={`
              w-full bg-white/95 border-2 rounded-full px-5 py-3.5
              text-base font-semibold text-charcoal placeholder-charcoal/40
              focus:outline-none transition-all duration-200
              ${isTitleFocused
                ? 'border-coral/50 ring-2 ring-coral/20'
                : 'border-white/60 hover:border-white/80'
              }
            `}
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          />
        </m.div>
      </div>

      {/* Review Text */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-charcoal/60" />
            <label
              className="text-base font-semibold text-charcoal"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              Your review
            </label>
          </div>

          {/* Character counter */}
          <m.span
            animate={{
              color: isNearLimit ? '#E88D67' : charCount < minChars ? 'rgba(45,52,54,0.4)' : 'rgba(45,52,54,0.6)',
            }}
            className="text-sm font-medium"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          >
            {charCount}/{maxChars}
          </m.span>
        </div>

        <m.div
          animate={{
            scale: isTextFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <textarea
            ref={textareaRef}
            value={reviewText}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= maxChars) {
                onTextChange(value);
              }
            }}
            onInput={(e) => {
              const value = (e.target as HTMLTextAreaElement).value;
              const truncated = value.length > maxChars ? value.substring(0, maxChars) : value;
              if (truncated !== reviewText) {
                onTextChange(truncated);
              }
            }}
            onFocus={() => setIsTextFocused(true)}
            onBlur={() => setIsTextFocused(false)}
            placeholder="Share your experience with others..."
            maxLength={maxChars}
            rows={4}
            className={`
              w-full bg-white/95 border-2 rounded-[12px] px-5 py-4
              text-base font-medium text-charcoal placeholder-charcoal/40
              focus:outline-none transition-all duration-200 resize-none
              min-h-[120px]
              ${isTextFocused
                ? 'border-coral/50 ring-2 ring-coral/20'
                : 'border-white/60 hover:border-white/80'
              }
            `}
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          />

          {/* Smart writing prompt */}
          <AnimatePresence mode="wait">
            {reviewText.length === 0 && !isTextFocused && (
              <m.div
                key={currentPrompt}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-4 left-4 right-4 flex items-center gap-2 pointer-events-none"
              >
                <Lightbulb className="w-4 h-4 text-coral/60 flex-shrink-0" />
                <span
                  className="text-sm text-charcoal/60"
                  style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                >
                  Tip: {writingPrompts[currentPrompt]}
                </span>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>

        {/* Validation message */}
        <AnimatePresence>
          {charCount > 0 && charCount < minChars && (
            <m.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 px-1 text-sm text-coral/80"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              {minChars - charCount} more character{minChars - charCount !== 1 ? 's' : ''} needed
            </m.p>
          )}
        </AnimatePresence>

        {/* Progress bar for minimum characters */}
        {charCount > 0 && charCount < minChars && (
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <m.div
              className="h-full bg-coral/60 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(charCount / minChars) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
