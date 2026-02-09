-- Anonymous review guardrails for business/event/special reviews.
-- Adds stable anonymous identity fields + anti-abuse indexes/constraints.

-- Business reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS anonymous_id UUID,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent_hash TEXT;

-- Event reviews
ALTER TABLE public.event_reviews
  ADD COLUMN IF NOT EXISTS anonymous_id UUID,
  ADD COLUMN IF NOT EXISTS user_agent_hash TEXT;

-- Special reviews
ALTER TABLE public.special_reviews
  ADD COLUMN IF NOT EXISTS anonymous_id UUID,
  ADD COLUMN IF NOT EXISTS user_agent_hash TEXT;

-- Fast lookup for cooldown/rate-limits
CREATE INDEX IF NOT EXISTS idx_reviews_anonymous_created
  ON public.reviews(anonymous_id, created_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_reviews_anonymous_created
  ON public.event_reviews(anonymous_id, created_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_special_reviews_anonymous_created
  ON public.special_reviews(anonymous_id, created_at DESC)
  WHERE anonymous_id IS NOT NULL;

-- One anonymous review per target per anonymous device identity
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_anonymous_per_business
  ON public.reviews(business_id, anonymous_id)
  WHERE user_id IS NULL AND anonymous_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_reviews_unique_anonymous_per_event
  ON public.event_reviews(event_id, anonymous_id)
  WHERE user_id IS NULL AND anonymous_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_special_reviews_unique_anonymous_per_special
  ON public.special_reviews(special_id, anonymous_id)
  WHERE user_id IS NULL AND anonymous_id IS NOT NULL;

COMMENT ON COLUMN public.reviews.anonymous_id IS 'Stable anonymous reviewer identifier for abuse limits and duplicate prevention.';
COMMENT ON COLUMN public.event_reviews.anonymous_id IS 'Stable anonymous reviewer identifier for abuse limits and duplicate prevention.';
COMMENT ON COLUMN public.special_reviews.anonymous_id IS 'Stable anonymous reviewer identifier for abuse limits and duplicate prevention.';
