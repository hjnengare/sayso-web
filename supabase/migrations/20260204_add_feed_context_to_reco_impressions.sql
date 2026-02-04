-- Add feed context to reco impressions for debugging/observability.
-- Keep the existing suppression semantics (unique per user_id + business_id).

ALTER TABLE public.user_reco_impressions
  ADD COLUMN IF NOT EXISTS feed_context TEXT,
  ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE OR REPLACE FUNCTION public.record_reco_impressions_v2(
  p_user_id UUID,
  p_business_ids UUID[],
  p_feed_context TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Enforce that callers can only write impressions for themselves.
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.user_reco_impressions (user_id, business_id, shown_at, feed_context, request_id)
  SELECT p_user_id, unnest(p_business_ids), NOW(), p_feed_context, p_request_id
  ON CONFLICT (user_id, business_id)
  DO UPDATE SET
    shown_at = NOW(),
    feed_context = EXCLUDED.feed_context,
    request_id = EXCLUDED.request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_reco_impressions_v2(UUID, UUID[], TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.record_reco_impressions_v2 IS
'Records that businesses were shown to a user, with optional feed_context and request_id (upserts).';
