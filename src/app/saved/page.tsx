"use client";

import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ChevronUp } from "react-feather";
import Pagination from "../components/EventsPage/Pagination";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";
import { useSavedItems } from "../contexts/SavedItemsContext";
import Header from "../components/Header/Header";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import EmptySavedState from "../components/Saved/EmptySavedState";
import { PageLoader, Loader } from "../components/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { Business } from "../components/BusinessCard/BusinessCard";

const ITEMS_PER_PAGE = 12;

const Footer = nextDynamic(() => import("../components/Footer/Footer"), {
  loading: () => null,
  ssr: false,
});

export default function SavedPage() {
  usePredefinedPageTitle("saved");
  const { savedItems, isLoading: savedItemsLoading, refetch } = useSavedItems();
  const [savedBusinesses, setSavedBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const previousPageRef = useRef(currentPage);

  // Extract unique categories from saved businesses
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(savedBusinesses.map(b => b.category).filter(Boolean))
    ).sort();
    return ['All', ...uniqueCategories];
  }, [savedBusinesses]);

  // Filter businesses by selected category
  const filteredBusinesses = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') {
      return savedBusinesses;
    }
    return savedBusinesses.filter(b => b.category === selectedCategory);
  }, [savedBusinesses, selectedCategory]);

  // Calculate pagination based on filtered businesses
  const totalPages = useMemo(
    () => Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE),
    [filteredBusinesses.length]
  );
  const currentBusinesses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredBusinesses.slice(startIndex, endIndex);
  }, [filteredBusinesses, currentPage]);

  // Reset to page 1 when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    const fetchSavedBusinesses = async () => {
      // Wait until SavedItemsContext has finished its initial load
      if (savedItemsLoading) return;

      try {
        setIsLoading(true);
        setError(null);

        // Use the endpoint that already returns BusinessCard-shaped data
        const response = await fetch("/api/user/saved");

        if (!response.ok) {
          if (response.status === 401) {
            // Not logged in => show empty state, no error
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
            console.warn(
              "Saved businesses table not accessible, feature disabled"
            );
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

        console.log("SavedPage - Fetched saved businesses (raw):", {
          totalBusinesses: data.businesses?.length || 0,
          businessIds: (data.businesses || []).map((b: any) => b.id),
          raw: data.businesses,
        });

        // No need to transform – this is already Business[]
        const businesses: Business[] = data.businesses || [];

        // Safety filter: make sure we only keep valid ones
        const filtered = businesses.filter((b) => {
          if (!b || !b.id) {
            console.warn("Saved business missing id:", b);
            return false;
          }
          if (!b.name || b.name.trim() === "") {
            console.warn("Saved business missing name:", b.id);
            return false;
          }
          return true;
        });

        console.log("SavedPage - Final businesses after filter:", {
          total: filtered.length,
          ids: filtered.map((b) => b.id),
        });

        setSavedBusinesses(filtered);
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

  // Handle pagination with loader and transitions
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;

    // Show loader
    setIsPaginationLoading(true);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Wait for scroll and show transition
    setTimeout(() => {
      previousPageRef.current = currentPage;
      setCurrentPage(newPage);

      // Hide loader after brief delay for smooth transition
      setTimeout(() => {
        setIsPaginationLoading(false);
      }, 300);
    }, 150);
  };

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };

    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener("scroll", handleScroll, options);
    return () => window.removeEventListener("scroll", handleScroll, options);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
            <motion.div
              className="mx-auto w-full max-w-[2000px] px-3 relative mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
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
            </motion.div>

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
              <motion.div
                className="relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="mx-auto w-full max-w-[2000px] px-2">
                  {/* Title */}
                  <motion.div
                    className="mb-6 sm:mb-8 px-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <h1
                      className="text-h2 sm:text-h1 font-bold text-charcoal"
                      style={{
                        fontFamily:
                          "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Your Saved Gems
                    </h1>
                    <p
                      className="text-body-sm text-charcoal/60 mt-2"
                      style={{
                        fontFamily:
                          "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      {filteredBusinesses.length} {filteredBusinesses.length === 1 ? "business" : "businesses"} saved
                      {selectedCategory && selectedCategory !== 'All' && ` in ${selectedCategory}`}
                    </p>
                  </motion.div>

                  {/* Category Filters */}
                  {categories.length > 1 && (
                    <div className="mb-6 px-2">
                      <div 
                        className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2"
                        style={{ 
                          WebkitOverflowScrolling: 'touch',
                          scrollBehavior: 'smooth',
                        }}
                      >
                        {categories.map((category) => {
                          const isSelected = selectedCategory === category || (!selectedCategory && category === 'All');
                          const count = category === 'All' 
                            ? savedBusinesses.length 
                            : savedBusinesses.filter(b => b.category === category).length;
                          
                          return (
                            <button
                              key={category}
                              onClick={() => setSelectedCategory(category === 'All' ? null : category)}
                              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-urbanist font-600 text-body-sm sm:text-body transition-all duration-200 active:scale-95 flex-shrink-0 whitespace-nowrap ${
                                isSelected
                                  ? "bg-coral text-white shadow-lg"
                                  : "bg-sage/10 text-charcoal/70 hover:bg-sage/20 hover:text-sage border border-sage/30"
                              }`}
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              {category}
                              {count > 0 && (
                                <span className="ml-2 text-xs sm:text-sm opacity-80">
                                  ({count})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Loading Spinner Overlay for Pagination */}
                  {isPaginationLoading && (
                    <div className="fixed inset-0 z-[9998] bg-off-white/95 backdrop-blur-sm flex items-center justify-center min-h-screen">
                      <Loader size="lg" variant="wavy" color="sage" />
                    </div>
                  )}

                  {/* Paginated Content with Smooth Transition */}
                  <AnimatePresence mode="wait" initial={false}>
                    <div
                      key={currentPage}
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3"
                    >
                      {currentBusinesses.map((business) => (
                        <div key={business.id} className="list-none">
                          <BusinessCard business={business} compact inGrid={true} />
                        </div>
                      ))}
                    </div>
                  </AnimatePresence>

                  {/* Pagination */}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    disabled={isPaginationLoading}
                  />
                </div>
              </motion.div>
            ) : (
              <div className="relative z-10 min-h-[calc(100vh-200px)] flex items-center justify-center">
                <EmptySavedState />
              </div>
            )}
          </div>

          <Footer />
        </div>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg hover:bg-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:scale-110 transition-all duration-300"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-6 h-6 text-white" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </EmailVerificationGuard>
  );
}
