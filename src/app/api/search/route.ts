import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { getCategoryLabelFromBusiness } from "@/app/utils/subcategoryPlaceholders";
import { getInterestIdForSubcategory } from "@/app/lib/onboarding/subcategoryMapping";
import { reRankByContactCompleteness } from "@/app/lib/utils/contactCompleteness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const minRatingParam = searchParams.get("minRating");
    const offsetParam = searchParams.get("offset") || "0";
    const limitParam = searchParams.get("limit") || "20";

    if (!query) {
      return NextResponse.json({
        results: [],
        meta: {
          query: null,
          minRating: null,
        },
      });
    }

    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 5), 50);
    const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);
    const minRating = minRatingParam ? parseFloat(minRatingParam) : null;

    const supabase = await getServerSupabase();

    // Try intelligent search_businesses RPC first (full-text + fuzzy + aliases)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_businesses",
      {
        q: query,
        p_limit: limit,
        p_offset: offset,
        p_verified_only: false,
        p_location: null,
      }
    );

    let results: Array<Record<string, unknown>>;

    if (rpcError) {
      // Fallback to ILIKE if RPC not available
      console.warn("[SEARCH API] RPC fallback:", rpcError.message);

      const { data, error } = await supabase
        .from("businesses")
        .select(
          `id, slug, name, primary_subcategory_slug, primary_subcategory_label, primary_category_slug, location, address, phone, email,
           website, hours, image_url, description, price_range, verified, badge, lat, lng,
           business_stats (average_rating, total_reviews)`
        )
        .eq("status", "active")
        .or(
          `name.ilike.%${query}%, description.ilike.%${query}%, primary_subcategory_slug.ilike.%${query}%, primary_subcategory_label.ilike.%${query}%, location.ilike.%${query}%`
        )
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Live search error:", error);
        return NextResponse.json(
          { error: "Failed to search businesses" },
          { status: 500 }
        );
      }

      results = (data || []).map((business: Record<string, unknown>) => {
        const stats = business.business_stats as
          | Array<{ average_rating: number; total_reviews: number }>
          | undefined;
        const categoryLabel = getCategoryLabelFromBusiness(business);
        const subInterestId = (business.primary_subcategory_slug as string) ?? (business.sub_interest_id as string) ?? undefined;
        const interestId = (business.primary_category_slug as string) ?? (business.interest_id as string) ?? (subInterestId ? getInterestIdForSubcategory(subInterestId) : undefined);
        return {
          id: business.id,
          slug: business.slug,
          name: business.name,
          category: (business.primary_subcategory_slug as string) ?? (business.category as string) ?? undefined,
          category_label: categoryLabel,
          subInterestId,
          subInterestLabel: categoryLabel !== 'Miscellaneous' ? categoryLabel : undefined,
          interestId: interestId || undefined,
          location: business.location,
          address: business.address,
          phone: business.phone,
          email: business.email,
          website: business.website,
          hours: business.hours,
          image_url: business.image_url,
          description: business.description,
          price_range: business.price_range,
          verified: business.verified,
          badge: business.badge,
          lat: (business.lat as number) ?? null,
          lng: (business.lng as number) ?? null,
          reviews: stats?.[0]?.total_reviews ?? 0,
          rating: stats?.[0]?.average_rating ?? null,
          stats: {
            average_rating: stats?.[0]?.average_rating ?? 0,
          },
        };
      });
    } else {
      // RPC returns relevance-ranked results (includes sub_interest_id)
      results = (rpcData || []).map((business: Record<string, unknown>) => {
        const categoryLabel = getCategoryLabelFromBusiness(business);
        const subInterestId = (business.primary_subcategory_slug as string) ?? (business.sub_interest_id as string) ?? undefined;
        const interestId = (business.primary_category_slug as string) ?? (business.interest_id as string) ?? (subInterestId ? getInterestIdForSubcategory(subInterestId) : undefined);
        return {
          id: business.id,
          slug: business.slug,
          name: business.name,
          category: (business.primary_subcategory_slug as string) ?? (business.category as string) ?? undefined,
          category_label: categoryLabel,
          subInterestId,
          subInterestLabel: categoryLabel !== 'Miscellaneous' ? categoryLabel : undefined,
          interestId: interestId || undefined,
          location: business.location,
          address: business.address,
          phone: business.phone,
          email: business.email,
          website: business.website,
          hours: business.hours,
          image_url: business.image_url,
          description: business.description,
          price_range: business.price_range,
          verified: business.verified,
          badge: business.badge,
          lat: ((business.lat as number) ?? (business.latitude as number) ?? null),
          lng: ((business.lng as number) ?? (business.longitude as number) ?? null),
          reviews:
            (business.total_reviews as number) ??
            (business.review_count as number) ??
            0,
          rating: (business.average_rating as number) ?? null,
          stats: {
            average_rating: (business.average_rating as number) ?? 0,
          },
        };
      });
    }

    // Apply minRating filter if provided
    if (minRating) {
      results = results.filter((business) => {
        const rating = (business.stats as { average_rating: number })
          ?.average_rating;
        return typeof rating === "number" && rating >= minRating;
      });
    }

    const rankedResults = reRankByContactCompleteness(
      results as Array<
        Record<string, unknown> & {
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address?: string | null;
          hours?: unknown;
        }
      >,
      { baseRankWeight: 6 }
    );
    const responseResults = rankedResults.map(({ hours: _hours, ...rest }) => rest);

    return NextResponse.json(
      {
        results: responseResults,
        meta: {
          query,
          minRating,
          total: responseResults.length,
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
