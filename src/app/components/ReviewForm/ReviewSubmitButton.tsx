"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, AlertCircle } from "lucide-react";

interface ReviewSubmitButtonProps {
  isFormValid: boolean;
  onSubmit: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export default function ReviewSubmitButton({
  isFormValid,
  onSubmit,
  isSubmitting = false,
  error = null,
}: ReviewSubmitButtonProps) {
  const touchStartTime = useRef<number | null>(null);
  const lastTouchEnd = useRef<number | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Scroll error into view when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current.focus();
    }
  }, [error]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent click if it was triggered by a recent touch (mobile devices)
    if (lastTouchEnd.current && Date.now() - lastTouchEnd.current < 500) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (!isFormValid || isSubmitting) {
      return;
    }
    onSubmit();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!isFormValid || isSubmitting) {
      e.preventDefault();
      return;
    }
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isFormValid || isSubmitting) {
      touchStartTime.current = null;
      return;
    }

    // Only submit if this was a quick tap (not a scroll)
    const touchDuration = touchStartTime.current ? Date.now() - touchStartTime.current : 0;
    if (touchDuration < 300) {
      lastTouchEnd.current = Date.now();
      onSubmit();
    }

    touchStartTime.current = null;
  };

  return (
    <div className="pt-2 space-y-4">
      {/* Inline Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            ref={errorRef}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            role="alert"
            tabIndex={-1}
            className="flex items-start gap-3 p-4 rounded-[12px] bg-coral/10 border border-coral/30 text-charcoal"
            style={{
              fontFamily: 'Urbanist, system-ui, sans-serif',
            }}
          >
            <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={!isFormValid || isSubmitting}
        whileHover={isFormValid && !isSubmitting ? { scale: 1.02 } : {}}
        whileTap={isFormValid && !isSubmitting ? { scale: 0.98 } : {}}
        className={`
          w-full py-4 px-6 rounded-full text-lg font-bold
          transition-all duration-300 relative overflow-hidden
          touch-manipulation min-h-[56px] flex items-center justify-center gap-2
          ${isFormValid && !isSubmitting
            ? "bg-gradient-to-r from-coral to-coral/90 text-white shadow-lg shadow-coral/25 hover:shadow-xl hover:shadow-coral/30"
            : "bg-charcoal/10 text-charcoal/60 cursor-not-allowed"
          }
        `}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          fontFamily: 'Urbanist, system-ui, sans-serif',
        }}
        aria-disabled={!isFormValid || isSubmitting}
      >
        {/* Background gradient animation */}
        {isFormValid && !isSubmitting && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut',
            }}
          />
        )}

        <AnimatePresence mode="wait">
          {isSubmitting ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting...</span>
            </motion.span>
          ) : (
            <motion.span
              key="submit"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10 flex items-center gap-2"
            >
              <span>Submit Review</span>
              {isFormValid && (
                <motion.span
                  initial={{ x: -4, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Send className="w-4 h-4" />
                </motion.span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Helper text when form is invalid */}
      <AnimatePresence>
        {!isFormValid && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 text-center text-sm text-charcoal/60"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          >
            Add a rating and at least 10 characters to submit
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
