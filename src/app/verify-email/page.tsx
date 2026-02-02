"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Urbanist } from "next/font/google";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { usePrefersReducedMotion } from "../utils/hooks/usePrefersReducedMotion";
import { Mail, CheckCircle, ExternalLink, ArrowLeft } from "lucide-react";
import { Loader as AppLoader } from "../components/Loader";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

const urbanist = Urbanist({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const styles = `
  /* Mobile-first typography scale - Body text = 16px */
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

  /* CSS Animations */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
  .animate-slide-in-left { animation: slideInLeft 0.6s ease-out forwards; }
  .animate-scale-in { animation: scaleIn 0.8s ease-out forwards; }

  .animate-delay-200 { animation-delay: 0.2s; }
  .animate-delay-400 { animation-delay: 0.4s; }
  .animate-delay-700 { animation-delay: 0.7s; }

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
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  // Load pending email from sessionStorage (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("pendingVerificationEmail");
    if (stored) setPendingEmail(stored);
  }, []);

  // Ensure scroll is not locked from previous routes/modals
  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const getPostVerifyRedirect = useCallback((): string => {
    if (!user) return "/login";

    // Route by profiles.role; business → /my-businesses only; never send business to user onboarding.
    // When role is unknown, stay on /verify-email so middleware can fetch and redirect (avoids sending business to /interests).
    const profileRole = user?.profile?.role;
    const accountRole = user?.profile?.account_role;
    const legacyCurrentRole = (user as any)?.current_role;

    const resolvedRole = profileRole || accountRole || legacyCurrentRole;

    if (resolvedRole === "business_owner") return "/my-businesses";
    if (resolvedRole === "user") return "/interests";
    // Role unknown — stay on verify-email; next request will be handled by middleware
    return "/verify-email";
  }, [user]);

  // Handle verification success from URL flag
  useEffect(() => {
    if (searchParams.get("verified") !== "1") return;

    // Mark verification as successful for UI
    setVerificationSuccess(true);
    showToastOnce("email-verified-v1", "Email verified successfully!", "sage", 3000);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pendingVerificationEmail");

      // Clean URL flag so refresh doesn't retrigger
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      router.replace(url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""), {
        scroll: false,
      });
    }

    // Redirect after showing success message
    const t = setTimeout(() => {
      if (user) {
        // User has session - redirect to appropriate page
        router.push(getPostVerifyRedirect());
      } else {
        // CROSS-DEVICE: No session on this device - redirect to login
        // The email IS verified, user just needs to log in on this device
        router.push("/login?message=Email+verified!+Please+log+in+to+continue.");
      }
    }, 2500);

    return () => clearTimeout(t);
  }, [searchParams, router, showToastOnce, user, getPostVerifyRedirect]);

  // If user is already verified, redirect correctly (business vs personal)
  useEffect(() => {
    if (!user || !user.email_verified) return;
    if (searchParams.get("verified")) return;

    showToastOnce("email-verified-v1", "Email verified. Account secured.", "sage", 3000);

    const t = setTimeout(() => {
      router.push(getPostVerifyRedirect());
    }, 1200);

    return () => clearTimeout(t);
  }, [user, searchParams, showToastOnce, router, getPostVerifyRedirect]);

  const handleResendVerification = async () => {
    const email = user?.email || pendingEmail;
    if (!email) return;

    setIsResending(true);
    try {
      const success = await resendVerificationEmail(email);
      if (success) showToast("Email sent. Check inbox.", "sage", 2500);
    } catch {
      showToast("Failed to resend. Try again.", "sage");
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenInbox = () => {
    const email = user?.email || pendingEmail;
    if (!email) return;

    const domain = email.split("@")[1]?.toLowerCase();
    let inboxUrl = "https://mail.google.com";

    if (domain?.includes("gmail")) inboxUrl = "https://mail.google.com";
    else if (domain?.includes("outlook") || domain?.includes("hotmail") || domain?.includes("live"))
      inboxUrl = "https://outlook.live.com/mail";
    else if (domain?.includes("yahoo")) inboxUrl = "https://mail.yahoo.com";
    else if (domain?.includes("icloud") || domain?.includes("me.com")) inboxUrl = "https://www.icloud.com/mail";
    else if (domain) inboxUrl = `https://${domain}`;

    window.open(inboxUrl, "_blank");
  };

  const handleRefreshUser = async () => {
    setIsChecking(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      showToast("Checking status...", "sage", 1500);

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } finally {
      setIsChecking(false);
    }
  };

  // Shared, consistent page shell for ALL branches (prevents hydration/layout mismatch)
  const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      ref={containerRef}
      data-reduced={prefersReduced}
      className="h-[100dvh] bg-off-white flex flex-col relative overflow-x-hidden overflow-y-auto ios-inertia hide-scrollbar safe-area-full touch-pan-y"
      style={{
        // Prevent scroll chaining on mobile + make wheel/touch feel consistent
        overscrollBehaviorY: "contain",
      }}
    >
      {children}
    </div>
  );

  const displayEmail = user?.email || pendingEmail;

  // Show success state when verification completed (especially for cross-device)
  if (verificationSuccess) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <PageShell>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="w-20 h-20 mx-auto mb-6 bg-sage/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-sage" />
              </div>
              <h2 
                className="text-2xl font-bold text-charcoal mb-3"
                style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
              >
                Email Verified!
              </h2>
              <p 
                className="text-base text-charcoal/70 mb-6"
                style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
              >
                {user 
                  ? "Redirecting you to continue setup..." 
                  : "Your email has been verified. Redirecting to login..."}
              </p>
              <div className="w-8 h-8 border-3 border-sage/20 border-t-sage rounded-full animate-spin mx-auto" />
            </div>
          </div>
        </PageShell>
      </>
    );
  }

  // Single unified loading/empty state - prevents layout shift
  if (isLoading || isResending || !displayEmail) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <PageShell>
          <div className="flex-1 flex items-center justify-center">
            {isLoading ? (
              <AppLoader size="lg" variant="wavy" color="sage" />
            ) : isResending ? (
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4" />
                <p className="font-urbanist text-base text-charcoal/70">Sending verification email...</p>
              </div>
            ) : (
              <div className="text-center max-w-md mx-auto p-6">
                <p className="text-lg text-charcoal mb-4">No verification pending.</p>
                <Link href="/register" className="text-sage hover:text-sage/80 underline">
                  Go to registration
                </Link>
              </div>
            )}
          </div>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <PageShell>
        {/* Back button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
          <Link
            href="/home"
            className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm"
          >
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
          {/* Header */}
          <div className="text-center mb-4 pt-16 sm:pt-20">
            <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
              <WavyTypedTitle
                text="Check Your Email"
                as="h2"
                className={`${urbanist.className} text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal`}
                typingSpeedMs={40}
                startDelayMs={300}
                waveVariant="subtle"
                loopWave={false}
                style={{ fontFamily: urbanist.style.fontFamily }}
              />
            </div>
            <p
              className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700"
              style={{
                fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 400,
              }}
            >
              We&apos;ve sent a confirmation email to verify your account and unlock full features!
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-card-bg rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden border border-white/50 shadow-md transition-shadow duration-300 animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-charcoal" />
              </div>

              <button
                onClick={handleOpenInbox}
                className="bg-navbar-bg rounded-full p-4 mb-6 border-0 w-full hover:bg-navbar-bg transition-all duration-300 cursor-pointer group"
              >
                <p
                  className="text-lg font-600 text-white group-hover:text-white transition-colors duration-300 flex items-center justify-center gap-2"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  {displayEmail}
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </p>
              </button>
            </div>

            <div className="text-center mb-8">
              <p
                className="text-sm text-charcoal/70 mb-6 leading-relaxed"
                style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
              >
                Please check your email and click the verification link to activate your account. The link will
                automatically redirect you back to the app once verified.
              </p>

              <div className="bg-gradient-to-r from-sage/5 to-coral/5 rounded-lg p-6 mb-6 text-left border border-sage/10">
                <h3
                  className="text-base font-600 text-charcoal mb-4 flex items-center gap-2"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  <CheckCircle className="w-5 h-5 text-sage" />
                  Why verify your email?
                </h3>
                <ul
                  className="text-sm text-charcoal/80 space-y-2 list-disc pl-5"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  <li>Unlock full app features (posting, saving, leaderboards)</li>
                  <li>Secure account recovery and password resets</li>
                  <li>Receive important updates and notifications</li>
                  <li>Build trust within the community</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-600 py-4 px-4 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
              >
                <Mail className="w-4 h-4" />
                Resend Verification Email
              </button>

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

            <p className="text-xs text-charcoal/70 text-center">
              Didn&apos;t receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </PageShell>
    </>
  );
}
