"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Clock3, Loader2, ShieldCheck, X } from "lucide-react";

const FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const VERIFY_ERROR_MESSAGES: Record<string, string> = {
  OTP_CODE_INVALID_FORMAT: "Enter a valid 6-digit code.",
  OTP_NOT_FOUND_OR_EXPIRED: "Code expired. Request a new OTP.",
  OTP_TOO_MANY_ATTEMPTS: "Too many attempts. Request a new OTP.",
  OTP_INVALID: "That code is invalid. Try again.",
  FORBIDDEN: "You can only verify your own claim.",
  CLAIM_NOT_FOUND: "Claim not found. Please restart the claim flow.",
};

const SEND_ERROR_MESSAGES: Record<string, string> = {
  OTP_SEND_RATE_LIMITED: "Too many OTP requests. Try again later.",
  PHONE_VERIFICATION_UNAVAILABLE: "Phone verification is unavailable for this business.",
};

type OtpApiSuccess = {
  ok?: boolean;
  code?: string;
  status?: string;
  message?: string;
  autoVerified?: boolean;
  maskedPhone?: string | null;
  expiresAt?: string | null;
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
};

type OtpApiError = {
  ok?: boolean;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
};

export interface PhoneOtpSessionState {
  claimId: string;
  maskedPhone: string | null;
  expiresAt: string | null;
  resendCooldownSeconds: number;
  autoMode?: boolean;
}

interface PhoneOtpModalProps {
  open: boolean;
  session: PhoneOtpSessionState | null;
  onClose: () => void;
  onVerified: (message: string) => void;
  onSessionUpdate: (next: PhoneOtpSessionState) => void;
}

function toMmSs(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function generateVisualOtpSeed(): string {
  let value = "";
  for (let i = 0; i < 6; i += 1) {
    value += Math.floor(Math.random() * 10).toString();
  }
  return value;
}

function getErrorText(
  payload: OtpApiError | null,
  fallback: string,
  source: "verify" | "send"
): string {
  const code = payload?.code ?? "";
  if (source === "verify" && VERIFY_ERROR_MESSAGES[code]) {
    return VERIFY_ERROR_MESSAGES[code];
  }
  if (source === "send" && SEND_ERROR_MESSAGES[code]) {
    return SEND_ERROR_MESSAGES[code];
  }
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  return fallback;
}

export default function PhoneOtpModal({
  open,
  session,
  onClose,
  onVerified,
  onSessionUpdate,
}: PhoneOtpModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [otpCode, setOtpCode] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState(0);
  const [autoSuccess, setAutoSuccess] = useState(false);
  const hasStartedAutoVerifyRef = useRef(false);

  // TEMPORARY: Auto-verification mode until Twilio integration.
  const autoModeEnabled = Boolean(session?.autoMode) && process.env.NODE_ENV !== "production";

  const expiresAtMs = useMemo(() => {
    if (!session?.expiresAt) return 0;
    const parsed = new Date(session.expiresAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }, [session?.expiresAt]);

  const expirySecondsLeft = expiresAtMs > 0 ? Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000)) : 0;
  const resendSecondsLeft = resendAvailableAtMs > 0 ? Math.max(0, Math.ceil((resendAvailableAtMs - nowMs) / 1000)) : 0;

  const hasExpired = expirySecondsLeft <= 0;
  const canVerify = otpCode.length === 6 && !isVerifying && !hasExpired && !autoModeEnabled;
  const canResend =
    Boolean(session?.claimId) && !isResending && resendSecondsLeft <= 0 && !autoModeEnabled;

  useEffect(() => {
    if (!open || !session) return;
    setOtpCode(autoModeEnabled ? generateVisualOtpSeed() : "");
    setInlineError(null);
    setIsVerifying(false);
    setIsResending(false);
    setAutoSuccess(false);
    hasStartedAutoVerifyRef.current = false;
    setNowMs(Date.now());
    setResendAvailableAtMs(Date.now() + Math.max(0, session.resendCooldownSeconds) * 1000);

    const focusId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => {
      window.clearTimeout(focusId);
    };
  }, [open, session?.claimId, session?.resendCooldownSeconds, autoModeEnabled]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isVerifying && !isResending) {
        onClose();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [open, isVerifying, isResending, onClose]);

  useEffect(() => {
    if (!open) return;
    const tick = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(tick);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !session?.claimId || !autoModeEnabled) return;
    if (hasStartedAutoVerifyRef.current) return;
    hasStartedAutoVerifyRef.current = true;

    const timeoutId = window.setTimeout(() => {
      void handleVerify(true);
    }, 140);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, session?.claimId, autoModeEnabled]);

  const handleCodeChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setInlineError(null);
    setOtpCode(numericValue);
  };

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setInlineError(null);
    setOtpCode(pasted);
  };

  const handleVerify = async (autoFlow = false) => {
    if (!session?.claimId) return;
    if (!autoFlow && !canVerify) return;

    setIsVerifying(true);
    setInlineError(null);
    try {
      const response = await fetch("/api/verification/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: session.claimId,
          code: otpCode,
        }),
      });

      let payload: OtpApiSuccess | OtpApiError | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || payload?.ok === false) {
        setInlineError(
          getErrorText(payload as OtpApiError, "Verification failed. Please try again.", "verify")
        );
        return;
      }

      if ((payload as OtpApiSuccess)?.status === "under_review") {
        const successMessage =
          (payload as OtpApiSuccess)?.message ??
          "Phone verified successfully. Your claim is now under review.";

        if (autoFlow) {
          setAutoSuccess(true);
          window.setTimeout(() => {
            onVerified(successMessage);
            onClose();
          }, 950);
          return;
        }

        onVerified(successMessage);
        onClose();
      }
    } catch (error) {
      console.error("[PhoneOtpModal] verify error:", error);
      setInlineError("Verification failed. Please check your connection and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!session?.claimId || !canResend) return;

    setIsResending(true);
    setInlineError(null);
    try {
      const response = await fetch("/api/verification/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: session.claimId,
        }),
      });

      let payload: OtpApiSuccess | OtpApiError | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || payload?.ok === false) {
        setInlineError(
          getErrorText(payload as OtpApiError, "Could not resend OTP. Please try again.", "send")
        );
        return;
      }

      if ((payload as OtpApiSuccess)?.autoVerified && (payload as OtpApiSuccess)?.status === "under_review") {
        onVerified(
          (payload as OtpApiSuccess)?.message ??
            "Phone verified successfully. Your claim is now under review."
        );
        onClose();
        return;
      }

      const nextCooldown = Number((payload as OtpApiSuccess)?.resendCooldownSeconds ?? 30);
      const explicitExpiresAt = (payload as OtpApiSuccess)?.expiresAt ?? null;
      const expiresInSeconds = Number((payload as OtpApiSuccess)?.expiresInSeconds ?? 0);
      const nextExpiresAt =
        explicitExpiresAt ||
        (expiresInSeconds > 0
          ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
          : session.expiresAt);

      onSessionUpdate({
        ...session,
        maskedPhone: (payload as OtpApiSuccess)?.maskedPhone ?? session.maskedPhone ?? null,
        expiresAt: nextExpiresAt ?? session.expiresAt,
        resendCooldownSeconds: nextCooldown,
      });

      setResendAvailableAtMs(Date.now() + Math.max(0, nextCooldown) * 1000);
      setOtpCode("");
      setInlineError(null);
      setNowMs(Date.now());
      window.setTimeout(() => inputRef.current?.focus(), 60);
    } catch (error) {
      console.error("[PhoneOtpModal] resend error:", error);
      setInlineError("Could not resend OTP. Please check your connection and try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && session ? (
        <motion.div
          className="fixed inset-0 z-[70] bg-charcoal/35 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isVerifying && !isResending) {
              onClose();
            }
          }}
        >
          <div className="grid min-h-full place-items-center p-4 sm:p-6">
            <motion.section
              className="w-full max-w-[420px] rounded-[14px] border border-sage/20 bg-off-white shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-charcoal/10 px-4 py-3">
                <h2
                  id="otp-modal-title"
                  className="text-base font-semibold text-charcoal"
                  style={{ fontFamily: FONT }}
                >
                  Verify Phone OTP
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isVerifying || isResending}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-colors disabled:opacity-50"
                  aria-label="Close OTP dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 py-4 sm:px-5 sm:py-5">
                <p className="text-sm text-charcoal/70 mb-3" style={{ fontFamily: FONT }}>
                  {autoModeEnabled ? (
                    <>
                      Finalizing phone verification for{" "}
                      <span className="font-semibold text-charcoal">
                        {session.maskedPhone || "the business phone"}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      Enter the 6-digit code sent to{" "}
                      <span className="font-semibold text-charcoal">
                        {session.maskedPhone || "the business phone"}
                      </span>
                      .
                    </>
                  )}
                </p>

                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(event) => handleCodeChange(event.target.value)}
                    onPaste={handleCodePaste}
                    readOnly={autoModeEnabled}
                    className="w-full rounded-[10px] border border-charcoal/20 bg-white px-4 py-3 text-center text-lg tracking-[0.35em] text-charcoal focus:outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/15"
                    placeholder={autoModeEnabled ? "" : "000000"}
                    aria-label="Enter 6-digit OTP"
                    style={{ fontFamily: FONT }}
                  />
                </div>

                {autoModeEnabled ? (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-charcoal/65" style={{ fontFamily: FONT }}>
                      <Clock3 className="w-3.5 h-3.5" />
                      Auto-verifying now...
                    </span>
                    <span className="inline-flex items-center gap-1 text-sage/90" style={{ fontFamily: FONT }}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Secure verify
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span
                      className={`inline-flex items-center gap-1 ${hasExpired ? "text-coral" : "text-charcoal/65"}`}
                      style={{ fontFamily: FONT }}
                    >
                      <Clock3 className="w-3.5 h-3.5" />
                      {hasExpired ? "Code expired" : `Expires in ${toMmSs(expirySecondsLeft)}`}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-sage/90"
                      style={{ fontFamily: FONT }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Secure verify
                    </span>
                  </div>
                )}

                {inlineError ? (
                  <div
                    className="mt-3 rounded-[10px] border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral flex items-start gap-2"
                    style={{ fontFamily: FONT }}
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{inlineError}</span>
                  </div>
                ) : !autoModeEnabled && hasExpired ? (
                  <div
                    className="mt-3 rounded-[10px] border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral"
                    style={{ fontFamily: FONT }}
                    role="alert"
                  >
                    Code expired. Resend OTP to continue.
                  </div>
                ) : autoSuccess ? (
                  <div
                    className="mt-3 rounded-[10px] border border-sage/25 bg-sage/10 px-3 py-2 text-sm text-sage"
                    style={{ fontFamily: FONT }}
                    role="status"
                  >
                    Phone verified successfully. Moving your claim to under review...
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void handleVerify(autoModeEnabled);
                    }}
                    disabled={
                      autoModeEnabled
                        ? isVerifying || autoSuccess
                        : !canVerify
                    }
                    className="w-full rounded-full bg-gradient-to-br from-sage to-sage/90 text-white px-4 py-2.5 text-sm font-semibold hover:from-sage/90 hover:to-sage/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ fontFamily: FONT }}
                  >
                    {autoModeEnabled ? (
                      <span className="inline-flex items-center gap-2">
                        {(isVerifying || (!inlineError && !autoSuccess)) && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {autoSuccess
                          ? "Verified"
                          : inlineError
                            ? "Retry verification"
                            : "Verifying..."}
                      </span>
                    ) : isVerifying ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      "Verify"
                    )}
                  </button>

                  {!autoModeEnabled && (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={!canResend}
                      className="text-sm font-semibold text-sage hover:text-sage/80 disabled:text-charcoal/40 disabled:cursor-not-allowed transition-colors"
                      style={{ fontFamily: FONT }}
                    >
                      {isResending
                        ? "Resending..."
                        : resendSecondsLeft > 0
                          ? `Resend OTP in ${toMmSs(resendSecondsLeft)}`
                          : "Resend OTP"}
                    </button>
                  )}
                </div>
              </div>
            </motion.section>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
