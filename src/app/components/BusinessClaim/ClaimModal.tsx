"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { m } from "framer-motion";
import { X, UserCheck, Mail, Phone, FileText, Building2, AlertCircle } from "lucide-react";
import { Loader } from "../Loader/Loader";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

const ERROR_CODE_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Please log in to claim this business.",
  MISSING_FIELDS: "Please fill in all required details.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_PHONE: "Please enter a valid phone number.",
  EMAIL_DOMAIN_MISMATCH: "This email doesn't match the business website domain. Use an official business email.",
  DUPLICATE_CLAIM: "You already have a claim in progress for this business.",
  ALREADY_OWNER: "You already own this business.",
  BUSINESS_NOT_FOUND: "We couldn't find that business. Please try again.",
  RLS_BLOCKED: "We couldn't process your claim right now. Please try again.",
  DB_ERROR: "We couldn't process your claim right now. Please try again.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
};

function getErrorMessage(result: { message?: string; code?: string; error?: string }): string {
  if (result.message) return result.message;
  if (result.code && ERROR_CODE_MESSAGES[result.code]) {
    return ERROR_CODE_MESSAGES[result.code];
  }
  if (result.error) return result.error;
  return "An error occurred. Please try again.";
}

interface ClaimModalProps {
  business: {
    id: string;
    name: string;
    category: string;
    location: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const MODAL_FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

export function ClaimModal({ business, onClose, onSuccess }: ClaimModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    role: "owner" as "owner" | "manager",
    phone: business.phone || "",
    email: business.email || user?.email || "",
    note: "",
    cipc_registration_number: "",
    cipc_company_name: "",
  });

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormError(null);
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (formError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current.focus();
    }
  }, [formError]);

  useEffect(() => {
    const scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    if (!user) {
      setFormError("Please log in to claim this business.");
      return;
    }

    const hasContact =
      formData.email?.trim() ||
      formData.phone?.trim() ||
      (formData.cipc_registration_number?.trim() && formData.cipc_company_name?.trim());

    if (!hasContact) {
      setFormError("Please provide a business email, phone number, or CIPC details.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/business/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          role: formData.role,
          phone: formData.phone?.trim() || undefined,
          email: formData.email?.trim() || undefined,
          note: formData.note?.trim() || undefined,
          cipc_registration_number: formData.cipc_registration_number?.trim() || undefined,
          cipc_company_name: formData.cipc_company_name?.trim() || undefined,
        }),
      });

      let result: any;
      try {
        result = await response.json();
      } catch {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      if (!response.ok || result.success === false) {
        const errorMessage = getErrorMessage(result);
        setFormError(errorMessage);
        return;
      }

      if (result.status === "verified") {
        showToast(result.message || "Business verified. You can now manage your listing.", "success", 5000);
        onSuccess();
        onClose();
        router.push(`/my-businesses/businesses/${business.id}`);
        return;
      }

      showToast(
        result.message || result.display_status || "Claim submitted. Complete the requested verification step.",
        "success",
        5000,
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error submitting claim:", error);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <m.div
      className="fixed inset-0 z-50 bg-charcoal/45 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="grid min-h-full place-items-center p-4 sm:p-6 lg:p-8"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <m.section
          className="w-full max-w-[680px]"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="bg-card-bg rounded-[16px] border border-white/20 shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="flex max-h-[92dvh] sm:max-h-[90dvh] min-h-0 flex-col">
              <div className="shrink-0 border-b border-white/20 px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between">
                <h2
                  id="claim-modal-title"
                  className="text-lg sm:text-xl font-bold text-white"
                  style={{ fontFamily: MODAL_FONT }}
                >
                  Claim Business
                </h2>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Close"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6 sm:py-5">
                  <div className="space-y-5 sm:space-y-6">
                    <div className="bg-white/20 rounded-[12px] p-4 border border-white/30">
                      <h3 className="text-sm font-semibold text-white mb-2" style={{ fontFamily: MODAL_FONT }}>
                        {business.name}
                      </h3>
                      <p className="text-sm text-white/90" style={{ fontFamily: MODAL_FONT }}>
                        {business.category} • {business.location}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-white flex items-center gap-2" style={{ fontFamily: MODAL_FONT }}>
                        <UserCheck className="w-4 h-4" />
                        Your Role
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateFormData({ role: "owner" })}
                          className={`px-4 py-3 rounded-lg border-2 transition-all ${
                            formData.role === "owner"
                              ? "border-white bg-white/20 text-white"
                              : "border-white/30 bg-white/10 text-white hover:border-white/50"
                          }`}
                          style={{ fontFamily: MODAL_FONT }}
                        >
                          Owner
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFormData({ role: "manager" })}
                          className={`px-4 py-3 rounded-lg border-2 transition-all ${
                            formData.role === "manager"
                              ? "border-white bg-white/20 text-white"
                              : "border-white/30 bg-white/10 text-white hover:border-white/50"
                          }`}
                          style={{ fontFamily: MODAL_FONT }}
                        >
                          Manager
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="claim-email" className="text-sm font-semibold text-white flex items-center gap-2 mb-2" style={{ fontFamily: MODAL_FONT }}>
                          <Mail className="w-4 h-4" />
                          Business Email (optional)
                        </label>
                        <input
                          id="claim-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData({ email: e.target.value })}
                          placeholder="info@business.co.za"
                          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors"
                          style={{ fontFamily: MODAL_FONT }}
                        />
                        <p className="text-xs text-white/70 mt-1" style={{ fontFamily: MODAL_FONT }}>
                          Match website domain to auto-verify
                        </p>
                      </div>

                      <div>
                        <label htmlFor="claim-phone" className="text-sm font-semibold text-white flex items-center gap-2 mb-2" style={{ fontFamily: MODAL_FONT }}>
                          <Phone className="w-4 h-4" />
                          Phone (optional)
                        </label>
                        <input
                          id="claim-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => updateFormData({ phone: e.target.value })}
                          placeholder="Business phone for OTP"
                          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors"
                          style={{ fontFamily: MODAL_FONT }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white flex items-center gap-2" style={{ fontFamily: MODAL_FONT }}>
                          <Building2 className="w-4 h-4" />
                          CIPC (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.cipc_registration_number}
                          onChange={(e) => updateFormData({ cipc_registration_number: e.target.value })}
                          placeholder="Company registration number"
                          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors"
                          style={{ fontFamily: MODAL_FONT }}
                        />
                        <input
                          type="text"
                          value={formData.cipc_company_name}
                          onChange={(e) => updateFormData({ cipc_company_name: e.target.value })}
                          placeholder="Registered company name"
                          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors"
                          style={{ fontFamily: MODAL_FONT }}
                        />
                        <p className="text-xs text-white/70" style={{ fontFamily: MODAL_FONT }}>
                          For manual CIPC review; no documents required
                        </p>
                      </div>

                      <div>
                        <label htmlFor="claim-notes" className="text-sm font-semibold text-white flex items-center gap-2 mb-2" style={{ fontFamily: MODAL_FONT }}>
                          <FileText className="w-4 h-4" />
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          id="claim-notes"
                          value={formData.note}
                          onChange={(e) => updateFormData({ note: e.target.value })}
                          placeholder="Tell us about your relationship with this business..."
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors resize-none"
                          style={{ fontFamily: MODAL_FONT }}
                        />
                      </div>
                    </div>

                    {formError && (
                      <div
                        ref={errorRef}
                        role="alert"
                        tabIndex={-1}
                        className="flex items-start gap-3 p-4 rounded-lg bg-coral/20 border border-coral/40 text-white"
                        style={{ fontFamily: MODAL_FONT }}
                      >
                        <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{formError}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t border-white/20 bg-card-bg/95 px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 rounded-full border-2 border-white/30 text-white hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                      style={{ fontFamily: MODAL_FONT }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !(formData.email?.trim() || formData.phone?.trim() || (formData.cipc_registration_number?.trim() && formData.cipc_company_name?.trim()))
                      }
                      className="flex-1 px-4 py-3 rounded-full bg-gradient-to-br from-coral to-coral/90 text-white hover:from-coral/90 hover:to-coral/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ fontFamily: MODAL_FONT }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader size="sm" variant="wavy" color="white" />
                          Starting claim...
                        </>
                      ) : (
                        "Submit Claim"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </m.section>
      </div>
    </m.div>
  );
}
