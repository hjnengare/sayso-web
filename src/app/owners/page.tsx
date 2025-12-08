"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { BusinessOwnershipService } from "../lib/services/businessOwnershipService";
import { PageLoader, Loader } from "../components/Loader";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { Store, MapPin, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Business } from "../lib/types/database";

export default function OwnersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/business/login');
        return;
      }

      setIsLoading(true);
      try {
        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
        setBusinesses(ownedBusinesses);
      } catch (error) {
        console.error('Error fetching businesses:', error);
        setError('Failed to load your businesses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return <PageLoader size="lg" variant="wavy" color="sage" />;
  }

  if (!user) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-off-white">
        <Header />
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-charcoal/70">{error}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">
      <Header
        showSearch={false}
        variant="white"
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />
      
      <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-2">
            {/* Breadcrumb */}
            <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm sm:text-base">
                <li>
                  <Link href="/claim-business" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Claim Business
                  </Link>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-charcoal/40" />
                </li>
                <li>
                  <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Your Businesses
                  </span>
                </li>
              </ol>
            </nav>

            {/* Header */}
            <div className="mb-8 sm:mb-12 px-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                Your Businesses
              </h1>
              <p className="text-charcoal/70 text-sm sm:text-base" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                Manage your business profiles and connect with customers
              </p>
            </div>

            {/* Businesses List */}
            <div className="px-2">
              {businesses.length === 0 ? (
                <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Store className="w-8 h-8 text-sage" />
                  </div>
                  <h2 className="text-xl font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    No businesses yet
                  </h2>
                  <p className="text-charcoal/70 mb-6" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Claim a business to get started managing your profile.
                  </p>
                  <Link
                    href="/claim-business"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-br from-coral to-coral/90 text-white rounded-full font-semibold hover:from-coral/90 hover:to-coral/80 transition-all duration-300"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    Claim Business
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {businesses.map((business) => (
                    <div
                      key={business.id}
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg hover:shadow-xl transition-all duration-300 p-5 sm:p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-charcoal mb-2 truncate" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                            {business.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-charcoal/70 mb-3">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{business.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mb-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-sage/20 text-sage border border-sage/30">
                          <Check className="w-3 h-3" />
                          Verified
                        </span>
                      </div>

                      {/* Manage Button */}
                      <Link
                        href={`/owners/businesses/${business.id}`}
                        className="block w-full px-4 py-2.5 bg-gradient-to-br from-coral to-coral/90 text-white rounded-full text-sm font-semibold text-center hover:from-coral/90 hover:to-coral/80 transition-all duration-300"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        Manage
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

