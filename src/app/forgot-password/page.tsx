"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Urbanist } from "next/font/google";
import { ArrowLeft } from "react-feather";
import { AuthService } from "../lib/auth";
import { useToast } from "../contexts/ToastContext";
import { RateLimiter } from "../lib/rateLimiting";
import { useScrollReveal } from "../hooks/useScrollReveal";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

// Import shared components
import { authStyles } from "../components/Auth/Shared/authStyles";
import { EmailInput } from "../components/Auth/Shared/EmailInput";

const urbanist = Urbanist({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { showToast } = useToast();
  const containerRef = useRef(null);

  // Initialize scroll reveal (runs once per page load)
  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

  // Validation function
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Mark field as touched for validation
    setEmailTouched(true);

    if (!email) {
      setError("Please enter your email address");
      showToast("Please enter your email address", 'sage', 3000);
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
      // Check rate limit before requesting password reset
      const normalizedEmail = email.trim().toLowerCase();
      const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, 'password_reset');
      
      if (!rateLimitResult.allowed) {
        const errorMsg = rateLimitResult.message || 'Too many password reset requests. Please try again later.';
        setError(errorMsg);
        showToast(errorMsg, 'sage', 5000);
        setIsSubmitting(false);
        return;
      }

      const { error: resetError } = await AuthService.resetPasswordForEmail(email);

      if (resetError) {
        setError(resetError.message);
        showToast(resetError.message, 'sage', 4000);
      } else {
        // Clear rate limit on successful password reset request
        await RateLimiter.recordSuccess(normalizedEmail, 'password_reset');
        setEmailSent(true);
        showToast("Password reset email sent! Check your inbox.", 'success', 5000);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send reset email';
      setError(errorMsg);
      showToast(errorMsg, 'sage', 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: authStyles }} />
        <div ref={containerRef} className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">
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
          <div className="text-center mb-4 pt-16 sm:pt-20 title-no-break">
            <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
              <WavyTypedTitle
                text="Check your email"
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
              Password reset instructions sent
            </p>
          </div>

          <div className="w-full sm:max-w-md lg:max-w-lg sm:mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 sm:px-2">
            <section data-section>
              <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
                <div className="text-center space-y-4 relative z-10">
                  <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <h2 className="font-urbanist text-xl font-700 text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Email sent!
                    </h2>
                    <p className="font-urbanist text-body-sm text-white/80" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      We&apos;ve sent password reset instructions to:
                    </p>
                    <p className="font-urbanist text-body font-600 text-coral" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      {email}
                    </p>
                  </div>

                  <div className="bg-white/10 rounded-[20px] p-4 text-left space-y-2">
                    <p className="font-urbanist text-body-sm text-white/90" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      <strong className="text-white">Next steps:</strong>
                    </p>
                    <ol className="font-urbanist text-body-sm text-white/80 space-y-1 list-decimal list-inside" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      <li>Check your inbox (and spam folder)</li>
                      <li>Click the reset link in the email</li>
                      <li>Create a new password</li>
                    </ol>
                    <p className="font-urbanist text-body-sm text-white/70 italic pt-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      The reset link expires in 60 minutes
                    </p>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      onClick={() => router.push('/login')}
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                      className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 flex items-center justify-center gap-2 btn-target btn-press"
                    >
                      Back to Login
                    </button>

                    <button
                      onClick={() => {
                        setEmailSent(false);
                        setEmail("");
                        setEmailTouched(false);
                      }}
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}
                      className="w-full text-body-sm text-white hover:text-coral transition-colors duration-300"
                    >
                      Use a different email
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
      <div ref={containerRef} className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">

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
        <div className="text-center mb-4 pt-16 sm:pt-20 title-no-break">
          <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
            <WavyTypedTitle
              text="Forgot password?"
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
            Enter your email to reset your password
          </p>
        </div>

        <div className="w-full sm:max-w-md lg:max-w-lg sm:mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 sm:px-2">
          {/* Form Card */}
          <section data-section>
            <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {/* Error Message */}
                {error && (
                  <div className="bg-orange-50 border border-orange-200 rounded-[20px] p-4 text-center">
                    <p className="text-caption font-semibold text-orange-600" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{error}</p>
                  </div>
                )}

                <div className="mb-4 text-center">
                  <p className="font-urbanist text-body-sm text-white/80" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                  </p>
                </div>

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

                {/* Submit Button */}
                <div className="pt-2 flex justify-center">
                  <div className="w-full">
                    <button
                      type="submit"
                      disabled={isSubmitting || !email}
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                      className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Sending...
                        </>
                      ) : (
                        "Send reset link"
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
