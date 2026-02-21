"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Store, Eye, ArrowRight, Clock } from "lucide-react";

type PendingBusiness = {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  primary_subcategory_label: string | null;
  created_at: string;
  owner_id: string | null;
  owner_email?: string;
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

export default function AdminPendingBusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/businesses/pending")
      .then((res) => {
        if (res.status === 403) { router.replace("/"); return null; }
        if (!res.ok) throw new Error("Failed to load pending businesses");
        return res.json();
      })
      .then((data) => { if (data?.businesses) setBusinesses(data.businesses); })
      .catch((err) => setError(err.message || "Something went wrong"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Store className="w-5 h-5 text-amber-600" />
            <h1 className="font-urbanist text-2xl font-bold text-charcoal tracking-tight">
              Pending Businesses
            </h1>
            {businesses.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-amber-100 text-amber-800 text-xs font-bold font-urbanist">
                {businesses.length}
              </span>
            )}
          </div>
          <p className="font-urbanist text-sm text-charcoal/55 ml-7">
            New businesses awaiting approval before going live
          </p>
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
      {!loading && !error && businesses.length === 0 && (
        <div className="rounded-2xl border border-charcoal/10 bg-white shadow-premium flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Store className="w-8 h-8 text-amber-400" />
          </div>
          <p className="font-urbanist text-base font-semibold text-charcoal/70">
            All clear — no pending businesses
          </p>
          <p className="font-urbanist text-sm text-charcoal/40">
            New submissions will appear here
          </p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && businesses.length > 0 && (
        <>
          <div className="hidden sm:block rounded-2xl border border-charcoal/10 bg-white shadow-premium overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-charcoal/8 bg-charcoal/[0.025]">
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Business</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Submitted by</th>
                  <th className="px-5 py-3.5 font-urbanist font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Submitted</th>
                  <th className="px-5 py-3.5 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {businesses.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-charcoal/[0.02] cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/businesses/${b.id}/review`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-urbanist font-semibold text-charcoal">{b.name}</p>
                          {b.location && (
                            <p className="font-urbanist text-xs text-charcoal/45">{b.location}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {b.primary_subcategory_label ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-charcoal/5 text-charcoal/70 text-xs font-medium font-urbanist">
                          {b.primary_subcategory_label}
                        </span>
                      ) : (
                        <span className="text-charcoal/30 font-urbanist">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-urbanist text-sm text-charcoal/70 truncate block max-w-[180px]">
                        {b.owner_email ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-charcoal/50">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-urbanist text-sm">{timeAgo(b.created_at) ?? formatDate(b.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/admin/businesses/${b.id}/review`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-navbar-bg text-white px-4 py-2 text-xs font-semibold font-urbanist hover:bg-navbar-bg/90 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {businesses.map((b) => (
              <Link
                key={b.id}
                href={`/admin/businesses/${b.id}/review`}
                className="group rounded-2xl border border-charcoal/10 bg-white shadow-premium p-4 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Store className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-urbanist font-semibold text-charcoal truncate">{b.name}</p>
                    {b.location && <p className="font-urbanist text-xs text-charcoal/45">{b.location}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {b.primary_subcategory_label && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-charcoal/5 text-charcoal/60 text-xs font-urbanist">
                      {b.primary_subcategory_label}
                    </span>
                  )}
                  <span className="font-urbanist text-xs text-charcoal/45 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(b.created_at) ?? formatDate(b.created_at)}
                  </span>
                </div>
                {b.owner_email && (
                  <p className="font-urbanist text-xs text-charcoal/55 truncate">{b.owner_email}</p>
                )}
                <div className="flex justify-end">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navbar-bg font-urbanist group-hover:gap-2 transition-all">
                    Review <ArrowRight className="w-3.5 h-3.5" />
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
