"use client";

import nextDynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import { useSavedItems } from "../contexts/SavedItemsContext";
import Header from "../components/Header/Header";
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
  alt: string;
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
            // User not authenticated - this is expected for logged out users
            setError(null); // Don't show error for expected case
            setSavedBusinesses([]);
            setIsLoading(false);
            return;
          }
          
          // Try to get error details from response
          let errorMessage = 'Failed to fetch saved businesses';
          let errorCode: string | undefined;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            errorCode = errorData.code;
          } catch {
            // If JSON parsing fails, use default message
          }
          
          // Check if it's a table/permission error
          const isTableError = response.status === 500 && (
            errorCode === '42P01' || // relation does not exist
            errorCode === '42501' || // insufficient privilege
            errorMessage.toLowerCase().includes('relation') ||
            errorMessage.toLowerCase().includes('does not exist') ||
            errorMessage.toLowerCase().includes('permission denied')
          );
          
          if (isTableError) {
            // Table doesn't exist - show helpful message but don't treat as critical error
            console.warn('Saved businesses table not accessible, feature disabled');
            setError(null); // Don't show error - feature just isn't available
            setSavedBusinesses([]);
            setIsLoading(false);
            return;
          }
          
          // For other server errors, show error but don't throw
          if (response.status >= 500) {
            console.warn('Error fetching saved businesses (non-critical):', errorMessage);
            setError('Unable to load saved businesses at the moment. Please try again later.');
          } else {
            // Client errors - don't show error, just set empty
            setError(null);
          }
          setSavedBusinesses([]);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        console.log('SavedPage - Fetched saved businesses:', {
          totalBusinesses: data.businesses?.length || 0,
          businessIds: (data.businesses || []).map((b: any) => b.id),
          businesses: data.businesses
        });
        setSavedBusinesses(data.businesses || []);
      } catch (err) {
        // Network or unexpected errors
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isNetworkError = errorMessage.includes('fetch') || 
                             errorMessage.includes('network') ||
                             errorMessage.includes('Failed to fetch');
        
        if (isNetworkError) {
          console.warn('Network error fetching saved businesses (non-critical):', errorMessage);
          setError('Unable to load saved businesses. Please check your connection and try again.');
        } else {
          console.warn('Error fetching saved businesses (non-critical):', err);
          setError('Failed to load saved businesses. Please try again.');
        }
        setSavedBusinesses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedBusinesses();
  }, [savedItemsLoading, savedItems.length]); // Refetch when saved items change (removed refetch to avoid unnecessary re-renders)

  return (
    <EmailVerificationGuard>
      <div 
        className="min-h-dvh bg-off-white relative font-urbanist"
        style={{
          fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <Header whiteText={true} />

        <div className="relative z-0">
          <div className="py-1 pt-20 pb-12 sm:pb-16 md:pb-20">
            {isLoading || savedItemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <PageLoader size="md" variant="wavy" color="sage" />
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
              <div className="relative z-10 min-h-[calc(100vh-200px)] flex items-center justify-center">
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
