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
      icon: 'bg-navbar-bg/20 text-navbar-bg',
      button: 'bg-navbar-bg hover:bg-navbar-bg/90 text-white',
    },
    warning: {
      icon: 'bg-navbar-bg/20 text-navbar-bg',
      button: 'bg-navbar-bg hover:bg-navbar-bg/90 text-white',
    },
    info: {
      icon: 'bg-blue-500/20 text-blue-500',
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-charcoal/60 z-[9998]"
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
              className="bg-card-bg rounded-lg shadow-lg max-w-md w-full relative border border-white/30"
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
                <h3 className="text-xl font-bold text-white text-center mb-3">
                  {title}
                </h3>

                {/* Message */}
                <p className="text-sm text-white/90 text-center mb-6">
                  {message}
                </p>

                {/* Confirm Input (if required) */}
                {requireConfirmText && (
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-white mb-2">
                      Type <span className="font-mono bg-white/20 px-2 py-1 rounded">{requireConfirmText}</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg text-sm text-charcoal border border-white/30 bg-white focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                      placeholder={requireConfirmText}
                      autoFocus
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
                    className="flex-1 px-6 py-3 rounded-full text-sm font-semibold bg-white/20 text-white hover:bg-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading || !canConfirm}
                    className={`flex-1 px-6 py-3 rounded-full text-sm font-semibold ${styles.button} transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
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

