import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export const dynamic = 'force-dynamic';
export const revalidate = 30;

// In-memory cache with TTL (30 seconds)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(searchParams: URLSearchParams): string {
  return Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
  // Clean up old cache entries (keep last 50)
  if (cache.size > 50) {
    const oldestKey = Array.from(cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
    cache.delete(oldestKey);
  }
}

// ---------- Helpers ----------

function norm(value?: string | null): string {
  return (value || "").toLowerCase();
}

function hasAnyKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw));
}

function isSportsEvent(event: any): boolean {
  const segment = norm(event.segment);
  const classification = norm(event.classification);
  const genre = norm(event.genre);
  const subGenre = norm(event.sub_genre);
  const title = norm(event.title);

  const sportsKeywords = [
    "sports",
    "rugby",
    "motorsport",
    "racing",
    "supercross",
    "grand prix",
    "gp",
    "football",
    "soccer",
    "cricket",
    "tennis",
    "hockey",
    "match",
    "vs",
  ];

  const haystack = [segment, classification, genre, subGenre, title].join(" ");

  return hasAnyKeyword(haystack, sportsKeywords);
}

// ---- DOPAMINE FILTER (NO SPORTS) ----
function isDopamineEvent(event: any): boolean {
  if (isSportsEvent(event)) return false; // 🚫 REMOVE ALL SPORTS

  const title = norm(event.title);
  const description = norm(event.description);
  const classification = norm(event.classification);
  const segment = norm(event.segment);
  const genre = norm(event.genre);
  const subGenre = norm(event.sub_genre);
  const location = norm(event.location);
  const venueName = norm(event.venue_name);

  const haystack = [
    title,
    description,
    classification,
    segment,
    genre,
    subGenre,
    location,
    venueName,
  ].join(" ");

  // 🎵 MUSIC = dopamine by default
  if (segment.includes("music") || classification.includes("music")) {
    return true;
  }

  // 🎭 ARTS & THEATRE can be dopamine (comedy shows, live acts)
  if (segment.includes("arts") || classification.includes("arts")) {
    return true;
  }

  // 🔥 KEYWORDS FOR NIGHTLIFE + SOCIAL FUN
  const DOPAMINE_KEYWORDS = [
    "festival",
    "fest",
    "concert",
    "live show",
    "world tour",
    "dj",
    "party",
    "nightlife",
    "club",
    "comedy",
    "standup",
    "stand-up",
    "show",
    "performance",
    "karaoke",
    "speed dating",
    "singles night",
    "mixer",
    "social",
    "dance",
    "escape",
  ];

  return hasAnyKeyword(haystack, DOPAMINE_KEYWORDS);
}

// ---- TAG GENERATION ----
function getEventTags(event: any): string[] {
  const tags: string[] = [];
  const title = norm(event.title);
  const description = norm(event.description || "");
  const segment = norm(event.segment || "");
  const genre = norm(event.genre || "");
  const haystack = `${title} ${description} ${segment} ${genre}`;

  // Festival
  if (hasAnyKeyword(haystack, ["festival", "fest", "carnival", "block party"])) {
    tags.push("festival");
  }

  // Concert
  if (hasAnyKeyword(haystack, ["concert", "live show", "world tour", "tour", "performance"])) {
    tags.push("concert");
  }

  // Comedy
  if (hasAnyKeyword(haystack, ["comedy", "standup", "stand-up", "improv", "roast"])) {
    tags.push("comedy");
  }

  // Nightlife
  if (hasAnyKeyword(haystack, ["dj", "club", "nightlife", "party", "rave", "nightclub"])) {
    tags.push("nightlife");
  }

  // Social
  if (hasAnyKeyword(haystack, ["karaoke", "speed dating", "mixer", "social", "trivia"])) {
    tags.push("social");
  }

  return tags.length > 0 ? tags : ["event"];
}

// ---- HYPE SCORE CALCULATION ----
function calculateHypeScore(event: any): number {
  let score = 0;
  const title = norm(event.title);
  const description = norm(event.description || "");
  const haystack = `${title} ${description}`;

  // High hype keywords
  if (hasAnyKeyword(haystack, ["festival", "world tour", "headliner", "special guest"])) {
    score += 30;
  }

  // Medium hype
  if (hasAnyKeyword(haystack, ["concert", "live show", "dj set", "party"])) {
    score += 15;
  }

  // Venue prestige (simple heuristic)
  const venue = norm(event.venue_name || "");
  if (hasAnyKeyword(venue, ["stadium", "arena", "theatre", "theater", "hall"])) {
    score += 10;
  }

  // Proximity bonus (events happening soon get a boost)
  if (event.start_date) {
    const eventDate = new Date(event.start_date);
    const now = new Date();
    const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntil <= 7) score += 20; // This week
    else if (daysUntil <= 30) score += 10; // This month
  }

  // Image presence (more polished = more hype)
  if (event.image_url) score += 5;

  return score;
}

// ---- SORTING ----
function sortByHype(events: any[]): any[] {
  return events
    .map(event => ({
      ...event,
      hypeScore: calculateHypeScore(event),
      tags: getEventTags(event),
    }))
    .sort((a, b) => b.hypeScore - a.hypeScore);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ---------- GET handler ----------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const city = searchParams.get("city");
    const limitParam = searchParams.get("limit");
    const debug = searchParams.get("debug") === "1";
    const random = searchParams.get("random") === "1" || searchParams.get("mode") === "tonight";
    const sortBy = searchParams.get("sort") || "hype"; // "hype" | "date" | "random"

    // Check cache first
    const cacheKey = getCacheKey(searchParams);
    const cached = getCachedData(cacheKey);
    if (cached && !debug) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-Cache': 'hit',
        },
      });
    }

    const limit = Math.min(Number(limitParam || "30") || 30, 100);
    const nowIso = new Date().toISOString();

    let query = supabase
      .from("ticketmaster_events")
      .select("*")
      .gte("start_date", nowIso)
      .order("start_date", { ascending: true })
      .limit(limit * 3);

    if (city) query = query.eq("city", city);

    const { data, error } = await query;

    if (error) {
      console.error("[GET /ticketmaster/events] Supabase error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const allEvents = data || [];

    if (debug) {
      return NextResponse.json({
        success: true,
        debug: true,
        total: allEvents.length,
        sample: allEvents.slice(0, 20),
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    // Filter dopamine events
    let filtered = allEvents.filter((event) => isDopamineEvent(event));

    // Add tags and hype scores
    filtered = filtered.map(event => ({
      ...event,
      tags: getEventTags(event),
      hypeScore: calculateHypeScore(event),
    }));

    // Apply sorting
    if (sortBy === "hype" || random) {
      filtered = sortByHype(filtered);
    } else if (sortBy === "random") {
      filtered = shuffleArray(filtered);
    }
    // "date" is already sorted by start_date from query

    // Randomizer mode: shuffle top hype events
    if (random) {
      const topHype = filtered.slice(0, Math.min(20, filtered.length));
      filtered = shuffleArray(topHype).concat(filtered.slice(20));
    }

    const limited = filtered.slice(0, limit);

    const response = {
      success: true,
      mode: random ? "tonight_vibe" : "dopamine_no_sports",
      sort: sortBy,
      total_fetched: allEvents.length,
      total_after_filter: filtered.length,
      count: limited.length,
      events: limited,
    };

    // Cache the response
    setCachedData(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'miss',
      },
    });
  } catch (err: any) {
    console.error("[GET /ticketmaster/events] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
