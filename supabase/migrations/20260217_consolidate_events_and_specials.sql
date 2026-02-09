-- Consolidate (dedupe) events before insertion into events_and_specials.
-- Dedupe key: lower(trim(title)) + start_date as UTC date + lower(trim(location))

-- 0) Immutable helper: extract the UTC date from a timestamptz.
--    date_trunc('day', timestamptz) is only STABLE, so we need this for the index.
CREATE OR REPLACE FUNCTION public.utc_date(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$ SELECT (ts AT TIME ZONE 'UTC')::date $$;

-- 1) Unique index to enforce idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_and_specials_source_key
  ON public.events_and_specials (
    (lower(btrim(title))),
    (public.utc_date(start_date)),
    (lower(btrim(COALESCE(location, ''))))
  );

-- 2) Batch upsert helper for cron/Edge Functions (service_role)
--    - Inserts new rows
--    - On duplicate key: updates end_date to greatest(existing, new)
--    - Keeps earliest start_date for that day
--    - Will NOT merge across different business_id values (safety)
CREATE OR REPLACE FUNCTION public.upsert_events_and_specials_consolidated(p_rows jsonb)
RETURNS TABLE(inserted integer, updated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  updated_count integer := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN QUERY SELECT 0::integer, 0::integer;
    RETURN;
  END IF;

  WITH rows AS (
    SELECT
      nullif(btrim(r->>'title'), '')::text AS title,
      nullif(btrim(r->>'type'), '')::text AS type,
      nullif(btrim(r->>'business_id'), '')::uuid AS business_id,
      nullif(btrim(r->>'created_by'), '')::uuid AS created_by,
      nullif(btrim(r->>'start_date'), '')::timestamptz AS start_date,
      nullif(btrim(r->>'end_date'), '')::timestamptz AS end_date,
      nullif(btrim(r->>'location'), '')::text AS location,
      nullif(btrim(r->>'description'), '')::text AS description,
      nullif(btrim(r->>'icon'), '')::text AS icon,
      nullif(btrim(r->>'image'), '')::text AS image,
      nullif(btrim(r->>'booking_url'), '')::text AS booking_url,
      nullif(btrim(r->>'booking_contact'), '')::text AS booking_contact,
      CASE
        WHEN nullif(btrim(r->>'price'), '') IS NULL THEN NULL::numeric
        ELSE (r->>'price')::numeric
      END AS price,
      CASE
        WHEN nullif(btrim(r->>'rating'), '') IS NULL THEN 0::numeric
        ELSE (r->>'rating')::numeric
      END AS rating
    FROM jsonb_array_elements(p_rows) AS r
  ),
  filtered AS (
    SELECT *
    FROM rows
    WHERE title IS NOT NULL
      AND type IN ('event', 'special')
      AND business_id IS NOT NULL
      AND created_by IS NOT NULL
      AND start_date IS NOT NULL
  ),
  upserted AS (
    INSERT INTO public.events_and_specials (
      title,
      type,
      business_id,
      start_date,
      end_date,
      location,
      description,
      icon,
      image,
      price,
      rating,
      booking_url,
      booking_contact,
      created_by
    )
    SELECT
      f.title,
      f.type,
      f.business_id,
      f.start_date,
      f.end_date,
      f.location,
      f.description,
      f.icon,
      f.image,
      f.price,
      f.rating,
      f.booking_url,
      f.booking_contact,
      f.created_by
    FROM filtered f
    ON CONFLICT (
      (lower(btrim(title))),
      (public.utc_date(start_date)),
      (lower(btrim(COALESCE(location, ''))))
    )
    DO UPDATE SET
      start_date = LEAST(events_and_specials.start_date, EXCLUDED.start_date),
      end_date = CASE
        WHEN events_and_specials.end_date IS NULL THEN EXCLUDED.end_date
        WHEN EXCLUDED.end_date IS NULL THEN events_and_specials.end_date
        ELSE GREATEST(events_and_specials.end_date, EXCLUDED.end_date)
      END,
      description = CASE
        WHEN EXCLUDED.description IS NOT NULL
         AND (events_and_specials.description IS NULL
              OR length(EXCLUDED.description) > length(events_and_specials.description))
        THEN EXCLUDED.description
        ELSE events_and_specials.description
      END,
      image = COALESCE(EXCLUDED.image, events_and_specials.image),
      booking_url = COALESCE(EXCLUDED.booking_url, events_and_specials.booking_url),
      updated_at = now()
    WHERE events_and_specials.business_id = EXCLUDED.business_id
    RETURNING (xmax = 0) AS inserted_flag
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE inserted_flag), 0)::integer,
    COALESCE(COUNT(*) FILTER (WHERE NOT inserted_flag), 0)::integer
  INTO inserted_count, updated_count
  FROM upserted;

  RETURN QUERY SELECT inserted_count, updated_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_events_and_specials_consolidated(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_events_and_specials_consolidated(jsonb) TO service_role;

-- 3) Read-time consolidation for cards (dedupe across days/times for the same series).
-- One card per (title + business_id + location), with a date range and start-date list.
CREATE OR REPLACE VIEW public.v_events_and_specials_cards AS
SELECT
  MIN(id::text)::uuid AS representative_id,
  LOWER(BTRIM(title)) AS norm_title,
  business_id,
  type,
  LOWER(BTRIM(COALESCE(location, ''))) AS norm_location,

  -- Display values: pick from the earliest row (by start_date)
  (array_agg(title ORDER BY start_date ASC))[1] AS title,
  (array_agg(location ORDER BY start_date ASC))[1] AS location,

  MIN(start_date) AS start_date,
  MAX(COALESCE(end_date, start_date)) AS end_date,
  COUNT(*)::int AS occurrences,

  ARRAY_AGG(start_date ORDER BY start_date) AS start_dates,

  MAX(image) FILTER (WHERE image IS NOT NULL AND BTRIM(image) <> '') AS image,
  MAX(icon) FILTER (WHERE icon IS NOT NULL AND BTRIM(icon) <> '') AS icon,
  MAX(description) FILTER (WHERE description IS NOT NULL AND BTRIM(description) <> '') AS description,
  MAX(booking_url) FILTER (WHERE booking_url IS NOT NULL AND BTRIM(booking_url) <> '') AS booking_url,
  MAX(booking_contact) FILTER (WHERE booking_contact IS NOT NULL AND BTRIM(booking_contact) <> '') AS booking_contact
FROM public.events_and_specials e
GROUP BY
  LOWER(BTRIM(title)),
  business_id,
  type,
  LOWER(BTRIM(COALESCE(location, '')));
