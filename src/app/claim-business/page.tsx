"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import {
  Search,
  Store,
  MapPin,
  Check,
} from "lucide-react";
import { ChevronRight } from "react-feather";
import { PageLoader, Loader } from "../components/Loader";
import { BusinessService } from "../lib/services/businessService";
import { BusinessOwnershipService } from "../lib/services/businessOwnershipService";
import { VerificationForm } from "../components/BusinessClaim/VerificationForm";
import type { Business, BusinessWithStats } from "../lib/types/database";
import Link from "next/link";
import Header from "../components/Header/Header";

const Footer = dynamic(() => import("../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

export default function ClaimBusinessPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [businesses, setBusinesses] = useState<BusinessWithStats[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithStats | null>(null);
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/claim-business');
    }
  }, [user, authLoading, router]);

  // Search businesses when query changes
  useEffect(() => {
    const searchBusinesses = async () => {
      if (searchQuery.trim().length < 2) {
        setBusinesses([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await BusinessService.searchBusinesses(searchQuery);
        setBusinesses(results);
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

  const handleClaimBusiness = (business: BusinessWithStats) => {
    if (!user) {
      router.push('/login?redirect=/claim-business');
      return;
    }
    setSelectedBusiness(business);
    setShowVerificationForm(true);
  };

  const handleVerificationSuccess = () => {
    setShowVerificationForm(false);
    setSelectedBusiness(null);
    router.push('/business/verification-status');
  };

  if (authLoading) {
    return <PageLoader size="lg" variant="wavy" color="sage"  />;
  }

  if (!user) {
    return null; // Will redirect
  }

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

      <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
        <div className="pt-16 sm:pt-20 md:pt-24">
          {/* Main Content Section */}
          <section
            className="relative"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            }}
          >
            <div className="mx-auto w-full max-w-[2000px] min-h-dvh px-4 sm:px-6 lg:px-8 relative z-10">
              {/* Breadcrumb Navigation */}
              <nav className="pt-4 sm:pt-0 mb-4 sm:mb-6 md:pt-2" aria-label="Breadcrumb">
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
                      Claim Business
                    </span>
                  </li>
                </ol>
              </nav>

              <div className="max-w-6xl mx-auto pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8">
                <div className="max-w-[800px] mx-auto">

                {/* Header Section */}
                <div className="py-12 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-sage/20">
                    <Store className="w-6 h-6 sm:w-7 sm:h-7 text-sage" />
                  </div>
                  <h2 className="font-urbanist text-lg sm:text-xl md:text-2xl font-semibold text-charcoal mb-2 px-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Own or manage a business?
                  </h2>
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
                      className="p-4 sm:p-5 bg-white border border-charcoal/10 rounded-lg shadow-sm
                                 hover:border-sage/30 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sage/10 rounded-full flex items-center justify-center flex-shrink-0
                                          group-hover:bg-sage/20 transition-colors duration-200">
                            <Store className="w-4 h-4 sm:w-5 sm:h-5 text-sage" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-urbanist text-sm sm:text-base font-semibold text-charcoal
                                           transition-colors duration-200 truncate" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                              {business.name}
                            </h3>
                            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-1 font-urbanist text-xs sm:text-sm text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                              <span className="truncate max-w-[120px] sm:max-w-none">{business.category}</span>
                              <span className="text-charcoal/40 hidden sm:inline">•</span>
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="w-3 h-3 text-charcoal/60 flex-shrink-0" />
                                <span className="truncate max-w-[100px] sm:max-w-none">{business.location}</span>
                              </div>
                              {business.stats && (
                                <>
                                  <span className="text-charcoal/40 hidden sm:inline">•</span>
                                  <span className="hidden sm:inline whitespace-nowrap">{business.stats.total_reviews || 0} reviews</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleClaimBusiness(business)}
                          className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-full text-sm font-semibold font-urbanist transition-all duration-200 flex-shrink-0
                            bg-gradient-to-br from-coral to-coral/90 text-white hover:from-coral/90 hover:to-coral/80 hover:shadow-lg active:scale-[0.98] touch-manipulation"
                          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                          Claim
                        </button>
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
                    <button className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-gradient-to-br from-coral to-coral/90 text-white text-sm font-semibold font-urbanist rounded-full hover:from-coral/90 hover:to-coral/80 transition-all duration-300 hover:shadow-lg active:scale-[0.98] touch-manipulation whitespace-nowrap"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Learn More
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <Footer />
      </div>

      {/* Verification Form Modal */}
      {showVerificationForm && selectedBusiness && (
        <VerificationForm
          business={selectedBusiness}
          onClose={() => {
            setShowVerificationForm(false);
            setSelectedBusiness(null);
          }}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  );
}
