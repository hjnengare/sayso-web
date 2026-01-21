-- Saved Businesses Schema
-- Allows users to save/bookmark businesses they're interested in

CREATE TABLE IF NOT EXISTS saved_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure a user can only save a business once
  UNIQUE(user_id, business_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_businesses_user ON saved_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_business ON saved_businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_created ON saved_businesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_user_created ON saved_businesses(user_id, created_at DESC);

-- Update updated_at on change
CREATE OR REPLACE FUNCTION update_saved_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN                                                                           
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_saved_businesses_updated_at ON saved_businesses;
CREATE TRIGGER update_saved_businesses_updated_at
  BEFORE UPDATE ON saved_businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_businesses_updated_at();

-- RLS Policies
ALTER TABLE saved_businesses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can save businesses" ON saved_businesses;
DROP POLICY IF EXISTS "Users can unsave businesses" ON saved_businesses;
DROP POLICY IF EXISTS "Users can view their saved businesses" ON saved_businesses;

-- Users can save businesses
CREATE POLICY "Users can save businesses"
  ON saved_businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave businesses
CREATE POLICY "Users can unsave businesses"
  ON saved_businesses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can view their saved businesses
CREATE POLICY "Users can view their saved businesses"
  ON saved_businesses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE saved_businesses IS 'Stores businesses that users have saved/bookmarked';
COMMENT ON COLUMN saved_businesses.user_id IS 'The user who saved the business';
COMMENT ON COLUMN saved_businesses.business_id IS 'The business that was saved';
COMMENT ON COLUMN saved_businesses.created_at IS 'When the business was saved';

