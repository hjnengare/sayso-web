-- Migration: Add last_activity_at to businesses table
-- This column tracks the most recent activity on a business for freshness scoring
-- Computed as: GREATEST(created_at, updated_at, latest_review_at)

-- Add the column
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Create index for efficient freshness queries
CREATE INDEX IF NOT EXISTS idx_businesses_last_activity_at
ON businesses(last_activity_at DESC NULLS LAST)
WHERE status = 'active';

-- Backfill existing businesses with computed last_activity_at
-- Uses the most recent of: created_at, updated_at, or latest review date
UPDATE businesses b
SET last_activity_at = GREATEST(
  b.created_at,
  b.updated_at,
  COALESCE(
    (SELECT MAX(r.created_at) FROM reviews r WHERE r.business_id = b.id),
    b.created_at
  )
);

-- Set default for new businesses
ALTER TABLE businesses
ALTER COLUMN last_activity_at SET DEFAULT NOW();

-- Create function to update last_activity_at when a review is added
CREATE OR REPLACE FUNCTION update_business_last_activity_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE businesses
  SET last_activity_at = NOW()
  WHERE id = NEW.business_id;
  RETURN NEW;
END;
$$;

-- Create trigger on reviews table
DROP TRIGGER IF EXISTS trigger_update_business_activity_on_review ON reviews;
CREATE TRIGGER trigger_update_business_activity_on_review
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_business_last_activity_on_review();

-- Create function to update last_activity_at when business is updated
CREATE OR REPLACE FUNCTION update_business_last_activity_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if meaningful fields changed (not just last_activity_at itself)
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.address IS DISTINCT FROM OLD.address
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.website IS DISTINCT FROM OLD.website
     OR NEW.image_url IS DISTINCT FROM OLD.image_url
     OR NEW.price_range IS DISTINCT FROM OLD.price_range
     OR NEW.verified IS DISTINCT FROM OLD.verified
  THEN
    NEW.last_activity_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on businesses table
DROP TRIGGER IF EXISTS trigger_update_business_activity ON businesses;
CREATE TRIGGER trigger_update_business_activity
BEFORE UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION update_business_last_activity_on_update();

-- Add comment
COMMENT ON COLUMN businesses.last_activity_at IS
'Most recent activity timestamp (review, update, etc). Used for freshness scoring in recommendations.';
