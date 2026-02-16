"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Store, Eye } from "lucide-react";

const FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

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

export default function AdminPendingBusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = () => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/businesses/pending")
      .then((res) => {
        if (res.status === 403) {
          router.replace("/");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load pending businesses");
        return res.json();
      })
      .then((data) => {
        if (data?.businesses) setBusinesses(data.businesses);
      })
      .catch((err) => setError(err.message || "Something went wrong"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, [router]);

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-charcoal" style={{ fontFamily: FONT }}>
            Pending Businesses
          </h1>
          <p className="text-sm text-charcoal/60 mt-1" style={{ fontFamily: FONT }}>
            New businesses awaiting approval before going live
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-charcoal/70 hover:text-charcoal"
          style={{ fontFamily: FONT }}
        >
          ← Back to Admin
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-charcoal/70 py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span style={{ fontFamily: FONT }}>Loading…</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm mb-6" style={{ fontFamily: FONT }}>
          {error}
        </div>
      )}

      {!loading && !error && businesses.length === 0 && (
        <div className="rounded-lg border border-charcoal/15 bg-off-white/50 p-8 text-center text-charcoal/70" style={{ fontFamily: FONT }}>
          <Store className="w-12 h-12 mx-auto mb-3 text-charcoal/40" />
          <p>No businesses pending approval.</p>
        </div>
      )}

      {!loading && businesses.length > 0 && (
        <div className="rounded-[12px] border border-charcoal/15 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal/15 bg-charcoal/5">
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Name</th>
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Category</th>
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Submitted By</th>
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Date</th>
                <th className="px-4 py-3 font-semibold text-charcoal" style={{ fontFamily: FONT }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-charcoal/10 hover:bg-charcoal/5 cursor-pointer"
                  onClick={() => router.push(`/admin/businesses/${b.id}/review`)}
                >
                  <td className="px-4 py-3 font-medium text-charcoal hover:text-sage transition-colors" style={{ fontFamily: FONT }}>
                    {b.name}
                  </td>
                  <td className="px-4 py-3 text-charcoal/80" style={{ fontFamily: FONT }}>{b.primary_subcategory_label ?? "—"}</td>
                  <td className="px-4 py-3 text-charcoal/80" style={{ fontFamily: FONT }}>{b.owner_email ?? "—"}</td>
                  <td className="px-4 py-3 text-charcoal/70" style={{ fontFamily: FONT }}>{formatDate(b.created_at)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/admin/businesses/${b.id}/review`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sage text-white px-4 py-2 text-sm font-semibold hover:bg-sage/90"
                      style={{ fontFamily: FONT }}
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
