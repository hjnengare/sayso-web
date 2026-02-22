"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import {
  Flag,
  ChevronDown,
  Loader2,
  AlertCircle,
  Star,
  Clock,
  ExternalLink,
  CheckCircle,
  Trash2,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FlagReason = "spam" | "inappropriate" | "harassment" | "off_topic" | "other";

type FlagRow = {
  id: string;
  reason: FlagReason;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  review_id: string;
  flagged_by: string;
  total_flags_on_review: number;
  reviews: {
    id: string;
    content: string | null;
    rating: number | null;
    title: string | null;
    created_at: string;
    business_id: string;
    user_id: string;
    businesses: { id: string; name: string; slug: string } | null;
  } | null;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type FlagsResponse = { flags: FlagRow[]; total: number };
type AdminAction = "dismiss" | "remove_review" | "warn";

// ─── Constants ───────────────────────────────────────────────────────────────

const REASON_LABELS: Record<FlagReason, string> = {
  spam: "Spam",
  inappropriate: "Inappropriate",
  harassment: "Harassment",
  off_topic: "Off-topic",
  other: "Other",
};

const REASON_COLORS: Record<FlagReason, string> = {
  spam: "bg-amber-50 text-amber-700",
  inappropriate: "bg-red-50 text-red-700",
  harassment: "bg-red-100 text-red-800",
  off_topic: "bg-charcoal/8 text-charcoal/70",
  other: "bg-charcoal/8 text-charcoal/60",
};

const PAGE_SIZE = 20;

// ─── Fetcher ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < rating ? "fill-amber-400 text-amber-400" : "text-charcoal/20"}`}
        />
      ))}
    </span>
  );
}

// ─── Action Modal ─────────────────────────────────────────────────────────────

function ActionModal({
  flag,
  onClose,
  onDone,
}: {
  flag: FlagRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [action, setAction] = useState<AdminAction | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const business = flag.reviews?.businesses;
  const review = flag.reviews;

  async function handleSubmit() {
    if (!action) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, admin_notes: notes.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to perform action");
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-charcoal/20" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 sm:pt-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-urbanist text-lg font-bold text-charcoal">Moderate Flag</h2>
              {business && (
                <p className="font-urbanist text-sm text-charcoal/50">
                  {business.name}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-charcoal/8 text-charcoal/40 hover:text-charcoal transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Review preview */}
          {review && (
            <div className="rounded-2xl bg-charcoal/[0.035] border border-charcoal/8 p-4 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Stars rating={review.rating} />
                {review.title && (
                  <span className="font-urbanist text-sm font-semibold text-charcoal">{review.title}</span>
                )}
              </div>
              {review.content && (
                <p className="font-urbanist text-sm text-charcoal/70 leading-relaxed line-clamp-4">
                  {review.content}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-urbanist ${REASON_COLORS[flag.reason] ?? "bg-charcoal/8 text-charcoal/60"}`}>
                  {REASON_LABELS[flag.reason] ?? flag.reason}
                </span>
                {flag.total_flags_on_review > 1 && (
                  <span className="font-urbanist text-xs text-red-600 font-semibold">
                    {flag.total_flags_on_review} flags on this review
                  </span>
                )}
                {flag.details && (
                  <span className="font-urbanist text-xs text-charcoal/50 italic">
                    &ldquo;{flag.details}&rdquo;
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action picker */}
          <p className="font-urbanist text-sm font-semibold text-charcoal/60 mb-3 uppercase tracking-wider text-xs">
            Choose action
          </p>
          <div className="flex flex-col gap-2 mb-5">
            {(
              [
                {
                  value: "dismiss" as AdminAction,
                  icon: CheckCircle,
                  label: "Dismiss",
                  desc: "No action needed — false positive",
                  color: "text-sage",
                  activeBg: "border-sage bg-sage/5",
                },
                {
                  value: "warn" as AdminAction,
                  icon: MessageSquare,
                  label: "Warn",
                  desc: "Add an admin note to the flag",
                  color: "text-amber-600",
                  activeBg: "border-amber-400 bg-amber-50/60",
                },
                {
                  value: "remove_review" as AdminAction,
                  icon: Trash2,
                  label: "Remove review",
                  desc: "Delete the review permanently",
                  color: "text-red-600",
                  activeBg: "border-red-400 bg-red-50/60",
                },
              ] as const
            ).map(({ value, icon: Icon, label, desc, color, activeBg }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAction(value)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  action === value
                    ? `${activeBg} border-opacity-100`
                    : "border-charcoal/10 hover:border-charcoal/20 hover:bg-charcoal/[0.025]"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                <div>
                  <p className="font-urbanist text-sm font-semibold text-charcoal">{label}</p>
                  <p className="font-urbanist text-xs text-charcoal/50">{desc}</p>
                </div>
                {action === value && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-charcoal flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white fill-none stroke-white stroke-[1.5]">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Notes (always visible for context, required for warn) */}
          <label className="block mb-5">
            <span className="font-urbanist text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-1.5 block">
              Admin notes {action === "warn" ? "(required)" : "(optional)"}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal note visible only to admins…"
              className="w-full rounded-2xl border border-charcoal/15 bg-charcoal/[0.025] px-4 py-3 font-urbanist text-sm text-charcoal placeholder-charcoal/35 focus:outline-none focus:ring-2 focus:ring-navbar-bg/25 focus:border-navbar-bg/40 resize-none"
            />
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm font-urbanist mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl border border-charcoal/15 font-urbanist text-sm font-semibold text-charcoal/70 hover:bg-charcoal/5 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!action || submitting || (action === "warn" && !notes.trim())}
              className="flex-1 py-3 rounded-2xl bg-navbar-bg font-urbanist text-sm font-semibold text-white hover:bg-navbar-bg/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FlaggedReviewsPage() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(0);
  const [activeFlagId, setActiveFlagId] = useState<string | null>(null);

  const offset = page * PAGE_SIZE;
  const swrKey = `/api/admin/flags?status=${statusFilter}&limit=${PAGE_SIZE}&offset=${offset}`;

  const { data, error, isLoading, mutate } = useSWR<FlagsResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  const flags = data?.flags ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const activeFlag = flags.find((f) => f.id === activeFlagId) ?? null;

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    setPage(0);
  }

  function handleDone() {
    setActiveFlagId(null);
    mutate();
    // Also revalidate pending count used by dashboard
    globalMutate((key: unknown) => typeof key === "string" && key.includes("/api/admin/flags?status=pending"), undefined, { revalidate: true });
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Flag className="w-5 h-5 text-red-500" />
            <h1 className="font-urbanist text-2xl font-bold text-charcoal tracking-tight">
              Flagged Reviews
            </h1>
            {total > 0 && statusFilter === "pending" && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-red-100 text-red-700 text-xs font-bold font-urbanist">
                {total}
              </span>
            )}
          </div>
          <p className="font-urbanist text-sm text-charcoal/55 ml-7">
            Review and moderate flagged content
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="appearance-none font-urbanist text-sm text-charcoal bg-white border border-charcoal/15 rounded-xl pl-4 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-300/40 shadow-premium cursor-pointer"
          >
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/40 pointer-events-none" />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-charcoal/30" />
          <span className="font-urbanist text-sm text-charcoal/50">Loading flags…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm font-urbanist mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load flags. Please refresh.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && flags.length === 0 && (
        <div className="rounded-2xl border border-charcoal/10 bg-white shadow-premium flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <Flag className="w-8 h-8 text-red-300" />
          </div>
          <p className="font-urbanist text-base font-semibold text-charcoal/70">
            No {statusFilter} flags
          </p>
          <p className="font-urbanist text-sm text-charcoal/40">
            {statusFilter === "pending" ? "Nothing needs moderation right now." : "No reviewed flags found."}
          </p>
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && !error && flags.length > 0 && (
        <>
          <div className="hidden sm:block rounded-2xl border border-charcoal/10 bg-white shadow-premium overflow-hidden mb-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-charcoal/8 bg-charcoal/[0.025]">
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Review</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Reason</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Flags</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Reported</th>
                  <th className="px-5 py-3.5 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {flags.map((f) => {
                  const business = f.reviews?.businesses;
                  const review = f.reviews;
                  return (
                    <tr key={f.id} className="hover:bg-charcoal/[0.02] transition-colors">
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Flag className="w-4 h-4 text-red-400" />
                          </div>
                          <div className="min-w-0">
                            {business && (
                              <p className="font-urbanist font-semibold text-charcoal text-sm truncate">
                                {business.name}
                              </p>
                            )}
                            {review?.content && (
                              <p className="font-urbanist text-xs text-charcoal/50 truncate max-w-[220px]">
                                {review.content}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Stars rating={review?.rating ?? null} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-urbanist ${REASON_COLORS[f.reason] ?? "bg-charcoal/8 text-charcoal/60"}`}>
                          {REASON_LABELS[f.reason] ?? f.reason}
                        </span>
                        {f.details && (
                          <p className="font-urbanist text-xs text-charcoal/45 mt-1 max-w-[160px] truncate italic">
                            {f.details}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`font-urbanist text-sm font-bold tabular-nums ${f.total_flags_on_review >= 3 ? "text-red-600" : "text-charcoal/60"}`}>
                          {f.total_flags_on_review}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-charcoal/50">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-urbanist text-sm">{timeAgo(f.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {business && (
                            <Link
                              href={`/businesses/${business.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-charcoal/8 text-charcoal/40 hover:text-charcoal transition-colors"
                              title="View business"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          {statusFilter === "pending" && (
                            <button
                              type="button"
                              onClick={() => setActiveFlagId(f.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-navbar-bg text-white px-4 py-2 text-xs font-semibold font-urbanist hover:bg-navbar-bg/90 transition-colors"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3 mb-4">
            {flags.map((f) => {
              const business = f.reviews?.businesses;
              const review = f.reviews;
              return (
                <div
                  key={f.id}
                  className="rounded-2xl border border-charcoal/10 bg-white shadow-premium p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Flag className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {business && (
                            <p className="font-urbanist font-semibold text-charcoal text-sm truncate">
                              {business.name}
                            </p>
                          )}
                          {review?.content && (
                            <p className="font-urbanist text-xs text-charcoal/50 line-clamp-2 mt-0.5">
                              {review.content}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold font-urbanist flex-shrink-0 ${REASON_COLORS[f.reason] ?? "bg-charcoal/8 text-charcoal/60"}`}>
                          {REASON_LABELS[f.reason] ?? f.reason}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Stars rating={review?.rating ?? null} />
                      <span className="font-urbanist text-xs text-charcoal/45 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(f.created_at)}
                      </span>
                      {f.total_flags_on_review > 1 && (
                        <span className="font-urbanist text-xs text-red-600 font-semibold">
                          {f.total_flags_on_review} flags
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {business && (
                        <Link
                          href={`/businesses/${business.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-charcoal/5 text-charcoal/50 hover:text-charcoal transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      {statusFilter === "pending" && (
                        <button
                          type="button"
                          onClick={() => setActiveFlagId(f.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-navbar-bg text-white px-4 py-2 text-xs font-semibold font-urbanist hover:bg-navbar-bg/90 transition-colors"
                        >
                          Review <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {f.details && (
                    <p className="font-urbanist text-xs text-charcoal/45 italic border-t border-charcoal/5 pt-2">
                      &ldquo;{f.details}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-charcoal/15 px-4 py-2.5 text-sm font-semibold font-urbanist text-charcoal/60 hover:bg-charcoal/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="font-urbanist text-sm text-charcoal/50">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1.5 rounded-xl border border-charcoal/15 px-4 py-2.5 text-sm font-semibold font-urbanist text-charcoal/60 hover:bg-charcoal/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Action modal */}
      {activeFlag && (
        <ActionModal
          flag={activeFlag}
          onClose={() => setActiveFlagId(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
