import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

type ClaimRow = {
  id: string;
  business_id: string;
  status: string;
  method_attempted: string | null;
  verification_level: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  businesses?: {
    id: string;
    name: string;
    category: string | null;
    location: string | null;
    slug: string | null;
  } | Array<{
    id: string;
    name: string;
    category: string | null;
    location: string | null;
    slug: string | null;
  }> | null;
};

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS });
}

function toDisplayStatus(status: string, methodAttempted: string | null): string {
  if (status === "verified") return "Verified";
  if (status === "rejected") return "Rejected";
  if (status === "action_required") return "Action Required";
  if (status === "under_review") return "Under Review";
  if (status === "pending" || status === "draft") {
    if (methodAttempted === "cipc") return "Under Review";
    if (methodAttempted === "email" || methodAttempted === "phone") return "Action Required";
    return "Pending Verification";
  }
  return "Pending Verification";
}

function getNextStepMessage(status: string, methodAttempted: string | null): string {
  if (status === "verified") return "You can manage your listing in My Businesses.";
  if (status === "rejected") return "Contact support if you believe this was an error.";
  if (status === "action_required") return "Please upload the requested documents or complete the requested step.";
  if (status === "under_review") return "We're reviewing your claim. We'll email you when done.";
  if (status === "pending" || status === "draft") {
    if (methodAttempted === "cipc") return "We're reviewing your CIPC details. We'll email you when done.";
    if (methodAttempted === "phone") return "Check the business phone for an OTP and enter it when prompted.";
    if (methodAttempted === "email") return "Check your business email or complete the next verification step.";
    return "We're checking your details. You may need to complete a verification step.";
  }
  return "";
}

function mapDatabaseErrorToStatus(error: any): number {
  const code = String(error?.code ?? "");
  if (code === "42501") return 403;
  if (code === "22P02" || code === "PGRST100") return 400;
  return 500;
}

function shouldUseFallbackWithoutJoin(error: any): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    message.includes("could not find a relationship") ||
    message.includes("relationship") ||
    message.includes("schema cache") ||
    (message.includes("does not exist") && message.includes("businesses"))
  );
}

async function fetchClaimsWithFallback(supabase: any, userId: string): Promise<{ data: ClaimRow[]; error: any | null }> {
  const baseSelect = `
    id,
    business_id,
    status,
    method_attempted,
    verification_level,
    submitted_at,
    reviewed_at,
    rejection_reason,
    created_at
  `;

  const primary = await supabase
    .from("business_claims")
    .select(
      `${baseSelect},
       businesses!inner (
         id,
         name,
         category,
         location,
         slug
       )`,
    )
    .eq("claimant_user_id", userId)
    .in("status", ["draft", "pending", "action_required", "under_review", "verified", "rejected"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (!primary.error) {
    return { data: (primary.data || []) as ClaimRow[], error: null };
  }

  if (!shouldUseFallbackWithoutJoin(primary.error)) {
    return { data: [], error: primary.error };
  }

  console.warn("[GET /api/business/claims] falling back to non-join query:", primary.error);

  const fallback = await supabase
    .from("business_claims")
    .select(baseSelect)
    .eq("claimant_user_id", userId)
    .in("status", ["draft", "pending", "action_required", "under_review", "verified", "rejected"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (fallback.error) {
    return { data: [], error: fallback.error };
  }

  const claimRows = (fallback.data || []) as ClaimRow[];
  const businessIds = Array.from(new Set(claimRows.map((claim) => claim.business_id).filter(Boolean)));

  if (businessIds.length === 0) {
    return { data: claimRows, error: null };
  }

  const businessesResult = await supabase
    .from("businesses")
    .select("id,name,category,location,slug")
    .in("id", businessIds);

  if (businessesResult.error) {
    console.error("[GET /api/business/claims] fallback business lookup failed:", businessesResult.error);
    return { data: claimRows, error: null };
  }

  const businessMap = new Map<string, any>();
  for (const business of businessesResult.data || []) {
    if (business?.id) {
      businessMap.set(String(business.id), business);
    }
  }

  const enrichedRows: ClaimRow[] = claimRows.map((claim) => ({
    ...claim,
    businesses: businessMap.get(String(claim.business_id)) ?? null,
  }));

  return { data: enrichedRows, error: null };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[GET /api/business/claims] auth error:", authError);
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    if (!user) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const { data: claims, error } = await fetchClaimsWithFallback(supabase, user.id);

    if (error) {
      const status = mapDatabaseErrorToStatus(error);
      console.error("[GET /api/business/claims] claims query failed:", error);

      if (status === 403) {
        return json(
          { success: false, error: "You don't have permission to view claims for this account." },
          403,
        );
      }

      if (status === 400) {
        return json(
          { success: false, error: "Invalid claim query parameters." },
          400,
        );
      }

      return json({ success: false, error: "Failed to fetch claims" }, 500);
    }

    const list = (claims || []).map((claim) => {
      const business = Array.isArray(claim.businesses) ? claim.businesses[0] : claim.businesses;
      return {
        id: claim.id,
        business_id: claim.business_id,
        business_name: business?.name ?? "Unknown",
        business_slug: business?.slug ?? null,
        category: business?.category ?? null,
        location: business?.location ?? null,
        status: claim.status,
        display_status: toDisplayStatus(claim.status, claim.method_attempted),
        method_attempted: claim.method_attempted,
        next_step: getNextStepMessage(claim.status, claim.method_attempted),
        submitted_at: claim.submitted_at,
        reviewed_at: claim.reviewed_at,
        rejection_reason: claim.rejection_reason ?? null,
        created_at: claim.created_at,
      };
    });

    return json({ success: true, claims: list }, 200);
  } catch (error) {
    console.error("[GET /api/business/claims] unexpected error:", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }
}
