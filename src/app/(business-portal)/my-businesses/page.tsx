"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "../../contexts/AuthContext";
import { getBrowserSupabase } from "@/app/lib/supabase/client";
import { useOwnerBusinessesList } from "../../hooks/useOwnerBusinessesList";
import SkeletonList from "../../components/shared/skeletons/SkeletonList";

import {
  Store,
  CalendarDays,
  Sparkles,
  Clock3,
  MapPin,
  Plus,
  Loader2,
} from "lucide-react";
import type { Business } from "../../components/BusinessCard/BusinessCard";
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

const LISTINGS_REQUEST_TIMEOUT_MS = 7000;
const ICON_CHIP_BASE_CLASS =
  "rounded-full bg-off-white/70 text-charcoal/85 flex items-center justify-center transition-colors hover:bg-off-white/90";

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
  return `${start} to ${formatDateDisplay(endDate)}`;
}

function getListingDetailHref(listing: OwnerListing): string {
  return listing.type === "special" ? `/special/${listing.id}` : `/event/${listing.id}`;
}

export default function MyBusinessesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const { businesses, isLoading: businessesLoading, error: businessesError, refetch: refetchBusinesses } =
    useOwnerBusinessesList(authLoading ? null : user?.id);
  const [ownerListings, setOwnerListings] = useState<OwnerListing[]>([]);
  const [listingsTypeFilter, setListingsTypeFilter] = useState<ListingTypeFilter>("all");
  const [listingsBusinessFilter, setListingsBusinessFilter] = useState<string>("all");
  const [listingsFetching, setListingsFetching] = useState(false);
  const [listingsWarning, setListingsWarning] = useState<string | null>(null);
  const listingsFetchedForRef = useRef<string | null>(null);

  const fetchOwnerListings = useCallback(async (ownedBusinesses: Business[], userId: string): Promise<OwnerListingsFetchResult> => {
    const allPromises: Promise<OwnerListing[]>[] = [];

    if (ownedBusinesses.length > 0) {
      allPromises.push(
        ...ownedBusinesses.map(async (business) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), LISTINGS_REQUEST_TIMEOUT_MS);
          try {
            const response = await fetch(`/api/businesses/${business.id}/events?owner_view=true`, {
              cache: "no-store",
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Failed to fetch listings for business ${business.id}`);
            const payload = (await response.json()) as { data?: any[]; error?: string };
            if (payload?.error) throw new Error(payload.error);
            const entries = Array.isArray(payload?.data) ? payload.data : [];
            return entries.map((entry: any): OwnerListing => ({
              id: String(entry.id),
              title: typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : "Untitled listing",
              type: entry.type === "special" ? "special" : "event",
              businessId: business.id,
              businessName: business.name,
              startDate: typeof entry.startDate === "string" ? entry.startDate : null,
              endDate: typeof entry.endDate === "string" ? entry.endDate : null,
              location: typeof entry.location === "string" && entry.location.trim()
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
        })
      );
    }

    allPromises.push(
      (async () => {
        try {
          const supabase = getBrowserSupabase();
          const { data, error } = await supabase
            .from('events_and_specials')
            .select('*')
            .eq('created_by', userId)
            .or('business_id.is.null,is_community_event.eq.true');
          if (error) { console.warn("Error fetching community events:", error); return []; }
          const entries = Array.isArray(data) ? data : [];
          const businessIds = new Set(ownedBusinesses.map(b => b.id));
          return entries
            .filter((entry: any) => !entry.business_id || !businessIds.has(entry.business_id))
            .map((entry: any): OwnerListing => ({
              id: String(entry.id),
              title: typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : "Untitled listing",
              type: entry.type === "special" ? "special" : "event",
              businessId: entry.business_id || "",
              businessName: entry.business_id ? "Unknown Business" : "Community Event",
              startDate: typeof entry.start_date === "string" ? entry.start_date : null,
              endDate: typeof entry.end_date === "string" ? entry.end_date : null,
              location: typeof entry.location === "string" && entry.location.trim() ? entry.location : "Location TBD",
              description: typeof entry.description === "string" ? entry.description : null,
            }));
        } catch (error) {
          console.warn("Error fetching community events:", error);
          return [];
        }
      })()
    );

    const results = await Promise.allSettled(allPromises);
    const items: OwnerListing[] = [];
    let failedCount = 0;
    for (const result of results) {
      if (result.status === "fulfilled") items.push(...result.value);
      else failedCount += 1;
    }
    items.sort((a, b) => {
      const left = parseDate(a.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const right = parseDate(b.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    });
    return { items, failedCount };
  }, []);

  const isLoading = authLoading || businessesLoading;

  useEffect(() => {
    if (!user?.id || businesses.length === 0) return;
    const userId = user.id;
    const key = businesses.map((b) => b.id).join(',');
    if (listingsFetchedForRef.current === key) return;
    listingsFetchedForRef.current = key;
    setListingsWarning(null);
    fetchOwnerListings(businesses as unknown as Business[], userId)
      .then(({ items, failedCount }) => {
        setOwnerListings(items);
        if (failedCount > 0) setListingsWarning("Some business listings could not be loaded.");
      })
      .catch(() => {
        setOwnerListings([]);
        setListingsWarning("Could not load events & specials.");
      });
  }, [businesses, user?.id, fetchOwnerListings]);

  useEffect(() => {
    if (listingsBusinessFilter === "all") return;
    if (!businesses.some((b) => b.id === listingsBusinessFilter)) setListingsBusinessFilter("all");
  }, [businesses, listingsBusinessFilter]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import("../../lib/utils/businessUpdateEvents")
      .then(({ businessUpdateEvents }) => {
        unsubscribe = businessUpdateEvents.onDelete((deletedBusinessId: string) => {
          setOwnerListings((prev) => prev.filter((l) => l.businessId !== deletedBusinessId));
          listingsFetchedForRef.current = null;
        });
      })
      .catch((err) => console.error("Error loading business update events:", err));
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const listingCounts = useMemo(() => {
    let event = 0, special = 0;
    for (const l of ownerListings) {
      if (l.type === "event") event++;
      if (l.type === "special") special++;
    }
    return { all: ownerListings.length, event, special };
  }, [ownerListings]);

  const filteredOwnerListings = useMemo(() => ownerListings.filter((l) => {
    const matchesType = listingsTypeFilter === "all" || l.type === listingsTypeFilter;
    const matchesBusiness = listingsBusinessFilter === "all" || l.businessId === listingsBusinessFilter;
    return matchesType && matchesBusiness;
  }), [ownerListings, listingsTypeFilter, listingsBusinessFilter]);

  const selectedBusinessName = useMemo(() => {
    if (listingsBusinessFilter === "all") return "all businesses";
    return businesses.find((b) => b.id === listingsBusinessFilter)?.name || "selected business";
  }, [businesses, listingsBusinessFilter]);

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-5 h-5 border-2 border-charcoal/15 border-t-charcoal/60 rounded-full animate-spin" />
          <span className="font-urbanist text-sm text-charcoal/50">Loading…</span>
        </div>
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (businessesError) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm font-urbanist mb-6">
          {businessesError}
        </div>
        <button
          type="button"
          onClick={() => refetchBusinesses()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navbar-bg text-white text-sm font-semibold rounded-xl hover:bg-navbar-bg/90 transition-colors font-urbanist"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className={`w-8 h-8 ${ICON_CHIP_BASE_CLASS}`}>
              <Store className="w-4 h-4" />
            </span>
            <h1 className="font-urbanist text-2xl font-bold text-charcoal tracking-tight">
              My Businesses
            </h1>
            {businesses.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-card-bg/15 text-card-bg text-xs font-bold font-urbanist">
                {businesses.length}
              </span>
            )}
          </div>
          <p className="font-urbanist text-sm text-charcoal/55 ml-7">
            Manage your business listings and events
          </p>
        </div>
        <Link
          href="/add-business"
          className="inline-flex items-center gap-1.5 rounded-xl bg-card-bg text-white px-4 py-2 text-sm font-semibold font-urbanist hover:bg-card-bg/90 transition-colors"
        >
          <span className="w-6 h-6 rounded-full bg-off-white/90 text-charcoal flex items-center justify-center">
            <Plus className="w-3.5 h-3.5" />
          </span>
          Add Business
        </Link>
      </div>

      {/* Empty state */}
      {businesses.length === 0 && ownerListings.length === 0 && (
        <div className="rounded-2xl border border-charcoal/10 bg-white shadow-premium flex flex-col items-center justify-center py-20 gap-3">
          <div className={`w-16 h-16 ${ICON_CHIP_BASE_CLASS}`}>
            <Store className="w-8 h-8" />
          </div>
          <p className="font-urbanist text-base font-semibold text-charcoal/70">
            No businesses or events yet
          </p>
          <p className="font-urbanist text-sm text-charcoal/40">
            Add your business or create an event to get started
          </p>
          <div className="flex gap-3 mt-2">
            <Link
              href="/add-business"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-card-bg text-white text-sm font-semibold rounded-xl hover:bg-card-bg/90 transition-colors font-urbanist"
            >
              Add Business
            </Link>
            <Link
              href="/add-event"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navbar-bg text-white text-sm font-semibold rounded-xl hover:bg-navbar-bg/90 transition-colors font-urbanist"
            >
              Create Event
            </Link>
          </div>
        </div>
      )}

      {/* Main content: businesses table + events sidebar */}
      {(businesses.length > 0 || ownerListings.length > 0) && (
        <div className={businesses.length > 0 ? "grid grid-cols-1 lg:grid-cols-12 lg:gap-6" : "flex justify-center"}>
          {/* Businesses table */}
          {businesses.length > 0 && (
            <div className="lg:col-span-8 min-w-0">
              <MyBusinessesTable businesses={businesses as unknown as Business[]} />
            </div>
          )}

          {/* Events & Specials sidebar */}
          <aside
            className={
              businesses.length > 0
                ? "lg:col-span-4 mt-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-5rem)] flex flex-col min-h-0"
                : "w-full max-w-2xl flex flex-col min-h-0"
            }
            aria-label="My Events & Specials"
          >
            <div className="rounded-2xl border border-charcoal/10 bg-white shadow-premium flex flex-col min-h-0 overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 px-5 py-4 border-b border-charcoal/8 space-y-3">
                <div>
                  <h2 className="font-urbanist text-base font-semibold text-charcoal">
                    Events & Specials
                  </h2>
                  <p className="font-urbanist text-xs text-charcoal/50 mt-0.5">
                    {filteredOwnerListings.length} shown
                    {listingsBusinessFilter !== "all" ? ` for ${selectedBusinessName}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/add-event"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-navbar-bg text-white text-xs font-semibold hover:bg-navbar-bg/90 transition-colors flex-1 font-urbanist"
                  >
                    <span className="w-5 h-5 rounded-full bg-off-white/90 text-charcoal flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </span>
                    Event
                  </Link>
                  <Link
                    href="/add-special"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-coral text-white text-xs font-semibold hover:bg-coral/90 transition-colors flex-1 font-urbanist"
                  >
                    <span className="w-5 h-5 rounded-full bg-off-white/90 text-charcoal flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </span>
                    Special
                  </Link>
                </div>
              </div>

              {/* Type tabs */}
              <div className="flex-shrink-0 px-4 pt-3">
                <div className="grid grid-cols-3 w-full rounded-xl bg-charcoal/5 p-1 gap-0.5" role="tablist">
                  {([
                    { key: "all", label: "All", count: listingCounts.all },
                    { key: "event", label: "Events", count: listingCounts.event },
                    { key: "special", label: "Specials", count: listingCounts.special },
                  ] as const).map((filter) => {
                    const active = listingsTypeFilter === filter.key;
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setListingsTypeFilter(filter.key)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors font-urbanist ${
                          active ? "bg-navbar-bg text-white shadow-sm" : "text-charcoal/60 hover:text-charcoal"
                        }`}
                      >
                        {filter.label} ({filter.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Business filter */}
              {businesses.length > 1 && (
                <div className="flex-shrink-0 px-4 pt-3">
                  <select
                    value={listingsBusinessFilter}
                    onChange={(e) => setListingsBusinessFilter(e.target.value)}
                    className="w-full font-urbanist text-xs text-charcoal bg-white border border-charcoal/15 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-card-bg/30"
                  >
                    <option value="all">All businesses</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {listingsWarning && (
                <div className="flex-shrink-0 px-4 pt-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 font-urbanist">
                    {listingsWarning}
                  </div>
                </div>
              )}

              {/* Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-3">
                {ownerListings.length === 0 ? (
                  <div className="rounded-xl border border-charcoal/8 bg-charcoal/[0.025] px-4 py-8 text-center">
                    <p className="font-urbanist text-sm font-semibold text-charcoal/60">No events or specials yet.</p>
                    <p className="font-urbanist text-xs text-charcoal/40 mt-1">Create one and it will appear here.</p>
                  </div>
                ) : filteredOwnerListings.length === 0 ? (
                  <div className="rounded-xl border border-charcoal/8 bg-charcoal/[0.025] px-4 py-8 text-center">
                    <p className="font-urbanist text-sm font-semibold text-charcoal/60">No listings match your filters.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOwnerListings.map((listing) => (
                      <article key={listing.id} className="rounded-xl border border-charcoal/8 bg-white p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-urbanist ${
                            listing.type === "event" ? "bg-navbar-bg/10 text-navbar-bg" : "bg-coral/10 text-coral"
                          }`}>
                            {listing.type === "event" ? <CalendarDays className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            {listing.type === "event" ? "Event" : "Special"}
                          </span>
                          <span className="text-xs text-charcoal/50 truncate max-w-[50%] font-urbanist">
                            {listing.businessName}
                          </span>
                        </div>
                        <h3 className="font-urbanist text-sm font-semibold text-charcoal line-clamp-1">
                          {listing.title}
                        </h3>
                        {listing.description && (
                          <p className="font-urbanist text-xs text-charcoal/60 line-clamp-2">
                            {listing.description}
                          </p>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-charcoal/60 font-urbanist">
                            <span className="w-6 h-6 rounded-full bg-off-white/70 text-charcoal/85 flex items-center justify-center flex-shrink-0">
                              <Clock3 className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate">{formatDateRange(listing.startDate, listing.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-charcoal/60 font-urbanist">
                            <span className="w-6 h-6 rounded-full bg-off-white/70 text-charcoal/85 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-3.5 h-3.5" />
                            </span>
                            <span className="line-clamp-1">{listing.location}</span>
                          </div>
                        </div>
                        <Link
                          href={getListingDetailHref(listing)}
                          className="inline-flex items-center justify-center w-full px-3 py-1.5 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 transition-colors mt-1 font-urbanist"
                        >
                          View details
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
