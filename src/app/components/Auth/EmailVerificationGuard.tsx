"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../lib/auth';
import { useToast } from '../../contexts/ToastContext';
import { Mail, CheckCircle, AlertCircle, Loader, ExternalLink } from 'lucide-react';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onVerificationRequired?: () => void;
}

export default function EmailVerificationGuard({
  children,
  fallback,
  onVerificationRequired
}: EmailVerificationGuardProps) {
  const { user, isLoading, updateUser } = useAuth();
  const { showToast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const searchParams = useSearchParams();
  const emailVerifiedParam = searchParams?.get('email_verified');
  const verifiedParam = searchParams?.get('verified');

  // Optimistically allow access if URL param indicates verification
  // Check both 'email_verified' and 'verified' params to handle different redirect scenarios
  const isVerifiedFromUrl = emailVerifiedParam === 'true' || verifiedParam === '1';

  // Extract stable primitives to prevent re-render loops
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const emailVerified = user?.email_verified ?? false;

  // Force refresh user state if we detect verification from URL
  // Only depends on stable primitives to prevent render loops
  useEffect(() => {
    if (!isVerifiedFromUrl || !userId || emailVerified) {
      return;
    }

    // Optimistically update user state
    AuthService.getCurrentUser().then(freshUser => {
      if (freshUser?.email_verified) {
        updateUser({ email_verified: true });
      }
    }).catch((err) => {
      console.error('[EmailVerificationGuard] Error refreshing user:', err);
      // Silently fail - will be handled by normal flow
    });
  }, [isVerifiedFromUrl, userId, emailVerified]);

  // More accurate user existence check - check if we have user data, not just the object
  const userExists = !!(userId || userEmail);

  // Show loading only briefly - don't block if we have URL verification signal
  // Use a minimal loading state to prevent layout shift
  if (isLoading && !isVerifiedFromUrl) {
    // Return children with a loading overlay instead of replacing entire content
    // This prevents the jarring flash when switching from loader to content
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-off-white/80 backdrop-blur-sm z-50 flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-3"></div>
            <p className="font-urbanist text-sm text-charcoal/70">Loading...</p>
          </div>
        </div>
        <div className="opacity-0 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  // If user is not logged in, show children (they'll be handled by ProtectedRoute)
  // Check both user object existence and if it has essential data
  if (!userId && !userEmail) {
    return <>{children}</>;
  }

  // If email is verified (from user state or URL param), show children immediately
  if (emailVerified || isVerifiedFromUrl) {
    return <>{children}</>;
  }

  // If email is not verified, show verification prompt
  const handleResendVerification = async () => {
    if (!userEmail) return;

    setIsResending(true);
    try {
      const { error } = await AuthService.resendVerificationEmail(userEmail);

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Verification email sent! Check your inbox.', 'success');
      }
    } catch (error) {
      showToast('Failed to resend verification email. Please try again.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-off-white rounded-lg shadow-lg border border-charcoal/10 p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-amber-600" />
          </div>

          {/* Title */}
          <h2 className="font-urbanist text-xl font-700 text-charcoal mb-3">
            Verify Your Email
          </h2>

          {/* Description */}
          <p className="font-urbanist text-sm text-charcoal/70 mb-6 leading-relaxed">
            We've sent a verification link to <span className="font-600 text-charcoal">{userEmail}</span>. 
            Please check your email and click the link to verify your account.
          </p>

          {/* Benefits */}
          <div className="bg-sage/5 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-urbanist text-sm font-600 text-charcoal mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-sage" />
              What you'll unlock:
            </h3>
            <ul className="space-y-2 text-sm sm:text-xs text-charcoal/70">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-sage rounded-full"></div>
                Post reviews and share your experiences
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-sage rounded-full"></div>
                Save your favorite local businesses
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-sage rounded-full"></div>
                Join the community leaderboard
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-sage rounded-full"></div>
                Secure account recovery options
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Open Gmail Button */}
            <button
              onClick={() => window.open('https://mail.google.com', '_blank')}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-urbanist text-sm font-600 py-3 px-4 rounded-[12px] hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Open Gmail
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* Resend Button */}
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full bg-sage text-white font-urbanist text-sm font-600 py-3 px-4 rounded-[12px] hover:bg-sage/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Resend Verification Email
                </>
              )}
            </button>

            {/* Go to Verify Email Page */}
            <Link
              href="/verify-email"
              className="block w-full bg-off-white border border-charcoal/20 text-charcoal font-urbanist text-sm font-600 py-3 px-4 rounded-[12px] hover:bg-charcoal/5 transition-all duration-300 text-center"
            >
              Go to Email Verification Page
            </Link>
          </div>

          {/* Help Text */}
          <p className="font-urbanist text-sm sm:text-xs text-charcoal/70 mt-4">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}


