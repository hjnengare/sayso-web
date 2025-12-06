"use client";

import { useState } from "react";
import { X, Mail, Phone, FileText, UserCheck } from "lucide-react";
import { InlineLoader } from "../Loader";
import { BusinessOwnershipService } from "../../lib/services/businessOwnershipService";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import type { Business } from "../../lib/types/database";

interface VerificationFormProps {
  business: Business;
  onClose: () => void;
  onSuccess: () => void;
}

type VerificationMethod = 'email' | 'phone' | 'document' | 'manual';

export function VerificationForm({ business, onClose, onSuccess }: VerificationFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationData, setVerificationData] = useState({
    email: business.email || '',
    phone: business.phone || '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod || !user) return;

    setIsSubmitting(true);

    try {
      const data: Record<string, any> = {};
      
      if (selectedMethod === 'email') {
        data.email = verificationData.email;
      } else if (selectedMethod === 'phone') {
        data.phone = verificationData.phone;
      } else if (selectedMethod === 'manual') {
        data.notes = verificationData.notes;
      }

      const result = await BusinessOwnershipService.createOwnershipRequest(
        business.id,
        user.id,
        selectedMethod,
        data
      );

      if (result.success) {
        showToast('Ownership request submitted successfully! We\'ll review it shortly.', 'success', 5000);
        onSuccess();
      } else {
        showToast(result.error || 'Failed to submit ownership request', 'sage', 4000);
      }
    } catch (error) {
      console.error('Error submitting verification request:', error);
      showToast('An error occurred. Please try again.', 'sage', 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-off-white rounded-[12px] shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-off-white border-b border-charcoal/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-charcoal" style={{
            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
          }}>
            Verify Ownership
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-charcoal/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-charcoal" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Business Info */}
          <div className="bg-white/50 rounded-[12px] p-4 border border-charcoal/10">
            <h3 className="text-sm font-semibold text-charcoal mb-2" style={{
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
            }}>
              {business.name}
            </h3>
            <p className="text-sm sm:text-xs text-charcoal/70">{business.category} • {business.location}</p>
          </div>

          {/* Verification Methods */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-charcoal block" style={{
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
            }}>
              Choose Verification Method
            </label>

            {/* Email Verification */}
            <label className={`flex items-start gap-3 p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
              selectedMethod === 'email' 
                ? 'border-coral bg-coral/5' 
                : 'border-charcoal/10 bg-white/50 hover:border-charcoal/20'
            }`}>
              <input
                type="radio"
                name="method"
                value="email"
                checked={selectedMethod === 'email'}
                onChange={() => setSelectedMethod('email')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-charcoal" />
                  <span className="text-sm font-semibold text-charcoal">Email Verification</span>
                </div>
                <p className="text-sm sm:text-xs text-charcoal/70">
                  We'll send a verification code to the business email address
                </p>
                {selectedMethod === 'email' && business.email && (
                  <div className="mt-2">
                    <input
                      type="email"
                      value={verificationData.email}
                      onChange={(e) => setVerificationData({ ...verificationData, email: e.target.value })}
                      placeholder="Business email"
                      className="w-full px-3 py-2 text-sm border border-charcoal/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30"
                      required
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Phone Verification */}
            <label className={`flex items-start gap-3 p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
              selectedMethod === 'phone' 
                ? 'border-coral bg-coral/5' 
                : 'border-charcoal/10 bg-white/50 hover:border-charcoal/20'
            }`}>
              <input
                type="radio"
                name="method"
                value="phone"
                checked={selectedMethod === 'phone'}
                onChange={() => setSelectedMethod('phone')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-charcoal" />
                  <span className="text-sm font-semibold text-charcoal">Phone Verification</span>
                </div>
                <p className="text-sm sm:text-xs text-charcoal/70">
                  We'll send an SMS code to the business phone number
                </p>
                {selectedMethod === 'phone' && business.phone && (
                  <div className="mt-2">
                    <input
                      type="tel"
                      value={verificationData.phone}
                      onChange={(e) => setVerificationData({ ...verificationData, phone: e.target.value })}
                      placeholder="Business phone"
                      className="w-full px-3 py-2 text-sm border border-charcoal/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30"
                      required
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Document Verification */}
            <label className={`flex items-start gap-3 p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
              selectedMethod === 'document' 
                ? 'border-coral bg-coral/5' 
                : 'border-charcoal/10 bg-white/50 hover:border-charcoal/20'
            }`}>
              <input
                type="radio"
                name="method"
                value="document"
                checked={selectedMethod === 'document'}
                onChange={() => setSelectedMethod('document')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-charcoal" />
                  <span className="text-sm font-semibold text-charcoal">Document Upload</span>
                </div>
                <p className="text-sm sm:text-xs text-charcoal/70">
                  Upload business license, tax documents, or other proof of ownership
                </p>
                <p className="text-sm sm:text-xs text-coral/80 mt-1">(Coming soon - manual review required)</p>
              </div>
            </label>

            {/* Manual Review */}
            <label className={`flex items-start gap-3 p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
              selectedMethod === 'manual' 
                ? 'border-coral bg-coral/5' 
                : 'border-charcoal/10 bg-white/50 hover:border-charcoal/20'
            }`}>
              <input
                type="radio"
                name="method"
                value="manual"
                checked={selectedMethod === 'manual'}
                onChange={() => setSelectedMethod('manual')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-charcoal" />
                  <span className="text-sm font-semibold text-charcoal">Manual Review</span>
                </div>
                <p className="text-sm sm:text-xs text-charcoal/70">
                  Request manual review by our team (for complex cases)
                </p>
                {selectedMethod === 'manual' && (
                  <div className="mt-2">
                    <textarea
                      value={verificationData.notes}
                      onChange={(e) => setVerificationData({ ...verificationData, notes: e.target.value })}
                      placeholder="Tell us why you need manual review..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-charcoal/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30"
                      required
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full text-sm font-semibold text-charcoal bg-white/50 hover:bg-charcoal/10 transition-colors"
              style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMethod || isSubmitting || (selectedMethod === 'document')}
              className="flex-1 px-4 py-3 rounded-full text-sm font-semibold text-white bg-coral hover:bg-coral/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
              }}
            >
              {isSubmitting ? (
                <>
                  <InlineLoader size="xs" color="current" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

