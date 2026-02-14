-- Fix Postgres 42703: column b.interest_id does not exist
-- public.businesses now uses primary_category_slug / primary_subcategory_slug (20260210).
-- Badge trigger/helpers still referenced b.interest_id; replace with b.primary_category_slug.

-- =============================================
-- 1. check_and_award_badges (trigger on reviews INSERT)
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
  IF TG_TABLE_NAME = 'reviews' THEN
    v_user_id := NEW.user_id;
    v_business_id := NEW.business_id;
    v_review_id := NEW.id;

    -- Get business category (slug) and location; use primary_category_slug (replaces interest_id)
    SELECT b.primary_category_slug, b.location INTO v_category_key, v_location
    FROM businesses b
    WHERE b.id = v_business_id;

    v_suburb := SPLIT_PART(COALESCE(v_location, ''), ',', 1);

    v_event_data := jsonb_build_object(
      'review_id', v_review_id,
      'business_id', v_business_id,
      'category_key', v_category_key,
      'suburb', v_suburb
    );

    PERFORM public.award_badges_for_user(v_user_id, 'review_created', v_event_data);

  ELSIF TG_TABLE_NAME = 'review_images' THEN
    SELECT r.user_id INTO v_user_id
    FROM reviews r
    WHERE r.id = NEW.review_id;

    IF v_user_id IS NOT NULL THEN
      v_event_data := jsonb_build_object('review_id', NEW.review_id);
      PERFORM public.award_badges_for_user(v_user_id, 'photo_added', v_event_data);
    END IF;

  ELSIF TG_TABLE_NAME = 'review_helpful_votes' THEN
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
-- 2. award_badges_for_user (b.interest_id -> b.primary_category_slug)
-- =============================================
CREATE OR REPLACE FUNCTION public.award_badges_for_user(
  p_user_id UUID,
  p_event_type TEXT,
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
  v_awarded_badges := ARRAY[]::TEXT[];

  SELECT 
    COUNT(DISTINCT r.id)::INTEGER,
    COUNT(DISTINCT ri.id)::INTEGER,
    COALESCE(SUM(r.helpful_count), 0)::INTEGER,
    COALESCE((SELECT COUNT(*)::INTEGER FROM review_helpful_votes rhv 
              INNER JOIN reviews r2 ON r2.id = rhv.review_id 
              WHERE r2.user_id = p_user_id), 0),
    COUNT(DISTINCT b.primary_category_slug)::INTEGER
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

  IF p_event_type = 'review_created' THEN
    v_business_id := (p_event_data->>'business_id')::UUID;
    v_category_key := (p_event_data->>'category_key')::TEXT;
    v_suburb := (p_event_data->>'suburb')::TEXT;

    IF v_business_id IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_business_review_count
      FROM reviews
      WHERE business_id = v_business_id
      AND created_at < (SELECT created_at FROM reviews WHERE id = (p_event_data->>'review_id')::UUID);
    END IF;

    IF v_category_key IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_category_review_count
      FROM reviews r
      INNER JOIN businesses b ON b.id = r.business_id
      WHERE r.user_id = p_user_id
      AND b.primary_category_slug = v_category_key;
    END IF;

    IF v_suburb IS NOT NULL THEN
      SELECT COUNT(DISTINCT r.business_id)::INTEGER INTO v_distinct_businesses_in_suburb
      FROM reviews r
      INNER JOIN businesses b ON b.id = r.business_id
      WHERE r.user_id = p_user_id
      AND b.location ILIKE '%' || v_suburb || '%';
    END IF;
  END IF;

  FOR v_badge_record IN 
    SELECT * FROM public.badges
    WHERE (
      (rule_type = 'review_count' AND threshold IS NOT NULL AND v_review_count >= threshold)
      OR
      (rule_type = 'category_review_count' 
       AND category_key IS NOT NULL 
       AND threshold IS NOT NULL
       AND (v_category_key = category_key OR category_key IS NULL)
       AND v_category_review_count >= threshold)
      OR
      (rule_type = 'distinct_category_count' 
       AND threshold IS NOT NULL 
       AND v_distinct_categories >= threshold)
      OR
      (rule_type = 'photo_count' 
       AND threshold IS NOT NULL 
       AND v_photo_count >= threshold)
      OR
      (rule_type = 'helpful_votes_received' 
       AND threshold IS NOT NULL 
       AND v_helpful_votes_received >= threshold)
      OR
      (rule_type = 'helpful_votes_total' 
       AND threshold IS NOT NULL 
       AND v_helpful_votes_total >= threshold)
      OR
      (rule_type = 'first_review_for_business' 
       AND p_event_type = 'review_created'
       AND v_business_review_count = 0)
      OR
      (rule_type = 'review_low_review_business_count' 
       AND p_event_type = 'review_created'
       AND threshold IS NOT NULL
       AND v_business_review_count < threshold)
      OR
      (rule_type = 'distinct_businesses_in_suburb' 
       AND p_event_type = 'review_created'
       AND threshold IS NOT NULL
       AND v_distinct_businesses_in_suburb >= threshold)
    )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = v_badge_record.id
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_id, awarded_at)
      VALUES (p_user_id, v_badge_record.id, NOW())
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      v_awarded_badges := array_append(v_awarded_badges, v_badge_record.id);
      RETURN QUERY SELECT v_badge_record.id, v_badge_record.name;
    END IF;
  END LOOP;

  -- Update progress for badges not yet earned
  FOR v_badge_record IN 
    SELECT * FROM public.badges
    WHERE threshold IS NOT NULL
  LOOP
    DECLARE
      v_current_progress INTEGER := 0;
      v_target INTEGER := v_badge_record.threshold;
    BEGIN
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
-- 3. check_user_badges (helper: distinct categories use primary_category_slug)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_user_badges(p_user_id UUID)
RETURNS TABLE(awarded_badge_id TEXT, badge_name TEXT) AS $$
DECLARE
  v_review_count INTEGER;
  v_photo_count INTEGER;
  v_helpful_votes_received INTEGER;
  v_helpful_votes_total INTEGER;
  v_distinct_categories INTEGER;
  v_badge_record RECORD;
BEGIN
  SELECT 
    COUNT(DISTINCT r.id)::INTEGER,
    COUNT(DISTINCT ri.id)::INTEGER,
    COALESCE(SUM(r.helpful_count), 0)::INTEGER,
    COALESCE((SELECT COUNT(*)::INTEGER FROM review_helpful_votes rhv 
              INNER JOIN reviews r2 ON r2.id = rhv.review_id 
              WHERE r2.user_id = p_user_id), 0),
    COUNT(DISTINCT b.primary_category_slug)::INTEGER
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

  FOR v_badge_record IN 
    SELECT * FROM public.badges
    WHERE (
      (rule_type = 'review_count' AND threshold IS NOT NULL AND v_review_count >= threshold)
      OR
      (rule_type = 'photo_count' AND threshold IS NOT NULL AND v_photo_count >= threshold)
      OR
      (rule_type = 'helpful_votes_received' AND threshold IS NOT NULL AND v_helpful_votes_received >= threshold)
      OR
      (rule_type = 'helpful_votes_total' AND threshold IS NOT NULL AND v_helpful_votes_total >= threshold)
      OR
      (rule_type = 'distinct_category_count' AND threshold IS NOT NULL AND v_distinct_categories >= threshold)
    )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = v_badge_record.id
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_id, awarded_at)
      VALUES (p_user_id, v_badge_record.id, NOW())
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      RETURN QUERY SELECT v_badge_record.id, v_badge_record.name;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_and_award_badges IS 'Trigger: award badges on review/photo/helpful_vote. Uses businesses.primary_category_slug (replaces interest_id).';
COMMENT ON FUNCTION public.award_badges_for_user IS 'Award badges for user; category logic uses primary_category_slug.';
COMMENT ON FUNCTION public.check_user_badges IS 'Manually check and award badges; distinct categories use primary_category_slug.';
