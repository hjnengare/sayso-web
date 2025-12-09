"use client";

import Link from "next/link";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { usePrefersReducedMotion } from "../../utils/hooks/usePrefersReducedMotion";
import { BusinessOwnershipService } from "../../lib/services/businessOwnershipService";
import { AuthService } from "../../lib/auth";

// Import shared components
import { authStyles } from "../../components/Auth/Shared/authStyles";
import { AuthHeader } from "../../components/Auth/Shared/AuthHeader";
import { EmailInput } from "../../components/Auth/Shared/EmailInput";
import { PasswordInput } from "../../components/Auth/Shared/PasswordInput";
import { SocialLoginButtons } from "../../components/Auth/Shared/SocialLoginButtons";
import { PageLoader } from "../../components/Loader";

function BusinessLoginPageContent() {
  const prefersReduced = usePrefersReducedMotion();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isLoading: authLoading, error: authError } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const containerRef = useRef(null);

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getEmailError = () => {
    if (!emailTouched) return "";
    if (!email) return "Email is required";
    if (!validateEmail(email)) return "Please enter a valid email address";
    return "";
  };

  const getPasswordError = () => {
    if (!passwordTouched) return "";
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Mark fields as touched for validation
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      showToast("Please fill in all fields", 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      showToast("Please enter a valid email address", 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    try {
      // Use AuthService directly to avoid automatic redirects
      const { user: authUser, error: authError } = await AuthService.signIn({ email, password });
      
      if (authError) {
        setError(authError.message);
        showToast(authError.message, 'sage', 4000);
        setIsSubmitting(false);
        return;
      }

      if (authUser) {
        // Check if user has verified business ownership
        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(authUser.id);
        
        // Update auth context (this will trigger auth state change)
        await login(email, password);
        
        // Get redirect URL from query params
        const redirectTo = searchParams?.get('redirect');
        
        if (ownedBusinesses.length > 0) {
          showToast("Welcome back to your business account!", 'success', 2000);
          // Redirect to owners dashboard or specified redirect
          setTimeout(() => {
            router.push(redirectTo || '/owners');
          }, 500);
        } else {
          // User doesn't have verified businesses - go to normal home
          showToast("You don't have any verified business accounts. Claim a business to get started.", 'sage', 5000);
          // Redirect to specified redirect or home
          setTimeout(() => {
            router.push(redirectTo || '/home');
          }, 2000);
        }
      } else {
        setError("Login failed. Please try again.");
        showToast("Login failed. Please try again.", 'sage', 4000);
        setIsSubmitting(false);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      setError(errorMsg);
      showToast(errorMsg, 'sage', 4000);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <div ref={containerRef} data-reduced={prefersReduced} className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">

        <AuthHeader
          backLink="/home"
          title="Business Account Login"
          subtitle="Sign in to manage your business profile and analytics"
          subtitleStyle={{
            wordBreak: 'keep-all',
            overflowWrap: 'normal',
            whiteSpace: 'normal',
            hyphens: 'none',
            WebkitHyphens: 'none',
            MozHyphens: 'none',
            msHyphens: 'none',
          }}
        />

        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12 px-1 sm:px-4">
          {/* Form Card */}
          <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/50 backdrop-blur-md ring-1 ring-white/20 px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Error Message */}
              {error && (
                <div className="bg-orange-50 border border-orange-200 rounded-[12px] p-4 text-center">
                  <p className="text-[14px] font-600 text-orange-600" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>{error}</p>
                </div>
              )}

              {/* Email Input */}
              <EmailInput
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  if (!emailTouched) setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                error={getEmailError()}
                touched={emailTouched}
                disabled={isSubmitting}
              />

              {/* Password Input */}
              <PasswordInput
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                disabled={isSubmitting}
                placeholder="Enter your password"
                showStrength={false}
                touched={passwordTouched}
              />

              {/* Forgot password link */}
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-white hover:text-coral transition-colors duration-300 font-medium"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <div className="pt-2 flex justify-center">
                <div className="w-full">
                  <button
                    type="submit"
                    disabled={isSubmitting || !email || !password}
                    style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                    className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-600 py-4 px-4 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </button>
                </div>
              </div>

              {/* Social Login */}
              <SocialLoginButtons />
            </form>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t border-white/20">
              <div 
                className="text-sm sm:text-base text-white" 
                style={{ 
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                  fontWeight: 600,
                  wordBreak: 'keep-all',
                  overflowWrap: 'normal',
                  whiteSpace: 'normal',
                  hyphens: 'none',
                  WebkitHyphens: 'none',
                  MozHyphens: 'none',
                  msHyphens: 'none',
                }}
              >
                Don&apos;t have a business account?{" "}
                <Link
                  href="/for-businesses"
                  className="text-white font-semibold hover:text-coral transition-colors duration-300 relative group"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                >
                  Claim your business
                </Link>
              </div>
              <div 
                className="text-sm text-white/70 mt-3" 
                style={{ 
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  wordBreak: 'keep-all',
                  overflowWrap: 'normal',
                  whiteSpace: 'normal',
                  hyphens: 'none',
                  WebkitHyphens: 'none',
                  MozHyphens: 'none',
                  msHyphens: 'none',
                }}
              >
                Looking for personal account?{" "}
                <Link
                  href="/login"
                  className="text-white hover:text-coral transition-colors duration-300"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  Sign in here
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function BusinessLoginPage() {
  return (
    <Suspense fallback={<PageLoader size="lg" variant="wavy" color="sage" />}>
      <BusinessLoginPageContent />
    </Suspense>
  );
}
