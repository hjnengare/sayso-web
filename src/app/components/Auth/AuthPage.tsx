"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { usePrefersReducedMotion } from "../../utils/hooks/usePrefersReducedMotion";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { RateLimiter } from "../../lib/rateLimiting";
import { InlineLoader } from "../Loader/Loader";
import { getBrowserSupabase } from "../../lib/supabase/client";

import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

import { authStyles } from "./Shared/authStyles";
import { EmailInput } from "./Shared/EmailInput";
import { PasswordInput } from "./Shared/PasswordInput";
import { SocialLoginButtons } from "./Shared/SocialLoginButtons";
import { BusinessNameInput } from "./Shared/BusinessNameInput";

import { UsernameInput } from "./Register/UsernameInput";
import { RegistrationProgress } from "./Register/RegistrationProgress";
import { usePasswordStrength, validatePassword } from "./Register/usePasswordStrength";

type AccountType = "personal" | "business";
type AuthMode = "login" | "register";

interface AuthPageProps {
  defaultAuthMode: AuthMode;
}

export default function AuthPage({ defaultAuthMode }: AuthPageProps) {
  const prefersReduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const supabase = getBrowserSupabase();

  const { register, login, isLoading: authLoading, error: authError } = useAuth();
  const { showToast } = useToast();

  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [authMode, setAuthMode] = useState<AuthMode>(defaultAuthMode);

  const [personalUsername, setPersonalUsername] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [consent, setConsent] = useState(false);

  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [existingAccountError, setExistingAccountError] = useState(false);
  const [existingAccountLabel, setExistingAccountLabel] = useState("Personal");

  const isLoading = authLoading;
  const isRegisterMode = authMode === "register";
  const isBusiness = accountType === "business";

  const passwordStrength = usePasswordStrength(password, email);

  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    setError("");
    setExistingAccountError(false);
  }, [authMode]);

  useEffect(() => {
    resetFormState();
  }, [accountType]);

  const resetFormState = () => {
    setPersonalUsername("");
    setBusinessName("");
    setEmail("");
    setPassword("");
    setConsent(false);
    setError("");
    setExistingAccountError(false);
    setExistingAccountLabel("Personal");
    setNameTouched(false);
    setEmailTouched(false);
    setPasswordTouched(false);
  };

  const validateUsername = (value: string) => /^[a-zA-Z0-9_]{3,20}$/.test(value);
  const validateBusinessName = (value: string) => value.trim().length >= 2 && value.trim().length <= 80;
  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const getNameError = () => {
    if (!nameTouched) return "";
    if (isBusiness) {
      if (!businessName) return "Business name is required";
      if (!validateBusinessName(businessName)) return "Business name must be 2-80 characters";
      return "";
    }

    if (!personalUsername) return "Username is required";
    if (personalUsername.length < 3) return "Username must be at least 3 characters";
    if (personalUsername.length > 20) return "Username must be less than 20 characters";
    if (!validateUsername(personalUsername)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    return "";
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

  const isFormDisabled = mounted ? submitting || isLoading : false;
  const isSubmitDisabled = mounted
    ? submitting ||
      isLoading ||
      (isRegisterMode
        ? !consent ||
          passwordStrength.score < 3 ||
          !email ||
          !password ||
          !validateEmail(email) ||
          (isBusiness ? !businessName || !validateBusinessName(businessName) : !personalUsername || !validateUsername(personalUsername))
        : !email ||
          !password ||
          !validateEmail(email))
    : true;

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

  const handleLogin = async () => {
    if (!email?.trim() || !password?.trim()) {
      setError("Complete all fields");
      showToast("All fields required", "sage", 2500);
      return;
    }

    if (!validateEmail(email.trim())) {
      const errorMsg = "Email invalid";
      setError(errorMsg);
      showToast(errorMsg, "sage", 2500);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, "login");

    if (!rateLimitResult.allowed) {
      const errorMsg = rateLimitResult.message || "Too many attempts. Try again later.";
      setError(errorMsg);
      showToast(errorMsg, "sage", 3500);
      return;
    }

    const desiredRole = isBusiness ? "business_owner" : "user";
    const loggedInUser = await login(normalizedEmail, password, desiredRole);

    if (loggedInUser) {
      await RateLimiter.recordSuccess(normalizedEmail, "login");
      showToast("Welcome back", "sage", 2000);
      return;
    }

    const errorMsg = authError || "Email or password is incorrect";
    setError(errorMsg);
    showToast(errorMsg, "sage", 3000);
  };

  const handleRegister = async () => {
    const nameValue = isBusiness ? businessName : personalUsername;

    if (!nameValue?.trim() || !email?.trim() || !password?.trim()) {
      setError("Please fill in all fields");
      showToast("Please fill in all fields", "sage", 3000);
      return;
    }

    if (isBusiness) {
      if (!validateBusinessName(businessName.trim())) {
        setError("Please enter a valid business name");
        showToast("Please enter a valid business name", "sage", 3000);
        return;
      }
    } else if (!validateUsername(personalUsername.trim())) {
      setError("Please enter a valid username");
      showToast("Please enter a valid username", "sage", 3000);
      return;
    }

    if (!validateEmail(email.trim())) {
      const msg = "Please enter a valid email address (for example, name@example.com).";
      setError(msg);
      showToast("Please enter a valid email address.", "sage", 3000);
      return;
    }

    if (email.trim().length > 254) {
      const msg = "Email address is too long (maximum 254 characters).";
      setError(msg);
      showToast("Email address is too long.", "sage", 3000);
      return;
    }

    if (email.trim().includes("..") || email.trim().startsWith(".") || email.trim().endsWith(".")) {
      const msg = "Email address format is invalid.";
      setError(msg);
      showToast("Email address format is invalid.", "sage", 3000);
      return;
    }

    if (!consent) {
      setError("Please accept the Terms and Privacy Policy");
      showToast("Please accept the Terms and Privacy Policy", "sage", 3000);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      showToast(passwordError, "sage", 4000);
      return;
    }

    if (passwordStrength.score < 3) {
      const msg = "Please create a stronger password";
      setError(msg);
      showToast(msg, "sage", 3000);
      return;
    }

    if (!isOnline) {
      const msg = "You're offline. Please check your connection and try again.";
      setError(msg);
      showToast(msg, "sage", 4000);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, "register");

    if (!rateLimitResult.allowed) {
      const msg =
        rateLimitResult.message ||
        "Too many registration attempts. Please try again later.";
      setError(msg);
      showToast(msg, "sage", 5000);
      return;
    }

    const emailCheck = await checkEmailExists(normalizedEmail);

    if (emailCheck === null) {
      const msg =
        "We couldn't confirm whether this email already exists. Please try again or log in.";
      setError(msg);
      showToast(msg, "sage", 4000);
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
      return;
    }

    const desiredRole = isBusiness ? "business_owner" : "user";
    const success = await register(normalizedEmail, password, nameValue.trim(), desiredRole);

    if (success) {
      await RateLimiter.recordSuccess(normalizedEmail, "register");

      resetFormState();
      showToast(
        isBusiness
          ? "Business account created! Check your email to confirm your account."
          : "Account created! Check your email to confirm your account.",
        "success",
        5000
      );
      return;
    }

    if (authError) {
      const lower = authError.toLowerCase();
      if (lower.includes("fetch") || lower.includes("network")) {
        const msg =
          "Connection error. Please check your internet connection and try again.";
        setError(msg);
        showToast(msg, "sage", 4000);
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
        const msg = "Email already exists. Please log in.";
        setError(msg);
        showToast(msg, "sage", 4000);
      } else if (
        lower.includes("invalid email") ||
        (lower.includes("email address") && lower.includes("invalid"))
      ) {
        const msg =
          "Email address is invalid. Please use a valid address like name@example.com.";
        setError(msg);
        showToast(msg, "sage", 4000);
      } else if (
        lower.includes("password") &&
        (lower.includes("weak") || lower.includes("requirements"))
      ) {
        const msg = "Password must be at least 6 characters long.";
        setError(msg);
        showToast("Password must be at least 6 characters long", "sage", 4000);
      } else if (lower.includes("too many requests") || lower.includes("rate limit")) {
        const msg = "Too many attempts. Please wait a moment and try again.";
        setError(msg);
        showToast(msg, "sage", 4000);
      } else {
        setError(authError);
        showToast(authError, "sage", 4000);
      }
    } else {
      const msg = "Registration failed. Please try again.";
      setError(msg);
      showToast(msg, "sage", 4000);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || isLoading) return;

    setError("");
    setExistingAccountError(false);
    setSubmitting(true);

    try {
      if (isRegisterMode) {
        await handleRegister();
      } else {
        await handleLogin();
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      showToast(msg, "sage", 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const title = isBusiness
    ? isRegisterMode
      ? "Register Your Business"
      : "Business Login"
    : isRegisterMode
      ? "Create Your Account"
      : "Welcome Back";

  const subtitle = isBusiness
    ? isRegisterMode
      ? "Register your business to manage your presence and connect with customers."
      : "Sign in to manage your business presence and respond to reviews."
    : isRegisterMode
      ? "Sign up today - share honest reviews, climb leaderboards, and rate any business!"
      : "Sign in to continue discovering sayso";

  const motionVariants = prefersReduced
    ? { initial: false, animate: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <div
        ref={containerRef}
        data-reduced={prefersReduced}
        className="min-h-[100dvh] bg-off-white flex flex-col relative safe-area-full"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
      >
        {/* Premium floating orbs background */}
        <div className="floating-orb floating-orb-1" aria-hidden="true" />
        <div className="floating-orb floating-orb-2" aria-hidden="true" />
        <div className="floating-orb floating-orb-3" aria-hidden="true" />
        <div className="floating-orb floating-orb-4" aria-hidden="true" />
        <div className="floating-orb floating-orb-5" aria-hidden="true" />
        <div className="floating-orb floating-orb-6" aria-hidden="true" />

        {/* Back button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
          <Link
            href="/onboarding"
            className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm"
          >
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-4 pt-16 sm:pt-20">
          <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
            <WavyTypedTitle
              text={title}
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

          <p
            className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700"
            style={{
              fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontWeight: 400,
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Role toggle */}
        <div className="flex justify-center px-4">
          <div className="inline-flex rounded-full bg-white/70 shadow-sm border border-white/70 p-1">
            <button
              type="button"
              onClick={() => setAccountType("personal")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                accountType === "personal"
                  ? "bg-navbar-bg/90 text-white shadow-md"
                  : "text-charcoal/70 hover:text-charcoal"
              }`}
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Personal Account
            </button>
            <button
              type="button"
              onClick={() => setAccountType("business")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                accountType === "business"
                  ? "bg-navbar-bg/90 text-white shadow-md"
                  : "text-charcoal/70 hover:text-charcoal"
              }`}
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Business Account
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full mx-auto max-w-[2000px] flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 lg:px-10 2xl:px-16">
          <div className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl sm:mx-auto relative z-10">
            <section data-section>
              <motion.div
                layout
                className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12"
              >
                <div className="flex items-center justify-center pb-6">
                  <div className="inline-flex rounded-full bg-white/15 p-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode("register")}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                        authMode === "register"
                          ? "bg-white text-charcoal shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                    >
                      Register
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                        authMode === "login"
                          ? "bg-white text-charcoal shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                    >
                      Login
                    </button>
                  </div>
                </div>

                {existingAccountError ? (
                  <div className="space-y-6 text-center relative z-10">
                    <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-6">
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
                          fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        }}
                      >
                        Account Already Exists
                      </h3>

                      <p
                        className="text-blue-700 mb-6"
                        style={{
                          fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
                            setAuthMode("login");
                            setEmailTouched(true);
                          }}
                          className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white text-body font-semibold rounded-full hover:bg-blue-700 transition-all duration-300"
                          style={{
                            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          }}
                        >
                          Switch to Login
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setExistingAccountError(false);
                            setError("");
                            setEmail("");
                          }}
                          className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 text-gray-700 text-body font-semibold rounded-full hover:bg-gray-200 transition-all duration-300"
                          style={{
                            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          }}
                        >
                          Try Different Email
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${accountType}-${authMode}`}
                      {...motionVariants}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                        {error && (
                          <div className="bg-error-50 border border-error-100 rounded-[20px] p-4 text-center">
                            <p
                              className="text-caption font-semibold text-error-600"
                              style={{
                                fontFamily:
                                  "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              }}
                            >
                              {error}
                            </p>
                          </div>
                        )}

                        {!isOnline && !error && isRegisterMode && (
                          <div className="bg-orange-50 border border-orange-200 rounded-[20px] p-4 text-center">
                            <p
                              className="text-caption font-semibold text-orange-600"
                              style={{
                                fontFamily:
                                  "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              }}
                            >
                              You&apos;re offline. We&apos;ll try again when you&apos;re back online.
                            </p>
                          </div>
                        )}

                        {isRegisterMode && (
                          <>
                            {isBusiness ? (
                              <BusinessNameInput
                                value={businessName}
                                onChange={(value) => {
                                  setBusinessName(value);
                                  if (!nameTouched) setNameTouched(true);
                                }}
                                onBlur={() => setNameTouched(true)}
                                error={getNameError()}
                                touched={nameTouched}
                                disabled={isFormDisabled}
                              />
                            ) : (
                              <UsernameInput
                                value={personalUsername}
                                onChange={(value) => {
                                  setPersonalUsername(value);
                                  if (!nameTouched) setNameTouched(true);
                                }}
                                onBlur={() => setNameTouched(true)}
                                error={getNameError()}
                                touched={nameTouched}
                                disabled={isFormDisabled}
                              />
                            )}
                          </>
                        )}

                        <EmailInput
                          value={email}
                          onChange={(value) => {
                            setEmail(value);
                            if (!emailTouched) setEmailTouched(true);
                          }}
                          onBlur={() => setEmailTouched(true)}
                          error={getEmailError()}
                          touched={emailTouched}
                          disabled={isFormDisabled}
                          placeholder={isBusiness ? "business@company.com" : "you@example.com"}
                          label={isBusiness ? "Business Email" : "Email"}
                        />

                        <PasswordInput
                          value={password}
                          onChange={(value) => {
                            setPassword(value);
                            if (!passwordTouched) setPasswordTouched(true);
                          }}
                          onBlur={() => setPasswordTouched(true)}
                          disabled={isFormDisabled}
                          showStrength={isRegisterMode}
                          strength={passwordStrength}
                          touched={passwordTouched}
                          error={!isRegisterMode ? getPasswordError() : undefined}
                          placeholder={isRegisterMode ? "Create a password" : "Enter your password"}
                        />

                        {!isRegisterMode && (
                          <div className="text-right">
                            <Link
                              href="/forgot-password"
                              className="text-body-sm text-white hover:text-coral transition-colors duration-300 font-medium"
                              style={{
                                fontFamily:
                                  "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontWeight: 600,
                              }}
                            >
                              Forgot password?
                            </Link>
                          </div>
                        )}

                        {isRegisterMode && (
                          <div className="pt-2">
                            <label
                              className="flex items-start gap-3 text-body-sm text-white cursor-pointer"
                              style={{
                                fontFamily:
                                  "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontWeight: 400,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
                                className="mt-1 w-4 h-4 border-white/40 bg-white/20 text-sage focus:ring-sage/30 focus:ring-offset-0 rounded"
                              />
                              <span className="flex-1 leading-relaxed">
                                I agree to the{" "}
                                <Link
                                  href="/privacy/sayso%20privacy%20policy%20%26%20terms%20of%20use.pdf"
                                  className="underline text-white hover:text-coral transition-colors font-semibold decoration-white/50"
                                >
                                  Terms of Use
                                </Link>{" "}
                                and{" "}
                                <Link
                                  href="/privacy/sayso%20privacy%20policy%20%26%20terms%20of%20use.pdf"
                                  className="underline text-white hover:text-coral transition-colors font-semibold decoration-white/50"
                                >
                                  Privacy Policy
                                </Link>
                              </span>
                            </label>
                          </div>
                        )}

                        <div className="pt-4 flex flex-col items-center gap-2">
                          <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            style={{
                              fontFamily:
                                "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              fontWeight: 600,
                            }}
                            className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                          >
                            {isFormDisabled ? (
                              <>
                                <InlineLoader size="xs" variant="wavy" color="white" />
                                {isRegisterMode ? "Creating account..." : "Signing in..."}
                              </>
                            ) : isRegisterMode ? (
                              isBusiness ? "Create business account" : "Create account"
                            ) : (
                              "Sign in"
                            )}
                          </button>
                        </div>

                        {isRegisterMode && !isBusiness && (
                          <RegistrationProgress
                            usernameValid={!!personalUsername && !getNameError()}
                            emailValid={!!email && !getEmailError()}
                            passwordStrong={passwordStrength.score >= 3}
                            consentGiven={consent}
                          />
                        )}

                        {!isBusiness && <SocialLoginButtons accountType={"user"} />}
                      </form>

                      <div className="text-center mt-6 pt-6 border-t border-white/20">
                        <div
                          className="text-body-sm sm:text-body text-white"
                          style={{
                            fontFamily:
                              "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontWeight: 400,
                          }}
                        >
                          {authMode === "register"
                            ? "Already have an account?"
                            : "Don't have an account?"}{" "}
                          <button
                            type="button"
                            onClick={() => setAuthMode(authMode === "register" ? "login" : "register")}
                            className="text-white font-semibold hover:text-coral transition-colors duration-300 relative group"
                            style={{
                              fontFamily:
                                "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              fontWeight: 600,
                            }}
                          >
                            {authMode === "register" ? "Log in" : "Sign up"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </motion.div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

