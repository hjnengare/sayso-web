'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { m } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

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
  const [mounted, setMounted] = React.useState(false);

  // Ensure we're mounted before rendering portal (SSR safety)
  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Reset confirm input when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  const handleConfirm = () => {
    if (requireConfirmText && confirmInput !== requireConfirmText) {
      return;
    }
    onConfirm();
  };

  const canConfirm = !requireConfirmText || confirmInput === requireConfirmText;

  const variantStyles = {
    danger: {
      iconBg: 'bg-gradient-to-br from-coral/20 to-coral/10',
      iconColor: 'text-coral',
      iconRing: 'ring-coral/20',
      button: 'bg-white/50 text-coral border border-coral hover:bg-coral hover:text-white',
      buttonShadow: 'shadow-coral/10 hover:shadow-coral/20',
    },
    warning: {
      iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-500/10',
      iconColor: 'text-amber-600',
      iconRing: 'ring-amber-500/20',
      button: 'bg-white/50 text-amber-600 border border-amber-500 hover:bg-amber-500 hover:text-white',
      buttonShadow: 'shadow-amber-500/10 hover:shadow-amber-500/20',
    },
    info: {
      iconBg: 'bg-gradient-to-br from-sage/20 to-sage/10',
      iconColor: 'text-sage',
      iconRing: 'ring-sage/20',
      button: 'bg-white/50 text-sage border border-sage hover:bg-card-bg hover:text-white',
      buttonShadow: 'shadow-sage/10 hover:shadow-sage/20',
    },
  };

  const styles = variantStyles[variant];

  // Don't render if not open or not mounted (SSR safety)
  if (!isOpen || !mounted) return null;

  // Render in a portal to escape any parent stacking contexts
  const modalContent = (
    <div className="fixed inset-0 z-[9999]" style={{ isolation: 'isolate' }}>
      {/* Backdrop with blur */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog - Centered vertically and horizontally */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <m.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.35,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[24px] shadow-2xl max-w-md w-full relative pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
              {/* Decorative gradient orbs */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-coral/10 to-transparent rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-sage/10 to-transparent rounded-full blur-2xl pointer-events-none" />

              {/* Content */}
              <div className="relative z-10 p-6 sm:p-8">
                {/* Icon with ring effect */}
                <m.div
                  className="flex items-center justify-center mb-6"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={`w-18 h-18 ${styles.iconBg} rounded-full flex items-center justify-center ring-8 ${styles.iconRing} p-4`}>
                    <AlertTriangle className={`w-8 h-8 ${styles.iconColor}`} strokeWidth={2} />
                  </div>
                </m.div>

                {/* Title */}
                <m.h3
                  className="text-xl font-semibold text-charcoal text-center mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {title}
                </m.h3>

                {/* Message */}
                <m.p
                  className="text-sm text-charcoal/70 text-center mb-6 leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {message}
                </m.p>

                {/* Confirm Input (if required) */}
                {requireConfirmText && (
                  <m.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <label className="block text-sm font-medium text-charcoal/80 mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Type <span className="font-semibold bg-coral/10 text-coral px-2 py-0.5 rounded-md">{requireConfirmText}</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-full text-sm text-charcoal border-2 border-charcoal/10 bg-white/80 focus:border-coral/50 focus:outline-none focus:ring-4 focus:ring-coral/10 transition-all duration-300"
                      placeholder={requireConfirmText}
                      autoFocus
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    />
                  </m.div>
                )}

                {/* Error Message */}
                {error && (
                  <m.div
                    className="mb-6 p-4 rounded-2xl bg-coral/10 border border-coral/20"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm text-coral font-medium">{error}</p>
                  </m.div>
                )}

                {/* Buttons */}
                <m.div
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-6 py-3 rounded-full text-sm font-semibold bg-white/60 text-charcoal border border-charcoal/10 hover:bg-white hover:border-charcoal/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading || !canConfirm}
                    className={`flex-1 px-6 py-3 rounded-full text-sm font-semibold ${styles.button} transition-all duration-300 shadow-lg ${styles.buttonShadow} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/50 disabled:hover:text-coral`}
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {isLoading ? 'Processing...' : confirmText}
                  </button>
            </m.div>
          </div>
        </m.div>
      </div>
    </div>
  );

  // Render in a portal to document.body to escape any stacking context issues
  return createPortal(modalContent, document.body);
};

