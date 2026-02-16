"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, FileCheck, Filter } from "lucide-react";

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

export default function AdminClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [methodFilter, setMethodFilter] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (methodFilter) params.set("method", methodFilter);
    params.set("limit", "50");

    fetch(`/api/admin/claims?${params.toString()}`)
      .then((res) => {
        if (res.status === 403) {
          router.replace("/");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load claims");
        return res.json();
      })
      .then((data) => {
        if (data?.claims) setClaims(data.claims);
      })
      .catch((err) => setError(err.message || "Something went wrong"))
      .finally(() => setLoading(false));
  }, [router, statusFilter, methodFilter]);

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-charcoal mb-6" style={{ fontFamily: "'Urbanist', sans-serif" }}>
          Business Claims
        </h1>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-charcoal/60" />
            <span className="text-sm text-charcoal/70">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-charcoal/20 bg-white px-3 py-2 text-sm text-charcoal"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="action_required">Action required</option>
              <option value="under_review">Under review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-charcoal/70">Method</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-lg border border-charcoal/20 bg-white px-3 py-2 text-sm text-charcoal"
            >
              <option value="">All</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="cipc">CIPC</option>
              <option value="documents">Documents</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sage" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-coral/10 border border-coral/20 text-coral px-4 py-3">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-xl border border-charcoal/10 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-charcoal/10 bg-charcoal/5">
                    <th className="px-4 py-3 text-sm font-semibold text-charcoal">Business</th>
                    <th className="px-4 py-3 text-sm font-semibold text-charcoal">Claimed By</th>
                    <th className="px-4 py-3 text-sm font-semibold text-charcoal">Status</th>
                    <th className="px-4 py-3 text-sm font-semibold text-charcoal">Method</th>
                    <th className="px-4 py-3 text-sm font-semibold text-charcoal">Created</th>
                    <th className="px-4 py-3 text-sm font-semibold text-charcoal w-20" />
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-charcoal/5 hover:bg-charcoal/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/claims/${c.id}`}
                          className="font-medium text-charcoal hover:text-sage"
                        >
                          {c.business_name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal/80">
                        {c.claimant_email ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${
                            c.status === "verified"
                              ? "bg-sage/15 text-sage"
                              : c.status === "rejected"
                                ? "bg-coral/10 text-coral"
                                : c.status === "under_review"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-charcoal/10 text-charcoal"
                          }`}
                        >
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal/80">
                        {c.method_attempted ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal/70">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/claims/${c.id}`}
                          className="text-sm font-medium text-sage hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {claims.length === 0 && (
              <div className="py-12 text-center text-charcoal/60">
                <FileCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                No claims match the filters.
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
