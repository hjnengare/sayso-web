"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, UserCheck, Mail, Phone, FileText, Building2, AlertCircle } from "lucide-react";
import { Loader } from "../Loader/Loader";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

// ============================================================================
// Error Code to Message Mapping (fallback if API doesn't provide message)
// ============================================================================
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
  // Prefer explicit message from API
  if (result.message) return result.message;
  // Fall back to code mapping
  if (result.code && ERROR_CODE_MESSAGES[result.code]) {
    return ERROR_CODE_MESSAGES[result.code];
  }
  // Legacy error field
  if (result.error) return result.error;
  // Ultimate fallback
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

export function ClaimModal({ business, onClose, onSuccess }: ClaimModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    role: 'owner' as 'owner' | 'manager',
    phone: business.phone || '',
    email: business.email || user?.email || '',
    note: '',
    cipc_registration_number: '',
    cipc_company_name: '',
  });

  // Clear error when form data changes
  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormError(null);
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Scroll error into view when it appears
  useEffect(() => {
    if (formError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current.focus();
    }
  }, [formError]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    // Save current scroll position
    const scrollY = window.scrollY;
    
    // Lock body scroll
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    // Cleanup: restore scroll on unmount
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    // Clear any previous error
    setFormError(null);
    
    if (!user) {
      setFormError('Please log in to claim this business.');
      return;
    }
    
    const hasContact = formData.email?.trim() || formData.phone?.trim() || (formData.cipc_registration_number?.trim() && formData.cipc_company_name?.trim());
    if (!hasContact) {
      setFormError('Please provide a business email, phone number, or CIPC details.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/business/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      let result;
      try {
        result = await response.json();
      } catch {
        // JSON parsing failed
        setFormError('Something went wrong. Please try again.');
        return;
      }

      // Handle error responses (structured or legacy)
      if (!response.ok || result.success === false) {
        const errorMessage = getErrorMessage(result);
        setFormError(errorMessage);
        return;
      }

      // Success: status === 'verified' means instant verification
      if (result.status === 'verified') {
        showToast(result.message || 'Business verified. You can now manage your listing.', 'success', 5000);
        onSuccess();
        onClose();
        router.push(`/my-businesses/businesses/${business.id}`);
        return;
      }

      // Success: claim submitted, needs verification
      showToast(result.message || result.display_status || 'Claim submitted. Complete the requested verification step.', 'success', 5000);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting claim:', error);
      setFormError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-sage rounded-[12px] shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-sage border-b border-white/20 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white" style={{
            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
          }}>
            Claim Business
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Business Info */}
          <div className="bg-white/20 rounded-[12px] p-4 border border-white/30">
            <h3 className="text-sm font-semibold text-white mb-2" style={{
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
            }}>
              {business.name}
            </h3>
            <p className="text-sm sm:text-xs text-white/90">{business.category} • {business.location}</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white flex items-center gap-2" style={{
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
            }}>
              <UserCheck className="w-4 h-4" />
              Your Role
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => updateFormData({ role: 'owner' })}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.role === 'owner'
                    ? 'border-white bg-white/20 text-white'
                    : 'border-white/30 bg-white/10 text-white hover:border-white/50'
                }`}
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => updateFormData({ role: 'manager' })}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.role === 'manager'
                    ? 'border-white bg-white/20 text-white'
                    : 'border-white/30 bg-white/10 text-white hover:border-white/50'
                }`}
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              >
                Manager
              </button>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div>
              <label htmlFor="claim-email" className="text-sm font-semibold text-white flex items-center gap-2 mb-2" style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}>
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
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              />
              <p className="text-xs text-white/70 mt-1">Match website domain to auto-verify</p>
            </div>

            <div>
              <label htmlFor="claim-phone" className="text-sm font-semibold text-white flex items-center gap-2 mb-2" style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}>
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
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              />
            </div>

            {/* CIPC (Tier 2) - optional */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white flex items-center gap-2" style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}>
                <Building2 className="w-4 h-4" />
                CIPC (optional)
              </label>
              <input
                type="text"
                value={formData.cipc_registration_number}
                onChange={(e) => updateFormData({ cipc_registration_number: e.target.value })}
                placeholder="Company registration number"
                className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors"
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              />
              <input
                type="text"
                value={formData.cipc_company_name}
                onChange={(e) => updateFormData({ cipc_company_name: e.target.value })}
                placeholder="Registered company name"
                className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors"
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              />
              <p className="text-xs text-white/70">For manual CIPC review; no documents required</p>
            </div>

            <div>
              <label htmlFor="claim-notes" className="text-sm font-semibold text-white flex items-center gap-2 mb-2" style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}>
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
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              />
            </div>
          </div>

          {/* Inline Error Banner */}
          {formError && (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="flex items-start gap-3 p-4 rounded-lg bg-coral/20 border border-coral/40 text-white animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}
            >
              <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{formError}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full border-2 border-white/30 text-white hover:bg-white/20 transition-colors"
              disabled={isSubmitting}
              style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !(formData.email?.trim() || formData.phone?.trim() || (formData.cipc_registration_number?.trim() && formData.cipc_company_name?.trim()))}
              className="flex-1 px-4 py-3 rounded-full bg-gradient-to-br from-coral to-coral/90 text-white hover:from-coral/90 hover:to-coral/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader size="sm" variant="wavy" color="white" />
                  Starting claim...
                </>
              ) : (
                'Submit Claim'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

