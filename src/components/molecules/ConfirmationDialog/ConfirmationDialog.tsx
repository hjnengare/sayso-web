'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'react-feather';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  requireConfirmText?: string; // If provided, user must type this to confirm
  error?: string | null; // Error message to display
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  requireConfirmText,
  error,
}) => {
  const [confirmInput, setConfirmInput] = React.useState('');

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Reset confirm input when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (requireConfirmText && confirmInput !== requireConfirmText) {
      return;
    }
    onConfirm();
  };

  const canConfirm = !requireConfirmText || confirmInput === requireConfirmText;

  const variantStyles = {
    danger: {
      icon: 'bg-coral/20 text-coral',
      button: 'bg-gradient-to-br from-coral to-coral/90 hover:from-coral/90 hover:to-coral/80 text-white',
    },
    warning: {
      icon: 'bg-amber-500/20 text-amber-600',
      button: 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white',
    },
    info: {
      icon: 'bg-sage/20 text-sage',
      button: 'bg-gradient-to-br from-sage to-sage/90 hover:from-sage/90 hover:to-sage/80 text-white',
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - No blur overlay, just a subtle transparent background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-charcoal/20 z-[9998]"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                duration: 0.4,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Content */}
              <div className="p-6 sm:p-8">
                {/* Icon */}
                <div className="flex items-center justify-center mb-4">
                  <div className={`w-16 h-16 ${styles.icon} rounded-full flex items-center justify-center`}>
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-charcoal text-center mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  {title}
                </h3>

                {/* Message */}
                <p className="text-sm text-charcoal/80 text-center mb-6" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  {message}
                </p>

                {/* Confirm Input (if required) */}
                {requireConfirmText && (
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Type <span className="font-mono bg-sage/20 text-charcoal px-2 py-1 rounded">{requireConfirmText}</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg text-sm text-charcoal border border-charcoal/20 bg-white focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                      placeholder={requireConfirmText}
                      autoFocus
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-3 rounded-lg bg-coral/10 border border-coral/30">
                    <p className="text-xs text-coral">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-6 py-3 rounded-full text-sm font-semibold bg-charcoal/10 text-charcoal hover:bg-charcoal/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading || !canConfirm}
                    className={`flex-1 px-6 py-3 rounded-full text-sm font-semibold ${styles.button} transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {isLoading ? 'Processing...' : confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

