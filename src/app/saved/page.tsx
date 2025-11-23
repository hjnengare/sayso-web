"use client";

import nextDynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import { useSavedItems } from "../contexts/SavedItemsContext";
import SavedHeader from "../components/Saved/SavedHeader";
import SavedBusinessRow from "../components/Saved/SavedBusinessRow";
import EmptySavedState from "../components/Saved/EmptySavedState";
import { PageLoader } from "../components/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";

// Note: dynamic and revalidate cannot be exported from client components
// Client components are automatically dynamic

const Footer = nextDynamic(() => import("../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

interface SavedBusiness {
  id: string;
  name: string;
  image?: string;
  category: string;
  location: string;
  rating?: number;
  totalRating?: number;
  reviews: number;
  badge?: string;
  href: string;
  verified: boolean;
  priceRange: string;
  hasRating: boolean;
  percentiles?: Record<string, number>;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  savedAt?: string;
}

export default function SavedPage() {
  usePredefinedPageTitle('saved');
  const { savedItems, isLoading: savedItemsLoading, refetch } = useSavedItems();
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch saved businesses from API
  useEffect(() => {
    const fetchSavedBusinesses = async () => {
      if (savedItemsLoading) {
        return; // Wait for saved items to load first
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/user/saved');
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to view saved businesses');
            setSavedBusinesses([]);
            return;
          }
          throw new Error('Failed to fetch saved businesses');
        }

        const data = await response.json();
        setSavedBusinesses(data.businesses || []);
      } catch (err) {
        console.error('Error fetching saved businesses:', err);
        setError('Failed to load saved businesses. Please try again.');
        setSavedBusinesses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedBusinesses();
  }, [savedItemsLoading, savedItems.length]); // Refetch when saved items change

  return (
    <EmailVerificationGuard>
      <div 
        className="min-h-dvh bg-off-white relative font-urbanist"
        style={{
          fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <SavedHeader />

        <div className="relative z-0">
          <div className="py-1 pt-20 pb-12 sm:pb-16 md:pb-20">
            {isLoading || savedItemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <PageLoader size="md" color="sage" text="Loading saved businesses..." />
              </div>
            ) : error ? (
              <div className="pt-4 relative z-10">
                <div className="text-center max-w-md mx-auto px-4">
                  <p className="text-body text-charcoal/70 mb-4" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                    {error}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-6 py-3 bg-sage text-white rounded-full text-body font-semibold hover:bg-sage/90 transition-colors"
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : savedBusinesses.length > 0 ? (
              <div className="relative z-10">
                <SavedBusinessRow
                  title="Your Saved Gems"
                  businesses={savedBusinesses}
                  showCount={true}
                />
              </div>
            ) : (
              <div className="pt-4 relative z-10">
                <EmptySavedState />
              </div>
            )}
          </div>

          <Footer />
        </div>
      </div>
    </EmailVerificationGuard>
  );
}
