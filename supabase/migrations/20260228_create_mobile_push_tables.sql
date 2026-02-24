-- Mobile push token registry + delivery dedupe log
-- Used by:
-- - POST/DELETE /api/user/push-tokens
-- - POST /api/internal/push/dispatch

CREATE TABLE IF NOT EXISTS public.mobile_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT NULL,
  app_version TEXT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_user_id
  ON public.mobile_push_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_active
  ON public.mobile_push_tokens (disabled_at, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.push_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES public.mobile_push_tokens(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'invalid_token')),
  provider_response JSONB NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, token_id)
);

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_notification_id
  ON public.push_delivery_logs (notification_id);

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_token_id
  ON public.push_delivery_logs (token_id);

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_sent_at
  ON public.push_delivery_logs (sent_at DESC);

-- Keep updated_at fresh on mobile_push_tokens updates.
DROP TRIGGER IF EXISTS update_mobile_push_tokens_updated_at ON public.mobile_push_tokens;
CREATE TRIGGER update_mobile_push_tokens_updated_at
  BEFORE UPDATE ON public.mobile_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mobile_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mobile push tokens" ON public.mobile_push_tokens;
DROP POLICY IF EXISTS "Users can insert own mobile push tokens" ON public.mobile_push_tokens;
DROP POLICY IF EXISTS "Users can update own mobile push tokens" ON public.mobile_push_tokens;
DROP POLICY IF EXISTS "Users can delete own mobile push tokens" ON public.mobile_push_tokens;

CREATE POLICY "Users can view own mobile push tokens"
  ON public.mobile_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mobile push tokens"
  ON public.mobile_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mobile push tokens"
  ON public.mobile_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mobile push tokens"
  ON public.mobile_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- push_delivery_logs intentionally has no end-user policies.
-- Service role access is used by the internal dispatch worker.
