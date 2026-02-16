"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CheckCircle,
  XCircle,
  MapPin,
  ExternalLink,
  AlertTriangle,
  FileText,
} from "lucide-react";

const FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

type BusinessDetail = {
  id: string;
  name: string;
  description: string | null;
  primary_subcategory_slug: string | null;
  primary_subcategory_label: string | null;
  primary_category_slug: string | null;
  location: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  uploaded_images: string[] | null;
  price_range: string | null;
  status: string;
  owner_id: string | null;
  owner_email: string | null;
  created_at: string;
  updated_at: string;
  lat: number | null;
  lng: number | null;
  slug: string | null;
  is_chain: boolean;
  normalized_name: string | null;
};

const REJECT_REASONS = [
  { value: "duplicate", label: "Duplicate" },
  { value: "incomplete_information", label: "Incomplete information" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "other", label: "Other" },
] as const;

export default function AdminBusinessReviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCheck, setDuplicateCheck] = useState<{
    checking: boolean;
    available: boolean | null;
  }>({ checking: false, available: null });
  const [action, setAction] = useState<"idle" | "approve" | "disapprove">("idle");
  const [showDisapproveModal, setShowDisapproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectComment, setRejectComment] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/businesses/${id}`)
      .then((res) => {
        if (res.status === 403) {
          router.replace("/");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load business");
        return res.json();
      })
      .then((data) => {
        if (data) setBusiness(data);
      })
      .catch((err) => setError(err.message || "Something went wrong"))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!business?.name || business.is_chain) {
      setDuplicateCheck({ checking: false, available: true });
      return;
    }
    setDuplicateCheck({ checking: true, available: null });
    const t = setTimeout(() => {
      fetch(
        `/api/businesses/check-name?name=${encodeURIComponent(business.name)}&excludeId=${encodeURIComponent(business.id)}`
      )
        .then((r) => r.json())
        .then((d) =>
          setDuplicateCheck({
            checking: false,
            available: d.available ?? true,
          })
        )
        .catch(() =>
          setDuplicateCheck({ checking: false, available: true })
        );
    }, 300);
    return () => clearTimeout(t);
  }, [business?.name, business?.id, business?.is_chain]);

  const formatDate = (s: string | null) =>
    s
      ? new Date(s).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  const hasAddress = Boolean(
    (business?.address && business.address.trim()) ||
      (business?.location && business.location.trim())
  );
  const hasCoords =
    business?.lat != null &&
    business?.lng != null &&
    !Number.isNaN(business.lat) &&
    !Number.isNaN(business.lng);
  const hasCategory = Boolean(
    business?.primary_subcategory_slug || business?.primary_category_slug
  );
  const hasImages = Boolean(
    (business?.image_url && business.image_url.trim()) ||
      (Array.isArray(business?.uploaded_images) &&
        business.uploaded_images.length > 0)
  );
  const possibleTestEntry = /^(e2e\s*)?test\s*business|^sample\s*business$/i.test(
    (business?.name ?? "").trim()
  );
  const canApprove =
    business?.status === "pending_approval" &&
    business.name &&
    hasCategory &&
    hasAddress &&
    hasCoords &&
    duplicateCheck.available !== false &&
    !duplicateCheck.checking &&
    !possibleTestEntry;

  const handleApprove = async () => {
    if (!id || !canApprove) return;
    setAction("approve");
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      router.push("/admin/pending-businesses");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve business"
      );
    } finally {
      setAction("idle");
    }
  };

  const openDisapproveModal = () => {
    setRejectReason("");
    setRejectComment("");
    setShowDisapproveModal(true);
  };

  const handleDisapprove = async () => {
    if (!id || !rejectReason.trim()) {
      setError("Please select a rejection reason.");
      return;
    }
    setAction("disapprove");
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${id}/disapprove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectReason.trim(),
          comment: rejectComment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to disapprove");
      setShowDisapproveModal(false);
      router.push("/admin/pending-businesses");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disapprove business"
      );
    } finally {
      setAction("idle");
    }
  };

  const mapUrl =
    business?.lat != null && business?.lng != null
      ? `https://www.google.com/maps?q=${business.lat},${business.lng}`
      : null;

  if (loading || !business) {
    return (
      <div className="min-h-screen bg-charcoal/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sage" />
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold text-charcoal"
            style={{ fontFamily: FONT }}
          >
            Review Business
          </h1>
          <p
            className="text-sm text-charcoal/60 mt-1"
            style={{ fontFamily: FONT }}
          >
            Validate submission before approval
          </p>
        </div>
        <Link
          href="/admin/pending-businesses"
          className="text-sm font-medium text-charcoal/70 hover:text-charcoal"
          style={{ fontFamily: FONT }}
        >
          ← Back to Pending
        </Link>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm mb-6 flex items-center gap-2"
          style={{ fontFamily: FONT }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section
          className="rounded-[12px] border border-charcoal/15 bg-white p-6"
          style={{ fontFamily: FONT }}
        >
          <h2 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Core Info
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-charcoal/60">Business Name</dt>
              <dd className="font-medium text-charcoal">{business.name}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Category / Subcategory</dt>
              <dd className="text-charcoal">
                {business.primary_subcategory_label ??
                  business.primary_subcategory_slug ??
                  business.primary_category_slug ??
                  "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-charcoal/60">Description</dt>
              <dd className="text-charcoal whitespace-pre-wrap">
                {business.description || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Address / Location</dt>
              <dd className="text-charcoal">
                {business.address || business.location || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Coordinates</dt>
              <dd className="text-charcoal">
                {business.lat != null && business.lng != null
                  ? `${business.lat}, ${business.lng}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Phone</dt>
              <dd className="text-charcoal">{business.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Email</dt>
              <dd className="text-charcoal">{business.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Website</dt>
              <dd className="text-charcoal">
                {business.website ? (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sage hover:underline inline-flex items-center gap-1"
                  >
                    {business.website}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Submitted By</dt>
              <dd className="text-charcoal">{business.owner_email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Submitted Date</dt>
              <dd className="text-charcoal">{formatDate(business.created_at)}</dd>
            </div>
          </dl>
        </section>

        {mapUrl && (
          <section
            className="rounded-[12px] border border-charcoal/15 bg-white p-6"
            style={{ fontFamily: FONT }}
          >
            <h2 className="text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Map Preview
            </h2>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border border-charcoal/15 h-48 bg-charcoal/5 hover:bg-charcoal/10 transition-colors"
            >
              <div className="w-full h-full flex items-center justify-center gap-2 text-sage">
                <MapPin className="w-6 h-6" />
                <span>View on Google Maps</span>
                <ExternalLink className="w-4 h-4" />
              </div>
            </a>
          </section>
        )}

        <section
          className="rounded-[12px] border border-charcoal/15 bg-white p-6"
          style={{ fontFamily: FONT }}
        >
          <h2 className="text-lg font-semibold text-charcoal mb-4">
            Validation Checklist
          </h2>
          <ul className="space-y-3 text-sm">
            <li
              className={
                duplicateCheck.checking
                  ? "text-charcoal/60 flex items-center gap-2"
                  : duplicateCheck.available === false
                    ? "text-red-700 flex items-center gap-2"
                    : "text-sage flex items-center gap-2"
              }
            >
              {duplicateCheck.checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking for duplicates…
                </>
              ) : duplicateCheck.available === false ? (
                <>
                  <XCircle className="w-4 h-4" />
                  Possible duplicate detected. Suggest merge or reject.
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Duplicate check passed
                </>
              )}
            </li>
            <li
              className={
                hasAddress && hasCoords ? "text-sage flex items-center gap-2" : "text-red-700 flex items-center gap-2"
              }
            >
              {hasAddress && hasCoords ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {hasAddress && hasCoords
                ? "Address & coordinates present"
                : "Address or coordinates missing — cannot approve"}
            </li>
            <li
              className={
                hasCategory ? "text-sage flex items-center gap-2" : "text-red-700 flex items-center gap-2"
              }
            >
              {hasCategory ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {hasCategory ? "Category set" : "Category missing"}
            </li>
            <li
              className={
                !possibleTestEntry ? "text-sage flex items-center gap-2" : "text-amber-700 flex items-center gap-2"
              }
            >
              {!possibleTestEntry ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {!possibleTestEntry
                ? "Content moderation passed (no obvious test entries)"
                : "Possible test/fake entry — review before approving"}
            </li>
            <li
              className={
                hasImages ? "text-sage flex items-center gap-2" : "text-amber-700 flex items-center gap-2"
              }
            >
              {hasImages ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {hasImages ? "At least one image" : "No images — consider requesting before approval"}
            </li>
          </ul>
        </section>

        {business.uploaded_images && business.uploaded_images.length > 0 && (
          <section
            className="rounded-[12px] border border-charcoal/15 bg-white p-6"
            style={{ fontFamily: FONT }}
          >
            <h2 className="text-lg font-semibold text-charcoal mb-4">Images</h2>
            <div className="flex flex-wrap gap-4">
              {business.image_url && (
                <img
                  src={business.image_url}
                  alt="Primary"
                  className="w-32 h-32 object-cover rounded-lg border border-charcoal/15"
                />
              )}
              {(business.uploaded_images || []).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Upload ${i + 1}`}
                  className="w-32 h-32 object-cover rounded-lg border border-charcoal/15"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="button"
            onClick={handleApprove}
            disabled={!canApprove || action !== "idle"}
            className="inline-flex items-center gap-2 rounded-full bg-sage text-white px-5 py-2.5 text-sm font-semibold hover:bg-sage/90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: FONT }}
          >
            {action === "approve" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={openDisapproveModal}
            disabled={action !== "idle"}
            className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white text-red-700 px-5 py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
            style={{ fontFamily: FONT }}
          >
            {action === "disapprove" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            Reject
          </button>
        </div>
      </div>

      {showDisapproveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-labelledby="disapprove-title"
        >
          <div
            className="rounded-[12px] border border-charcoal/15 bg-white p-6 max-w-md w-full shadow-lg"
            style={{ fontFamily: FONT }}
          >
            <h2
              id="disapprove-title"
              className="text-lg font-semibold text-charcoal mb-2"
            >
              Reject business
            </h2>
            <p className="text-sm text-charcoal/70 mb-4">
              This business will not go live. Select a reason (required).
            </p>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Reason <span className="text-red-600">*</span>
            </label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm mb-4"
            >
              <option value="">Select a reason…</option>
              {REJECT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Additional comment (optional)
            </label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="e.g. Please add more details and resubmit."
              className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm min-h-[80px]"
              rows={3}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setShowDisapproveModal(false)}
                className="px-4 py-2 text-sm font-medium text-charcoal/80 hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisapprove}
                disabled={!rejectReason.trim() || action === "disapprove"}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {action === "disapprove" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
