"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { RateLimiter } from "../../lib/rateLimiting";
import { usePredefinedPageTitle } from "../../hooks/usePageTitle";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

// Import shared components
import { authStyles } from "../../components/Auth/Shared/authStyles";
import { EmailInput } from "../../components/Auth/Shared/EmailInput";
import { PasswordInput } from "../../components/Auth/Shared/PasswordInput";
// Note: SocialLoginButtons not imported - business accounts use email+password only

export default function BusinessLoginPage() {
  usePredefinedPageTitle('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef(null);

  const { login, error: authError } = useAuth();
  const { showToast } = useToast();

  // Initialize scroll reveal (runs once per page load)
  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

  // Ensure the document can scroll (clears any stale scroll locks from menus/modals).
  // This runs client-side only and doesn't change markup, preventing hydration mismatch.
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

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
      setError("Complete all fields");
      showToast("All fields required", 'sage', 2500);
      setIsSubmitting(false);
      return;
    }

    if (!validateEmail(email)) {
      const errorMsg = "Email invalid";
      setError(errorMsg);
      showToast(errorMsg, 'sage', 2500);
      setIsSubmitting(false);
      return;
    }

    try {
      // Check rate limit before attempting login
      const normalizedEmail = email.trim().toLowerCase();
      const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, 'login');

      if (!rateLimitResult.allowed) {
        const errorMsg = rateLimitResult.message || 'Too many attempts. Try again later.';
        setError(errorMsg);
        showToast(errorMsg, 'sage', 3500);
        setIsSubmitting(false);
        return;
      }

      // Login as business owner
      const loggedInUser = await login(email, password, 'business_owner');

      if (loggedInUser) {
        // Clear rate limit on successful login
        await RateLimiter.recordSuccess(email.trim().toLowerCase(), 'login');
        showToast("Welcome back", 'sage', 2000);
      } else {
        // Rate limit already incremented by checkRateLimit, no need to record failure
        const errorMsg = authError || "Email or password is incorrect";
        setError(errorMsg);
        showToast(errorMsg, 'sage', 3000);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      setError(errorMsg);
      showToast(errorMsg, 'sage', 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      {/* Let the document handle scrolling to avoid nested scroll containers on mobile. */}
      <div ref={containerRef} className="min-h-[100dvh] bg-off-white flex flex-col relative safe-area-full" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>

        {/* Back button with entrance animation */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
          <Link href="/onboarding" className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm">
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Header with premium styling and animations */}
        <div className="text-center mb-4 pt-16 sm:pt-20">
          <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
            <WavyTypedTitle
              text="Business Login"
              as="h2"
              className="font-urbanist text-3xl md:text-4xl font-700 mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal"
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              triggerOnTypingComplete={true}
              enableScrollTrigger={false}
            />
          </div>
          <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700">
            Sign in to manage your business on sayso
          </p>
        </div>

        <div className="w-full sm:max-w-md lg:max-w-lg sm:mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 sm:px-2">
          {/* Form Card */}
          <section data-section>
          <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Error Message */}
              {error && (
                <div className="bg-orange-50 border border-orange-200 rounded-[20px] p-4 text-center">
                  <p className="text-caption font-semibold text-orange-600">{error}</p>
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
                placeholder="you@example.com"
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
                error={getPasswordError()}
              />

              {/* Forgot password link */}
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-body-sm text-white hover:text-coral transition-colors duration-300 font-medium"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </div>

                {/* Login Button */}
                <div className="pt-2 flex flex-col items-center gap-2">
                  <div className="w-full">
                    <button
                      type="submit"
                      disabled={isSubmitting || !email || !password}
                      className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
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
                  {/* Personal Account Links */}
                  <div className="mt-2 text-center">
                    <Link
                      href="/login"
                      className="text-body-sm text-white/80 hover:text-coral font-medium underline-offset-2 hover:underline transition-colors duration-200"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}
                    >
                      Log in to a Personal Account
                    </Link>
                    <span className="mx-2 text-white/30" aria-hidden="true">|</span>
                    <Link
                      href="/register"
                      className="text-body-sm text-white/80 hover:text-coral font-medium underline-offset-2 hover:underline transition-colors duration-200"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}
                    >
                      Sign up for a Personal Account
                    </Link>
                  </div>
                </div>

              {/* Note: No OAuth for business accounts - email+password only */}
            </form>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t border-white/20">
              <div className="text-body-sm sm:text-body text-white">
                Don&apos;t have a business account?{" "}
                <Link
                  href="/business/register"
                  className="text-white font-semibold hover:text-coral transition-colors duration-300 relative group"
                >
                  Sign up
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
