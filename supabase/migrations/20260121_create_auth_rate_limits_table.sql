-- Create auth_rate_limits table for tracking registration and login attempts
-- This table helps prevent brute force attacks and abuse

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or IP address
  attempt_type TEXT NOT NULL, -- 'register', 'login', 'password_reset', etc.
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on identifier and attempt_type combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier_type 
ON public.auth_rate_limits(identifier, attempt_type);

-- Create index on blocked_until for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked_until 
ON public.auth_rate_limits(blocked_until);

-- Enable RLS
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own rate limit records
CREATE POLICY "Users can view own rate limits"
ON public.auth_rate_limits
FOR SELECT
USING (
  identifier = auth.email()
  OR identifier = auth.jwt()->>'email'
);

-- Policy: Service role can manage all records (for API endpoints)
CREATE POLICY "Service role can manage rate limits"
ON public.auth_rate_limits
FOR ALL
USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_auth_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_auth_rate_limits_updated_at
BEFORE UPDATE ON public.auth_rate_limits
FOR EACH ROW
EXECUTE FUNCTION update_auth_rate_limits_updated_at();

-- Create function to cleanup old rate limit records (optional, can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_auth_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.auth_rate_limits
  WHERE 
    (blocked_until IS NULL AND last_attempt_at < NOW() - INTERVAL '24 hours')
    OR (blocked_until IS NOT NULL AND blocked_until < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
