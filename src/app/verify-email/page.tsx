"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Urbanist } from "next/font/google";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { usePrefersReducedMotion } from "../utils/hooks/usePrefersReducedMotion";
import { getBrowserSupabase } from "../lib/supabase/client";
import type { AuthUser } from "../lib/types/database";
import { Mail, CheckCircle, ExternalLink, ArrowLeft, AlertCircle } from "lucide-react";
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
  const { user, resendVerificationEmail, refreshUser, isLoading } = useAuth();
  const { showToast, showToastOnce } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isResending, setIsResending] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationStatusMessage, setVerificationStatusMessage] = useState<string | null>(null);

  // Detect expired link from ?expired=1 synchronously to avoid flashes
  const [linkExpired, setLinkExpired] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("expired") === "1";
  });

  // Read sessionStorage synchronously during init to avoid a flash of "No verification pending"
  const [pendingEmail] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("pendingVerificationEmail");
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const redirectingRef = useRef(false);
  const checkingRef = useRef(false);
  const prefersReduced = usePrefersReducedMotion();

  // Clean ?expired param from URL without re-render
  useEffect(() => {
    if (!linkExpired || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("expired");
    window.history.replaceState({}, "", url.pathname + (url.search || ""));
  }, [linkExpired]);

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

  const getPostVerifyRedirect = useCallback((candidate?: AuthUser | null): string => {
    const resolvedUser = candidate || user;
    if (!resolvedUser) return "/verify-email";

    const profile = resolvedUser.profile as (AuthUser["profile"] & { is_admin?: boolean }) | undefined;
    const roleRaw =
      profile?.account_role ||
      profile?.role ||
      (resolvedUser as any)?.current_role ||
      "";
    const role = String(roleRaw).toLowerCase();

    const isAdmin = profile?.is_admin === true || role === "admin" || role === "super_admin" || role === "superadmin";
    if (isAdmin) return "/admin";

    const isBusinessAccount =
      role === "business_owner" ||
      role === "business" ||
      role === "owner";
    if (isBusinessAccount) return "/my-businesses";

    const onboardingDone = Boolean(profile?.onboarding_completed_at || profile?.onboarding_complete);
    return onboardingDone ? "/home" : "/interests";
  }, [user]);

  const handleResendVerification = async () => {
    const email = user?.email || pendingEmail;
    if (!email) return;

    setIsResending(true);
    try {
      const success = await resendVerificationEmail(email);
      if (success) {
        showToast("Email sent. Check inbox.", "sage", 2500);
      } else {
        showToast("Could not resend. Please wait a moment and try again.", "error", 3000);
      }
    } catch {
      showToast("Failed to resend. Try again.", "error", 3000);
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

  const checkVerificationStatus = useCallback(async (options?: {
    manual?: boolean;
    showSuccessToast?: boolean;
    fromVerificationCallback?: boolean;
    successToastMessage?: string;
    successToastOnceKey?: string;
  }): Promise<boolean> => {
    const {
      manual = false,
      showSuccessToast = true,
      fromVerificationCallback = false,
      successToastMessage = "Email verified successfully",
      successToastOnceKey,
    } = options || {};
    if (redirectingRef.current || checkingRef.current) return false;

    checkingRef.current = true;
    if (manual) {
      setVerificationStatusMessage(null);
    }

    const supabase = getBrowserSupabase();
    const notVerifiedMessage =
      "We still can't detect verification. Please check your inbox and try again.";
    const verificationSessionMessage =
      "Verification completed. Please open the verification link in the same browser to continue automatically.";

    try {
      // Only attempt PKCE exchange during the explicit verification callback flow.
      if (fromVerificationCallback) {
        const code = searchParams.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code).catch(() => undefined);
        }
      }

      // Ensure a valid active session exists before checking confirmed state.
      let { data: sessionData } = await supabase.auth.getSession();
      let session = sessionData.session;

      if (!session) {
        await supabase.auth.refreshSession().catch(() => undefined);
        ({ data: sessionData } = await supabase.auth.getSession());
        session = sessionData.session;
      }

      if (!session) {
        if (manual || fromVerificationCallback) {
          setVerificationStatusMessage(verificationSessionMessage);
        }
        return false;
      }

      if (!session.user?.email_confirmed_at) {
        if (manual || fromVerificationCallback) {
          setVerificationStatusMessage(notVerifiedMessage);
        }
        return false;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        if (manual || fromVerificationCallback) {
          setVerificationStatusMessage(verificationSessionMessage);
        }
        return false;
      }

      const authUser = userData.user;
      if (!authUser.email_confirmed_at) {
        if (manual || fromVerificationCallback) setVerificationStatusMessage(notVerifiedMessage);
        return false;
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pendingVerificationEmail");
        sessionStorage.removeItem("pendingVerificationAccountType");
      }

      await refreshUser();

      let profile: AuthUser["profile"] | undefined = user?.profile;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, account_role, onboarding_complete, onboarding_completed_at")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (profileData) {
        profile = {
          ...(profile || {}),
          role: profileData.role as any,
          account_role: profileData.account_role as any,
          onboarding_complete: Boolean(profileData.onboarding_complete),
          onboarding_completed_at: profileData.onboarding_completed_at || undefined,
        } as AuthUser["profile"];
      }

      const verifiedUser: AuthUser = {
        id: authUser.id,
        email: authUser.email || user?.email || "",
        email_verified: true,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at || authUser.created_at,
        profile,
      };

      setVerificationSuccess(true);
      setVerificationStatusMessage(null);
      if (showSuccessToast) {
        if (successToastOnceKey) {
          showToastOnce(successToastOnceKey, successToastMessage, "sage", 3000);
        } else {
          showToast(successToastMessage, "sage", 2200);
        }
      }
      redirectingRef.current = true;
      router.replace(getPostVerifyRedirect(verifiedUser));
      return true;
    } catch {
      if (manual) {
        setVerificationStatusMessage("Could not check verification status. Please try again.");
      }
      return false;
    } finally {
      checkingRef.current = false;
    }
  }, [
    getPostVerifyRedirect,
    refreshUser,
    router,
    searchParams,
    showToast,
    showToastOnce,
    user?.email,
    user?.profile,
  ]);

  // Handle callback returns such as /verify-email?verified=1 from email links.
  useEffect(() => {
    if (redirectingRef.current) return;
    if (searchParams.get("verified") !== "1") return;

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }

    const timeout = window.setTimeout(() => {
      void checkVerificationStatus({
        manual: false,
        fromVerificationCallback: true,
        showSuccessToast: true,
        successToastMessage: "Email verified. Account secured.",
        successToastOnceKey: "email-verified-v1",
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [checkVerificationStatus, searchParams]);

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

  // Show expired link state with resend button
  if (linkExpired) {
    const expiredEmail = displayEmail;
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <PageShell>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="w-20 h-20 mx-auto mb-6 bg-coral/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-coral" />
              </div>
              <h2
                className="text-2xl font-bold text-charcoal mb-3"
                style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
              >
                Verification Link Expired
              </h2>
              <p
                className="text-base text-charcoal/70 mb-6 leading-relaxed"
                style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
              >
                {expiredEmail
                  ? <>The verification link for <strong className="text-charcoal">{expiredEmail}</strong> has expired. Request a new one below.</>
                  : "Your verification link has expired. Request a new one below."}
              </p>

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    if (!expiredEmail) {
                      router.push("/register");
                      return;
                    }
                    setIsResending(true);
                    try {
                      const success = await resendVerificationEmail(expiredEmail);
                      if (success) {
                        showToast("New verification email sent! Check your inbox.", "sage", 3000);
                        setLinkExpired(false);
                      } else {
                        showToast("Could not resend. Please wait a moment and try again.", "error", 3000);
                      }
                    } catch {
                      showToast("Failed to resend. Try again.", "error", 3000);
                    } finally {
                      setIsResending(false);
                    }
                  }}
                  disabled={isResending || !expiredEmail}
                  className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-base font-600 py-4 px-4 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                >
                  {isResending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Resend Verification Email
                    </>
                  )}
                </button>

                <Link
                  href="/login"
                  className="block w-full text-center text-base text-charcoal/60 hover:text-charcoal transition-colors duration-300 py-3"
                >
                  Back to login
                </Link>
              </div>
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
            </div>

            {verificationStatusMessage && (
              <div className="mb-5 rounded-lg border border-coral/20 bg-coral/5 px-4 py-3">
                <p
                  className="text-sm text-charcoal/80"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  {verificationStatusMessage}
                </p>
              </div>
            )}

            <p className="text-xs text-charcoal/70 text-center">
              Didn&apos;t receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </PageShell>
    </>
  );
}

