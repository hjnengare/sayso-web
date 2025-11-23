"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { usePrefersReducedMotion } from "../utils/hooks/usePrefersReducedMotion";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { RateLimiter } from "../lib/rateLimiting";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";

// Import shared components
import { authStyles } from "../components/Auth/Shared/authStyles";
import { AuthHeader } from "../components/Auth/Shared/AuthHeader";
import { EmailInput } from "../components/Auth/Shared/EmailInput";
import { PasswordInput } from "../components/Auth/Shared/PasswordInput";
import { SocialLoginButtons } from "../components/Auth/Shared/SocialLoginButtons";

// Import register-specific components
import { UsernameInput } from "../components/Auth/Register/UsernameInput";
import { RegistrationProgress } from "../components/Auth/Register/RegistrationProgress";
import { usePasswordStrength, validatePassword } from "../components/Auth/Register/usePasswordStrength";

export default function RegisterPage() {
  usePredefinedPageTitle('register');
  const prefersReduced = usePrefersReducedMotion();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [consent, setConsent] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { register, isLoading: authLoading, error: authError } = useAuth();
  const isLoading = authLoading;
  const { showToast } = useToast();
  const router = useRouter();
  const containerRef = useRef(null);

  // Use password strength hook
  const passwordStrength = usePasswordStrength(password, email);

  // Initialize scroll reveal (runs once per page load)
  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

  // Validation functions
  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getUsernameError = () => {
    if (!usernameTouched) return "";
    if (!username) return "Username is required";
    if (username.length < 3) return "Username must be at least 3 characters";
    if (username.length > 20) return "Username must be less than 20 characters";
    if (!validateUsername(username)) return "Username can only contain letters, numbers, and underscores";
    return "";
  };

  const getEmailError = () => {
    if (!emailTouched) return "";
    if (!email) return "Email is required";
    if (!validateEmail(email)) return "Please enter a valid email address";
    return "";
  };

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Offline detection
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Hydration-safe disabled state
  const isFormDisabled = mounted ? (submitting || isLoading) : false;
  const isSubmitDisabled = mounted ? (
    submitting || isLoading || !consent || passwordStrength.score < 3 ||
    !username || !email || !password || !validateUsername(username) || !validateEmail(email)
  ) : true;

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (!usernameTouched) setUsernameTouched(true);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!emailTouched) setEmailTouched(true);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (!passwordTouched) setPasswordTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting || isLoading) return;

    setError("");
    setSubmitting(true);

    try {
      // Enhanced validation
      if (!username?.trim() || !email?.trim() || !password?.trim()) {
        setError("Please fill in all fields");
        showToast("Please fill in all fields", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      if (!validateUsername(username.trim())) {
        setError("Please enter a valid username");
        showToast("Please enter a valid username", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      if (!validateEmail(email.trim())) {
        setError("📧 Please enter a valid email address (e.g., user@example.com)");
        showToast("📧 Please enter a valid email address", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      if (email.trim().length > 254) {
        setError("📧 Email address is too long (maximum 254 characters)");
        showToast("📧 Email address is too long", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      if (email.trim().includes('..') || email.trim().startsWith('.') || email.trim().endsWith('.')) {
        setError("📧 Email address format is invalid");
        showToast("📧 Email address format is invalid", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      if (!consent) {
        setError("Please accept the Terms and Privacy Policy");
        showToast("Please accept the Terms and Privacy Policy", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        showToast(passwordError, 'sage', 4000);
        setSubmitting(false);
        return;
      }

      if (passwordStrength.score < 3) {
        setError("🔐 Please create a stronger password");
        showToast("🔐 Please create a stronger password", 'sage', 3000);
        setSubmitting(false);
        return;
      }

      if (!isOnline) {
        setError("You're offline. Please check your connection and try again.");
        showToast("You're offline. Please check your connection and try again.", 'sage', 4000);
        setSubmitting(false);
        return;
      }

      // Check rate limit before attempting registration
      const normalizedEmail = email.trim().toLowerCase();
      const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, 'register');
      
      if (!rateLimitResult.allowed) {
        const errorMsg = rateLimitResult.message || 'Too many registration attempts. Please try again later.';
        setError(errorMsg);
        showToast(errorMsg, 'sage', 5000);
        setSubmitting(false);
        return;
      }

      const success = await register(normalizedEmail, password);
      
      if (success) {
        // Clear rate limit on successful registration
        await RateLimiter.recordSuccess(normalizedEmail, 'register');
        
        setUsername("");
        setEmail("");
        setPassword("");
        showToast("✅ Account created! Check your email to confirm your account.", 'success', 5000);
      } else {
        // Rate limit already incremented by checkRateLimit, no need to record failure
        
        if (authError) {
          if (authError.includes('fetch') || authError.includes('network')) {
            setError('🌐 Connection error. Please check your internet connection and try again.');
            showToast('🌐 Connection error. Please check your internet connection and try again.', 'sage', 4000);
          } else if (authError.includes('already registered') || authError.includes('already exists')) {
            setError('❌ This email is already registered. Try logging in instead.');
            showToast('❌ This email is already registered. Try logging in instead.', 'sage', 4000);
          } else if (authError.includes('invalid email') || authError.includes('email address') && authError.includes('invalid')) {
            setError('📧 The email address format is invalid. Please check and try again.');
            showToast('📧 The email address format is invalid. Please check and try again.', 'sage', 4000);
          } else if (authError.includes('password') && (authError.includes('weak') || authError.includes('requirements'))) {
            setError('🔐 Password doesn\'t meet security requirements. Use 8+ characters with uppercase, lowercase, and numbers.');
            showToast('🔐 Password doesn\'t meet security requirements', 'sage', 4000);
          } else if (authError.includes('too many requests') || authError.includes('rate limit')) {
            setError('⏰ Too many attempts. Please wait a moment and try again.');
            showToast('⏰ Too many attempts. Please wait a moment and try again.', 'sage', 4000);
          } else {
            setError(authError);
            showToast(authError, 'sage', 4000);
          }
        } else {
          setError("❌ Registration failed. Please try again.");
          showToast("❌ Registration failed. Please try again.", 'sage', 4000);
        }
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'sage', 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <div ref={containerRef} data-reduced={prefersReduced} className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">

        {/* Premium floating orbs background */}
        <div className="floating-orb floating-orb-1" aria-hidden="true" />
        <div className="floating-orb floating-orb-2" aria-hidden="true" />
        <div className="floating-orb floating-orb-3" aria-hidden="true" />
        <div className="floating-orb floating-orb-4" aria-hidden="true" />
        <div className="floating-orb floating-orb-5" aria-hidden="true" />
        <div className="floating-orb floating-orb-6" aria-hidden="true" />

        <AuthHeader
          backLink="/onboarding"
          title="Create your account"
          subtitle="Sign up today - share honest reviews, climb leaderboards, and rate any business!"
        />

        <div className="w-full mx-auto max-w-[2000px] flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 lg:px-10 2xl:px-16">
          <div className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl sm:mx-auto relative z-10">
          {/* Form Card */}
          <section data-section>
          <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-2xl overflow-hidden backdrop-blur-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Error Message */}
              {error && (
                <div className="bg-error-50 border border-error-100 rounded-xl p-4 text-center">
                  <p className="text-caption font-semibold text-error-600" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{error}</p>
                </div>
              )}

              {/* Offline Message */}
              {!isOnline && !error && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-caption font-semibold text-orange-600" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>You&apos;re offline. We&apos;ll try again when you&apos;re back online.</p>
                </div>
              )}

              {/* Username Input */}
              <UsernameInput
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => setUsernameTouched(true)}
                error={getUsernameError()}
                touched={usernameTouched}
                disabled={isFormDisabled}
              />

              {/* Email Input */}
              <EmailInput
                value={email}
                onChange={handleEmailChange}
                onBlur={() => setEmailTouched(true)}
                error={getEmailError()}
                touched={emailTouched}
                disabled={isFormDisabled}
              />

              {/* Password Input */}
              <PasswordInput
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => setPasswordTouched(true)}
                disabled={isFormDisabled}
                showStrength={true}
                strength={passwordStrength}
                touched={passwordTouched}
              />

              {/* Terms consent */}
              <div className="pt-2">
                <label className="flex items-start gap-3 text-body-sm text-white cursor-pointer" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 border-white/40 bg-white/20 text-sage focus:ring-sage/30 focus:ring-offset-0 rounded"
                  />
                  <span className="flex-1 leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" className="underline text-white hover:text-coral transition-colors font-semibold decoration-white/50">
                      Terms of Use
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline text-white hover:text-coral transition-colors font-semibold decoration-white/50">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {/* Sign Up Button */}
              <div className="pt-4 flex justify-center">
                <div className="w-full">
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                    className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                  >
                    {isFormDisabled ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>
                </div>
              </div>

              {/* Registration progress */}
              <RegistrationProgress
                usernameValid={username && !getUsernameError()}
                emailValid={email && !getEmailError()}
                passwordStrong={passwordStrength.score >= 3}
                consentGiven={consent}
              />

              {/* Social Login */}
              <SocialLoginButtons />
            </form>

            {/* Footer */}
              <div className="text-center mt-6 pt-6 border-t border-white/20">
              <div className="text-body-sm sm:text-body text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-white font-semibold hover:text-coral transition-colors duration-300 relative group"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
          </section>
          </div>
        </div>
      </div>
    </>
  );
}
