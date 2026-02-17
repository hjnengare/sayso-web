"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "../contexts/AuthContext";
import { BusinessOwnershipService } from "../lib/services/businessOwnershipService";
import SkeletonHeader from "../components/shared/skeletons/SkeletonHeader";
import SkeletonList from "../components/shared/skeletons/SkeletonList";
import { usePreviousPageBreadcrumb } from "../hooks/usePreviousPageBreadcrumb";

import { ChevronRight, Store, CalendarDays, Sparkles, Clock3, MapPin, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { Business } from "../components/BusinessCard/BusinessCard";
import Footer from "../components/Footer/Footer";
import MyBusinessesTable from "./MyBusinessesTable";

type ListingTypeFilter = "all" | "event" | "special";

interface OwnerListing {
  id: string;
  title: string;
  type: "event" | "special";
  businessId: string;
  businessName: string;
  startDate: string | null;
  endDate: string | null;
  location: string;
  description: string | null;
}

interface OwnerListingsFetchResult {
  items: OwnerListing[];
  failedCount: number;
}

const FONT_STACK = "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const LISTINGS_REQUEST_TIMEOUT_MS = 7000;
const OWNER_DATA_REQUEST_TIMEOUT_MS = 7600;
// Watchdog needs to account for two sequential API calls (owner data + listings)
// Max theoretical time: 7.6s + 7.6s = 15.2s, so set to 18s with buffer
const LOADING_WATCHDOG_TIMEOUT_MS = 18000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function toBusinessCardData(ownedBusinesses: any[]): Business[] {
  return ownedBusinesses.map((business) => ({
    ...(business as any),
    alt: business.name,
    reviews: 0,
    uploaded_images: [],
  }));
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed;
}

function formatDateDisplay(value: string | null | undefined): string {
  const parsed = parseDate(value);
  if (!parsed) return "Date TBD";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
  const start = formatDateDisplay(startDate);
  if (!endDate || endDate === startDate) return start;
  const end = formatDateDisplay(endDate);
  return `${start} to ${end}`;
}

function getListingDetailHref(listing: OwnerListing): string {
  return listing.type === "special" ? `/special/${listing.id}` : `/event/${listing.id}`;
}

export default function MyBusinessesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { previousHref, previousLabel } = usePreviousPageBreadcrumb({
    fallbackHref: "/home",
    fallbackLabel: "Home",
  });

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [ownerListings, setOwnerListings] = useState<OwnerListing[]>([]);
  const [listingsTypeFilter, setListingsTypeFilter] = useState<ListingTypeFilter>("all");
  const [listingsBusinessFilter, setListingsBusinessFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingsWarning, setListingsWarning] = useState<string | null>(null);
  const fetchCallCountRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchOwnerListings = useCallback(async (ownedBusinesses: Business[]): Promise<OwnerListingsFetchResult> => {
    if (ownedBusinesses.length === 0) return { items: [], failedCount: 0 };

    const results = await Promise.allSettled(
      ownedBusinesses.map(async (business) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LISTINGS_REQUEST_TIMEOUT_MS);

        try {
          const response = await fetch(`/api/businesses/${business.id}/events?owner_view=true`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch listings for business ${business.id}`);
          }

          const payload = (await response.json()) as { data?: any[]; error?: string };
          if (payload?.error) {
            throw new Error(payload.error);
          }
          const entries = Array.isArray(payload?.data) ? payload.data : [];

          return entries.map((entry: any): OwnerListing => ({
            id: String(entry.id),
            title: typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : "Untitled listing",
            type: entry.type === "special" ? "special" : "event",
            businessId: business.id,
            businessName: business.name,
            startDate: typeof entry.startDate === "string" ? entry.startDate : null,
            endDate: typeof entry.endDate === "string" ? entry.endDate : null,
            location:
              typeof entry.location === "string" && entry.location.trim()
                ? entry.location
                : business.location || "Location TBD",
            description: typeof entry.description === "string" ? entry.description : null,
          }));
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error(`Listings request timed out for business ${business.id}`);
          }
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      }),
    );

    const items: OwnerListing[] = [];
    let failedCount = 0;

    for (const result of results) {
      if (result.status === "fulfilled") {
        items.push(...result.value);
      } else {
        failedCount += 1;
      }
    }

    items.sort((a, b) => {
      const left = parseDate(a.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const right = parseDate(b.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    });

    return { items, failedCount };
  }, []);

  const loadOwnerDashboardData = useCallback(
    async (ownerId: string, showLoading = true) => {
      if (!ownerId) {
        setError("Couldn't load businesses. Please try again.");
        setIsLoading(false);
        return;
      }
      if (isFetchingRef.current && !showLoading) {
        return;
      }

      isFetchingRef.current = true;
      fetchCallCountRef.current += 1;
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[my-businesses] fetch call #${fetchCallCountRef.current}`, { ownerId, showLoading });
      }

      if (showLoading) setIsLoading(true);
      setError(null);
      setListingsWarning(null);

      // Phase 1: Fetch businesses (blocking — clears isLoading when done)
      let transformedBusinesses: Business[] = [];
      try {
        const ownedBusinesses = await withTimeout(
          BusinessOwnershipService.getBusinessesForOwner(ownerId),
          OWNER_DATA_REQUEST_TIMEOUT_MS,
          "Timed out while loading businesses",
        );
        transformedBusinesses = toBusinessCardData(ownedBusinesses);
        setBusinesses(transformedBusinesses);
      } catch (err) {
        console.error("Error fetching owner businesses:", err);
        setBusinesses([]);
        setOwnerListings([]);
        setError("Couldn't load businesses. Please try again.");
        isFetchingRef.current = false;
        if (showLoading) setIsLoading(false);
        return;
      }

      // Unblock page render — businesses are loaded
      if (showLoading) setIsLoading(false);

      // Phase 2: Fetch listings (non-blocking — page is already visible)
      try {
        const { items, failedCount } = await withTimeout(
          fetchOwnerListings(transformedBusinesses),
          OWNER_DATA_REQUEST_TIMEOUT_MS,
          "Timed out while loading listings",
        );
        setOwnerListings(items);

        if (failedCount > 0) {
          setListingsWarning("Some business listings could not be loaded. Showing the available results.");
        }
      } catch (err) {
        console.error("Error fetching owner listings:", err);
        setOwnerListings([]);
        setListingsWarning("Could not load events & specials. They will appear on your next visit.");
      } finally {
        isFetchingRef.current = false;
      }
    },
    [fetchOwnerListings],
  );

  // Initial load
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    void loadOwnerDashboardData(user.id, true);
  }, [authLoading, user?.id, loadOwnerDashboardData]);

  // Refetch on focus / tab visibility
  useEffect(() => {
    if (!user?.id) return;

    const refetch = async () => {
      await loadOwnerDashboardData(user.id, false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
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
  }, [user?.id, loadOwnerDashboardData]);

  useEffect(() => {
    const isBlockingState = authLoading || isLoading;
    if (!isBlockingState) return;

    const timeoutId = window.setTimeout(() => {
      console.error("[my-businesses] loading watchdog exceeded", {
        userId: user?.id ?? null,
        authLoading,
        isLoading,
        fetchCalls: fetchCallCountRef.current,
      });
      setError("Couldn't load businesses. Please try again.");
      setIsLoading(false);
    }, LOADING_WATCHDOG_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authLoading, isLoading, user?.id]);

  // Keep business filter valid if a business is removed
  useEffect(() => {
    if (listingsBusinessFilter === "all") return;
    const stillExists = businesses.some((business) => business.id === listingsBusinessFilter);
    if (!stillExists) {
      setListingsBusinessFilter("all");
    }
  }, [businesses, listingsBusinessFilter]);

  // Listen for business deletion events
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    import("../lib/utils/businessUpdateEvents")
      .then(({ businessUpdateEvents }) => {
        unsubscribe = businessUpdateEvents.onDelete((deletedBusinessId: string) => {
          setBusinesses((prev) => prev.filter((business) => business.id !== deletedBusinessId));
          setOwnerListings((prev) => prev.filter((listing) => listing.businessId !== deletedBusinessId));
        });
      })
      .catch((err) => {
        console.error("Error loading business update events:", err);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const listingCounts = useMemo(() => {
    let event = 0;
    let special = 0;
    for (const listing of ownerListings) {
      if (listing.type === "event") event += 1;
      if (listing.type === "special") special += 1;
    }
    return {
      all: ownerListings.length,
      event,
      special,
    };
  }, [ownerListings]);

  const filteredOwnerListings = useMemo(() => {
    return ownerListings.filter((listing) => {
      const matchesType = listingsTypeFilter === "all" || listing.type === listingsTypeFilter;
      const matchesBusiness = listingsBusinessFilter === "all" || listing.businessId === listingsBusinessFilter;
      return matchesType && matchesBusiness;
    });
  }, [ownerListings, listingsTypeFilter, listingsBusinessFilter]);

  const selectedBusinessName = useMemo(() => {
    if (listingsBusinessFilter === "all") return "all businesses";
    return businesses.find((business) => business.id === listingsBusinessFilter)?.name || "selected business";
  }, [businesses, listingsBusinessFilter]);

  const handleRetry = useCallback(() => {
    if (!user?.id) {
      router.push("/login");
      return;
    }
    void loadOwnerDashboardData(user.id, true);
  }, [loadOwnerDashboardData, router, user?.id]);

  if ((authLoading || isLoading) && !error) {
    return (
      <div className="min-h-dvh bg-off-white">
        <main>
          <div className="mx-auto w-full max-w-[2000px] px-2">
            <nav className="py-1" aria-label="Breadcrumb">
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

  if (!user) {
    router.push("/login");
    return null;
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-off-white">
        <main>
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-charcoal/70">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-card-bg text-white text-body font-semibold rounded-full hover:bg-card-bg/90 transition-all duration-300"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">
      <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
        <main>
          <div className="mx-auto w-full max-w-[2000px] px-2">
            {(!businesses || businesses.length === 0) && (
              <div className="relative z-10 min-h-[calc(100vh-200px)] flex items-center justify-center">
                <div className="mx-auto w-full max-w-[2000px] px-2 font-urbanist">
                  <div className="text-center w-full">
                    <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                      <Store className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                    </div>

                    <h3 className="text-h2 font-semibold text-charcoal mb-2">No businesses yet</h3>

                    <p className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto" style={{ fontWeight: 500 }}>
                      Add your business to manage it here
                    </p>

                    <button
                      onClick={() => router.push("/add-business")}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-card-bg text-white text-body font-semibold rounded-full hover:bg-card-bg/90 transition-all duration-300"
                    >
                      Add your business
                    </button>
                  </div>
                </div>
              </div>
            )}

            {businesses && businesses.length > 0 && (
              <>
                <motion.nav
                  className="pt-2 px-2"
                  aria-label="Breadcrumb"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ol className="flex items-center gap-2 text-sm sm:text-base">
                    <li>
                      <Link href={previousHref} className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: FONT_STACK }}>
                        {previousLabel}
                      </Link>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-charcoal/60" />
                    </li>
                    <li>
                      <span className="text-charcoal font-semibold" style={{ fontFamily: FONT_STACK }}>
                        My Businesses
                      </span>
                    </li>
                  </ol>
                </motion.nav>

                <motion.div
                  className="mb-6 sm:mb-8 px-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <h1 className="text-h2 sm:text-h1 font-bold text-charcoal" style={{ fontFamily: FONT_STACK }}>
                    My Businesses
                  </h1>
                  <p className="text-body-sm text-charcoal/60 mt-2" style={{ fontFamily: FONT_STACK }}>
                    {businesses.length} {businesses.length === 1 ? "business" : "businesses"} to manage
                  </p>
                </motion.div>

                {/* Two-column layout: table (left) + Events & Specials sidebar (right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8 pb-4">
                  {/* Left: My Businesses table (~65–75%) */}
                  <motion.div
                    className="relative z-10 lg:col-span-8 min-w-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <MyBusinessesTable businesses={businesses} />
                  </motion.div>

                  {/* Right: Events & Specials sidebar (~25–35%), sticky on desktop */}
                  <motion.aside
                    className="lg:col-span-4 w-full lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] flex flex-col min-h-0 mt-8 lg:mt-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    aria-label="My Events & Specials"
                  >
                    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] border border-white/60 shadow-md flex flex-col min-h-0 h-full overflow-hidden">
                      {/* Stack 1: Header (title, subtitle, buttons) */}
                      <div className="flex-shrink-0 p-4 pb-3 border-b border-charcoal/10 space-y-3">
                        <div className="space-y-1">
                          <h2 className="text-h3 font-semibold text-charcoal" style={{ fontFamily: FONT_STACK }}>
                            My Events & Specials
                          </h2>
                          <p className="text-body-sm text-charcoal/70" style={{ fontFamily: FONT_STACK }}>
                            {filteredOwnerListings.length} shown across {selectedBusinessName}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link
                            href="/add-event"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-navbar-bg text-white text-sm font-semibold hover:bg-navbar-bg/90 transition-colors w-full sm:w-auto"
                            style={{ fontFamily: FONT_STACK }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Event
                          </Link>
                          <Link
                            href="/add-special"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-coral text-white text-sm font-semibold hover:bg-coral/90 transition-colors w-full sm:w-auto"
                            style={{ fontFamily: FONT_STACK }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Special
                          </Link>
                        </div>
                      </div>

                      {/* Stack 2: Tabs row (segmented control, full width) */}
                      <div className="flex-shrink-0 px-4 pt-3">
                        <div
                          className="grid grid-cols-3 w-full rounded-full bg-white/80 border border-white/70 p-1 gap-0"
                          role="tablist"
                          aria-label="Filter by type"
                        >
                          {(
                            [
                              { key: "all", label: "All", count: listingCounts.all },
                              { key: "event", label: "Events", count: listingCounts.event },
                              { key: "special", label: "Specials", count: listingCounts.special },
                            ] as const
                          ).map((filter) => {
                            const active = listingsTypeFilter === filter.key;
                            return (
                              <button
                                key={filter.key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setListingsTypeFilter(filter.key)}
                                className={`px-2 py-2 rounded-full text-xs font-semibold transition-colors truncate ${
                                  active ? "bg-navbar-bg text-white" : "text-charcoal/70 hover:text-charcoal"
                                }`}
                                style={{ fontFamily: FONT_STACK }}
                              >
                                {filter.label} ({filter.count})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Stack 3: Business filter block */}
                      <div className="flex-shrink-0 px-4 pt-3 space-y-2">
                        <label htmlFor="business-listing-filter" className="block text-xs font-medium text-charcoal/70" style={{ fontFamily: FONT_STACK }}>
                          Business
                        </label>
                        <select
                          id="business-listing-filter"
                          value={listingsBusinessFilter}
                          onChange={(event) => setListingsBusinessFilter(event.target.value)}
                          className="w-full bg-white/95 border border-white/60 rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-navbar-bg/30"
                          style={{ fontFamily: FONT_STACK }}
                        >
                          <option value="all">All businesses</option>
                          {businesses.map((business) => (
                            <option key={business.id} value={business.id}>
                              {business.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {listingsWarning ? (
                        <div className="flex-shrink-0 px-4 pt-3">
                          <div className="rounded-lg border border-coral/20 bg-coral/5 px-3 py-2 text-xs text-charcoal/80" style={{ fontFamily: FONT_STACK }}>
                            {listingsWarning}
                          </div>
                        </div>
                      ) : null}

                      {/* Stack 4: Scrollable content area */}
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-3">
                        {ownerListings.length === 0 ? (
                          <div className="rounded-[12px] border border-white/70 bg-white/70 p-5 py-8 text-center">
                            <p className="text-charcoal/80 font-semibold text-sm" style={{ fontFamily: FONT_STACK }}>
                              No events or specials yet.
                            </p>
                            <p className="text-xs text-charcoal/65 mt-1.5" style={{ fontFamily: FONT_STACK }}>
                              Create an event or special and it will appear here.
                            </p>
                          </div>
                        ) : filteredOwnerListings.length === 0 ? (
                          <div className="rounded-[12px] border border-white/70 bg-white/70 p-5 py-8 text-center">
                            <p className="text-charcoal/80 font-semibold text-sm" style={{ fontFamily: FONT_STACK }}>
                              No listings match your selected filters.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredOwnerListings.map((listing) => (
                              <article key={listing.id} className="rounded-[12px] border border-white/70 bg-white/85 backdrop-blur-sm p-3 flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                      listing.type === "event" ? "bg-navbar-bg/10 text-navbar-bg" : "bg-coral/10 text-coral"
                                    }`}
                                    style={{ fontFamily: FONT_STACK }}
                                  >
                                    {listing.type === "event" ? <CalendarDays className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                    {listing.type === "event" ? "Event" : "Special"}
                                  </span>
                                  <span className="text-xs text-charcoal/60 truncate max-w-[50%]" style={{ fontFamily: FONT_STACK }}>
                                    {listing.businessName}
                                  </span>
                                </div>

                                <h3 className="text-sm font-semibold text-charcoal line-clamp-1" style={{ fontFamily: FONT_STACK }}>
                                  {listing.title}
                                </h3>
                                {listing.description ? (
                                  <p className="text-xs text-charcoal/70 line-clamp-2" style={{ fontFamily: FONT_STACK }}>
                                    {listing.description}
                                  </p>
                                ) : null}

                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs text-charcoal/70" style={{ fontFamily: FONT_STACK }}>
                                    <Clock3 className="w-3.5 h-3.5 text-charcoal/50 flex-shrink-0" />
                                    <span className="truncate">{formatDateRange(listing.startDate, listing.endDate)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-charcoal/70" style={{ fontFamily: FONT_STACK }}>
                                    <MapPin className="w-3.5 h-3.5 text-charcoal/50 flex-shrink-0" />
                                    <span className="line-clamp-1">{listing.location}</span>
                                  </div>
                                </div>

                                <Link
                                  href={getListingDetailHref(listing)}
                                  className="inline-flex items-center justify-center w-full px-3 py-2 rounded-full bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 transition-colors mt-1"
                                  style={{ fontFamily: FONT_STACK }}
                                >
                                  View details
                                </Link>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.aside>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
