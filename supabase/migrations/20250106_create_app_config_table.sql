-- ============================================
-- App Config Table for API Keys
-- ============================================
-- Alternative to using database settings for storing API keys
-- More secure and easier to manage
-- ============================================

-- Create app_config table for storing configuration values
CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Only system/service role can access config
CREATE POLICY "Service role can manage config"
  ON app_config
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to get config value
CREATE OR REPLACE FUNCTION get_config(p_key VARCHAR)
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT value INTO v_value
  FROM app_config
  WHERE key = p_key;
  
  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set config value (with description)
CREATE OR REPLACE FUNCTION set_config(
  p_key VARCHAR(255), 
  p_value TEXT, 
  p_description TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO app_config ("key", value, description, updated_at)
  VALUES (p_key::VARCHAR(255), p_value::TEXT, p_description::TEXT, NOW())
  ON CONFLICT ("key") DO UPDATE SET
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, app_config.description),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set config value (without description)
CREATE OR REPLACE FUNCTION set_config(
  p_key VARCHAR(255), 
  p_value TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO app_config ("key", value, updated_at)
  VALUES (p_key::VARCHAR(255), p_value::TEXT, NOW())
  ON CONFLICT ("key") DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE app_config IS 'Application configuration values including API keys';
COMMENT ON FUNCTION get_config IS 'Retrieves a configuration value by key';
COMMENT ON FUNCTION set_config IS 'Sets or updates a configuration value';

-- Example: Set Ticketmaster API key
-- SELECT set_config('TICKETMASTER_API_KEY', 'your_api_key_here', 'Ticketmaster API key for fetching events');

