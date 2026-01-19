"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'sage';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  showToastOnce: (key: string, message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastQueue, setToastQueue] = useState<Toast[]>([]);

  // Track shown toasts to prevent duplicates
  const seenToasts = typeof window !== 'undefined'
    ? new Set<string>(JSON.parse(sessionStorage.getItem('shown-toasts') || '[]'))
    : new Set<string>();

  // Clear all toasts when route changes
  useEffect(() => {
    console.log('[ToastContext] Route changed to:', pathname);
    console.log('[ToastContext] Clearing all toasts and queue');
    setToasts([]);
    setToastQueue([]);
  }, [pathname]);

  // Generate unique ID to prevent collisions
  const generateUniqueId = () => {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const showToast = (message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = generateUniqueId();
    const newToast: Toast = { id, message, type, duration };

    // If no toasts are currently showing, show immediately
    if (toasts.length === 0) {
      setToasts([newToast]);
      
      // Auto remove toast after duration
      setTimeout(() => {
        removeToast(id);
      }, duration);
    } else {
      // Add to queue if toasts are already showing
      setToastQueue(prev => [...prev, newToast]);
    }
  };

  const showToastOnce = (key: string, message: string, type: Toast['type'] = 'info', duration = 4000) => {
    if (seenToasts.has(key)) return;
    
    seenToasts.add(key);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('shown-toasts', JSON.stringify(Array.from(seenToasts)));
    }
    
    showToast(message, type, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => {
      const filtered = prev.filter(toast => toast.id !== id);
      
      // If no toasts are showing and there are queued toasts, show the next one
      if (filtered.length === 0 && toastQueue.length > 0) {
        const nextToast = toastQueue[0];
        setToastQueue(prevQueue => prevQueue.slice(1));
        
        // Auto remove the next toast after its duration
        setTimeout(() => {
          removeToast(nextToast.id);
        }, nextToast.duration || 4000);
        
        return [nextToast];
      }
      
      return filtered;
    });
  };

  const getToastStyles = (type: Toast['type']) => {
    // All toast types use unified sage background with white text
    return 'bg-sage text-white';
  };

  const getToastIcon = (type: Toast['type']) => {
    const iconClasses = "w-4 h-4 flex-shrink-0";
    switch (type) {
      case 'success':
        return <CheckCircle className={iconClasses} />;
      case 'sage':
        return <Sparkles className={iconClasses} />;
      case 'error':
        return <XCircle className={iconClasses} />;
      case 'warning':
        return <AlertTriangle className={iconClasses} />;
      default:
        return <Info className={iconClasses} />;
    }
  };

  const value: ToastContextType = {
    showToast,
    showToastOnce,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Container - Top-center position with Framer Motion - Responsive */}
      <div className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-full px-2 sm:px-4 max-w-full sm:max-w-sm">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                layout: { duration: 0.2 }
              }}
              className={`
                pointer-events-auto w-full backdrop-blur-xl rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg
                ${getToastStyles(toast.type)}
              `}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="flex-shrink-0"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                  {getToastIcon(toast.type)}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-urbanist text-xs sm:text-sm font-600 leading-tight break-words">
                    {toast.message}
                  </p>
                </div>
                <motion.button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 ml-1.5 sm:ml-2 opacity-70 hover:opacity-100 transition-opacity duration-200 p-0.5 hover:bg-white/20 rounded-full"
                  aria-label="Dismiss notification"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-3 h-3" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
