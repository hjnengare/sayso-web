"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Send,
} from "lucide-react";

type ClaimDetail = {
  claim: {
    id: string;
    business_id: string;
    business_name: string | null;
    business_slug: string | null;
    business_phone: string | null;
    business_email: string | null;
    business_website: string | null;
    claimant_user_id: string;
    claimant_email: string | null;
    status: string;
    method_attempted: string | null;
    verification_data: Record<string, unknown> | null;
    rejection_reason: string | null;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    last_notified_at: string | null;
  };
  events: Array<{ id: string; event_type: string; event_data: unknown; created_at: string; created_by: string | null }>;
  documents: Array<{ id: string; doc_type: string; status: string; uploaded_at: string; delete_after: string }>;
}

export default function AdminClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const claimId = params?.claimId as string;
  const [data, setData] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"idle" | "approve" | "reject" | "request-docs">("idle");
  const [rejectReason, setRejectReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (!claimId) return;
    fetch(`/api/admin/claims/${claimId}`)
      .then((res) => {
        if (res.status === 403) {
          router.replace("/");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load claim");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || "Something went wrong"))
      .finally(() => setLoading(false));
  }, [claimId, router]);

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

  const handleApprove = async () => {
    setAction("approve");
    try {
      const res = await fetch(`/api/businesses/claims/${claimId}/approve`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to approve");
      }
      const d = await fetch(`/api/admin/claims/${claimId}`).then((r) => r.json());
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setAction("idle");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    setAction("reject");
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim(), admin_notes: adminNotes.trim() || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to reject");
      }
      const d = await fetch(`/api/admin/claims/${claimId}`).then((r) => r.json());
      setData(d);
      setRejectReason("");
      setAdminNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setAction("idle");
    }
  };

  const handleRequestDocs = async () => {
    setAction("request-docs");
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/request-docs`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to request documents");
      }
      const d = await fetch(`/api/admin/claims/${claimId}`).then((r) => r.json());
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to request documents");
    } finally {
      setAction("idle");
    }
  };

  const openDoc = async (docId: string) => {
    try {
      const res = await fetch(`/api/admin/docs/${docId}/signed-url`);
      if (!res.ok) throw new Error("Failed to get link");
      const { url } = await res.json();
      if (url) window.open(url, "_blank");
    } catch {
      setError("Could not open document.");
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-[100dvh] bg-charcoal/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sage" />
      </div>
    );
  }

  const { claim, events, documents } = data;
  const canAct = claim.status !== "verified" && claim.status !== "rejected";

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-charcoal" style={{ fontFamily: "'Urbanist', sans-serif" }}>
          Claim: {claim.business_name ?? claim.id}
        </h1>
        {error && (
          <div className="rounded-lg bg-coral/10 border border-coral/20 text-coral px-4 py-3">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-charcoal/10 bg-white p-6">
          <h2 className="text-lg font-semibold text-charcoal mb-4">Summary</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-charcoal/60">Status</dt>
              <dd>
                <span
                  className={`inline-flex px-2 py-1 rounded-full font-medium ${
                    claim.status === "verified"
                      ? "bg-card-bg/15 text-sage"
                      : claim.status === "rejected"
                        ? "bg-coral/10 text-coral"
                        : "bg-charcoal/10 text-charcoal"
                  }`}
                >
                  {claim.status.replace(/_/g, " ")}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Method</dt>
              <dd>{claim.method_attempted ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Claimant email</dt>
              <dd>{claim.claimant_email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Business</dt>
              <dd>
                {claim.business_name ?? "—"}
                {claim.business_slug && (
                  <Link
                    href={`/business/${claim.business_slug}`}
                    className="ml-1 text-sage hover:underline inline-flex items-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Submitted</dt>
              <dd>{formatDate(claim.submitted_at)}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60">Reviewed</dt>
              <dd>{formatDate(claim.reviewed_at)}</dd>
            </div>
          </dl>
          {claim.rejection_reason && (
            <div className="mt-4 pt-4 border-t border-charcoal/10">
              <dt className="text-charcoal/60 text-sm">Rejection reason</dt>
              <dd className="text-charcoal mt-1">{claim.rejection_reason}</dd>
            </div>
          )}
        </section>

        {canAct && (
          <section className="rounded-xl border border-charcoal/10 bg-white p-6">
            <h2 className="text-lg font-semibold text-charcoal mb-4">Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleApprove}
                disabled={action !== "idle"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card-bg text-white font-medium hover:opacity-90 disabled:opacity-50"
              >
                {action === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve
              </button>
              <button
                onClick={handleRequestDocs}
                disabled={action !== "idle"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-charcoal/10 text-charcoal font-medium hover:bg-charcoal/15 disabled:opacity-50"
              >
                {action === "request-docs" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Request documents
              </button>
              <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Rejection reason (required to reject)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Admin notes (optional)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
                />
                <button
                  onClick={handleReject}
                  disabled={action !== "idle" || !rejectReason.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-coral/15 text-coral font-medium hover:bg-coral/20 disabled:opacity-50 w-fit"
                >
                  {action === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
              </div>
            </div>
          </section>
        )}

        {documents.length > 0 && (
          <section className="rounded-xl border border-charcoal/10 bg-white p-6">
            <h2 className="text-lg font-semibold text-charcoal mb-4">Documents</h2>
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-2 border-b border-charcoal/5 last:border-0">
                  <span className="text-sm text-charcoal">
                    {doc.doc_type.replace(/_/g, " ")} — {formatDate(doc.uploaded_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openDoc(doc.id)}
                    className="text-sm font-medium text-sage hover:underline inline-flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-charcoal/10 bg-white p-6">
          <h2 className="text-lg font-semibold text-charcoal mb-4">Timeline</h2>
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="text-sm text-charcoal/80">
                <span className="font-medium text-charcoal">{ev.event_type.replace(/_/g, " ")}</span>
                {" — "}
                {formatDate(ev.created_at)}
              </li>
            ))}
            {events.length === 0 && <li className="text-charcoal/60">No events yet.</li>}
          </ul>
        </section>
      </main>
    </>
  );
}
