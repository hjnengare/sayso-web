-- Migration: Add profile enhancements
-- Adds bio, location, website_url, social_links, privacy_settings to profiles table
-- Ensures created_at and last_active_at columns exist

-- Add new columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
    "showActivity": true,
    "showStats": true,
    "showSavedBusinesses": false
  }'::jsonb;

-- Ensure created_at exists (should already exist, but safe to add if not)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add last_active_at column if it doesn't exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location) WHERE location IS NOT NULL;

-- Add check constraint for website_url format (basic validation)
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_website_url_format;

ALTER TABLE profiles 
  ADD CONSTRAINT check_website_url_format 
  CHECK (
    website_url IS NULL OR 
    website_url ~* '^https?://[^\s/$.?#].[^\s]*$'
  );

-- Add check constraint for bio length (max 2000 characters)
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_bio_length;

ALTER TABLE profiles 
  ADD CONSTRAINT check_bio_length 
  CHECK (bio IS NULL OR LENGTH(bio) <= 2000);

-- Create function to update last_active_at
CREATE OR REPLACE FUNCTION update_profile_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_active_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_active_at on profile updates
DROP TRIGGER IF EXISTS trigger_update_profile_last_active ON profiles;

CREATE TRIGGER trigger_update_profile_last_active
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  EXECUTE FUNCTION update_profile_last_active();

-- Add comment for documentation
COMMENT ON COLUMN profiles.bio IS 'User biography/description (max 2000 characters)';
COMMENT ON COLUMN profiles.location IS 'User location (city, state, country, etc.)';
COMMENT ON COLUMN profiles.website_url IS 'User website URL (must be valid HTTP/HTTPS URL)';
COMMENT ON COLUMN profiles.social_links IS 'JSON object containing social media links (e.g. {"instagram": "...", "x": "...", "tiktok": "..."})';
COMMENT ON COLUMN profiles.privacy_settings IS 'JSON object containing privacy preferences (showActivity, showStats, showSavedBusinesses)';
COMMENT ON COLUMN profiles.last_active_at IS 'Timestamp of last user activity (updated on profile updates and API calls)';

