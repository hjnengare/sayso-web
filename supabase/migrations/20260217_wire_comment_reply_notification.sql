-- ============================================
-- Wire comment_reply notification type into reply trigger
-- ============================================
-- Updates notify_on_new_reply() so the review author receives a
-- 'comment_reply' type notification (with its own icon/color in the UI)
-- instead of the generic 'review' type.
-- Business owner still gets a 'review' type notification.
-- ============================================

CREATE OR REPLACE FUNCTION notify_on_new_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_review RECORD;
  v_business RECORD;
  v_replier_name TEXT;
  v_author_link TEXT;
  v_owner_link TEXT;
BEGIN
  -- Look up the parent review
  SELECT id, user_id, business_id
  INTO v_review
  FROM reviews
  WHERE id = NEW.review_id;

  IF v_review IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the business
  SELECT id, name, slug, owner_id
  INTO v_business
  FROM businesses
  WHERE id = v_review.business_id;

  IF v_business IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get replier display name
  -- If the replier is the business owner, use the business name
  IF NEW.user_id = v_business.owner_id THEN
    v_replier_name := v_business.name;
  ELSE
    SELECT COALESCE(display_name, 'Someone')
    INTO v_replier_name
    FROM profiles
    WHERE user_id = NEW.user_id;

    IF v_replier_name IS NULL THEN
      v_replier_name := 'Someone';
    END IF;
  END IF;

  -- Build links
  v_author_link := '/business/' || COALESCE(v_business.slug, v_business.id::TEXT);
  v_owner_link  := '/my-businesses/businesses/' || v_business.id::TEXT || '/reviews';

  -- Notify review author using comment_reply type (skip if replier IS the author)
  IF NEW.user_id != v_review.user_id THEN
    PERFORM create_comment_reply_notification(
      v_review.user_id,
      NEW.user_id,
      NEW.review_id,
      NEW.id::TEXT,
      v_replier_name,
      v_business.slug
    );
  END IF;

  -- Notify business owner (skip if replier IS the owner,
  -- or if owner IS the review author — they already got notified above)
  IF v_business.owner_id IS NOT NULL
     AND NEW.user_id != v_business.owner_id
     AND v_business.owner_id != v_review.user_id
  THEN
    PERFORM create_review_notification(
      v_business.owner_id,
      'Reply on Review',
      v_replier_name || ' replied to a review on ' || v_business.name,
      NULL,
      NULL,
      v_owner_link
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_on_new_reply IS 'Trigger: notifies review author (comment_reply) and business owner (review) when a reply is posted';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
