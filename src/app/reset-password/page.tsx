"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "../lib/auth";
import { useToast } from "../contexts/ToastContext";
import { AlertCircle } from "react-feather";
import { getBrowserSupabase } from "../lib/supabase/client";

// Import shared components
import { authStyles } from "../components/Auth/Shared/authStyles";
import { AuthHeader } from "../components/Auth/Shared/AuthHeader";
import { PasswordInput } from "../components/Auth/Shared/PasswordInput";
import { PageLoader, InlineLoader } from "../components/Loader";

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

  useEffect(() => {
    // Check if we have a valid session (should be set by auth callback)
    const checkSession = async () => {
      try {
        const supabase = getBrowserSupabase();

        // Check for existing session (from callback redirect)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('Reset password page - session check:', {
          hasSession: !!session,
          error: sessionError
        });

        if (session) {
          // Valid session exists, user can reset password
          setIsValidToken(true);
          
          // Clear the verified parameter from URL for security
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.has('verified')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } else {
          setError("Invalid or expired reset link. Please request a new one.");
          showToast("Invalid or expired reset link", 'sage', 4000);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setError("Failed to verify reset link. Please try again.");
        showToast("Failed to verify reset link", 'sage', 4000);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [router, showToast]); // Only run once on mount

  const getPasswordError = () => {
    if (!passwordTouched) return "";
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "Password must contain uppercase, lowercase, and number";
    }
    return "";
  };

  const getConfirmPasswordError = () => {
    if (!confirmPasswordTouched) return "";
    if (!confirmPassword) return "Please confirm your password";
    if (confirmPassword !== password) return "Passwords do not match";
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
      setError("Please fill in all fields");
      showToast("Please fill in all fields", 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      showToast("Passwords do not match", 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    const passwordError = getPasswordError();
    if (passwordError) {
      setError(passwordError);
      showToast(passwordError, 'sage', 4000);
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Starting password update...');
      const { error: updateError } = await AuthService.updatePassword(password);
      console.log('Password update response:', { error: updateError });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError(updateError.message);
        showToast(updateError.message, 'sage', 4000);
        setIsSubmitting(false);
      } else {
        console.log('Password updated successfully');
        
        setResetComplete(true);
        showToast("Password reset successful!", 'success', 3000);

        // Redirect to home after 2 seconds
        setTimeout(() => {
          console.log('Redirecting to home...');
          router.push('/home');
        }, 2000);
      }
    } catch (error: unknown) {
      console.error('Exception during password reset:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to reset password';
      setError(errorMsg);
      showToast(errorMsg, 'sage', 4000);
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
        <div className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">
          <AuthHeader
            backLink="/login"
            title="Invalid link"
            subtitle="This reset link is invalid or has expired"
          />

          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
            <div className="bg-off-white/95 rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden border border-white/30 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.06),0_22px_70px_rgba(0,0,0,0.10)] animate-scale-in">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="font-urbanist text-xl font-700 text-charcoal">
                    Link expired
                  </h2>
                  <p className="font-urbanist text-sm text-charcoal/70">
                    This password reset link is invalid or has expired. Please request a new one.
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => router.push('/forgot-password')}
                    className="w-full btn-premium text-white text-base font-semibold py-3 px-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-sage/30 transform hover:scale-105 active:scale-95"
                  >
                    Request new link
                  </button>

                  <button
                    onClick={() => router.push('/login')}
                    className="w-full text-sm text-sage hover:text-coral transition-colors duration-300 font-500"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (resetComplete) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: authStyles }} />
        <div className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">
          <AuthHeader
            backLink="/login"
            title="Success!"
            subtitle="Your password has been reset"
          />

          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
            <div className="bg-off-white/95 rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden border border-white/30 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.06),0_22px_70px_rgba(0,0,0,0.10)] animate-scale-in">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="font-urbanist text-xl font-700 text-charcoal">
                    Password reset!
                  </h2>
                  <p className="font-urbanist text-sm text-charcoal/70">
                    Your password has been successfully reset. Redirecting you to home...
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => router.push('/home')}
                    className="w-full btn-premium text-white text-base font-semibold py-3 px-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-sage/30 transform hover:scale-105 active:scale-95"
                  >
                    Continue to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <div className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">

        <AuthHeader
          backLink="/login"
          title="Reset password"
          subtitle="Enter your new password"
        />

        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
          <div className="bg-off-white/95 rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden border border-white/30 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.06),0_22px_70px_rgba(0,0,0,0.10)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08),0_30px_90px_rgba(0,0,0,0.14)] transition-shadow duration-300 animate-scale-in">

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-[12px] p-4 text-center">
                  <p className="font-urbanist text-[14px] font-600 text-red-600">{error}</p>
                </div>
              )}

              <div className="mb-4 text-center">
                <p className="font-urbanist text-sm text-charcoal/70">
                  Create a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
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
              />
              {getPasswordError() && passwordTouched && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1" role="alert">
                  <AlertCircle className="w-3 h-3" />
                  {getPasswordError()}
                </p>
              )}

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
              />
              {getConfirmPasswordError() && confirmPasswordTouched && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1" role="alert">
                  <AlertCircle className="w-3 h-3" />
                  {getConfirmPasswordError()}
                </p>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex justify-center">
                <div className="w-full">
                  <button
                    type="submit"
                    disabled={isSubmitting || !password || !confirmPassword}
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
                    className={`group block w-full text-base font-semibold py-3 px-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 relative overflow-hidden text-center min-h-[48px] whitespace-nowrap transform hover:scale-105 active:scale-95 ${
                      isSubmitting || !password || !confirmPassword
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                        : 'btn-premium text-white focus:ring-sage/30'
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSubmitting && <InlineLoader size="xs" />}
                      {isSubmitting ? "Resetting..." : "Reset password"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-coral to-coral/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
                  </button>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center mt-4 pt-4 border-t border-light-gray/30">
              <div className="font-urbanist text-sm sm:text-base font-600 text-charcoal/70">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-coral font-600 hover:text-coral/80 transition-colors duration-300 relative group"
                >
                  <span>Sign in</span>
                  <div className="absolute inset-x-0 -bottom-1 h-0.5 bg-coral/30 group-hover:bg-coral/60 transition-colors duration-300 rounded-full"></div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
