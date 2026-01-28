"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "../contexts/AuthContext";
import { BusinessOwnershipService } from "../lib/services/businessOwnershipService";
import SkeletonHeader from "../components/shared/skeletons/SkeletonHeader";
import SkeletonList from "../components/shared/skeletons/SkeletonList";

import { ChevronRight, Store } from "lucide-react";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import { motion } from "framer-motion";
import type { Business } from "../components/BusinessCard/BusinessCard";

export default function MyBusinessesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch - start as soon as we have a user
  useEffect(() => {
    const fetchBusinesses = async () => {
      // If auth is still loading, wait
      if (authLoading) return;

      // If auth resolved but no user, stop loading and let redirect happen
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
        // Transform to BusinessCard Business type
        const transformedBusinesses: Business[] = ownedBusinesses.map(business => ({
          ...(business as any),
          alt: business.name,
          reviews: 0, // TODO: fetch actual review count
          uploaded_images: [], // TODO: fetch uploaded images
        }));
        setBusinesses(transformedBusinesses);
      } catch (err) {
        console.error("Error fetching businesses:", err);
        setError("Failed to load your businesses");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, [user?.id, authLoading]); // Depend on both user ID and authLoading

  // Refetch when page becomes visible/focused
  useEffect(() => {
    if (!user) return;

    const refetch = async () => {
      try {
        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
        // Transform to BusinessCard Business type
        const transformedBusinesses: Business[] = ownedBusinesses.map(business => ({
          ...(business as any),
          alt: business.name,
          reviews: 0, // TODO: fetch actual review count
          uploaded_images: [], // TODO: fetch uploaded images
        }));
        setBusinesses(transformedBusinesses);
      } catch (err) {
        console.error("Error refetching businesses:", err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Small delay to ensure navigation settles
        setTimeout(() => {
          void refetch();
        }, 100);
      }
    };

    const handleFocus = () => {
      void refetch();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  // Listen for business deletion events and remove from list
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    import("../lib/utils/businessUpdateEvents")
      .then(({ businessUpdateEvents }) => {
        unsubscribe = businessUpdateEvents.onDelete((deletedBusinessId: string) => {
          setBusinesses((prev) => prev.filter((b) => b.id !== deletedBusinessId));
        });
      })
      .catch((err) => {
        console.error("Error loading business update events:", err);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ✅ IMPORTANT: never return null while auth is still resolving (prevents blank page)
  if (authLoading || isLoading) {
    return (
      <div className="min-h-dvh bg-off-white">
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-2">
            <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
              <SkeletonHeader width="w-1/3" height="h-6" className="mb-2" />
            </nav>
            <div className="mb-8 sm:mb-12 px-2">
              <SkeletonHeader width="w-2/3" height="h-10" className="mb-2" />
              <SkeletonHeader width="w-1/2" height="h-6" />
            </div>
            <div className="px-2">
              <SkeletonList count={3} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Auth resolved, no user → redirect + render nothing
  if (!user) {
    router.push("/login");
    return null;
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-off-white">
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-charcoal/70">{error}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">

      <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-2">
            {/* Empty state (only when user is logged in + fetch completed + no businesses) */}
            {(!businesses || businesses.length === 0) && (
              <div className="relative z-10 min-h-[calc(100vh-200px)] flex items-center justify-center">
                <div className="mx-auto w-full max-w-[2000px] px-2 font-urbanist">
                  <div className="text-center w-full">
                    <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                      <Store className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                    </div>

                    <h3 className="text-h2 font-semibold text-charcoal mb-2">No businesses yet</h3>

                    <p
                      className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
                      style={{ fontWeight: 500 }}
                    >
                      Add your business to manage it here
                    </p>

                    <button
                      onClick={() => router.push("/add-business")}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage text-white text-body font-semibold rounded-full hover:bg-sage/90 transition-all duration-300"
                    >
                      Add your business
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Businesses view */}
            {businesses && businesses.length > 0 && (
              <>
                {/* Breadcrumb Navigation */}
                <motion.nav
                  className="mb-4 sm:mb-6 px-2"
                  aria-label="Breadcrumb"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ol className="flex items-center gap-2 text-sm sm:text-base">
                    <li>
                      <Link
                        href="/home"
                        className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                        style={{
                          fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        }}
                      >
                        Home
                      </Link>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-charcoal/60" />
                    </li>
                    <li>
                      <span
                        className="text-charcoal font-semibold"
                        style={{
                          fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        }}
                      >
                        My Businesses
                      </span>
                    </li>
                  </ol>
                </motion.nav>

                {/* Page Header */}
                <motion.div
                  className="mb-6 sm:mb-8 px-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <h1
                    className="text-h2 sm:text-h1 font-bold text-charcoal"
                    style={{
                      fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    My Businesses
                  </h1>
                  <p
                    className="text-body-sm text-charcoal/60 mt-2"
                    style={{
                      fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    {businesses.length} {businesses.length === 1 ? "business" : "businesses"} to manage
                  </p>
                </motion.div>

                {/* Business Grid */}
                <motion.div
                  className="relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3">
                    {businesses.map((business) => (
                      <div key={business.id} className="list-none">
                        <BusinessCard business={business} compact inGrid={true} ownerView={true} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
