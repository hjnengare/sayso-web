"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, FileCheck, ArrowRight, Clock, ChevronDown } from "lucide-react";

type ClaimRow = {
  id: string;
  business_id: string;
  business_name: string | null;
  business_slug: string | null;
  claimant_user_id: string;
  claimant_email: string | null;
  status: string;
  method_attempted: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  verified:       "bg-sage/10 text-sage",
  rejected:       "bg-red-50 text-red-700",
  under_review:   "bg-amber-50 text-amber-700",
  action_required:"bg-orange-50 text-orange-700",
  pending:        "bg-charcoal/8 text-charcoal/70",
};

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function timeAgo(s: string | null) {
  if (!s) return null;
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [methodFilter, setMethodFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (methodFilter) params.set("method", methodFilter);
    params.set("limit", "50");

    fetch(`/api/admin/claims?${params.toString()}`)
      .then((res) => {
        if (res.status === 403) { router.replace("/"); return null; }
        if (!res.ok) throw new Error("Failed to load claims");
        return res.json();
      })
      .then((data) => { if (data?.claims) setClaims(data.claims); })
      .catch((err) => setError(err.message || "Something went wrong"))
      .finally(() => setLoading(false));
  }, [router, statusFilter, methodFilter]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <FileCheck className="w-5 h-5 text-sage" />
            <h1 className="font-urbanist text-2xl font-bold text-charcoal tracking-tight">
              Business Claims
            </h1>
            {claims.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-sage/15 text-sage text-xs font-bold font-urbanist">
                {claims.length}
              </span>
            )}
          </div>
          <p className="font-urbanist text-sm text-charcoal/55 ml-7">
            Review and manage business ownership claim requests
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none font-urbanist text-sm text-charcoal bg-white border border-charcoal/15 rounded-xl pl-4 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-sage/30 shadow-premium cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="action_required">Action required</option>
            <option value="under_review">Under review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/40 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="appearance-none font-urbanist text-sm text-charcoal bg-white border border-charcoal/15 rounded-xl pl-4 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-sage/30 shadow-premium cursor-pointer"
          >
            <option value="">All methods</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="cipc">CIPC</option>
            <option value="documents">Documents</option>
            <option value="manual">Manual</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/40 pointer-events-none" />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-charcoal/30" />
          <span className="font-urbanist text-sm text-charcoal/50">Loading…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm font-urbanist mb-6">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && claims.length === 0 && (
        <div className="rounded-2xl border border-charcoal/10 bg-white shadow-premium flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center">
            <FileCheck className="w-8 h-8 text-sage/60" />
          </div>
          <p className="font-urbanist text-base font-semibold text-charcoal/70">
            No claims match the filters
          </p>
          <p className="font-urbanist text-sm text-charcoal/40">
            Try adjusting the status or method filter above
          </p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && !error && claims.length > 0 && (
        <>
          <div className="hidden sm:block rounded-2xl border border-charcoal/10 bg-white shadow-premium overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-charcoal/8 bg-charcoal/[0.025]">
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Business</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Claimed by</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Method</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Submitted</th>
                  <th className="px-5 py-3.5 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {claims.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-charcoal/[0.02] cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/claims/${c.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0">
                          <FileCheck className="w-4 h-4 text-sage" />
                        </div>
                        <p className="font-urbanist font-semibold text-charcoal">
                          {c.business_name ?? "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-urbanist text-sm text-charcoal/70 truncate block max-w-[180px]">
                        {c.claimant_email ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-urbanist capitalize ${STATUS_STYLES[c.status] ?? "bg-charcoal/8 text-charcoal/70"}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-urbanist text-sm text-charcoal/60 capitalize">
                        {c.method_attempted ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-charcoal/50">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-urbanist text-sm">
                          {timeAgo(c.created_at) ?? formatDate(c.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/admin/claims/${c.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-navbar-bg text-white px-4 py-2 text-xs font-semibold font-urbanist hover:bg-navbar-bg/90 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {claims.map((c) => (
              <Link
                key={c.id}
                href={`/admin/claims/${c.id}`}
                className="group rounded-2xl border border-charcoal/10 bg-white shadow-premium p-4 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-4 h-4 text-sage" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-urbanist font-semibold text-charcoal truncate">
                      {c.business_name ?? "—"}
                    </p>
                    {c.claimant_email && (
                      <p className="font-urbanist text-xs text-charcoal/45 truncate">{c.claimant_email}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold font-urbanist capitalize flex-shrink-0 ${STATUS_STYLES[c.status] ?? "bg-charcoal/8 text-charcoal/70"}`}>
                    {c.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-urbanist text-xs text-charcoal/45 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(c.created_at) ?? formatDate(c.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navbar-bg font-urbanist group-hover:gap-2 transition-all">
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
