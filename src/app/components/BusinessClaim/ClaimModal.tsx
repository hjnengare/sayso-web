"use client";

import { useState, useEffect } from "react";
import { X, UserCheck, Mail, Phone, FileText } from "lucide-react";
import { Loader } from "../Loader/Loader";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

interface ClaimModalProps {
  business: {
    id: string;
    name: string;
    category: string;
    location: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ClaimModal({ business, onClose, onSuccess }: ClaimModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    role: 'owner' as 'owner' | 'manager',
    phone: '',
    email: user?.email || '',
    note: '',
  });

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
    if (!user) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/business/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          role: formData.role,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          note: formData.note || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit claim');
      }

      showToast('Claim request submitted successfully! We\'ll review it shortly.', 'success', 5000);
      onSuccess();
    } catch (error) {
      console.error('Error submitting claim:', error);
      showToast(
        error instanceof Error ? error.message : 'An error occurred. Please try again.',
        'sage',
        4000
      );
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
                onClick={() => setFormData({ ...formData, role: 'owner' })}
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
                onClick={() => setFormData({ ...formData, role: 'manager' })}
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
                Email
              </label>
              <input
                id="claim-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors"
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              />
            </div>

            <div>
              <label htmlFor="claim-phone" className="text-sm font-semibold text-white flex items-center gap-2 mb-2" style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}>
                <Phone className="w-4 h-4" />
                Phone (Optional)
              </label>
              <input
                id="claim-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors"
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              />
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
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Tell us about your relationship with this business..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 transition-colors resize-none"
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                }}
              />
            </div>
          </div>

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
              disabled={isSubmitting || !formData.email}
              className="flex-1 px-4 py-3 rounded-full bg-gradient-to-br from-coral to-coral/90 text-white hover:from-coral/90 hover:to-coral/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader size="sm" variant="wavy" color="white" />
                  Submitting...
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

