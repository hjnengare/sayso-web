-- ============================================
-- Badge and Helpful Vote Notifications Migration
-- ============================================
-- This migration adds:
-- 1. 'badge_earned' and 'review_helpful' notification types
-- 2. entity_id column for referencing the related entity (badge_id, review_id, etc.)
-- 3. Indexes for performance
-- ============================================

-- Add entity_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN entity_id TEXT;
    COMMENT ON COLUMN notifications.entity_id IS 'Reference to the related entity (badge_id, review_id, business_id, etc.)';
  END IF;
END $$;

-- Update the notifications table type constraint to include new types
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'review', 
    'business', 
    'user', 
    'highlyRated', 
    'gamification',
    'badge_earned',
    'review_helpful',
    'message',
    'otp_sent',
    'otp_verified',
    'claim_status_changed',
    'docs_requested',
    'docs_received'
  ));

-- Update the comment
COMMENT ON COLUMN notifications.type IS 'Type of notification: review, business, user, highlyRated, gamification, badge_earned, review_helpful, message, otp_sent, otp_verified, claim_status_changed, docs_requested, docs_received';

-- Create index for entity_id lookups
CREATE INDEX IF NOT EXISTS idx_notifications_entity_id ON notifications(entity_id);

-- Create composite index for checking duplicate notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_entity ON notifications(user_id, type, entity_id);

-- ============================================
-- Function: Create badge earned notification
-- ============================================
CREATE OR REPLACE FUNCTION create_badge_notification(
  p_user_id UUID,
  p_badge_id TEXT,
  p_badge_name TEXT,
  p_badge_icon TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_existing_notification UUID;
BEGIN
  -- Check for existing notification to prevent duplicates
  SELECT id INTO v_existing_notification
  FROM notifications
  WHERE user_id = p_user_id
    AND type = 'badge_earned'
    AND entity_id = p_badge_id
  LIMIT 1;
  
  -- If notification already exists, return existing ID
  IF v_existing_notification IS NOT NULL THEN
    RETURN v_existing_notification;
  END IF;
  
  -- Create new notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    image,
    image_alt,
    link,
    entity_id,
    read
  ) VALUES (
    p_user_id,
    'badge_earned',
    '🏆 Badge Earned!',
    'Congratulations! You earned the "' || p_badge_name || '" badge!',
    COALESCE(p_badge_icon, '/badges/default-badge.png'),
    p_badge_name || ' badge',
    '/achievements',
    p_badge_id,
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_badge_notification IS 'Creates a badge earned notification, preventing duplicates';

-- ============================================
-- Function: Create helpful vote notification
-- ============================================
CREATE OR REPLACE FUNCTION create_helpful_notification(
  p_review_owner_id UUID,
  p_voter_id UUID,
  p_review_id UUID,
  p_voter_name TEXT DEFAULT 'Someone'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_existing_notification UUID;
BEGIN
  -- Don't create notification if user voted on their own review
  IF p_review_owner_id = p_voter_id THEN
    RETURN NULL;
  END IF;
  
  -- Check for existing notification for this review/voter combination
  -- We allow multiple "helpful" notifications for a review, but only one per voter
  SELECT id INTO v_existing_notification
  FROM notifications
  WHERE user_id = p_review_owner_id
    AND type = 'review_helpful'
    AND entity_id = p_review_id || ':' || p_voter_id
  LIMIT 1;
  
  -- If notification already exists for this voter, return existing ID
  IF v_existing_notification IS NOT NULL THEN
    RETURN v_existing_notification;
  END IF;
  
  -- Create new notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    image,
    image_alt,
    link,
    entity_id,
    read
  ) VALUES (
    p_review_owner_id,
    'review_helpful',
    '👍 Helpful Vote',
    p_voter_name || ' found your review helpful!',
    '/png/helpful-icon.png',
    'Helpful vote',
    '/profile',
    p_review_id || ':' || p_voter_id,
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_helpful_notification IS 'Creates a helpful vote notification, preventing duplicates and self-notifications';
