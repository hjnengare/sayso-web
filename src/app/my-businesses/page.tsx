"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "../contexts/AuthContext";
import { BusinessOwnershipService } from "../lib/services/businessOwnershipService";
import SkeletonHeader from "../components/shared/skeletons/SkeletonHeader";
import SkeletonList from "../components/shared/skeletons/SkeletonList";

import { ChevronRight, Store, CalendarDays, Sparkles, Clock3, MapPin, Plus } from "lucide-react";
import BusinessCard from "../components/BusinessCard/BusinessCard";
import { motion } from "framer-motion";
import type { Business } from "../components/BusinessCard/BusinessCard";
import Footer from "../components/Footer/Footer";

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

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [ownerListings, setOwnerListings] = useState<OwnerListing[]>([]);
  const [listingsTypeFilter, setListingsTypeFilter] = useState<ListingTypeFilter>("all");
  const [listingsBusinessFilter, setListingsBusinessFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingsWarning, setListingsWarning] = useState<string | null>(null);

  const fetchOwnerListings = useCallback(async (ownedBusinesses: Business[]): Promise<OwnerListingsFetchResult> => {
    if (ownedBusinesses.length === 0) return { items: [], failedCount: 0 };

    const results = await Promise.allSettled(
      ownedBusinesses.map(async (business) => {
        const response = await fetch(`/api/businesses/${business.id}/events?owner_view=true`, { cache: "no-store" });
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
      if (showLoading) setIsLoading(true);
      setError(null);
      setListingsWarning(null);

      try {
        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(ownerId);
        const transformedBusinesses = toBusinessCardData(ownedBusinesses);
        setBusinesses(transformedBusinesses);

        const { items, failedCount } = await fetchOwnerListings(transformedBusinesses);
        setOwnerListings(items);

        if (failedCount > 0) {
          setListingsWarning("Some business listings could not be loaded. Showing the available results.");
        }
      } catch (err) {
        console.error("Error fetching owner dashboard data:", err);
        setError("Failed to load your businesses");
      } finally {
        if (showLoading) setIsLoading(false);
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

  if (authLoading || isLoading) {
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
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage text-white text-body font-semibold rounded-full hover:bg-sage/90 transition-all duration-300"
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
                      <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: FONT_STACK }}>
                        Home
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

                <motion.section
                  className="mt-8 px-2 pb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                >
                  <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] border border-white/60 shadow-md p-4 sm:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-h3 font-semibold text-charcoal" style={{ fontFamily: FONT_STACK }}>
                          My Events & Specials
                        </h2>
                        <p className="text-body-sm text-charcoal/70 mt-1" style={{ fontFamily: FONT_STACK }}>
                          {filteredOwnerListings.length} shown across {selectedBusinessName}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href="/add-event"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navbar-bg text-white text-sm font-semibold hover:bg-navbar-bg/90 transition-colors"
                          style={{ fontFamily: FONT_STACK }}
                        >
                          <Plus className="w-4 h-4" />
                          Add Event
                        </Link>
                        <Link
                          href="/add-special"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral text-white text-sm font-semibold hover:bg-coral/90 transition-colors"
                          style={{ fontFamily: FONT_STACK }}
                        >
                          <Plus className="w-4 h-4" />
                          Add Special
                        </Link>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="inline-flex items-center rounded-full bg-white/80 border border-white/70 p-1">
                        {(
                          [
                            { key: "all", label: `All (${listingCounts.all})` },
                            { key: "event", label: `Events (${listingCounts.event})` },
                            { key: "special", label: `Specials (${listingCounts.special})` },
                          ] as const
                        ).map((filter) => {
                          const active = listingsTypeFilter === filter.key;
                          return (
                            <button
                              key={filter.key}
                              type="button"
                              onClick={() => setListingsTypeFilter(filter.key)}
                              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                active ? "bg-navbar-bg text-white font-semibold" : "text-charcoal/70 hover:text-charcoal"
                              }`}
                              style={{ fontFamily: FONT_STACK }}
                            >
                              {filter.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <label htmlFor="business-listing-filter" className="text-sm text-charcoal/70" style={{ fontFamily: FONT_STACK }}>
                          Business
                        </label>
                        <select
                          id="business-listing-filter"
                          value={listingsBusinessFilter}
                          onChange={(event) => setListingsBusinessFilter(event.target.value)}
                          className="bg-white/95 border border-white/60 rounded-full px-4 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-navbar-bg/30"
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
                    </div>

                    {listingsWarning ? (
                      <div className="mt-4 rounded-[10px] border border-coral/20 bg-coral/5 px-3 py-2 text-sm text-charcoal/80" style={{ fontFamily: FONT_STACK }}>
                        {listingsWarning}
                      </div>
                    ) : null}

                    {ownerListings.length === 0 ? (
                      <div className="mt-5 rounded-[12px] border border-white/70 bg-white/70 p-5 text-center">
                        <p className="text-charcoal/80 font-semibold" style={{ fontFamily: FONT_STACK }}>
                          No events or specials yet.
                        </p>
                        <p className="text-sm text-charcoal/65 mt-1" style={{ fontFamily: FONT_STACK }}>
                          Create an event or special and it will appear here.
                        </p>
                      </div>
                    ) : filteredOwnerListings.length === 0 ? (
                      <div className="mt-5 rounded-[12px] border border-white/70 bg-white/70 p-5 text-center">
                        <p className="text-charcoal/80 font-semibold" style={{ fontFamily: FONT_STACK }}>
                          No listings match your selected filters.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredOwnerListings.map((listing) => (
                          <article key={listing.id} className="rounded-[12px] border border-white/70 bg-white/85 backdrop-blur-sm p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  listing.type === "event" ? "bg-navbar-bg/10 text-navbar-bg" : "bg-coral/10 text-coral"
                                }`}
                                style={{ fontFamily: FONT_STACK }}
                              >
                                {listing.type === "event" ? <CalendarDays className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {listing.type === "event" ? "Event" : "Special"}
                              </span>
                              <span className="text-xs text-charcoal/60" style={{ fontFamily: FONT_STACK }}>
                                {listing.businessName}
                              </span>
                            </div>

                            <div>
                              <h3 className="text-base font-semibold text-charcoal line-clamp-1" style={{ fontFamily: FONT_STACK }}>
                                {listing.title}
                              </h3>
                              {listing.description ? (
                                <p className="text-sm text-charcoal/70 mt-1 line-clamp-2" style={{ fontFamily: FONT_STACK }}>
                                  {listing.description}
                                </p>
                              ) : null}
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm text-charcoal/70" style={{ fontFamily: FONT_STACK }}>
                                <Clock3 className="w-4 h-4 text-charcoal/50" />
                                <span>{formatDateRange(listing.startDate, listing.endDate)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-charcoal/70" style={{ fontFamily: FONT_STACK }}>
                                <MapPin className="w-4 h-4 text-charcoal/50" />
                                <span className="line-clamp-1">{listing.location}</span>
                              </div>
                            </div>

                            <div className="pt-1 mt-auto">
                              <Link
                                href={getListingDetailHref(listing)}
                                className="inline-flex items-center justify-center w-full px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors"
                                style={{ fontFamily: FONT_STACK }}
                              >
                                View details
                              </Link>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.section>
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
