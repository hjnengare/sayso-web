"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../lib/auth';
import { useToast } from '../../contexts/ToastContext';
import { Mail, CheckCircle, AlertCircle, Loader, ExternalLink } from 'react-feather';

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

  // Optimistically allow access if URL param indicates verification
  const isVerifiedFromUrl = emailVerifiedParam === 'true';

  // Force refresh user state if we detect verification from URL
  useEffect(() => {
    if (isVerifiedFromUrl && user && !user.email_verified) {
      // Optimistically update user state
      AuthService.getCurrentUser().then(freshUser => {
        if (freshUser?.email_verified) {
          updateUser({ email_verified: true });
        }
      }).catch(() => {
        // Silently fail - will be handled by normal flow
      });
    }
  }, [isVerifiedFromUrl, user, updateUser]);

  // More accurate user existence check - check if we have user data, not just the object
  const userExists = !!(user && (user.email || user.id));
  
  console.log('EmailVerificationGuard: Checking access', {
    user_exists: userExists,
    user_object_exists: !!user,
    user_id: user?.id,
    email: user?.email,
    email_verified: user?.email_verified,
    isVerifiedFromUrl,
    isLoading,
    user_type: user ? typeof user : 'null'
  });

  // Show loading only briefly - don't block if we have URL verification signal
  if (isLoading && !isVerifiedFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-off-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-urbanist text-base text-charcoal/70">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, show children (they'll be handled by ProtectedRoute)
  // Check both user object existence and if it has essential data
  if (!user || (!user.email && !user.id)) {
    console.log('EmailVerificationGuard: No user or incomplete user data, allowing access (ProtectedRoute will handle)', {
      user: user ? { id: user.id, email: user.email } : null
    });
    return <>{children}</>;
  }

  // If email is verified (from user state or URL param), show children immediately
  if (user.email_verified || isVerifiedFromUrl) {
    console.log('EmailVerificationGuard: Email verified, allowing access');
    return <>{children}</>;
  }

  // If email is not verified, show verification prompt
  console.log('EmailVerificationGuard: Email not verified, blocking access');
  const handleResendVerification = async () => {
    if (!user.email) return;

    setIsResending(true);
    try {
      const { error } = await AuthService.resendVerificationEmail(user.email);
      
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
            We've sent a verification link to <span className="font-600 text-charcoal">{user.email}</span>. 
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
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-urbanist text-sm font-600 py-3 px-4 rounded-[20px] hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Open Gmail
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* Resend Button */}
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full bg-sage text-white font-urbanist text-sm font-600 py-3 px-4 rounded-[20px] hover:bg-sage/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              className="block w-full bg-off-white border border-charcoal/20 text-charcoal font-urbanist text-sm font-600 py-3 px-4 rounded-[20px] hover:bg-charcoal/5 transition-all duration-300 text-center"
            >
              Go to Email Verification Page
            </Link>
          </div>

          {/* Help Text */}
          <p className="font-urbanist text-sm sm:text-xs text-charcoal/50 mt-4">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}


