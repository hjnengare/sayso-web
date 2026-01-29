import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const distanceKmParam = searchParams.get("distanceKm");
    const minRatingParam = searchParams.get("minRating");
    const offsetParam = searchParams.get("offset") || "0";
    const limitParam = searchParams.get("limit") || "20";

    if (!query) {
      return NextResponse.json({
        results: [],
        meta: {
          query: null,
          distanceKm: null,
          minRating: null,
        },
      });
    }

    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 5), 50);
    const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);
    const distanceKm = distanceKmParam ? parseFloat(distanceKmParam) : null;
    const minRating = minRatingParam ? parseFloat(minRatingParam) : null;

    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("businesses")
      .select(`
        id,
        slug,
        name,
        category,
        location,
        address,
        phone,
        email,
        website,
        image_url,
        description,
        price_range,
        verified,
        badge,
        business_stats (average_rating)
      `)
      .eq("status", "active")
      .or(`name.ilike.%${query}%, description.ilike.%${query}%, category.ilike.%${query}%, location.ilike.%${query}%`)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Live search error:", error);
      return NextResponse.json(
        { error: "Failed to search businesses" },
        { status: 500 }
      );
    }

    const filtered = (data || []).filter((business) => {
      if (minRating) {
        const rating = business.business_stats?.average_rating;
        if (typeof rating !== "number" || rating < minRating) {
          return false;
        }
      }
      return true;
    });

    const results = filtered.map((business) => ({
      id: business.id,
      slug: business.slug,
      name: business.name,
      category: business.category,
      location: business.location,
      address: business.address,
      phone: business.phone,
      email: business.email,
      website: business.website,
      image_url: business.image_url,
      description: business.description,
      price_range: business.price_range,
      verified: business.verified,
      badge: business.badge,
      rating: business.business_stats?.average_rating ?? null,
      stats: {
        average_rating: business.business_stats?.average_rating ?? 0,
      },
    }));

    return NextResponse.json(
      {
        results,
        meta: {
          query,
          distanceKm,
          minRating,
          distanceFilterSupported: false, // TODO: wire up real geo filtering once coordinates are stored
          total: results.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Live search route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
