"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Sparkles } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'sage';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => string;
  showToastOnce: (key: string, message: string, type?: Toast['type'], duration?: number) => string | null;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
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

  const showToast = (message: string, type: Toast['type'] = 'info', duration = 4000): string => {
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
    
    return id;
  };

  const showToastOnce = (key: string, message: string, type: Toast['type'] = 'info', duration = 4000): string | null => {
    if (seenToasts.has(key)) return null;
    
    seenToasts.add(key);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('shown-toasts', JSON.stringify(Array.from(seenToasts)));
    }
    
    return showToast(message, type, duration);
  };

  const clearAllToasts = () => {
    setToasts([]);
    setToastQueue([]);
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
    removeToast,
    clearAllToasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Container - Bottom-left position */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-4 z-[9999] flex flex-col-reverse gap-2 pointer-events-none max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`
                pointer-events-auto max-w-sm w-full backdrop-blur-xl rounded-[20px] p-4 shadow-lg border border-sage/20
                transition-all duration-300 ease-out animate-in slide-in-from-left
                ${getToastStyles(toast.type)}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getToastIcon(toast.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-urbanist text-sm font-600 leading-tight">
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-charcoal/10 rounded-full"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
