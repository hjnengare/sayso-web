"use client";

import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ChevronRight } from "react-feather";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import { useSavedItems } from "../contexts/SavedItemsContext";
import Header from "../components/Header/Header";
import SavedBusinessRow from "../components/Saved/SavedBusinessRow";
import EmptySavedState from "../components/Saved/EmptySavedState";
import { PageLoader } from "../components/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";

const Footer = nextDynamic(() => import("../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

interface SavedBusiness {
  id: string;
  name: string;
  image?: string;
  image_url?: string;
  uploaded_image?: string;
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
  slug?: string;
  subInterestId?: string;
  interestId?: string;
  // extra safety if your row/cards filter on this:
  isSaved?: boolean;
}

export default function SavedPage() {
  usePredefinedPageTitle("saved");
  const { savedItems, isLoading: savedItemsLoading, refetch } = useSavedItems();
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedBusinesses = async () => {
      if (savedItemsLoading) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/saved/businesses?limit=1000");

        if (!response.ok) {
          if (response.status === 401) {
            setError(null);
            setSavedBusinesses([]);
            setIsLoading(false);
            return;
          }

          let errorMessage = "Failed to fetch saved businesses";
          let errorCode: string | undefined;

          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            errorCode = errorData.code;
          } catch {
            // ignore parse error
          }

          const isTableError =
            response.status === 500 &&
            (errorCode === "42P01" || // relation does not exist
              errorCode === "42501" || // insufficient privilege
              errorMessage.toLowerCase().includes("relation") ||
              errorMessage.toLowerCase().includes("does not exist") ||
              errorMessage.toLowerCase().includes("permission denied"));

          if (isTableError) {
            console.warn("Saved businesses table not accessible, feature disabled");
            setError(null);
            setSavedBusinesses([]);
            setIsLoading(false);
            return;
          }

          if (response.status >= 500) {
            console.warn(
              "Error fetching saved businesses (non-critical):",
              errorMessage
            );
            setError(
              "Unable to load saved businesses at the moment. Please try again later."
            );
          } else {
            setError(null);
          }

          setSavedBusinesses([]);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        console.log("SavedPage - Fetched saved businesses:", {
          totalBusinesses: data.businesses?.length || 0,
          businessIds: (data.businesses || []).map((b: any) => b.id),
          raw: data.businesses,
        });

        const transformedBusinesses: SavedBusiness[] = (data.businesses || [])
          .map((b: any): SavedBusiness | null => {
            if (!b || !b.id) {
              console.warn("Saved business missing id:", b);
              return null;
            }

            if (!b.name || b.name.trim() === "") {
              console.warn("Saved business missing name:", b.id);
              return null;
            }

            const image = b.uploaded_image || b.image_url || b.image || "";
            const alt = `${b.name} - ${b.category || "Business"}`;
            const hasRating = b.rating != null && b.rating > 0;

            return {
              id: b.id,
              slug: b.slug,
              name: b.name.trim(),
              image,
              image_url: b.image_url,
              uploaded_image: b.uploaded_image,
              alt,
              category: b.category || "Uncategorized",
              subInterestId: b.sub_interest_id,
              interestId: b.interest_id,
              location: b.location || b.address || "Location not available",
              rating: b.rating,
              totalRating: b.rating,
              reviews: b.total_reviews || 0,
              badge: b.badge,
              href: b.slug ? `/business/${b.slug}` : `/business/${b.id}`,
              percentiles: b.percentiles,
              verified: b.verified || false,
              priceRange: b.price_range || "$$",
              hasRating,
              description: b.description,
              phone: b.phone,
              website: b.website,
              address: b.address,
              savedAt: b.saved_at,
              // force true in case your card/row checks this
              isSaved: true,
            };
          })
          .filter((b: SavedBusiness | null): b is SavedBusiness => b !== null);

        console.log("SavedPage - Transformed businesses:", {
          total: transformedBusinesses.length,
          transformed: transformedBusinesses,
        });

        setSavedBusinesses(transformedBusinesses);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : String(err);
        const isNetworkError =
          errorMessage.includes("fetch") ||
          errorMessage.includes("network") ||
          errorMessage.includes("Failed to fetch");

        if (isNetworkError) {
          console.warn(
            "Network error fetching saved businesses (non-critical):",
            errorMessage
          );
          setError(
            "Unable to load saved businesses. Please check your connection and try again."
          );
        } else {
          console.warn(
            "Error fetching saved businesses (non-critical):",
            err
          );
          setError("Failed to load saved businesses. Please try again.");
        }

        setSavedBusinesses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedBusinesses();
  }, [savedItemsLoading, savedItems.length]);

  return (
    <EmailVerificationGuard>
      <div
        className="min-h-dvh bg-off-white relative font-urbanist"
        style={{
          fontFamily:
            '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <Header
          showSearch={true}
          variant="frosty"
          backgroundClassName="bg-navbar-bg"
          searchLayout="floating"
          topPosition="top-0"
          reducedPadding={true}
          whiteText={true}
        />

        <div className="relative">
          <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 md:pb-20">
            <div className="mx-auto w-full max-w-[2000px] px-3 relative mb-4">
              {/* Breadcrumb Navigation */}
              <nav
                className="mb-4 sm:mb-6 px-2"
                aria-label="Breadcrumb"
              >
                <ol className="flex items-center gap-2 text-sm sm:text-base">
                  <li>
                    <Link
                      href="/home"
                      className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                      style={{
                        fontFamily:
                          "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Home
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 text-charcoal/40" />
                  </li>
                  <li>
                    <span
                      className="text-charcoal font-semibold"
                      style={{
                        fontFamily:
                          "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Saved
                    </span>
                  </li>
                </ol>
              </nav>
            </div>

            {isLoading || savedItemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <PageLoader size="md" variant="wavy" color="sage" />
              </div>
            ) : error ? (
              <div className="pt-4 relative z-10">
                <div className="text-center max-w-md mx-auto px-4">
                  <p
                    className="text-body text-charcoal/70 mb-4"
                    style={{
                      fontFamily: "Urbanist, system-ui, sans-serif",
                    }}
                  >
                    {error}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-6 py-3 bg-sage text-white rounded-full text-body font-semibold hover:bg-sage/90 transition-colors"
                    style={{
                      fontFamily: "Urbanist, system-ui, sans-serif",
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : savedBusinesses.length > 0 ? (
              <div className="relative z-10">
                {/* 🔍 DEBUG SECTION – remove when happy */}
                <div className="mb-4 px-3 text-xs text-charcoal/60">
                  <div>Saved businesses count: {savedBusinesses.length}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {savedBusinesses.slice(0, 10).map((b) => (
                      <span
                        key={b.id}
                        className="px-2 py-1 rounded-full bg-charcoal/5"
                      >
                        {b.name}
                      </span>
                    ))}
                  </div>
                </div>

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
