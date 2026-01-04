"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import {
  Search,
  Store,
  MapPin,
  Check,
  Clock,
  XCircle,
} from "lucide-react";
import { ChevronRight } from "react-feather";
import { PageLoader, Loader } from "../components/Loader";
import { ClaimModal } from "../components/BusinessClaim/ClaimModal";
import Link from "next/link";
import Header from "../components/Header/Header";
import { Suspense } from "react";
import { Fontdiner_Swanky } from "next/font/google";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const Footer = dynamic(() => import("../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

interface BusinessSearchResult {
  id: string;
  name: string;
  category: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  image_url?: string;
  verified: boolean;
  claim_status: 'unclaimed' | 'claimed' | 'pending';
  pending_by_user?: boolean;
  claimed_by_user?: boolean;
}

function ClaimBusinessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [businesses, setBusinesses] = useState<BusinessSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSearchResult | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Handle businessId from query params (after login redirect)
  useEffect(() => {
    const businessId = searchParams?.get('businessId');
    if (businessId && user && businesses.length > 0) {
      const business = businesses.find(b => b.id === businessId);
      if (business && business.claim_status === 'unclaimed' && !business.claimed_by_user) {
        setSelectedBusiness(business);
        setShowClaimModal(true);
      }
    }
  }, [searchParams, user, businesses]);

  // Search businesses when query changes
  useEffect(() => {
    const searchBusinesses = async () => {
      if (searchQuery.trim().length < 2) {
        setBusinesses([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/businesses/search?query=${encodeURIComponent(searchQuery.trim())}`);
        if (!response.ok) {
          throw new Error('Failed to search businesses');
        }
        const result = await response.json();
        setBusinesses(result.businesses || []);
      } catch (error) {
        console.error('Error searching businesses:', error);
        setBusinesses([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchBusinesses, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleClaimClick = (business: BusinessSearchResult) => {
    if (!user) {
      // Redirect to business login with redirect back to for-businesses with businessId
      router.push(`/business/login?redirect=/for-businesses?businessId=${business.id}`);
      return;
    }

    // Check claim status
    if (business.claimed_by_user) {
      // User already owns this business - go to dashboard
      router.push(`/owners/businesses/${business.id}`);
      return;
    }

    if (business.pending_by_user) {
      // Already has pending claim - show message
      return;
    }

    if (business.claim_status === 'claimed' && !business.claimed_by_user) {
      // Already claimed by someone else - show message
      return;
    }

    // Open claim modal
    setSelectedBusiness(business);
    setShowClaimModal(true);
  };

  const handleClaimSuccess = () => {
    setShowClaimModal(false);
    setSelectedBusiness(null);
    // Refresh search results to update status
    if (searchQuery.trim().length >= 2) {
      const event = new Event('input', { bubbles: true });
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.dispatchEvent(event);
      }
    }
  };

  const getStatusBadge = (business: BusinessSearchResult) => {
    if (business.claimed_by_user) {
      return null; // Don't show badge if user owns it
    }

    if (business.pending_by_user) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          Claim pending
        </span>
      );
    }

    if (business.claim_status === 'claimed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3" />
          Business already claimed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-sage/10 text-sage border border-sage/20">
        <Check className="w-3 h-3" />
        Unclaimed
      </span>
    );
  };

  const getActionButton = (business: BusinessSearchResult) => {
    if (!user) {
      return (
        <button
          onClick={() => handleClaimClick(business)}
          className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-full text-sm font-semibold font-urbanist transition-all duration-200 flex-shrink-0
            bg-gradient-to-br from-coral to-coral/90 text-white hover:from-coral/90 hover:to-coral/80 hover:shadow-lg active:scale-[0.98] touch-manipulation"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Log in to claim
        </button>
      );
    }

    if (business.claimed_by_user) {
      return (
        <button
          onClick={() => handleClaimClick(business)}
          className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-full text-sm font-semibold font-urbanist transition-all duration-200 flex-shrink-0
            bg-gradient-to-br from-sage to-sage/90 text-white hover:from-sage/90 hover:to-sage/80 hover:shadow-lg active:scale-[0.98] touch-manipulation"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Go to dashboard
        </button>
      );
    }

    if (business.pending_by_user) {
      return (
        <button
          disabled
          className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-full text-sm font-semibold font-urbanist transition-all duration-200 flex-shrink-0
            bg-charcoal/10 text-charcoal/60 cursor-not-allowed"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Claim pending review
        </button>
      );
    }

    if (business.claim_status === 'claimed' && !business.claimed_by_user) {
      return (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-charcoal/60 text-center sm:text-left">Business already claimed</span>
          <Link
            href="/support"
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-full text-sm font-semibold font-urbanist transition-all duration-200 flex-shrink-0
              border-2 border-charcoal/20 text-charcoal hover:bg-charcoal/5 text-center"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            Contact support
          </Link>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleClaimClick(business)}
        className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-full text-sm font-semibold font-urbanist transition-all duration-200 flex-shrink-0
          bg-gradient-to-br from-coral to-coral/90 text-white hover:from-coral/90 hover:to-coral/80 hover:shadow-lg active:scale-[0.98] touch-manipulation"
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        Claim this business
      </button>
    );
  };

  return (
    <div className="min-h-dvh bg-off-white">
      {/* Header */}
      <Header
        showSearch={false}
        variant="white"
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />

      <main className="pt-20 sm:pt-24 pb-28">
        <div className="mx-auto w-full max-w-[2000px] px-2">
          {/* Breadcrumb Navigation */}
          <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Home
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/40" />
              </li>
              <li>
                <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  For Businesses
                </span>
              </li>
            </ol>
          </nav>

          <div className="py-3 sm:py-4">
            <div className="pt-4 sm:pt-6 md:pt-10">
              <div className="max-w-6xl mx-auto">
                <div className="max-w-[800px] mx-auto">

                  {/* Header Section */}
                  <div className="py-12 text-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-sage/20">
                      <Store className="w-6 h-6 sm:w-7 sm:h-7 text-sage" />
                    </div>
                    <div className="inline-block relative mb-2 px-2">
                      <WavyTypedTitle
                        text="Own or manage a business?"
                        as="h2"
                        className={`${swanky.className} text-lg sm:text-xl md:text-2xl font-semibold mb-2 text-center leading-[1.2] tracking-tight text-charcoal`}
                        typingSpeedMs={40}
                        startDelayMs={300}
                        waveVariant="subtle"
                        loopWave={false}
                        triggerOnTypingComplete={true}
                        enableScrollTrigger={false}
                        style={{ 
                          fontFamily: swanky.style.fontFamily,
                        }}
                      />
                    </div>
                    <p className="font-urbanist text-sm sm:text-base text-charcoal/70 max-w-md mx-auto px-4 sm:px-0 break-keep" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', wordBreak: 'normal', overflowWrap: 'normal', whiteSpace: 'normal', hyphens: 'none', WebkitHyphens: 'none', MozHyphens: 'none', msHyphens: 'none' }}>
                      Claim your business profile to respond to reviews, update information, and connect with customers
                    </p>
                  </div>

                  {/* Search Section */}
                  <div className="pb-8">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none z-10">
                        <Search className="w-5 h-5 text-charcoal/60" strokeWidth={2} />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for your business..."
                        className="w-full pl-8 pr-4 py-3 min-h-[48px] bg-transparent border-0 border-b-2 border-charcoal/20
                                   text-base placeholder:text-base placeholder:text-charcoal/40 font-normal text-charcoal
                                   focus:outline-none focus:border-charcoal/60
                                   hover:border-charcoal/30 transition-all duration-200 touch-manipulation"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      />
                    </div>
                  </div>

                  {/* Business Results */}
                  <div className="space-y-3 sm:space-y-4 py-6">
                    {isSearching && (
                      <div className="flex items-center justify-center py-8 sm:py-12">
                        <Loader size="md" variant="wavy" color="sage" />
                      </div>
                    )}
                    {!isSearching && businesses.map((business) => (
                      <div
                        key={business.id}
                        className="p-4 sm:p-5 bg-sage border border-sage/20 rounded-[20px] shadow-sm
                                   hover:border-sage/40 hover:shadow-md transition-all duration-300 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0
                                            group-hover:bg-white/30 transition-colors duration-200">
                              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-urbanist text-sm sm:text-base font-semibold text-white
                                               transition-colors duration-200 truncate" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                  {business.name}
                                </h3>
                                {getStatusBadge(business)}
                              </div>
                              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 font-urbanist text-xs sm:text-sm text-white/90" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                <span className="truncate max-w-[120px] sm:max-w-none">{business.category}</span>
                                <span className="text-white/60 hidden sm:inline">•</span>
                                <div className="flex items-center gap-1 min-w-0">
                                  <MapPin className="w-3 h-3 text-white/80 flex-shrink-0" />
                                  <span className="truncate max-w-[100px] sm:max-w-none">{business.location}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {getActionButton(business)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty State */}
                  {searchQuery && !isSearching && businesses.length === 0 && (
                    <div className="text-center py-8 sm:py-12 px-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-sage/20">
                        <Search className="w-5 h-5 sm:w-6 sm:h-6 text-sage" />
                      </div>
                      <h3 className="font-urbanist text-base sm:text-lg font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Business not found
                      </h3>
                      <p className="font-urbanist text-sm sm:text-base text-charcoal/70 mb-4 sm:mb-6 max-w-md mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Can't find your business? You can add it to our directory.
                      </p>
                      <button className="px-6 py-2.5 min-h-[44px] bg-gradient-to-br from-sage to-sage/90 text-white rounded-full text-sm font-semibold font-urbanist
                                         hover:from-sage/90 hover:to-sage/80 transition-all duration-300 hover:shadow-lg active:scale-[0.98] touch-manipulation"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Add Your Business
                      </button>
                    </div>
                  )}

                  {/* Help Section */}
                  <div className="mt-8 sm:mt-12 mb-8 sm:mb-12 p-4 sm:p-6 bg-sage border border-sage/20 rounded-lg shadow-sm">
                    <h3 className="font-urbanist text-base sm:text-lg font-semibold text-white mb-2 px-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Need help claiming your business?
                    </h3>
                    <p className="font-urbanist text-sm sm:text-base text-white/90 mb-4 sm:mb-5 break-keep leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', wordBreak: 'normal', overflowWrap: 'normal', whiteSpace: 'normal', hyphens: 'none', WebkitHyphens: 'none', MozHyphens: 'none', msHyphens: 'none' }}>
                      Our business verification process is quick and easy. You'll need to provide proof of ownership
                      or management authorisation.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] border-2 border-white text-white rounded-full text-sm font-semibold font-urbanist
                                         hover:bg-white hover:text-sage transition-all duration-300 active:scale-[0.98] touch-manipulation whitespace-nowrap"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Contact Support
                      </button>
                      <Link href="/add-business" className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-gradient-to-br from-coral to-coral/90 text-white text-sm font-semibold font-urbanist rounded-full hover:from-coral/90 hover:to-coral/80 transition-all duration-300 hover:shadow-lg active:scale-[0.98] touch-manipulation whitespace-nowrap inline-flex items-center justify-center"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Add Service
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Claim Modal */}
      {showClaimModal && selectedBusiness && (
        <ClaimModal
          business={selectedBusiness}
          onClose={() => {
            setShowClaimModal(false);
            setSelectedBusiness(null);
          }}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  );
}

export default function ClaimBusinessPage() {
  return (
    <Suspense fallback={<PageLoader size="lg" variant="wavy" color="sage" />}>
      <ClaimBusinessPageContent />
    </Suspense>
  );
}
