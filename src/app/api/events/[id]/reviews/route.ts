import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  applyAnonymousCookie,
  detectSpamSignals,
  getClientIp,
  getRateLimitWindowStart,
  getUserAgentHash,
  resolveAnonymousId,
} from "@/app/lib/utils/anonymousReviews";

export const dynamic = "force-dynamic";

const isProd = process.env.NODE_ENV === "production";

function logDevError(...args: unknown[]) {
  if (!isProd) {
    console.error(...args);
  }
}

function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function mapReviewRow(row: Record<string, unknown>) {
  const profile = row.profile as Record<string, unknown> | null;
  const isGuest = !row.user_id;

  return {
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id ?? null,
    rating: row.rating,
    title: row.title ?? null,
    content: row.content,
    tags: row.tags ?? [],
    helpful_count: row.helpful_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.user_id ?? null,
      name: isGuest
        ? "Anonymous"
        : (profile?.display_name as string) || (profile?.username as string) || "Anonymous",
      display_name: isGuest
        ? "Anonymous"
        : (profile?.display_name as string) || null,
      username: isGuest ? null : (profile?.username as string) || null,
      email: isGuest ? null : (profile?.email as string) || null,
      avatar_url: isGuest ? null : (profile?.avatar_url as string) || null,
    },
    images: [],
  };
}

async function getProfilesByUserId(
  req: NextRequest,
  userIds: string[],
): Promise<Map<string, Record<string, unknown>>> {
  if (userIds.length === 0) return new Map();

  const supabase = await getServerSupabase(req);
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, email, avatar_url")
    .in("user_id", userIds);

  if (error) {
    logDevError("[events/[id]/reviews] profile query error:", error);
    return new Map();
  }

  const map = new Map<string, Record<string, unknown>>();
  for (const row of data || []) {
    if (row?.user_id) map.set(row.user_id, row as Record<string, unknown>);
  }
  return map;
}

async function fetchEventReviews(req: NextRequest, eventId: string) {
  const supabase = await getServerSupabase(req);
  const { data, error } = await supabase
    .from("event_reviews")
    .select(`
      id,
      event_id,
      user_id,
      guest_name,
      rating,
      title,
      content,
      tags,
      helpful_count,
      created_at,
      updated_at
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    logDevError("[events/[id]/reviews] query error:", error);
    return [];
  }

  const rows = (data || []) as Record<string, unknown>[];
  const userIds = Array.from(
    new Set(
      rows
        .map((row) => row.user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const profilesByUserId = await getProfilesByUserId(req, userIds);

  return rows.map((row) => {
    const userId = typeof row.user_id === "string" ? row.user_id : null;
    const profile = userId ? profilesByUserId.get(userId) ?? null : null;
    return mapReviewRow({ ...row, profile });
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ reviews: [] }, { status: 200 });
    }

    const reviews = await fetchEventReviews(req, id);
    return NextResponse.json({ reviews }, { status: 200 });
  } catch (err) {
    logDevError("[events/[id]/reviews] GET error:", err);
    return NextResponse.json({ reviews: [] }, { status: 200 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json(
        { success: false, code: "MISSING_EVENT_ID", message: "Event ID is required." },
        { status: 400 },
      );
    }

    const supabase = await getServerSupabase(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const isAnonymous = !user || !!authError;
    const { anonymousId, setCookie } = resolveAnonymousId(req);
    const clientIp = getClientIp(req);
    const userAgentHash = getUserAgentHash(req);

    const contentType = req.headers.get("content-type") || "";
    let ratingInput: unknown;
    let commentInput: unknown;
    let titleInput: unknown;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      ratingInput = body?.rating;
      commentInput = body?.comment ?? body?.content;
      titleInput = body?.title;
    } else {
      const formData = await req.formData();
      ratingInput = formData.get("rating");
      commentInput = formData.get("comment") ?? formData.get("content");
      titleInput = formData.get("title");
    }

    const rating = Number.parseInt(String(ratingInput ?? ""), 10);
    const comment = sanitizeText(String(commentInput ?? ""));
    const titleRaw = sanitizeText(String(titleInput ?? ""));
    const title = titleRaw.length > 0 ? titleRaw.slice(0, 100) : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, code: "INVALID_RATING", message: "Rating must be between 1 and 5." },
        { status: 400 },
      );
    }

    if (!comment || comment.length < 10) {
      return NextResponse.json(
        {
          success: false,
          code: "CONTENT_TOO_SHORT",
          message: "Comment must be at least 10 characters.",
        },
        { status: 400 },
      );
    }

    const spamSignals = detectSpamSignals(comment);
    if (spamSignals.includes("contains_link") || spamSignals.includes("excessive_repetition")) {
      return NextResponse.json(
        {
          success: false,
          code: "SPAM_DETECTED",
          message: "Your review looks automated. Please revise and try again.",
        },
        { status: 400 },
      );
    }

    // Ensure event exists in consolidated table (canonical event detail source)
    const { data: eventRecord, error: eventLookupError } = await supabase
      .from("events_and_specials")
      .select("id,type")
      .eq("id", id)
      .eq("type", "event")
      .maybeSingle();

    if (eventLookupError) {
      logDevError("[events/[id]/reviews] event lookup error:", eventLookupError);
      return NextResponse.json(
        { success: false, code: "DB_ERROR", message: "Unable to verify event." },
        { status: 500 },
      );
    }

    if (!eventRecord) {
      return NextResponse.json(
        { success: false, code: "EVENT_NOT_FOUND", message: "Event not found." },
        { status: 404 },
      );
    }

    if (isAnonymous) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const { count: recentCount } = await adminClient
        .from("event_reviews")
        .select("*", { count: "exact", head: true })
        .eq("anonymous_id", anonymousId)
        .gte("created_at", getRateLimitWindowStart());

      if ((recentCount ?? 0) >= 3) {
        return NextResponse.json(
          {
            success: false,
            code: "RATE_LIMITED",
            message: "You reached the anonymous review limit. Try again in about an hour.",
          },
          { status: 429 },
        );
      }

      const { count: duplicateCount } = await adminClient
        .from("event_reviews")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("anonymous_id", anonymousId);

      if ((duplicateCount ?? 0) > 0) {
        return NextResponse.json(
          {
            success: false,
            code: "DUPLICATE_ANON_REVIEW",
            message: "You already posted an anonymous review for this event.",
          },
          { status: 409 },
        );
      }
    }

    const insertClient = isAnonymous
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        )
      : supabase;

    const { data: inserted, error: insertError } = await insertClient
      .from("event_reviews")
      .insert({
        event_id: id,
        user_id: user?.id ?? null,
        rating,
        title,
        content: comment,
        tags: [],
        helpful_count: 0,
        ...(isAnonymous
          ? {
              anonymous_id: anonymousId,
              ip_address: clientIp,
              user_agent_hash: userAgentHash,
            }
          : {}),
      })
      .select(`
        id,
        event_id,
        user_id,
        guest_name,
        rating,
        title,
        content,
        tags,
        helpful_count,
        created_at,
        updated_at
      `)
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            code: "DUPLICATE_REVIEW",
            message: "You have already reviewed this event.",
          },
          { status: 409 },
        );
      }

      logDevError("[events/[id]/reviews] insert error:", insertError);
      return NextResponse.json(
        { success: false, code: "DB_ERROR", message: "Unable to create review." },
        { status: 500 },
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        review: inserted
          ? mapReviewRow({
              ...(inserted as unknown as Record<string, unknown>),
              profile: user?.id
                ? (await getProfilesByUserId(req, [user.id])).get(user.id) ?? null
                : null,
            })
          : null,
      },
      { status: 201 },
    );
    if (isAnonymous && setCookie) {
      applyAnonymousCookie(response, anonymousId);
    }
    return response;
  } catch (err) {
    logDevError("[events/[id]/reviews] POST error:", err);
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", message: "Unexpected server error." },
      { status: 500 },
    );
  }
}
