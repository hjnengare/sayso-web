"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { AuthService } from "@/app/lib/auth";
import { useToast } from "@/app/contexts/ToastContext";
import { authCopy, formatAuthMessage } from "./authCopy";

interface SocialLoginButtonsProps {
  accountType?: 'user' | 'business_owner';
}

export function SocialLoginButtons({ accountType = 'user' }: SocialLoginButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { showToast } = useToast();

  // Only show OAuth for Personal accounts
  const showOAuth = accountType === 'user';

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await AuthService.signInWithGoogle();

      if (error) {
        console.error('Google sign-in error:', error);
        showToast(formatAuthMessage(error.message || "", authCopy.authRequestFailed), 'error', 4000);
        setIsGoogleLoading(false);
      }
      // If successful, user will be redirected by Supabase
    } catch (error) {
      console.error('Unexpected error during Google sign-in:', error);
      const message = formatAuthMessage(error instanceof Error ? error.message : "", authCopy.authRequestFailed);
      showToast(message, 'error', 4000);
      setIsGoogleLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {showOAuth && (
        <m.div
          key="oauth-section"
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: 1, 
            height: 'auto',
            transition: {
              opacity: { duration: 0.25, ease: [0.4, 0.0, 0.2, 1], delay: 0.05 },
              height: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
            }
          }}
          exit={{ 
            opacity: 0, 
            height: 0,
            transition: {
              opacity: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] },
              height: { duration: 0.25, ease: [0.4, 0.0, 0.2, 1], delay: 0.05 }
            }
          }}
          style={{ overflow: 'hidden' }}
        >
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 text-white/80 font-medium" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>or continue with</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="flex items-center justify-center bg-white/95 backdrop-blur-sm border-none rounded-full px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 text-sm font-semibold text-charcoal hover:bg-white hover:border-white/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 group btn-target btn-press disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full max-w-xs"
              style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span className="group-hover:text-charcoal/80 transition-colors duration-300">
                {isGoogleLoading ? 'Connecting...' : 'Google'}
              </span>
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
