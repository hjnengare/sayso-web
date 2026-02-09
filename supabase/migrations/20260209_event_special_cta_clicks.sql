-- CTA click tracking for events/specials (external URL + WhatsApp).

CREATE TABLE IF NOT EXISTS public.event_special_cta_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_special_id uuid NOT NULL REFERENCES public.events_and_specials(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  cta_kind text NOT NULL DEFAULT 'external_url',
  cta_source text NULL,
  target_url text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_special_cta_clicks
  ADD COLUMN IF NOT EXISTS cta_kind text NOT NULL DEFAULT 'external_url';

ALTER TABLE public.event_special_cta_clicks
  ADD COLUMN IF NOT EXISTS cta_source text;

ALTER TABLE public.event_special_cta_clicks
  ADD COLUMN IF NOT EXISTS target_url text;

ALTER TABLE public.event_special_cta_clicks
  ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE public.event_special_cta_clicks
  DROP CONSTRAINT IF EXISTS event_special_cta_clicks_cta_kind_check;

ALTER TABLE public.event_special_cta_clicks
  ADD CONSTRAINT event_special_cta_clicks_cta_kind_check
  CHECK (cta_kind IN ('external_url', 'whatsapp'));

CREATE INDEX IF NOT EXISTS idx_event_special_cta_clicks_event_special_id
  ON public.event_special_cta_clicks(event_special_id);

CREATE INDEX IF NOT EXISTS idx_event_special_cta_clicks_created_at
  ON public.event_special_cta_clicks(created_at DESC);

ALTER TABLE public.event_special_cta_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert CTA clicks" ON public.event_special_cta_clicks;
CREATE POLICY "Allow insert CTA clicks"
  ON public.event_special_cta_clicks
  FOR INSERT
  TO public
  WITH CHECK (true);
