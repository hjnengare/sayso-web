-- =============================================
-- Badge System Implementation
-- =============================================
-- This migration creates the complete badge system for Sayso
-- Based on the Badge Notes 26 November specification
--
-- Tables:
--   - badges: Badge catalog/definitions
--   - user_badges: Awarded badges
--   - user_badge_progress: Progress tracking (optional but recommended)
--
-- Functions:
--   - award_badges_for_user: Main badge awarding logic
--   - check_and_award_badges: Trigger function for badge checks
--
-- Triggers:
--   - On reviews INSERT
--   - On review_images INSERT
--   - On review_helpful_votes INSERT
-- =============================================

-- =============================================
-- 1. Badges Catalog Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  badge_group TEXT NOT NULL CHECK (badge_group IN ('milestone', 'category_explorer', 'category_specialist', 'community', 'personality')),
  category_key TEXT NULL, -- Only for category-specific badges (e.g., 'food-drink', 'shopping')
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'review_count',
    'category_review_count',
    'distinct_category_count',
    'photo_count',
    'helpful_votes_total',
    'helpful_votes_received',
    'first_review_for_business',
    'review_low_review_business_count',
    'distinct_businesses_in_suburb',
    'streak_days',
    'weekly_streak',
    'loyal_reviewer' -- Same business reviewed twice
  )),
  threshold INTEGER NULL, -- For numeric thresholds (e.g., 10 reviews, 15 photos)
  meta JSONB NULL DEFAULT '{}'::jsonb, -- Special rules (e.g., "review 10+ places in one suburb")
  icon_name TEXT NULL, -- Icon identifier for UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for badges
CREATE INDEX IF NOT EXISTS idx_badges_badge_group ON public.badges(badge_group);
CREATE INDEX IF NOT EXISTS idx_badges_category_key ON public.badges(category_key) WHERE category_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_badges_rule_type ON public.badges(rule_type);

-- =============================================
-- 2. User Badges Table (Awarded Badges)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Indexes for user_badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_awarded_at ON public.user_badges(awarded_at DESC);

-- =============================================
-- 3. User Badge Progress Table (Fast UI + Avoids Recalculating)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_badge_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Indexes for user_badge_progress
CREATE INDEX IF NOT EXISTS idx_user_badge_progress_user_id ON public.user_badge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_progress_badge_id ON public.user_badge_progress(badge_id);

-- =============================================
-- 4. Row Level Security (RLS)
-- =============================================
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badge_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read badges" ON public.badges;
DROP POLICY IF EXISTS "Users can read their own badges" ON public.user_badges;
DROP POLICY IF EXISTS "No direct insert to user_badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can read their own badge progress" ON public.user_badge_progress;
DROP POLICY IF EXISTS "No direct insert/update to user_badge_progress" ON public.user_badge_progress;
DROP POLICY IF EXISTS "No direct update to user_badge_progress" ON public.user_badge_progress;

-- Badges: Public read access
CREATE POLICY "Anyone can read badges"
  ON public.badges FOR SELECT
  TO anon, authenticated
  USING (true);

-- User badges: Users can read their own badges
CREATE POLICY "Users can read their own badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User badges: Only database functions/triggers can insert (no direct client inserts)
-- SECURITY DEFINER functions will bypass this policy
CREATE POLICY "No direct insert to user_badges"
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Block all client inserts, only allow triggers/functions

-- User badge progress: Users can read their own progress
CREATE POLICY "Users can read their own badge progress"
  ON public.user_badge_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User badge progress: Only database functions/triggers can insert/update
-- SECURITY DEFINER functions will bypass these policies
CREATE POLICY "No direct insert/update to user_badge_progress"
  ON public.user_badge_progress FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct update to user_badge_progress"
  ON public.user_badge_progress FOR UPDATE
  TO authenticated
  USING (false);

-- =============================================
-- 5. Badge Awarding Function
-- =============================================
CREATE OR REPLACE FUNCTION public.award_badges_for_user(
  p_user_id UUID,
  p_event_type TEXT, -- 'review_created', 'photo_added', 'helpful_vote_received'
  p_event_data JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(awarded_badge_id TEXT, badge_name TEXT) AS $$
DECLARE
  v_review_count INTEGER;
  v_photo_count INTEGER;
  v_helpful_votes_received INTEGER;
  v_helpful_votes_total INTEGER;
  v_distinct_categories INTEGER;
  v_category_review_count INTEGER;
  v_business_id UUID;
  v_business_review_count INTEGER;
  v_category_key TEXT;
  v_suburb TEXT;
  v_distinct_businesses_in_suburb INTEGER;
  v_badge_record RECORD;
  v_awarded_badges TEXT[];
BEGIN
  -- Initialize awarded badges array
  v_awarded_badges := ARRAY[]::TEXT[];

  -- Get current user stats
  SELECT 
    COUNT(DISTINCT r.id)::INTEGER,
    COUNT(DISTINCT ri.id)::INTEGER,
    COALESCE(SUM(r.helpful_count), 0)::INTEGER,
    COALESCE((SELECT COUNT(*)::INTEGER FROM review_helpful_votes rhv 
              INNER JOIN reviews r2 ON r2.id = rhv.review_id 
              WHERE r2.user_id = p_user_id), 0),
    COUNT(DISTINCT b.interest_id)::INTEGER
  INTO 
    v_review_count,
    v_photo_count,
    v_helpful_votes_received,
    v_helpful_votes_total,
    v_distinct_categories
  FROM reviews r
  LEFT JOIN review_images ri ON ri.review_id = r.id
  LEFT JOIN businesses b ON b.id = r.business_id
  WHERE r.user_id = p_user_id;

  -- Extract event-specific data
  IF p_event_type = 'review_created' THEN
    v_business_id := (p_event_data->>'business_id')::UUID;
    v_category_key := (p_event_data->>'category_key')::TEXT;
    v_suburb := (p_event_data->>'suburb')::TEXT;
    
    -- Get business review count (for "Early Bird" and "Discoverer" badges)
    IF v_business_id IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_business_review_count
      FROM reviews
      WHERE business_id = v_business_id
      AND created_at < (SELECT created_at FROM reviews WHERE id = (p_event_data->>'review_id')::UUID);
    END IF;
    
    -- Get category-specific review count
    IF v_category_key IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_category_review_count
      FROM reviews r
      INNER JOIN businesses b ON b.id = r.business_id
      WHERE r.user_id = p_user_id
      AND b.interest_id = v_category_key;
    END IF;
    
    -- Get distinct businesses in suburb (for "Neighbourhood Plug" badge)
    IF v_suburb IS NOT NULL THEN
      SELECT COUNT(DISTINCT r.business_id)::INTEGER INTO v_distinct_businesses_in_suburb
      FROM reviews r
      INNER JOIN businesses b ON b.id = r.business_id
      WHERE r.user_id = p_user_id
      AND b.location ILIKE '%' || v_suburb || '%';
    END IF;
  END IF;

  -- Check all applicable badges
  FOR v_badge_record IN 
    SELECT * FROM public.badges
    WHERE (
      -- Milestone badges (review_count)
      (rule_type = 'review_count' AND threshold IS NOT NULL AND v_review_count >= threshold)
      OR
      -- Category specialist badges (category_review_count)
      (rule_type = 'category_review_count' 
       AND category_key IS NOT NULL 
       AND threshold IS NOT NULL
       AND (v_category_key = category_key OR category_key IS NULL)
       AND v_category_review_count >= threshold)
      OR
      -- Category explorer badges (distinct_category_count)
      (rule_type = 'distinct_category_count' 
       AND threshold IS NOT NULL 
       AND v_distinct_categories >= threshold)
      OR
      -- Photo badges (photo_count)
      (rule_type = 'photo_count' 
       AND threshold IS NOT NULL 
       AND v_photo_count >= threshold)
      OR
      -- Helpful votes received (helpful_votes_received)
      (rule_type = 'helpful_votes_received' 
       AND threshold IS NOT NULL 
       AND v_helpful_votes_received >= threshold)
      OR
      -- Helpful votes total (helpful_votes_total)
      (rule_type = 'helpful_votes_total' 
       AND threshold IS NOT NULL 
       AND v_helpful_votes_total >= threshold)
      OR
      -- Early bird (first_review_for_business)
      (rule_type = 'first_review_for_business' 
       AND p_event_type = 'review_created'
       AND v_business_review_count = 0)
      OR
      -- Discoverer (review_low_review_business_count)
      (rule_type = 'review_low_review_business_count' 
       AND p_event_type = 'review_created'
       AND threshold IS NOT NULL
       AND v_business_review_count < threshold)
      OR
      -- Neighbourhood plug (distinct_businesses_in_suburb)
      (rule_type = 'distinct_businesses_in_suburb' 
       AND p_event_type = 'review_created'
       AND threshold IS NOT NULL
       AND v_distinct_businesses_in_suburb >= threshold)
    )
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = v_badge_record.id
    ) THEN
      -- Award the badge
      INSERT INTO public.user_badges (user_id, badge_id, awarded_at)
      VALUES (p_user_id, v_badge_record.id, NOW())
      ON CONFLICT (user_id, badge_id) DO NOTHING;
      
      -- Add to awarded badges array
      v_awarded_badges := array_append(v_awarded_badges, v_badge_record.id);
      
      -- Return the awarded badge
      RETURN QUERY SELECT v_badge_record.id, v_badge_record.name;
    END IF;
  END LOOP;

  -- Update progress for all relevant badges
  -- This is a simplified version - you can expand this to track progress for badges not yet earned
  FOR v_badge_record IN 
    SELECT * FROM public.badges
    WHERE threshold IS NOT NULL
  LOOP
    DECLARE
      v_current_progress INTEGER := 0;
      v_target INTEGER := v_badge_record.threshold;
    BEGIN
      -- Calculate current progress based on rule_type
      CASE v_badge_record.rule_type
        WHEN 'review_count' THEN
          v_current_progress := v_review_count;
        WHEN 'photo_count' THEN
          v_current_progress := v_photo_count;
        WHEN 'helpful_votes_received' THEN
          v_current_progress := v_helpful_votes_received;
        WHEN 'helpful_votes_total' THEN
          v_current_progress := v_helpful_votes_total;
        WHEN 'distinct_category_count' THEN
          v_current_progress := v_distinct_categories;
        WHEN 'category_review_count' THEN
          IF v_badge_record.category_key = v_category_key THEN
            v_current_progress := v_category_review_count;
          END IF;
        ELSE
          v_current_progress := 0;
      END CASE;

      -- Upsert progress (only if badge not yet earned)
      IF NOT EXISTS (
        SELECT 1 FROM public.user_badges
        WHERE user_id = p_user_id AND badge_id = v_badge_record.id
      ) THEN
        INSERT INTO public.user_badge_progress (user_id, badge_id, progress, target, updated_at)
        VALUES (p_user_id, v_badge_record.id, v_current_progress, v_target, NOW())
        ON CONFLICT (user_id, badge_id) DO UPDATE SET
          progress = v_current_progress,
          updated_at = NOW();
      END IF;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. Trigger Function for Badge Checks
-- =============================================
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_category_key TEXT;
  v_location TEXT;
  v_suburb TEXT;
  v_review_id UUID;
  v_event_data JSONB;
BEGIN
  -- Determine user_id and event type based on trigger
  IF TG_TABLE_NAME = 'reviews' THEN
    v_user_id := NEW.user_id;
    v_business_id := NEW.business_id;
    v_review_id := NEW.id;
    
    -- Get business category and location
    SELECT b.interest_id, b.location INTO v_category_key, v_location
    FROM businesses b
    WHERE b.id = v_business_id;
    
    -- Extract suburb from location (simple extraction - can be improved)
    -- Assumes location format like "Cape Town, V&A Waterfront" or "Cape Town"
    v_suburb := SPLIT_PART(v_location, ',', 1);
    
    -- Build event data
    v_event_data := jsonb_build_object(
      'review_id', v_review_id,
      'business_id', v_business_id,
      'category_key', v_category_key,
      'suburb', v_suburb
    );
    
    -- Award badges
    PERFORM public.award_badges_for_user(v_user_id, 'review_created', v_event_data);
    
  ELSIF TG_TABLE_NAME = 'review_images' THEN
    -- Get user_id from the review
    SELECT r.user_id INTO v_user_id
    FROM reviews r
    WHERE r.id = NEW.review_id;
    
    IF v_user_id IS NOT NULL THEN
      v_event_data := jsonb_build_object('review_id', NEW.review_id);
      PERFORM public.award_badges_for_user(v_user_id, 'photo_added', v_event_data);
    END IF;
    
  ELSIF TG_TABLE_NAME = 'review_helpful_votes' THEN
    -- Get user_id from the review (the review author receives the helpful vote)
    SELECT r.user_id INTO v_user_id
    FROM reviews r
    WHERE r.id = NEW.review_id;
    
    IF v_user_id IS NOT NULL THEN
      v_event_data := jsonb_build_object('review_id', NEW.review_id);
      PERFORM public.award_badges_for_user(v_user_id, 'helpful_vote_received', v_event_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. Create Triggers
-- =============================================
-- Trigger on reviews INSERT
DROP TRIGGER IF EXISTS trigger_award_badges_on_review ON reviews;
CREATE TRIGGER trigger_award_badges_on_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges();

-- Trigger on review_images INSERT
DROP TRIGGER IF EXISTS trigger_award_badges_on_photo ON review_images;
CREATE TRIGGER trigger_award_badges_on_photo
  AFTER INSERT ON review_images
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges();

-- Trigger on review_helpful_votes INSERT
DROP TRIGGER IF EXISTS trigger_award_badges_on_helpful_vote ON review_helpful_votes;
CREATE TRIGGER trigger_award_badges_on_helpful_vote
  AFTER INSERT ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges();

-- =============================================
-- 8. Seed Initial Badges
-- =============================================
-- Milestone Badges
INSERT INTO public.badges (id, name, description, badge_group, rule_type, threshold, icon_name) VALUES
  ('milestone_new_voice', 'New Voice', 'Write your first review', 'milestone', 'review_count', 1, 'mic'),
  ('milestone_contributor', 'Contributor', 'Write 5 reviews', 'milestone', 'review_count', 5, 'pen-tool'),
  ('milestone_reviewer', 'Reviewer', 'Write 10 reviews', 'milestone', 'review_count', 10, 'star'),
  ('milestone_expert', 'Expert Reviewer', 'Write 50 reviews', 'milestone', 'review_count', 50, 'award'),
  ('milestone_legend', 'Review Legend', 'Write 100 reviews', 'milestone', 'review_count', 100, 'crown')
ON CONFLICT (id) DO NOTHING;

-- Photo Badges
INSERT INTO public.badges (id, name, description, badge_group, rule_type, threshold, icon_name) VALUES
  ('photo_take_a_pic', 'Take a Pic!', 'Upload your first photo', 'community', 'photo_count', 1, 'camera'),
  ('photo_visual_storyteller', 'Visual Storyteller', 'Upload 15 photos', 'community', 'photo_count', 15, 'image')
ON CONFLICT (id) DO NOTHING;

-- Helpful Votes Badges
INSERT INTO public.badges (id, name, description, badge_group, rule_type, threshold, icon_name) VALUES
  ('helpful_reviewer', 'Helpful Reviewer', 'Receive 10 helpful votes', 'community', 'helpful_votes_received', 10, 'thumbs-up'),
  ('helpful_hero', 'Helpful Hero', 'Receive 100 helpful votes', 'community', 'helpful_votes_received', 100, 'heart'),
  ('helpful_legend', 'Helpful Legend', 'Receive 500 helpful votes', 'community', 'helpful_votes_received', 500, 'trophy')
ON CONFLICT (id) DO NOTHING;

-- Category Explorer Badges
INSERT INTO public.badges (id, name, description, badge_group, rule_type, threshold, icon_name) VALUES
  ('explorer_beginner', 'Category Explorer', 'Review businesses in 3 different categories', 'category_explorer', 'distinct_category_count', 3, 'compass'),
  ('explorer_advanced', 'Category Master', 'Review businesses in 10 different categories', 'category_explorer', 'distinct_category_count', 10, 'map')
ON CONFLICT (id) DO NOTHING;

-- Special Event Badges
INSERT INTO public.badges (id, name, description, badge_group, rule_type, threshold, icon_name, meta) VALUES
  ('early_bird', 'Early Bird', 'Be the first to review a business', 'community', 'first_review_for_business', NULL, 'sunrise', '{}'::jsonb),
  ('discoverer', 'Discoverer', 'Review a business with fewer than 3 reviews', 'community', 'review_low_review_business_count', 3, 'search', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Category Specialist Badges (example for Food & Drink)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, threshold, icon_name) VALUES
  ('specialist_food_beginner', 'Food Enthusiast', 'Write 3 reviews in Food & Drink', 'category_specialist', 'food-drink', 'category_review_count', 3, 'utensils'),
  ('specialist_food_intermediate', 'Food Expert', 'Write 10 reviews in Food & Drink', 'category_specialist', 'food-drink', 'category_review_count', 10, 'chef-hat'),
  ('specialist_food_master', 'Food Master', 'Write 25 reviews in Food & Drink', 'category_specialist', 'food-drink', 'category_review_count', 25, 'award')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 9. Comments for Documentation
-- =============================================
COMMENT ON TABLE public.badges IS 'Badge catalog/definitions. Contains all available badges with their rules and thresholds.';
COMMENT ON TABLE public.user_badges IS 'Awarded badges to users. Only database triggers can insert into this table.';
COMMENT ON TABLE public.user_badge_progress IS 'Progress tracking for badges not yet earned. Used for UI display and performance.';
COMMENT ON FUNCTION public.award_badges_for_user IS 'Main badge awarding function. Called by triggers when events occur (review created, photo added, helpful vote received).';
COMMENT ON FUNCTION public.check_and_award_badges IS 'Trigger function that determines event type and calls award_badges_for_user with appropriate data.';

