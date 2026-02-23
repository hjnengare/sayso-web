"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { usePredefinedPageTitle } from "../../hooks/usePageTitle";
import { InlineLoader } from "../../components/Loader/Loader";
import { getBrowserSupabase } from "../../lib/supabase/client";
import WavyTypedTitle from "@/app/components/Animations/WavyTypedTitle";

// Import shared components
import { authStyles } from "../../components/Auth/Shared/authStyles";
import { EmailInput } from "../../components/Auth/Shared/EmailInput";
import { PasswordInput } from "../../components/Auth/Shared/PasswordInput";
// Note: SocialLoginButtons not imported - business accounts use email+password only

// Import register-specific components
import { UsernameInput } from "../../components/Auth/Register/UsernameInput";
import { RegistrationProgress } from "../../components/Auth/Register/RegistrationProgress";
import { usePasswordStrength, validatePassword } from "../../components/Auth/Register/usePasswordStrength";

export default function BusinessRegisterPage() {
  usePredefinedPageTitle("register");
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
  const [existingAccountError, setExistingAccountError] = useState(false);
  const [existingAccountLabel, setExistingAccountLabel] = useState("Personal");

  const { register, isLoading: authLoading, error: authError } = useAuth();
  const isLoading = authLoading;
  const { showToast } = useToast();
  const containerRef = useRef(null);
  const supabase = getBrowserSupabase();

  // Use password strength hook
  const passwordStrength = usePasswordStrength(password, email);

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
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Hydration-safe disabled state
  const isFormDisabled = mounted ? (submitting || isLoading) : false;
  const isSubmitDisabled = mounted ? (
    submitting || isLoading || !consent || passwordStrength.score < 3 ||
    !username ||
    !email ||
    !password ||
    !validateUsername(username) ||
    !validateEmail(email)
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

  const checkEmailExists = async (
    normalizedEmail: string
  ): Promise<{ exists: boolean; role?: "user" | "business_owner" | "admin" } | null> => {
    try {
      const { data, error: emailError } = await supabase
        .from("profiles")
        .select("user_id, role")
        .eq("email", normalizedEmail)
        .limit(1);

      if (emailError) return null;
      const exists = (data?.length || 0) > 0;
      return { exists, role: data?.[0]?.role };
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting || isLoading) return;

    setError("");
    setExistingAccountError(false);
    setSubmitting(true);

    try {
      // Enhanced validation
      if (!username?.trim() || !email?.trim() || !password?.trim()) {
        setError("Please fill in all fields");
        showToast("Please fill in all fields", "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!validateUsername(username.trim())) {
        setError("Please enter a valid username");
        showToast("Please enter a valid username", "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!validateEmail(email.trim())) {
        const errorMsg = "Please enter a valid email address (for example, name@example.com).";
        setError(errorMsg);
        // Only show toast, error already shown inline
        showToast("Please enter a valid email address.", "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (email.trim().length > 254) {
        const errorMsg = "Email address is too long (maximum 254 characters).";
        setError(errorMsg);
        // Only show toast, error already shown inline
        showToast("Email address is too long.", "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (email.trim().includes("..") || email.trim().startsWith(".") || email.trim().endsWith(".")) {
        const errorMsg = "Email address format is invalid.";
        setError(errorMsg);
        // Only show toast, error already shown inline
        showToast("Email address format is invalid.", "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!consent) {
        setError("Please accept the Terms and Privacy Policy");
        showToast("Please accept the Terms and Privacy Policy", "sage", 3000);
        setSubmitting(false);
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        // Only show toast, error already shown inline
        showToast(passwordError, "sage", 4000);
        setSubmitting(false);
        return;
      }

      if (passwordStrength.score < 3) {
        const errorMsg = "Please create a stronger password";
        setError(errorMsg);
        // Only show toast, error already shown inline
        showToast(errorMsg, "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!isOnline) {
        setError("You're offline. Please check your connection and try again.");
        showToast("You're offline. Please check your connection and try again.", "sage", 4000);
        setSubmitting(false);
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      // FLOW: BUSINESS REGISTER (NO SHARED EMAILS)
      // 1) If email exists in profiles, block signup and ask for a different email.
      // 2) If email does not exist, signUp and create a business profile.
      //    Supabase sends the verification email; redirect to /verify-email.
      const emailCheck = await checkEmailExists(normalizedEmail);

      if (emailCheck === null) {
        const msg =
          "We couldn't confirm whether this email already exists. Please try again or log in.";
        setError(msg);
        showToast(msg, "sage", 4000);
        setSubmitting(false);
        return;
      }

      if (emailCheck.exists) {
        const accountLabel =
          emailCheck.role === "business_owner"
            ? "Business"
            : emailCheck.role === "admin"
              ? "Admin"
              : "Personal";
        setExistingAccountLabel(accountLabel);
        setExistingAccountError(true);
        const msg = `Email already registered for a ${accountLabel} account. Log in or use a different email.`;
        setError(msg);
        showToast(msg, "sage", 4000);
        setSubmitting(false);
        return;
      }

      // STEP 2: Create a brand-new business auth user
      const success = await register(
        normalizedEmail,
        password,
        username.trim(),
        "business_owner"
      );

      if (success) {
        setUsername("");
        setEmail("");
        setPassword("");
        showToast("Business account created! Check your email to confirm your account.", "success", 5000);
      } else {
        if (authError) {
          const lower = authError.toLowerCase();
          if (lower.includes("fetch") || lower.includes("network")) {
            setError("Connection error. Please check your internet connection and try again.");
            showToast("Connection error. Please check your internet connection and try again.", "sage", 4000);
          } else if (
            lower.includes("already in use") ||
            lower.includes("already registered") ||
            lower.includes("already exists") ||
            lower.includes("email already") ||
            lower.includes("already taken") ||
            lower.includes("duplicate") ||
            lower.includes("user_exists")
          ) {
            setExistingAccountError(true);
            setError("Email already registered. Log in or use a different email.");
            showToast("Email already registered. Log in or use a different email.", "sage", 4000);
          } else if (
            lower.includes("invalid email") ||
            (lower.includes("email address") && lower.includes("invalid"))
          ) {
            const msg = "Email address is invalid. Please use a valid address like name@example.com.";
            setError(msg);
            showToast(msg, "sage", 4000);
          } else if (lower.includes("password") && (lower.includes("weak") || lower.includes("requirements"))) {
            setError("Password must be at least 6 characters long.");
            showToast("Password must be at least 6 characters long", "sage", 4000);
          } else if (lower.includes("too many requests") || lower.includes("rate limit")) {
            setError("Too many attempts. Please wait a moment and try again.");
            showToast("Too many attempts. Please wait a moment and try again.", "sage", 4000);
          } else {
            setError(authError);
            showToast(authError, "sage", 4000);
          }
        } else {
          setError("Registration failed. Please try again.");
          showToast("Registration failed. Please try again.", "sage", 4000);
        }
      }
    } catch (error: unknown) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      showToast(errorMessage, "sage", 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      {/* Let the document handle scrolling to avoid nested scroll containers on mobile. */}
      <div ref={containerRef} data-reduced={prefersReduced} className="  bg-off-white flex flex-col relative safe-area-full" style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}>

        {/* Premium floating orbs background */}
        <div className="floating-orb floating-orb-1" aria-hidden="true" />
        <div className="floating-orb floating-orb-2" aria-hidden="true" />
        <div className="floating-orb floating-orb-3" aria-hidden="true" />
        <div className="floating-orb floating-orb-4" aria-hidden="true" />
        <div className="floating-orb floating-orb-5" aria-hidden="true" />
        <div className="floating-orb floating-orb-6" aria-hidden="true" />

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
              text="Create a business account"
              as="h2"
              className="text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal"
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              triggerOnTypingComplete={true}
              enableScrollTrigger={false}
              style={{
                fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 700,
              }}
            />
          </div>
          <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400 }}>
            Register your business to manage your presence, respond to reviews, and connect with customers!
          </p>
        </div>

        <div className="w-full mx-auto max-w-[2000px] flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 lg:px-10 2xl:px-16">
          <div className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl sm:mx-auto relative z-10">
          {/* Form Card */}
          <section data-section>
          <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">

            {existingAccountError ? (
              <div className="space-y-6 text-center relative z-10">
                <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>

                  <h3
                    className="text-lg font-semibold text-blue-900 mb-2"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    Account Already Exists
                  </h3>

                  <p
                    className="text-blue-700 mb-6"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    Email already registered for a {existingAccountLabel} account. Log in or use a different email.
                  </p>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setExistingAccountError(false);
                        setError("");
                        setEmail("");
                      }}
                      className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 text-gray-700 text-body font-semibold rounded-full hover:bg-gray-200 transition-all duration-300"
                      style={{
                        fontFamily:
                          "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Try Different Email
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {/* Error Message */}
                {error && (
                  <div className="bg-error-50 border border-error-100 rounded-[12px] p-4 text-center">
                    <p className="text-caption font-semibold text-error-600" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>{error}</p>
                  </div>
                )}

                {/* Offline Message */}
                {!isOnline && !error && (
                  <div className="bg-orange-50 border border-orange-200 rounded-[12px] p-4 text-center">
                    <p className="text-caption font-semibold text-orange-600" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>You&apos;re offline. We&apos;ll try again when you&apos;re back online.</p>
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
                <p
                  className="text-xs text-white/80 mt-1"
                  style={{
                    fontFamily:
                      "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  This is your account username.
                </p>

                {/* Email Input */}
                <EmailInput
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setEmailTouched(true)}
                  error={getEmailError()}
                  touched={emailTouched}
                  disabled={isFormDisabled}
                  placeholder="you@example.com"
                />

                {/* Password Input */}
                <PasswordInput
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => setPasswordTouched(true)}
                  disabled={isFormDisabled}
                  showStrength={true}
                  strength={{
                    ...passwordStrength,
                    checks: {
                      length: passwordStrength.checks.length,
                      uppercase: false,
                      lowercase: false,
                      number: false,
                    }
                  }}
                  touched={passwordTouched}
                />

                {/* Terms consent */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 text-body-sm text-white cursor-pointer" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400 }}>
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

                  {/* Sign Up Button and Personal Links */}
                  <div className="pt-4 flex flex-col items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                      className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                    >
                      {isFormDisabled ? (
                        <>
                          <InlineLoader size="xs" variant="wavy" color="white" />
                          Creating account...
                        </>
                      ) : (
                        "Create business account"
                      )}
                    </button>
                    {/* Personal Account Links */}
                    <div className="mt-2 text-center">
                      <Link
                        href="/login"
                        className="text-body-sm text-white/80 hover:text-coral font-medium underline-offset-2 hover:underline transition-colors duration-200"
                        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 500 }}
                      >
                        Log in to a Personal Account
                      </Link>
                      <span className="mx-2 text-white/30" aria-hidden="true">|</span>
                      <Link
                        href="/register"
                        className="text-body-sm text-white/80 hover:text-coral font-medium underline-offset-2 hover:underline transition-colors duration-200"
                        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 500 }}
                      >
                        Sign up for a Personal Account
                      </Link>
                    </div>
                  </div>

                {/* Registration progress */}
                <RegistrationProgress
                  usernameValid={!!username && !getUsernameError()}
                  emailValid={!!email && !getEmailError()}
                  passwordStrong={passwordStrength.score >= 3}
                  consentGiven={consent}
                />

                {/* Note: No OAuth for business accounts - email+password only */}
              </form>
            )}

            {/* Footer */}
              <div className="text-center mt-6 pt-6 border-t border-white/20">
              <div className="text-body-sm sm:text-body text-white" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400 }}>
                Already have a business account?{" "}
                <Link
                  href="/business/login"
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

