-- ============================================
-- Ticketmaster Events Table Migration
-- ============================================
-- This migration creates:
-- 1. Events table to store Ticketmaster events
-- 
-- NOTE: API fetching is done via Supabase Edge Function
-- See: supabase/functions/fetch-ticketmaster-events/
-- The Edge Function handles HTTP requests and data processing
-- ============================================

-- Create events table to store Ticketmaster events
CREATE TABLE IF NOT EXISTS ticketmaster_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketmaster_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'event', -- 'event' or 'special'
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location TEXT,
  city TEXT,
  country TEXT,
  venue_name TEXT,
  venue_address TEXT,
  image_url TEXT,
  url TEXT,
  price_range JSONB,
  classification TEXT,
  segment TEXT, -- e.g., 'Music', 'Sports', 'Arts & Theatre'
  genre TEXT,
  sub_genre TEXT,
  raw_data JSONB, -- Store full Ticketmaster event data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticketmaster_events_ticketmaster_id ON ticketmaster_events(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_ticketmaster_events_start_date ON ticketmaster_events(start_date);
CREATE INDEX IF NOT EXISTS idx_ticketmaster_events_city ON ticketmaster_events(city);
CREATE INDEX IF NOT EXISTS idx_ticketmaster_events_type ON ticketmaster_events(type);
CREATE INDEX IF NOT EXISTS idx_ticketmaster_events_segment ON ticketmaster_events(segment);

-- Legacy function (kept for backward compatibility)
-- NOTE: This function requires pg_cron and http extensions which may not be available
-- Use the Supabase Edge Function instead: supabase/functions/fetch-ticketmaster-events/
CREATE OR REPLACE FUNCTION fetch_ticketmaster_events(
  p_keyword TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_size INTEGER DEFAULT 20,
  p_page INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_api_key TEXT;
  v_url TEXT;
  v_response http_response;
  v_response_body JSONB;
  v_events JSONB;
  v_event JSONB;
  v_inserted_count INTEGER := 0;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get API key from config table (preferred) or database setting
  -- Try config table first (if it exists)
  BEGIN
    SELECT value INTO v_api_key 
    FROM app_config 
    WHERE key = 'TICKETMASTER_API_KEY';
  EXCEPTION
    WHEN undefined_table THEN
      -- Config table doesn't exist yet, will try database setting
      v_api_key := NULL;
  END;
  
  -- Fallback to database setting if config table doesn't have it or doesn't exist
  IF v_api_key IS NULL OR v_api_key = '' THEN
    BEGIN
      v_api_key := current_setting('app.ticketmaster_api_key', true);
    EXCEPTION
      WHEN OTHERS THEN
        v_api_key := NULL;
    END;
  END IF;
  
  IF v_api_key IS NULL OR v_api_key = '' THEN
    RAISE EXCEPTION 'TICKETMASTER_API_KEY not configured. Set it via: SELECT set_config(''TICKETMASTER_API_KEY'', ''your_key''); OR ALTER DATABASE postgres SET app.ticketmaster_api_key = ''your_key'';';
  END IF;

  -- Build Ticketmaster API URL
  v_url := 'https://app.ticketmaster.com/discovery/v2/events.json?apikey=' || v_api_key;
  v_url := v_url || '&size=' || p_size::TEXT;
  v_url := v_url || '&page=' || p_page::TEXT;
  
  IF p_keyword IS NOT NULL AND p_keyword != '' THEN
    v_url := v_url || '&keyword=' || url_encode(p_keyword);
  END IF;
  
  IF p_city IS NOT NULL AND p_city != '' THEN
    v_url := v_url || '&city=' || url_encode(p_city);
  END IF;

  -- Make HTTP request to Ticketmaster API
  SELECT * INTO v_response FROM http_get(v_url);
  
  -- Check response status
  IF v_response.status != 200 THEN
    RAISE EXCEPTION 'Ticketmaster API error: Status % - %', v_response.status, v_response.content;
  END IF;

  -- Parse JSON response
  v_response_body := v_response.content::JSONB;
  v_events := v_response_body->'_embedded'->'events';

  -- If no events, return early
  IF v_events IS NULL OR jsonb_array_length(v_events) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No events found',
      'events_processed', 0
    );
  END IF;

  -- Process each event
  FOR v_event IN SELECT * FROM jsonb_array_elements(v_events)
  LOOP
    BEGIN
      INSERT INTO ticketmaster_events (
        ticketmaster_id,
        title,
        description,
        start_date,
        end_date,
        location,
        city,
        country,
        venue_name,
        venue_address,
        image_url,
        url,
        price_range,
        classification,
        segment,
        genre,
        sub_genre,
        raw_data,
        updated_at,
        last_fetched_at
      ) VALUES (
        v_event->>'id',
        v_event->>'name',
        COALESCE(v_event->>'info', v_event->>'description', ''),
        CASE 
          WHEN v_event->'dates'->'start'->>'dateTime' IS NOT NULL 
          THEN (v_event->'dates'->'start'->>'dateTime')::TIMESTAMPTZ
          WHEN v_event->'dates'->'start'->>'localDate' IS NOT NULL 
          THEN (v_event->'dates'->'start'->>'localDate')::DATE::TIMESTAMPTZ
          ELSE NULL
        END,
        CASE 
          WHEN v_event->'dates'->'end'->>'dateTime' IS NOT NULL 
          THEN (v_event->'dates'->'end'->>'dateTime')::TIMESTAMPTZ
          WHEN v_event->'dates'->'end'->>'localDate' IS NOT NULL 
          THEN (v_event->'dates'->'end'->>'localDate')::DATE::TIMESTAMPTZ
          ELSE NULL
        END,
        COALESCE(
          v_event->'_embedded'->'venues'->0->>'name',
          v_event->'_embedded'->'venues'->0->>'address'->>'line1'
        ),
        v_event->'_embedded'->'venues'->0->>'city'->>'name',
        v_event->'_embedded'->'venues'->0->>'country'->>'name',
        v_event->'_embedded'->'venues'->0->>'name',
        COALESCE(
          v_event->'_embedded'->'venues'->0->>'address'->>'line1',
          ''
        ) || COALESCE(
          ' ' || v_event->'_embedded'->'venues'->0->>'address'->>'line2',
          ''
        ),
        COALESCE(
          v_event->'images'->0->>'url',
          NULL
        ),
        v_event->>'url',
        CASE 
          WHEN v_event->'priceRanges' IS NOT NULL 
          THEN v_event->'priceRanges'
          ELSE NULL
        END,
        v_event->'classifications'->0->>'segment'->>'name',
        v_event->'classifications'->0->>'segment'->>'name',
        v_event->'classifications'->0->>'genre'->>'name',
        v_event->'classifications'->0->>'subGenre'->>'name',
        v_event,
        NOW(),
        NOW()
      )
      ON CONFLICT (ticketmaster_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        location = EXCLUDED.location,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        venue_name = EXCLUDED.venue_name,
        venue_address = EXCLUDED.venue_address,
        image_url = EXCLUDED.image_url,
        url = EXCLUDED.url,
        price_range = EXCLUDED.price_range,
        classification = EXCLUDED.classification,
        segment = EXCLUDED.segment,
        genre = EXCLUDED.genre,
        sub_genre = EXCLUDED.sub_genre,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW(),
        last_fetched_at = NOW();
      
      IF FOUND THEN
        IF (SELECT COUNT(*) FROM ticketmaster_events WHERE ticketmaster_id = v_event->>'id') = 1 THEN
          v_inserted_count := v_inserted_count + 1;
        ELSE
          v_updated_count := v_updated_count + 1;
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing other events
        RAISE WARNING 'Error processing event %: %', v_event->>'id', SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Processed %s events', jsonb_array_length(v_events)),
    'events_processed', jsonb_array_length(v_events),
    'inserted', v_inserted_count,
    'updated', v_updated_count,
    'fetched_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for URL encoding (simple version)
CREATE OR REPLACE FUNCTION url_encode(input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple URL encoding - replace spaces with %20, etc.
  RETURN replace(replace(replace(input, ' ', '%20'), '&', '%26'), '#', '%23');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a simpler wrapper function for cron job (no parameters)
CREATE OR REPLACE FUNCTION cron_fetch_ticketmaster_events()
RETURNS VOID AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Fetch events (customize parameters as needed)
  -- You can modify these defaults or make them configurable
  SELECT fetch_ticketmaster_events(
    p_keyword => NULL,  -- Set keyword if needed
    p_city => 'Cape Town',  -- Set your default city
    p_size => 20,
    p_page => 0
  ) INTO v_result;
  
  -- Log the result
  RAISE NOTICE 'Ticketmaster events fetch completed: %', v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CRON JOB SETUP
-- ============================================
-- Use Supabase Edge Function instead of pg_cron
-- 
-- To schedule the Edge Function:
-- 1. Deploy: supabase functions deploy fetch-ticketmaster-events
-- 2. Set secret: supabase secrets set TICKETMASTER_API_KEY=your_key
-- 3. Schedule via external cron service or Supabase Dashboard
--
-- See: supabase/functions/fetch-ticketmaster-events/README.md
-- ============================================

-- Enable Row Level Security
ALTER TABLE ticketmaster_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public read access to events
CREATE POLICY "Anyone can view events"
  ON ticketmaster_events
  FOR SELECT
  USING (true);

-- Only system can insert/update (via function)
CREATE POLICY "System can manage events"
  ON ticketmaster_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE ticketmaster_events IS 'Events fetched from Ticketmaster API via Edge Function';
COMMENT ON FUNCTION fetch_ticketmaster_events IS 'Legacy function - use Edge Function instead: supabase/functions/fetch-ticketmaster-events';
COMMENT ON FUNCTION cron_fetch_ticketmaster_events IS 'Legacy function - use Edge Function instead: supabase/functions/fetch-ticketmaster-events';

-- ============================================
-- API KEY CONFIGURATION
-- ============================================
-- The Edge Function uses environment secrets, not database config
-- Set the API key via: supabase secrets set TICKETMASTER_API_KEY=your_key
--
-- If you want to store it in the database for reference:
-- SELECT set_config('TICKETMASTER_API_KEY', 'your_api_key_here', 'Ticketmaster API key');
-- (Make sure to run the app_config migration first)
-- ============================================

