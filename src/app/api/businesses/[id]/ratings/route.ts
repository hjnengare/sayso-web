import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ rating: 0, total_reviews: 0 }, { status: 200 });
  }

  try {
    const supabase = await getServerSupabase(req);
    const { data, error } = await supabase
      .from("reviews")
      .select("rating", { head: false })
      .eq("business_id", id);

    if (error) {
      console.error("[businesses/[id]/ratings] query error:", error);
      return NextResponse.json({ rating: 0, total_reviews: 0 }, { status: 200 });
    }

    const ratings = (data ?? []).map((r: any) => Number(r.rating) || 0);
    const total_reviews = ratings.length;
    const rating =
      total_reviews > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / total_reviews
        : 0;

    return NextResponse.json({ rating, total_reviews }, { status: 200 });
  } catch (err) {
    console.error("[businesses/[id]/ratings] unexpected error:", err);
    return NextResponse.json({ rating: 0, total_reviews: 0 }, { status: 200 });
  }
}
