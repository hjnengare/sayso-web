import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/admin";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { normalizeReviewPreviewText } from "@/app/lib/utils/reviewPreview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ReviewPreviewPayload {
  businessId: string;
  content: string;
  rating: number | null;
  createdAt: string | null;
}

function toBusinessIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  ).slice(0, 100);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const businessIds = toBusinessIds((body as { businessIds?: unknown }).businessIds);

  if (businessIds.length === 0) {
    return NextResponse.json({ previews: {} });
  }

  const previews: Record<string, ReviewPreviewPayload | null> = {};
  for (const id of businessIds) {
    previews[id] = null;
  }

  try {
    let supabase;
    try {
      supabase = getServiceSupabase();
    } catch {
      supabase = await getServerSupabase();
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("business_id, content, rating, created_at")
      .in("business_id", businessIds)
      .not("content", "is", null)
      .order("rating", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[REVIEWS PREVIEW] Failed to fetch previews:", error);
      return NextResponse.json({ previews });
    }

    const assignedBusinessIds = new Set<string>();

    for (const row of data || []) {
      const businessId = row.business_id as string;
      if (!businessId || assignedBusinessIds.has(businessId)) continue;

      const content = normalizeReviewPreviewText(row.content);
      if (!content) continue;

      previews[businessId] = {
        businessId,
        content,
        rating: typeof row.rating === "number" ? row.rating : null,
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
      };
      assignedBusinessIds.add(businessId);
    }

    return NextResponse.json({ previews });
  } catch (error) {
    console.error("[REVIEWS PREVIEW] Unexpected error:", error);
    return NextResponse.json({ previews });
  }
}
