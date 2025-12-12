"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Fontdiner_Swanky } from "next/font/google";
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePrefersReducedMotion } from '../utils/hooks/usePrefersReducedMotion';
import { Mail, CheckCircle, ExternalLink, ArrowLeft } from 'react-feather';
import { Loader as AppLoader } from '../components/Loader';
import WavyTypedTitle from '../../components/Animations/WavyTypedTitle';

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const styles = `
  /* Mobile-first typography scale - Body text ≥ 16px */
  .text-body { font-size: 1rem; line-height: 1.5; }
  .text-body-lg { font-size: 1.125rem; line-height: 1.5; }
  .text-heading-sm { font-size: 1.25rem; line-height: 1.4; }
  .text-heading-md { font-size: 1.5rem; line-height: 1.3; }
  .text-heading-lg { font-size: 1.875rem; line-height: 1.2; }

  /* iOS inertia scrolling and prevent double scroll */
  .ios-inertia {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    min-height: 0;
  }

  /* Hide scrollbar */
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Button press states - 44-48px targets */
  .btn-press:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  .btn-target {
    min-height: 44px;
    min-width: 44px;
    touch-action: manipulation;
  }

  /* Premium button styling */
  .btn-premium {
    position: relative;
    background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%);
    box-shadow:
      0 10px 40px rgba(125, 155, 118, 0.25),
      0 4px 12px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
  }

  .btn-premium:hover {
    transform: translateY(-2px);
    box-shadow:
      0 20px 60px rgba(125, 155, 118, 0.35),
      0 8px 24px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn-premium:active {
    transform: translateY(0);
  }

  /* Input styling - 16px+ to prevent auto-zoom */
  .input-mobile {
    font-size: 1rem !important;
    min-height: 48px;
    touch-action: manipulation;
  }

  /* Premium card styling with gradient shadow */
  .card-premium {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(125, 155, 118, 0.1);
    box-shadow:
      0 8px 32px rgba(125, 155, 118, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(10px);
  }

  /* Text truncation support */
  .text-truncate {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Full-screen pattern - respects notches */
  .full-screen {
    min-height: 100dvh;
    min-height: 100vh;
  }

  /* Safe area padding */
  .safe-area-full {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    padding-top: max(1.5rem, env(safe-area-inset-top));
    padding-bottom: max(6rem, env(safe-area-inset-bottom));
  }

  /* Prevent layout jumps */
  .stable-layout {
    contain: layout style;
  }

  /* Fixed aspect ratios for images */
  .aspect-square { aspect-ratio: 1 / 1; }
  .aspect-video { aspect-ratio: 16 / 9; }
  .aspect-photo { aspect-ratio: 4 / 3; }

  /* Carousel patterns for mobile */
  @media (max-width: 768px) {
    .carousel-mobile {
      scroll-snap-type: x mandatory;
      overflow-x: auto;
      display: flex;
    }

    .carousel-item {
      scroll-snap-align: center;
      flex-shrink: 0;
    }
  }

  /* CSS Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Animation classes */
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .animate-slide-in-left {
    animation: slideInLeft 0.6s ease-out forwards;
  }

  .animate-scale-in {
    animation: scaleIn 0.8s ease-out forwards;
  }

  .animate-delay-200 {
    animation-delay: 0.2s;
    opacity: 0;
  }

  .animate-delay-400 {
    animation-delay: 0.4s;
    opacity: 0;
  }

  .animate-delay-700 {
    animation-delay: 0.7s;
    opacity: 0;
  }

  /* Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in-up,
    .animate-slide-in-left,
    .animate-scale-in {
      animation: none;
      opacity: 1;
    }
    
    .animate-delay-200,
    .animate-delay-400,
    .animate-delay-700 {
      animation-delay: 0s;
      opacity: 1;
    }
  }
`;

export default function VerifyEmailPage() {
  const { user, resendVerificationEmail, isLoading } = useAuth();
  const { showToast, showToastOnce } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  // Prevent hydration mismatch and load pending email from sessionStorage
  useEffect(() => {
    setMounted(true);

    // Check for pending verification email in sessionStorage
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('pendingVerificationEmail');
      if (stored) {
        setPendingEmail(stored);
      }
    }
  }, []);

  // Middleware handles redirects - just log the state
  useEffect(() => {
    console.log('VerifyEmail: Checking user state', { 
      isLoading, 
      user: user?.email, 
      email_verified: user?.email_verified,
      user_exists: !!user 
    });
    
    // Middleware will redirect unauthenticated users
    // No manual redirect needed here
  }, [user, isLoading]);

  // Handle verification success from URL flag
  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      console.log('VerifyEmail: Email verification success from URL flag');
      showToastOnce('email-verified-v1', '🎉 You\'re verified! Your account is now secured and ready.', 'success', 4000);

      // Clear pending verification email from sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pendingVerificationEmail');
      }

      // Clean the URL flag so refreshes don't retrigger
      const url = new URL(window.location.href);
      url.searchParams.delete('verified');
      router.replace(url.pathname + (url.search ? '?' + url.searchParams.toString() : ''), { scroll: false });

      // Redirect to interests after showing success message
      setTimeout(() => {
        router.push('/interests');
      }, 2000);
    }
  }, [searchParams, router, showToastOnce]);

  // Check if user is already verified (show success message)
  useEffect(() => {
    console.log('VerifyEmail: Checking verification status', {
      user_exists: !!user,
      email_verified: user?.email_verified,
      has_verified_flag: !!searchParams.get('verified')
    });
    
    if (user && user.email_verified && !searchParams.get('verified')) {
      console.log('VerifyEmail: User already verified, showing success message');
      showToastOnce('email-verified-v1', '🎉 You\'re verified! Your account is now secured and ready.', 'success', 4000);
      
      // Middleware will redirect to interests automatically
      // No manual redirect needed
    }
  }, [user, searchParams, showToastOnce]);

  const handleResendVerification = async () => {
    const email = user?.email || pendingEmail;
    if (!email) return;

    setIsResending(true);
    try {
      const success = await resendVerificationEmail(email);
      if (success) {
        showToast('Verification email sent! Check your inbox and spam folder.', 'success');
      }
    } catch (error) {
      showToast('Failed to resend verification email. Please try again.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenInbox = () => {
    const email = user?.email || pendingEmail;
    if (!email) return;

    // Detect email provider and open appropriate inbox
    const domain = email.split('@')[1]?.toLowerCase();
    let inboxUrl = 'https://mail.google.com'; // default to Gmail

    if (domain?.includes('gmail')) {
      inboxUrl = 'https://mail.google.com';
    } else if (domain?.includes('outlook') || domain?.includes('hotmail') || domain?.includes('live')) {
      inboxUrl = 'https://outlook.live.com/mail';
    } else if (domain?.includes('yahoo')) {
      inboxUrl = 'https://mail.yahoo.com';
    } else if (domain?.includes('icloud') || domain?.includes('me.com')) {
      inboxUrl = 'https://www.icloud.com/mail';
    } else {
      // For other providers, try to construct a webmail URL
      inboxUrl = `https://${domain}`;
    }

    window.open(inboxUrl, '_blank');
  };

  const handleRefreshUser = async () => {
    setIsChecking(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      showToast('Checking verification status... If you\'ve verified your email, the page will refresh automatically.', 'info');

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading if user data is still loading
  if (isLoading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="min-h-[100dvh] bg-off-white flex items-center justify-center ios-inertia hide-scrollbar">
          <AppLoader size="lg" variant="wavy" color="sage" />
        </div>
      </>
    );
  }

  // Show full-page loader when resending email
  if (isResending) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="min-h-[100dvh] bg-off-white flex items-center justify-center ios-inertia hide-scrollbar">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-urbanist text-base text-charcoal/70">Sending verification email...</p>
          </div>
        </div>
      </>
    );
  }

  // Use either user from AuthContext or pending email from sessionStorage
  const displayEmail = user?.email || pendingEmail;

  // If no user and no pending email after loading, show error message
  if (!isLoading && !displayEmail) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="min-h-[100dvh] bg-off-white flex items-center justify-center ios-inertia hide-scrollbar safe-area-full">
          <div className="text-center max-w-md mx-auto p-6">
            <p className="text-lg text-charcoal mb-4">No verification pending.</p>
            <Link href="/register" className="text-sage hover:text-sage/80 underline">
              Go to registration
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div ref={containerRef} data-reduced={prefersReduced} className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">
        
        {/* Back button with entrance animation */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
          <Link href="/home" className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm">
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
          
          {/* Header with premium styling and animations */}
          <div className="text-center mb-4 pt-16 sm:pt-20">
            <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
              <WavyTypedTitle
                text="Check Your Email"
                as="h2"
                className={`${swanky.className} text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal`}
                typingSpeedMs={40}
                startDelayMs={300}
                waveVariant="subtle"
                loopWave={false}
                style={{ 
                  fontFamily: swanky.style.fontFamily,
                }}
              />
            </div>
            <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
              We&apos;ve sent a confirmation email to verify your account and unlock full features!
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-card-bg rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden border border-white/50 shadow-md transition-shadow duration-300 animate-scale-in">
            
            {/* Email Icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-charcoal" />
              </div>

              {/* Email Display - Clickable */}
              <button
                onClick={handleOpenInbox}
                className="bg-navbar-bg rounded-full p-4 mb-6 border-0 w-full hover:bg-navbar-bg transition-all duration-300 cursor-pointer group"
              >
                <p className="text-lg font-600 text-white group-hover:text-white transition-colors duration-300 flex items-center justify-center gap-2" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  {displayEmail}
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </p>
              </button>
            </div>

            {/* Instructions */}
            <div className="text-center mb-8">
              <p className="text-sm text-charcoal/70 mb-6 leading-relaxed" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                Please check your email and click the verification link to activate your account. The link will automatically redirect you back to the app once verified.
              </p>

              {/* Benefits */}
              <div className="bg-gradient-to-r from-sage/5 to-coral/5 rounded-lg p-6 mb-6 text-left border border-sage/10">
                <h3 className="text-base font-600 text-charcoal mb-4 flex items-center gap-2" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  <CheckCircle className="w-5 h-5 text-sage" />
                  Why verify your email?
                </h3>
                <ul className="text-sm text-charcoal/80 space-y-2 list-disc pl-5" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  <li>Unlock full app features (posting, saving, leaderboards)</li>
                  <li>Secure account recovery and password resets</li>
                  <li>Receive important updates and notifications</li>
                  <li>Build trust within the community</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              {/* Resend Button */}
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-600 py-4 px-4 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                
              >
                <Mail className="w-4 h-4" />
                Resend Verification Email
              </button>

              {/* I've Verified Button */}
              <button
                onClick={handleRefreshUser}
                disabled={isChecking}
                className="w-full bg-gradient-to-r from-sage to-sage/80 text-white text-sm font-600 py-4 px-4 rounded-full hover:from-sage/90 hover:to-sage transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                
              >
                {isChecking ? (
                  <>
                    <AppLoader className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    I&apos;ve Verified My Email
                  </>
                )}
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-charcoal/50 text-center" >
              Didn&apos;t receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
