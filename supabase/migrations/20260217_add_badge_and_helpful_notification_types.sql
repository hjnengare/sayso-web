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
    'business_approved',
    'claim_approved',
    'comment_reply',
    'photo_approved',
    'milestone_achievement',
    'message',
    'otp_sent',
    'otp_verified',
    'claim_status_changed',
    'docs_requested',
    'docs_received'
  ));

-- Update the comment
COMMENT ON COLUMN notifications.type IS 'Type of notification: review, business, user, highlyRated, gamification, badge_earned, review_helpful, business_approved, claim_approved, comment_reply, photo_approved, milestone_achievement, message, otp_sent, otp_verified, claim_status_changed, docs_requested, docs_received';

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

-- ============================================
-- Function: Create business approved notification
-- ============================================
CREATE OR REPLACE FUNCTION create_business_approved_notification(
  p_owner_id UUID,
  p_business_id TEXT,
  p_business_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_existing_notification UUID;
BEGIN
  -- Check for existing notification to prevent duplicates
  SELECT id INTO v_existing_notification
  FROM notifications
  WHERE user_id = p_owner_id
    AND type = 'business_approved'
    AND entity_id = p_business_id
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
    p_owner_id,
    'business_approved',
    '✅ Business Approved!',
    'Your business "' || p_business_name || '" has been approved and is now live on Sayso!',
    '/png/restaurants.png',
    'Business approved',
    '/my-businesses/businesses/' || p_business_id,
    p_business_id,
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_business_approved_notification IS 'Creates a business approved notification, preventing duplicates';

-- ============================================
-- Function: Create claim approved notification
-- ============================================
CREATE OR REPLACE FUNCTION create_claim_approved_notification(
  p_claimant_id UUID,
  p_business_id TEXT,
  p_business_name TEXT,
  p_claim_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_existing_notification UUID;
  v_entity_id TEXT;
BEGIN
  -- Use claim_id if provided, otherwise business_id
  v_entity_id := COALESCE(p_claim_id, p_business_id);
  
  -- Check for existing notification to prevent duplicates
  SELECT id INTO v_existing_notification
  FROM notifications
  WHERE user_id = p_claimant_id
    AND type = 'claim_approved'
    AND entity_id = v_entity_id
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
    p_claimant_id,
    'claim_approved',
    '🎉 Claim Approved!',
    'Your business claim for "' || p_business_name || '" has been approved! You can now manage your business.',
    '/png/restaurants.png',
    'Claim approved',
    '/my-businesses/businesses/' || p_business_id,
    v_entity_id,
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_claim_approved_notification IS 'Creates a claim approved notification, preventing duplicates';

-- ============================================
-- Function: Create comment reply notification
-- ============================================
CREATE OR REPLACE FUNCTION create_comment_reply_notification(
  p_review_owner_id UUID,
  p_replier_id UUID,
  p_review_id UUID,
  p_reply_id TEXT,
  p_replier_name TEXT DEFAULT 'Someone',
  p_business_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_existing_notification UUID;
BEGIN
  -- Don't create notification if user replied to their own review
  IF p_review_owner_id = p_replier_id THEN
    RETURN NULL;
  END IF;
  
  -- Check for existing notification for this reply
  SELECT id INTO v_existing_notification
  FROM notifications
  WHERE user_id = p_review_owner_id
    AND type = 'comment_reply'
    AND entity_id = p_reply_id
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
    p_review_owner_id,
    'comment_reply',
    '💬 New Reply',
    p_replier_name || ' replied to your review',
    '/png/restaurants.png',
    'Comment reply',
    COALESCE('/business/' || p_business_slug, '/profile'),
    p_reply_id,
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_comment_reply_notification IS 'Creates a comment reply notification, preventing duplicates and self-notifications';

-- ============================================
-- Function: Create milestone achievement notification
-- ============================================
CREATE OR REPLACE FUNCTION create_milestone_notification(
  p_user_id UUID,
  p_milestone_type TEXT,
  p_milestone_value INTEGER,
  p_title TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_existing_notification UUID;
  v_entity_id TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Construct entity_id from milestone type and value
  v_entity_id := p_milestone_type || '_' || p_milestone_value::TEXT;
  
  -- Check for existing notification to prevent duplicates
  SELECT id INTO v_existing_notification
  FROM notifications
  WHERE user_id = p_user_id
    AND type = 'milestone_achievement'
    AND entity_id = v_entity_id
  LIMIT 1;
  
  -- If notification already exists, return existing ID
  IF v_existing_notification IS NOT NULL THEN
    RETURN v_existing_notification;
  END IF;
  
  -- Use provided title/message or generate defaults
  v_title := COALESCE(p_title, '🎯 Milestone Reached!');
  v_message := COALESCE(p_message, 'You''ve reached a new milestone: ' || p_milestone_value || ' ' || p_milestone_type);
  
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
    'milestone_achievement',
    v_title,
    v_message,
    '/png/restaurants.png',
    'Milestone achievement',
    '/profile',
    v_entity_id,
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_milestone_notification IS 'Creates a milestone achievement notification, preventing duplicates';
