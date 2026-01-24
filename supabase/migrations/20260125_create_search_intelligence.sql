-- ============================================================================
-- SEARCH INTELLIGENCE SYSTEM
-- 3-Layer Search: Alias Mapping → Full-Text + Fuzzy → Ranked Results
-- ============================================================================

-- Enable pg_trgm extension for fuzzy/typo-tolerant search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- LAYER 1: Search Aliases Table (Synonym Brain)
-- Maps natural language phrases to existing business categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.search_aliases (
  id BIGSERIAL PRIMARY KEY,
  phrase TEXT NOT NULL,              -- what users type (lowercase, trimmed)
  category_match TEXT NOT NULL,      -- MUST match existing businesses.category values
  weight INT DEFAULT 20,             -- higher = stronger match preference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure no duplicate phrase mappings
  UNIQUE(phrase, category_match)
);

-- Index for fast phrase lookup
CREATE INDEX IF NOT EXISTS idx_search_aliases_phrase ON search_aliases(phrase);
CREATE INDEX IF NOT EXISTS idx_search_aliases_phrase_trgm ON search_aliases USING GIN(phrase gin_trgm_ops);

-- Enable RLS
ALTER TABLE search_aliases ENABLE ROW LEVEL SECURITY;

-- Allow public read access (aliases are public knowledge)
CREATE POLICY "Allow public read access to search aliases"
  ON search_aliases FOR SELECT
  USING (true);

-- Only allow service role to modify aliases
CREATE POLICY "Only service role can modify search aliases"
  ON search_aliases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- LAYER 2: Add trigram index on businesses for fuzzy search
-- ============================================================================

-- Trigram indexes for typo-tolerant search on key columns
CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON businesses USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_category_trgm ON businesses USING GIN(category gin_trgm_ops);

-- ============================================================================
-- LAYER 3: search_businesses RPC Function
-- Combines alias lookup, full-text search, fuzzy matching, and ranking
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_businesses(
  q TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_verified_only BOOLEAN DEFAULT FALSE,
  p_location TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_km DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  location TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  verified BOOLEAN,
  price_range TEXT,
  status TEXT,
  badge TEXT,
  owner_id UUID,
  slug TEXT,
  interest_id TEXT,
  sub_interest_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  -- Stats
  total_reviews INTEGER,
  average_rating DECIMAL(3,2),
  -- Search relevance
  search_rank REAL,
  alias_boost REAL,
  fuzzy_similarity REAL,
  final_score REAL,
  matched_alias TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_query TEXT;
  v_tsquery TSQUERY;
  v_best_alias RECORD;
  v_has_fts_results BOOLEAN := FALSE;
BEGIN
  -- ========================================
  -- Step 1: Clean and normalize the query
  -- ========================================
  v_clean_query := LOWER(TRIM(COALESCE(q, '')));

  -- Return empty if no query
  IF v_clean_query = '' THEN
    RETURN;
  END IF;

  -- ========================================
  -- Step 2: Find best matching alias
  -- ========================================
  SELECT
    sa.phrase,
    sa.category_match,
    sa.weight,
    SIMILARITY(sa.phrase, v_clean_query) AS sim
  INTO v_best_alias
  FROM search_aliases sa
  WHERE
    -- Exact match
    sa.phrase = v_clean_query
    -- Or phrase contains the query
    OR sa.phrase ILIKE '%' || v_clean_query || '%'
    -- Or fuzzy match (for typos)
    OR SIMILARITY(sa.phrase, v_clean_query) > 0.3
  ORDER BY
    -- Exact match first
    CASE WHEN sa.phrase = v_clean_query THEN 0 ELSE 1 END,
    -- Then weight
    sa.weight DESC,
    -- Then similarity
    SIMILARITY(sa.phrase, v_clean_query) DESC
  LIMIT 1;

  -- ========================================
  -- Step 3: Build full-text search query
  -- ========================================
  BEGIN
    -- Try websearch format first (handles phrases naturally)
    v_tsquery := websearch_to_tsquery('english', v_clean_query);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to plainto_tsquery for simple queries
    v_tsquery := plainto_tsquery('english', v_clean_query);
  END;

  -- ========================================
  -- Step 4: Execute search with ranking
  -- ========================================
  RETURN QUERY
  WITH ranked_businesses AS (
    SELECT
      b.id,
      b.name,
      b.description,
      b.category,
      b.location,
      b.address,
      b.phone,
      b.email,
      b.website,
      b.image_url,
      b.verified,
      b.price_range,
      b.status,
      b.badge,
      b.owner_id,
      b.slug,
      b.interest_id,
      b.sub_interest_id,
      b.lat,
      b.lng,
      b.created_at,
      b.updated_at,
      -- Stats from business_stats table
      COALESCE(bs.total_reviews, 0) AS total_reviews,
      COALESCE(bs.average_rating, 0.0) AS average_rating,
      -- Full-text search rank (0-1)
      COALESCE(ts_rank_cd(b.search_vector, v_tsquery, 32), 0.0)::REAL AS search_rank,
      -- Alias category boost (0 or weight value)
      CASE
        WHEN v_best_alias.category_match IS NOT NULL
             AND LOWER(b.category) = LOWER(v_best_alias.category_match)
        THEN COALESCE(v_best_alias.weight, 20)::REAL
        ELSE 0.0
      END AS alias_boost,
      -- Fuzzy similarity on name and category (0-1)
      GREATEST(
        SIMILARITY(b.name, v_clean_query),
        SIMILARITY(b.category, v_clean_query)
      )::REAL AS fuzzy_similarity,
      -- Matched alias (for transparency)
      v_best_alias.category_match AS matched_alias,
      -- Verified boost
      CASE WHEN b.verified THEN 5.0 ELSE 0.0 END AS verified_boost
    FROM businesses b
    LEFT JOIN business_stats bs ON bs.business_id = b.id
    WHERE
      -- Only active businesses
      b.status = 'active'
      -- Full-text search OR fuzzy match OR category alias match
      AND (
        -- Full-text search match
        b.search_vector @@ v_tsquery
        -- OR fuzzy name match (typo tolerance)
        OR SIMILARITY(b.name, v_clean_query) > 0.2
        -- OR fuzzy category match
        OR SIMILARITY(b.category, v_clean_query) > 0.3
        -- OR category matches the alias
        OR (v_best_alias.category_match IS NOT NULL
            AND LOWER(b.category) = LOWER(v_best_alias.category_match))
        -- OR name contains query (fallback)
        OR b.name ILIKE '%' || v_clean_query || '%'
        -- OR description contains query
        OR b.description ILIKE '%' || v_clean_query || '%'
      )
      -- Optional filters
      AND (p_verified_only = FALSE OR b.verified = TRUE)
      AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
      -- Geographic filter (if lat/lng/radius provided)
      AND (
        p_lat IS NULL OR p_lng IS NULL OR p_radius_km IS NULL
        OR (
          b.lat IS NOT NULL AND b.lng IS NOT NULL
          AND (
            -- Haversine approximation for distance in km
            6371 * ACOS(
              LEAST(1, GREATEST(-1,
                COS(RADIANS(p_lat)) * COS(RADIANS(b.lat)) *
                COS(RADIANS(b.lng) - RADIANS(p_lng)) +
                SIN(RADIANS(p_lat)) * SIN(RADIANS(b.lat))
              ))
            ) <= p_radius_km
          )
        )
      )
  )
  SELECT
    rb.id,
    rb.name,
    rb.description,
    rb.category,
    rb.location,
    rb.address,
    rb.phone,
    rb.email,
    rb.website,
    rb.image_url,
    rb.verified,
    rb.price_range,
    rb.status,
    rb.badge,
    rb.owner_id,
    rb.slug,
    rb.interest_id,
    rb.sub_interest_id,
    rb.lat,
    rb.lng,
    rb.created_at,
    rb.updated_at,
    rb.total_reviews,
    rb.average_rating,
    rb.search_rank,
    rb.alias_boost,
    rb.fuzzy_similarity,
    -- Final composite score for ranking
    (
      -- Full-text relevance (normalized to 0-30)
      (rb.search_rank * 30) +
      -- Alias category boost (0 or weight, typically 20)
      rb.alias_boost +
      -- Fuzzy similarity (0-1, scaled to 0-15)
      (rb.fuzzy_similarity * 15) +
      -- Verified boost (5 points)
      rb.verified_boost +
      -- Rating boost (0-5, scaled to 0-10)
      (rb.average_rating * 2)
    )::REAL AS final_score,
    rb.matched_alias
  FROM ranked_businesses rb
  ORDER BY
    -- Primary: final composite score
    (
      (rb.search_rank * 30) +
      rb.alias_boost +
      (rb.fuzzy_similarity * 15) +
      rb.verified_boost +
      (rb.average_rating * 2)
    ) DESC,
    -- Secondary: total reviews (popularity)
    rb.total_reviews DESC,
    -- Tertiary: name alphabetically
    rb.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION public.search_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_businesses TO anon;

-- ============================================================================
-- SEED INITIAL SEARCH ALIASES
-- These map common search phrases to existing business categories
-- ============================================================================

INSERT INTO search_aliases (phrase, category_match, weight) VALUES
  -- Coffee & Cafes
  ('coffee', 'cafe', 25),
  ('coffee place', 'cafe', 25),
  ('coffee shop', 'cafe', 25),
  ('coffee house', 'cafe', 25),
  ('coffeehouse', 'cafe', 25),
  ('espresso', 'cafe', 20),
  ('latte', 'cafe', 20),
  ('cappuccino', 'cafe', 20),
  ('caffee', 'cafe', 15),
  ('koffie', 'cafe', 15),

  -- Restaurants & Dining
  ('food', 'restaurant', 20),
  ('food place', 'restaurant', 20),
  ('eat', 'restaurant', 20),
  ('eating', 'restaurant', 20),
  ('dining', 'restaurant', 20),
  ('dine', 'restaurant', 20),
  ('eatery', 'restaurant', 20),
  ('diner', 'restaurant', 18),
  ('bistro', 'restaurant', 18),
  ('brasserie', 'restaurant', 15),

  -- Burgers
  ('burger', 'restaurant', 22),
  ('burgers', 'restaurant', 22),
  ('burger spot', 'restaurant', 22),
  ('burger place', 'restaurant', 22),
  ('burger joint', 'restaurant', 22),

  -- Pizza
  ('pizza', 'restaurant', 22),
  ('pizza place', 'restaurant', 22),
  ('pizzeria', 'restaurant', 22),

  -- Movies & Cinema
  ('movies', 'cinema', 25),
  ('movie', 'cinema', 25),
  ('movie theater', 'cinema', 25),
  ('movie theatre', 'cinema', 25),
  ('film', 'cinema', 20),
  ('films', 'cinema', 20),
  ('theatre', 'cinema', 18),
  ('theater', 'cinema', 18),
  ('flicks', 'cinema', 15),
  ('bioscope', 'cinema', 15),

  -- Hair & Barber
  ('haircut', 'barber', 25),
  ('hair cut', 'barber', 25),
  ('haircuts', 'barber', 25),
  ('barber', 'barber', 25),
  ('barbershop', 'barber', 25),
  ('barber shop', 'barber', 25),
  ('trim', 'barber', 15),
  ('fade', 'barber', 18),
  ('shave', 'barber', 18),

  -- Hair Salon
  ('hair salon', 'salon', 25),
  ('hair dresser', 'salon', 25),
  ('hairdresser', 'salon', 25),
  ('stylist', 'salon', 20),
  ('hair stylist', 'salon', 22),
  ('hairstylist', 'salon', 22),
  ('hair', 'salon', 15),
  ('blowout', 'salon', 18),
  ('highlights', 'salon', 18),
  ('color', 'salon', 12),

  -- Fitness & Gym
  ('gym', 'gym', 25),
  ('fitness', 'gym', 25),
  ('fitness center', 'gym', 25),
  ('fitness centre', 'gym', 25),
  ('workout', 'gym', 22),
  ('work out', 'gym', 22),
  ('exercise', 'gym', 20),
  ('training', 'gym', 18),
  ('weights', 'gym', 18),
  ('gym near me', 'gym', 25),
  ('crossfit', 'gym', 20),

  -- Spa & Wellness
  ('spa', 'spa', 25),
  ('wellness', 'spa', 22),
  ('massage', 'spa', 22),
  ('day spa', 'spa', 22),
  ('beauty spa', 'spa', 22),
  ('relaxation', 'spa', 18),
  ('pamper', 'spa', 18),
  ('facial', 'spa', 20),

  -- Bars & Nightlife
  ('bar', 'bar', 25),
  ('bars', 'bar', 25),
  ('pub', 'bar', 22),
  ('pubs', 'bar', 22),
  ('tavern', 'bar', 20),
  ('lounge', 'bar', 20),
  ('drinks', 'bar', 18),
  ('cocktails', 'bar', 20),
  ('beer', 'bar', 18),
  ('wine bar', 'bar', 22),

  -- Nightclub
  ('club', 'nightclub', 22),
  ('nightclub', 'nightclub', 25),
  ('night club', 'nightclub', 25),
  ('clubbing', 'nightclub', 22),
  ('dancing', 'nightclub', 18),

  -- Shopping
  ('shop', 'shop', 22),
  ('shopping', 'shop', 22),
  ('store', 'shop', 22),
  ('boutique', 'boutique', 25),
  ('retail', 'shop', 18),

  -- Nails
  ('nails', 'nail salon', 25),
  ('nail salon', 'nail salon', 25),
  ('manicure', 'nail salon', 22),
  ('pedicure', 'nail salon', 22),
  ('mani pedi', 'nail salon', 22),
  ('gel nails', 'nail salon', 20),
  ('acrylics', 'nail salon', 20),

  -- Hotels & Accommodation
  ('hotel', 'hotel', 25),
  ('hotels', 'hotel', 25),
  ('stay', 'hotel', 18),
  ('accommodation', 'hotel', 22),
  ('lodge', 'hotel', 20),
  ('inn', 'hotel', 18),
  ('bed and breakfast', 'hotel', 20),
  ('bnb', 'hotel', 18),
  ('airbnb', 'hotel', 15),

  -- Supermarket & Grocery
  ('supermarket', 'supermarket', 25),
  ('grocery', 'supermarket', 22),
  ('groceries', 'supermarket', 22),
  ('grocery store', 'supermarket', 25),
  ('food store', 'supermarket', 20),

  -- Pharmacy
  ('pharmacy', 'pharmacy', 25),
  ('chemist', 'pharmacy', 22),
  ('drugstore', 'pharmacy', 20),
  ('medicine', 'pharmacy', 18),
  ('medication', 'pharmacy', 18),

  -- Pet services
  ('vet', 'veterinarian', 25),
  ('veterinarian', 'veterinarian', 25),
  ('animal doctor', 'veterinarian', 22),
  ('pet doctor', 'veterinarian', 22),
  ('pet', 'pet shop', 18),
  ('pet store', 'pet shop', 22),
  ('pet shop', 'pet shop', 25),

  -- Auto & Car services
  ('car wash', 'car wash', 25),
  ('carwash', 'car wash', 25),
  ('mechanic', 'mechanic', 25),
  ('car repair', 'mechanic', 22),
  ('auto repair', 'mechanic', 22),
  ('garage', 'mechanic', 20),
  ('service center', 'mechanic', 18),

  -- Banks & Financial
  ('bank', 'bank', 25),
  ('banking', 'bank', 22),
  ('atm', 'bank', 20),
  ('money', 'bank', 15),

  -- Fast food
  ('fast food', 'fast food', 25),
  ('fastfood', 'fast food', 25),
  ('quick food', 'fast food', 22),
  ('takeaway', 'fast food', 20),
  ('takeout', 'fast food', 20),
  ('take away', 'fast food', 20),

  -- Bakery
  ('bakery', 'bakery', 25),
  ('bread', 'bakery', 20),
  ('pastry', 'bakery', 20),
  ('pastries', 'bakery', 20),
  ('cake', 'bakery', 20),
  ('cakes', 'bakery', 20),

  -- Doctor & Medical
  ('doctor', 'doctor', 25),
  ('clinic', 'clinic', 25),
  ('medical', 'clinic', 22),
  ('hospital', 'hospital', 25),
  ('health', 'clinic', 18),
  ('gp', 'doctor', 22),

  -- Dentist
  ('dentist', 'dentist', 25),
  ('dental', 'dentist', 22),
  ('teeth', 'dentist', 18),

  -- Laundry
  ('laundry', 'laundromat', 25),
  ('laundromat', 'laundromat', 25),
  ('dry cleaning', 'dry cleaner', 25),
  ('dry cleaner', 'dry cleaner', 25),
  ('wash clothes', 'laundromat', 20)

ON CONFLICT (phrase, category_match) DO UPDATE SET
  weight = EXCLUDED.weight,
  updated_at = NOW();

-- ============================================================================
-- Helper function to add/update aliases (for admin use)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_search_alias(
  p_phrase TEXT,
  p_category_match TEXT,
  p_weight INT DEFAULT 20
)
RETURNS search_aliases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result search_aliases;
BEGIN
  INSERT INTO search_aliases (phrase, category_match, weight)
  VALUES (LOWER(TRIM(p_phrase)), p_category_match, p_weight)
  ON CONFLICT (phrase, category_match) DO UPDATE SET
    weight = EXCLUDED.weight,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to service_role only (admin function)
GRANT EXECUTE ON FUNCTION public.upsert_search_alias TO service_role;

-- ============================================================================
-- Function to get suggested aliases for a query (for debugging/testing)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_search_suggestions(p_query TEXT, p_limit INT DEFAULT 5)
RETURNS TABLE (
  phrase TEXT,
  category_match TEXT,
  weight INT,
  similarity REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_query TEXT;
BEGIN
  v_clean_query := LOWER(TRIM(COALESCE(p_query, '')));

  IF v_clean_query = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sa.phrase,
    sa.category_match,
    sa.weight,
    SIMILARITY(sa.phrase, v_clean_query)::REAL AS similarity
  FROM search_aliases sa
  WHERE
    sa.phrase ILIKE '%' || v_clean_query || '%'
    OR SIMILARITY(sa.phrase, v_clean_query) > 0.2
  ORDER BY
    CASE WHEN sa.phrase = v_clean_query THEN 0 ELSE 1 END,
    sa.weight DESC,
    SIMILARITY(sa.phrase, v_clean_query) DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute to all
GRANT EXECUTE ON FUNCTION public.get_search_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_suggestions TO anon;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE search_aliases IS 'Maps natural language search phrases to business categories for intelligent search';
COMMENT ON COLUMN search_aliases.phrase IS 'The search phrase users might type (lowercase)';
COMMENT ON COLUMN search_aliases.category_match IS 'The business category this phrase maps to';
COMMENT ON COLUMN search_aliases.weight IS 'Ranking weight: higher = stronger preference (default 20)';

COMMENT ON FUNCTION search_businesses IS 'Main search RPC: combines alias lookup, full-text search, fuzzy matching, and ranking';
COMMENT ON FUNCTION get_search_suggestions IS 'Debug helper: shows which aliases match a given query';
COMMENT ON FUNCTION upsert_search_alias IS 'Admin helper: add or update a search alias';
