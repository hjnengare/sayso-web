"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Urbanist } from "next/font/google";
import { ArrowLeft } from "lucide-react";
import { AuthService } from "../lib/auth";
import { useToast } from "../contexts/ToastContext";
import { getBrowserSupabase } from "../lib/supabase/client";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import WavyTypedTitle from "@/app/components/Animations/WavyTypedTitle";

// Import shared components
import { authStyles } from "../components/Auth/Shared/authStyles";
import { PasswordInput } from "../components/Auth/Shared/PasswordInput";
import { AuthAlert } from "../components/Auth/Shared/AuthAlert";
import { authCopy, formatAuthMessage } from "../components/Auth/Shared/authCopy";
import { PageLoader, InlineLoader } from "../components/Loader";

const urbanist = Urbanist({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState("");
  const [isValidToken, setIsValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const router = useRouter();
  const { showToast } = useToast();
  const containerRef = useRef(null);

  // Initialize scroll reveal (runs once per page load)
  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });
  usePredefinedPageTitle('resetPassword');

  useEffect(() => {
    // Check if we have a valid session or need to exchange code for session
    const checkSession = async () => {
      try {
        const supabase = getBrowserSupabase();
        
        // Check for code parameter in URL
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const verified = searchParams.get('verified');

        // If we have a code parameter, redirect to auth callback to handle exchange server-side
        // This is required because password reset codes need server-side exchange (no PKCE)
        if (code) {
          console.log('Reset password page - redirecting to auth callback for code exchange');
          // Redirect to auth callback with type=recovery so it knows to redirect back here
          const callbackUrl = new URL('/auth/callback', window.location.origin);
          callbackUrl.searchParams.set('code', code);
          callbackUrl.searchParams.set('type', 'recovery');
          callbackUrl.searchParams.set('next', '/reset-password');
          window.location.href = callbackUrl.toString();
          return; // Don't continue, let the redirect happen
        }

        // Check for existing session (from callback redirect, hash exchange, or already logged in)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        const activeSession = session;

        if (activeSession) {
          // Valid session exists, user can reset password
          setIsValidToken(true);

          // Clear the verified parameter from URL for security
          if (verified) {
            window.history.replaceState(null, '', window.location.pathname);
          }

          // Remove any hash tokens from URL once the session is stored
          if (window.location.hash) {
            const cleanUrl = `${window.location.pathname}${window.location.search}`;
            window.history.replaceState(null, '', cleanUrl);
          }
        } else {
          console.error('Session check error:', sessionError);
          setError(authCopy.resetLinkInvalid);
          showToast(authCopy.resetLinkInvalid, 'error', 4000);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setError(authCopy.resetLinkVerifyFailed);
        showToast(authCopy.resetLinkVerifyFailed, 'error', 4000);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, []); // Only run once on mount - router and showToast are stable

  const getPasswordError = () => {
    if (!passwordTouched) return "";
    if (!password) return authCopy.passwordRequired;
    if (password.length < 6) return authCopy.passwordMin;
    return "";
  };

  const getConfirmPasswordError = () => {
    if (!confirmPasswordTouched) return "";
    if (!confirmPassword) return authCopy.passwordConfirmRequired;
    if (confirmPassword !== password) return authCopy.passwordMismatch;
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Mark fields as touched for validation
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    if (!password || !confirmPassword) {
      setError(authCopy.requiredFields);
      showToast(authCopy.requiredFields, 'warning', 3000);
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(authCopy.passwordMismatch);
      showToast(authCopy.passwordMismatch, 'warning', 3000);
      setIsSubmitting(false);
      return;
    }

    const passwordError = getPasswordError();
    if (passwordError) {
      setError(passwordError);
      showToast(passwordError, 'warning', 4000);
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Starting password update...');
      const { error: updateError } = await AuthService.updatePassword(password);
      console.log('Password update response:', { error: updateError });

      if (updateError) {
        console.error('Password update error:', updateError);
        const updateMessage = formatAuthMessage(updateError.message, authCopy.resetPasswordFailed);
        setError(updateMessage);
        showToast(updateMessage, 'error', 4000);
        setIsSubmitting(false);
      } else {
        console.log('Password updated successfully');
        
        setResetComplete(true);
        showToast("Your password has been updated.", 'success', 3000);

        // Redirect to home after 2 seconds
        setTimeout(() => {
          console.log('Redirecting to home...');
          router.push('/home');
        }, 2000);
      }
    } catch (error: unknown) {
      console.error('Exception during password reset:', error);
      const errorMsg = formatAuthMessage(error instanceof Error ? error.message : "", authCopy.resetPasswordFailed);
      setError(errorMsg);
      showToast(errorMsg, 'error', 4000);
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: authStyles }} />
        <PageLoader size="xl" variant="wavy" color="sage" />
      </>
    );
  }

  if (!isValidToken) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: authStyles }} />
        <div ref={containerRef} className="  bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">
          {/* Premium floating orbs background */}
          <div className="floating-orb floating-orb-1" aria-hidden="true" />
          <div className="floating-orb floating-orb-2" aria-hidden="true" />
          <div className="floating-orb floating-orb-3" aria-hidden="true" />
          <div className="floating-orb floating-orb-4" aria-hidden="true" />
          <div className="floating-orb floating-orb-5" aria-hidden="true" />
          <div className="floating-orb floating-orb-6" aria-hidden="true" />

          {/* Back button with entrance animation */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
            <Link href="/login" className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm">
              <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Header with premium styling and animations */}
          <div className="text-center mb-4 pt-16 sm:pt-20">
            <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
              <WavyTypedTitle
                text="Invalid link"
                as="h2"
                className={`${urbanist.className} text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal`}
                typingSpeedMs={40}
                startDelayMs={300}
                waveVariant="subtle"
                loopWave={false}
                style={{ 
                  fontFamily: urbanist.style.fontFamily,
                }}
              />
            </div>
            <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
              This reset link is no longer valid
            </p>
          </div>

          <div className="w-full sm:max-w-md lg:max-w-lg sm:mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 sm:px-2">
            <section data-section>
            <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
              <div className="text-center space-y-4 relative z-10">
                <div className="w-16 h-16 mx-auto bg-orange-50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="text-heading-md font-bold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 700 }}>
                    Link expired
                  </h2>
                  <p className="text-body-sm text-white/90" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    This password reset link is no longer valid. Please request a new one.
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => router.push('/forgot-password')}
                    className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-sage/30 transform hover:scale-105 active:scale-95 btn-target btn-press"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    Request new link
                  </button>

                  <button
                    onClick={() => router.push('/login')}
                    className="w-full text-sm text-white hover:text-coral transition-colors duration-300 font-medium"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </div>
            </section>
          </div>
        </div>
      </>
    );
  }

  if (resetComplete) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: authStyles }} />
        <div ref={containerRef} className="  bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">
          {/* Premium floating orbs background */}
          <div className="floating-orb floating-orb-1" aria-hidden="true" />
          <div className="floating-orb floating-orb-2" aria-hidden="true" />
          <div className="floating-orb floating-orb-3" aria-hidden="true" />
          <div className="floating-orb floating-orb-4" aria-hidden="true" />
          <div className="floating-orb floating-orb-5" aria-hidden="true" />
          <div className="floating-orb floating-orb-6" aria-hidden="true" />

          {/* Back button with entrance animation */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
            <Link href="/login" className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm">
              <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Header with premium styling and animations */}
          <div className="text-center mb-4 pt-16 sm:pt-20">
            <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
              <WavyTypedTitle
                text="Password updated"
                as="h2"
                className={`${urbanist.className} text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal`}
                typingSpeedMs={40}
                startDelayMs={300}
                waveVariant="subtle"
                loopWave={false}
                style={{ 
                  fontFamily: urbanist.style.fontFamily,
                }}
              />
            </div>
            <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
              Your password has been reset
            </p>
          </div>

          <div className="w-full sm:max-w-md lg:max-w-lg sm:mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 sm:px-2">
            <section data-section>
            <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
              <div className="text-center space-y-4 relative z-10">
                <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="text-heading-md font-bold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 700 }}>
                    Password updated
                  </h2>
                  <p className="text-body-sm text-white/90" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Your password has been updated. Redirecting you to home.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => router.push('/home')}
                    className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-sage/30 transform hover:scale-105 active:scale-95 btn-target btn-press"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    Continue to Home
                  </button>
                </div>
              </div>
            </div>
            </section>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <div ref={containerRef} className="  bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">

        {/* Premium floating orbs background */}
        <div className="floating-orb floating-orb-1" aria-hidden="true" />
        <div className="floating-orb floating-orb-2" aria-hidden="true" />
        <div className="floating-orb floating-orb-3" aria-hidden="true" />
        <div className="floating-orb floating-orb-4" aria-hidden="true" />
        <div className="floating-orb floating-orb-5" aria-hidden="true" />
        <div className="floating-orb floating-orb-6" aria-hidden="true" />

        {/* Back button with entrance animation */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
          <Link href="/login" className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm">
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Header with premium styling and animations */}
        <div className="text-center mb-4 pt-16 sm:pt-20">
          <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
            <WavyTypedTitle
              text="Reset password"
              as="h2"
              className={`${urbanist.className} text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal`}
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              style={{ 
                fontFamily: urbanist.style.fontFamily,
              }}
            />
          </div>
          <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
            Enter your new password
          </p>
        </div>

        <div className="w-full sm:max-w-md lg:max-w-lg sm:mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 sm:px-2">
          {/* Form Card */}
          <section data-section>
          <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Error Message */}
              {error && (
                <AuthAlert message={error} tone="error" />
              )}

              <div className="mb-4 text-center">
                <p className="text-body-sm text-white/90" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Create a password with at least 6 characters.
                </p>
              </div>

              {/* New Password Input */}
              <PasswordInput
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                disabled={isSubmitting}
                placeholder="Enter new password"
                showStrength={true}
                touched={passwordTouched}
                error={getPasswordError()}
                id="reset-password"
                label="New password"
                autoComplete="new-password"
              />

              {/* Confirm Password Input */}
              <PasswordInput
                value={confirmPassword}
                onChange={(value) => {
                  setConfirmPassword(value);
                  if (!confirmPasswordTouched) setConfirmPasswordTouched(true);
                }}
                onBlur={() => setConfirmPasswordTouched(true)}
                disabled={isSubmitting}
                placeholder="Confirm new password"
                showStrength={false}
                touched={confirmPasswordTouched}
                error={getConfirmPasswordError()}
                id="reset-password-confirm"
                label="Confirm password"
                autoComplete="new-password"
              />

              {/* Submit Button */}
              <div className="pt-2 flex justify-center">
                <div className="w-full">
                  <button
                    type="submit"
                    disabled={isSubmitting || !password || !confirmPassword}
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                    className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Resetting...
                      </>
                    ) : (
                      "Reset password"
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t border-white/20">
              <div className="text-body-sm sm:text-body text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-white font-semibold hover:text-coral transition-colors duration-300 relative group"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
          </section>
        </div>
      </div>
    </>
  );
}
