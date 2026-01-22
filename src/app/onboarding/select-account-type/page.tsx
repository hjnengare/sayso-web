"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { usePageTitle } from "../../hooks/usePageTitle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";
import { InlineLoader } from "../../components/Loader/Loader";

const styles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
  .animate-scale-in { animation: scaleIn 0.6s ease-out forwards; }

  .delay-400 { animation-delay: .4s }
  .delay-600 { animation-delay: .6s }
  .delay-800 { animation-delay: .8s }

  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }

  .safe-area-padding {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .account-type-card {
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .account-type-card:hover {
    transform: translateY(-4px);
  }

  .account-type-card.selected {
    box-shadow: 0 0 0 2px #69a382, 0 0 0 4px rgba(105, 163, 130, 0.1);
  }

  .account-type-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
`;

export default function SelectAccountTypePage() {
  usePageTitle("Choose Your Account Type", "Select how you'd like to use your account");
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  
  const businessTied = searchParams.get('business_tied') === 'true';
  const isOAuthFlow = searchParams.get('oauth') === 'true';
  
  const [selectedType, setSelectedType] = useState<'user' | 'business_owner' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize scroll reveal
  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if user is not authenticated or already has completed onboarding
  useEffect(() => {
    if (mounted && !user) {
      router.push('/login');
    }
  }, [mounted, user, router]);

  const handleSelectAccountType = async (type: 'user' | 'business_owner') => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account type');
      }

      const data = await response.json();
      showToast(`✅ ${type === 'user' ? 'Personal' : 'Business'} account selected!`, 'success', 2000);

      // Redirect based on account type
      setTimeout(() => {
        if (type === 'business_owner') {
          router.push('/claim-business');
        } else {
          router.push('/interests?verified=1&email_verified=true');
        }
      }, 500);
    } catch (error) {
      console.error('Error updating account type:', error);
      showToast('Failed to update account type. Please try again.', 'error', 3000);
      setIsLoading(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-[100svh] bg-off-white flex items-center justify-center">
        <InlineLoader size="md" variant="wavy" color="sage" />
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="min-h-[100svh] md:min-h-[100dvh] bg-off-white flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden safe-area-padding">
        
        {/* Back button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
          <button
            onClick={() => router.back()}
            className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="w-full mx-auto max-w-2xl relative z-10 flex flex-col items-center">
          
          {/* Title */}
          <div data-reveal className="text-center mb-8 sm:mb-12">
            <h1 className="font-urbanist text-3xl sm:text-4xl md:text-5xl font-700 leading-[1.2] tracking-tight text-charcoal mb-4" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 700 }}>
              <WavyTypedTitle
                text="Choose Your Account Type"
                as="span"
                className="inline-block"
                typingSpeedMs={40}
                startDelayMs={300}
                waveVariant="subtle"
                loopWave={false}
                triggerOnTypingComplete={true}
                enableScrollTrigger={false}
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  fontWeight: 700,
                }}
              />
            </h1>
            <p
              data-reveal
              className="text-body font-normal text-charcoal/70 leading-[1.55] max-w-[60ch] mx-auto"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 400,
              }}
            >
              {businessTied
                ? `Your email is linked to a business. Choose how you'd like to use your account: continue with Business to manage your claim, or switch to Personal for exploring and reviews.`
                : `You can always switch between Personal and Business modes later in your settings`}
            </p>
          </div>

          {/* Account Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-md md:max-w-2xl">
            
            {/* Personal Card */}
            <div
              data-reveal
              onClick={() => !isLoading && setSelectedType('user')}
              className={`account-type-card p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 ${
                selectedType === 'user'
                  ? 'selected bg-sage/10 border-sage'
                  : 'bg-white border-charcoal/10 hover:border-charcoal/20'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-center">
                <div className="account-type-icon">👤</div>
                <h3 className="text-xl sm:text-2xl font-semibold text-charcoal mb-2" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  Personal
                </h3>
                <p className="text-body-sm sm:text-body text-charcoal/70 leading-relaxed mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Explore businesses, leave reviews, and find amazing places near you
                </p>
                <ul className="text-left text-sm text-charcoal/60 space-y-2 mb-6" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  <li className="flex items-start gap-2">
                    <span className="text-sage font-bold">✓</span>
                    <span>Search and discover local businesses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sage font-bold">✓</span>
                    <span>Write and read reviews</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sage font-bold">✓</span>
                    <span>Rate businesses and track favorites</span>
                  </li>
                </ul>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAccountType('user');
                  }}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-full font-semibold transition-all duration-300 ${
                    selectedType === 'user'
                      ? 'bg-sage text-white hover:bg-sage/90'
                      : 'bg-charcoal/10 text-charcoal hover:bg-charcoal/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                >
                  {isLoading && selectedType === 'user' ? (
                    <>
                      <InlineLoader size="xs" variant="wavy" color="white" />
                      Selecting...
                    </>
                  ) : (
                    <>
                      {selectedType === 'user' ? '✓ Selected' : 'Select Personal'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Business Card */}
            <div
              data-reveal
              onClick={() => !isLoading && setSelectedType('business_owner')}
              className={`account-type-card p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 ${
                selectedType === 'business_owner'
                  ? 'selected bg-coral/10 border-coral'
                  : 'bg-white border-charcoal/10 hover:border-charcoal/20'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-center">
                <div className="account-type-icon">🏢</div>
                <h3 className="text-xl sm:text-2xl font-semibold text-charcoal mb-2" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  Business
                </h3>
                <p className="text-body-sm sm:text-body text-charcoal/70 leading-relaxed mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Claim your business, manage your profile, and engage with customers
                </p>
                <ul className="text-left text-sm text-charcoal/60 space-y-2 mb-6" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  <li className="flex items-start gap-2">
                    <span className="text-coral font-bold">✓</span>
                    <span>Claim and manage your business</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-coral font-bold">✓</span>
                    <span>Respond to customer reviews</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-coral font-bold">✓</span>
                    <span>View business insights and analytics</span>
                  </li>
                </ul>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAccountType('business_owner');
                  }}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-full font-semibold transition-all duration-300 ${
                    selectedType === 'business_owner'
                      ? 'bg-coral text-white hover:bg-coral/90'
                      : 'bg-charcoal/10 text-charcoal hover:bg-charcoal/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                >
                  {isLoading && selectedType === 'business_owner' ? (
                    <>
                      <InlineLoader size="xs" variant="wavy" color="white" />
                      Selecting...
                    </>
                  ) : (
                    <>
                      {selectedType === 'business_owner' ? '✓ Selected' : 'Select Business'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Skip for now link */}
          <p className="mt-8 text-center text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            {businessTied ? (
              <>
                Want to use a different email?{" "}
                <button
                  onClick={() => handleSelectAccountType('user')}
                  disabled={isLoading}
                  className="text-sage font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use Personal Account
                </button>
              </>
            ) : (
              <>
                Not sure?{" "}
                <button
                  onClick={() => handleSelectAccountType('user')}
                  disabled={isLoading}
                  className="text-sage font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start with Personal
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
