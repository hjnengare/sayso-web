"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Fontdiner_Swanky } from "next/font/google";
import { ArrowLeft } from "react-feather";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { RateLimiter } from "../lib/rateLimiting";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

// Import shared components
import { authStyles } from "../components/Auth/Shared/authStyles";
import { EmailInput } from "../components/Auth/Shared/EmailInput";
import { PasswordInput } from "../components/Auth/Shared/PasswordInput";
import { SocialLoginButtons } from "../components/Auth/Shared/SocialLoginButtons";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export default function LoginPage() {
  usePredefinedPageTitle('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remainingAttempts?: number; lockedUntil?: Date } | null>(null);

  const { login, isLoading: authLoading, error: authError } = useAuth();
  const { showToast } = useToast();
  const containerRef = useRef(null);

  // Initialize scroll reveal (runs once per page load)
  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

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
      const errorMsg = "Please enter a valid email address";
      setError(errorMsg);
      // Only show toast, error already shown inline
      showToast(errorMsg, 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    try {
      // Check rate limit before attempting login
      const normalizedEmail = email.trim().toLowerCase();
      const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, 'login');
      
      // Update rate limit info for UI feedback
      setRateLimitInfo({
        remainingAttempts: rateLimitResult.remainingAttempts,
        lockedUntil: rateLimitResult.lockedUntil,
      });
      
      if (!rateLimitResult.allowed) {
        const errorMsg = rateLimitResult.message || 'Too many login attempts. Please try again later.';
        setError(errorMsg);
        showToast(errorMsg, 'sage', 5000);
        setIsSubmitting(false);
        return;
      }

      const success = await login(email, password);
      
      if (success) {
        // Clear rate limit on successful login
        await RateLimiter.recordSuccess(email.trim().toLowerCase(), 'login');
        showToast("Welcome back! Redirecting...", 'success', 2000);
      } else {
        // Rate limit already incremented by checkRateLimit, no need to record failure
        const errorMsg = authError || "Invalid email or password";
        setError(errorMsg);
        showToast(errorMsg, 'sage', 4000);
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
      <div ref={containerRef} className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">

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
              text="Welcome back"
              as="h2"
              className={`${swanky.className} text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal`}
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              triggerOnTypingComplete={true}
              enableScrollTrigger={false}
              style={{ 
                fontFamily: swanky.style.fontFamily,
              }}
            />
          </div>
          <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
            Sign in to continue discovering sayso
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
                  <p className="text-caption font-semibold text-orange-600" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{error}</p>
                </div>
              )}

              {/* Rate Limit Warning */}
              {rateLimitInfo && rateLimitInfo.remainingAttempts !== undefined && rateLimitInfo.remainingAttempts < 5 && rateLimitInfo.remainingAttempts > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-3 text-center">
                  <p className="text-xs font-medium text-amber-700" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    ⚠️ {rateLimitInfo.remainingAttempts} login attempt{rateLimitInfo.remainingAttempts !== 1 ? 's' : ''} remaining
                  </p>
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
              <div className="pt-2 flex justify-center">
                <div className="w-full">
                  <button
                    type="submit"
                    disabled={isSubmitting || !email || !password}
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
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
              </div>

              {/* Social Login */}
              <SocialLoginButtons />
            </form>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t border-white/20">
              <div className="text-body-sm sm:text-body text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-white font-semibold hover:text-coral transition-colors duration-300 relative group"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
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
