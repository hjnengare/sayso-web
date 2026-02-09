-- WhatsApp CTA support for events_and_specials.

ALTER TABLE public.events_and_specials
  ADD COLUMN IF NOT EXISTS cta_source text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_prefill_template text;

ALTER TABLE public.events_and_specials
  DROP CONSTRAINT IF EXISTS events_and_specials_cta_source_check;

ALTER TABLE public.events_and_specials
  ADD CONSTRAINT events_and_specials_cta_source_check
  CHECK (
    cta_source IS NULL
    OR cta_source IN ('website', 'whatsapp', 'quicket', 'webtickets', 'other')
  );

ALTER TABLE public.events_and_specials
  DROP CONSTRAINT IF EXISTS events_and_specials_whatsapp_number_format_check;

ALTER TABLE public.events_and_specials
  ADD CONSTRAINT events_and_specials_whatsapp_number_format_check
  CHECK (
    whatsapp_number IS NULL
    OR whatsapp_number ~ '^[0-9]{7,15}$'
  );

ALTER TABLE public.events_and_specials
  DROP CONSTRAINT IF EXISTS events_and_specials_whatsapp_requires_number_check;

ALTER TABLE public.events_and_specials
  ADD CONSTRAINT events_and_specials_whatsapp_requires_number_check
  CHECK (
    cta_source IS DISTINCT FROM 'whatsapp'
    OR (whatsapp_number IS NOT NULL AND btrim(whatsapp_number) <> '')
  );
