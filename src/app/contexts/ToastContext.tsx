"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastQueue, setToastQueue] = useState<Toast[]>([]);

  // Track shown toasts to prevent duplicates
  const seenToasts = typeof window !== 'undefined'
    ? new Set<string>(JSON.parse(sessionStorage.getItem('shown-toasts') || '[]'))
    : new Set<string>();

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
    switch (type) {
      case 'success':
        return 'bg-off-white   text-sage';
      case 'sage':
        return 'bg-off-white   text-sage';
      case 'error':
        return 'bg-off-white   text-red-500';
      case 'warning':
        return 'bg-off-white   text-amber-500';
      default:
        return 'bg-off-white   text-charcoal';
    }
  };

  const getToastIcon = (type: Toast['type']) => {
    const iconClasses = "w-5 h-5 flex-shrink-0";
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

      {/* Toast Container - Bottom-left position with Framer Motion */}
      <div className="fixed bottom-4 left-4 z-[9999] flex flex-col-reverse gap-2 pointer-events-none max-w-sm">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: -100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.9 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                layout: { duration: 0.2 }
              }}
              className={`
                pointer-events-auto max-w-sm w-full backdrop-blur-xl rounded-[20px] p-4 shadow-lg border border-sage/20
                ${getToastStyles(toast.type)}
              `}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="flex-shrink-0"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                  {getToastIcon(toast.type)}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-urbanist text-sm font-600 leading-tight">
                    {toast.message}
                  </p>
                </div>
                <motion.button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-charcoal/10 rounded-full"
                  aria-label="Dismiss notification"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
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
