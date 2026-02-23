-- Fix notify_badge_earned to use icon_name column (icon_path no longer exists)
CREATE OR REPLACE FUNCTION public.notify_badge_earned()
RETURNS TRIGGER AS $$
DECLARE
  v_badge RECORD;
  v_icon TEXT;
BEGIN
  -- Look up badge metadata (name + icon filename)
  SELECT id, name, icon_name
  INTO v_badge
  FROM public.badges
  WHERE id = NEW.badge_id
  LIMIT 1;

  IF v_badge IS NULL THEN
    RAISE NOTICE '[notify_badge_earned] badge not found for %', NEW.badge_id;
    RETURN NEW;
  END IF;

  -- Build icon path from icon_name (stored as filename)
  v_icon := CASE
    WHEN v_badge.icon_name IS NULL OR length(trim(v_badge.icon_name)) = 0 THEN '/badges/default-badge.png'
    WHEN v_badge.icon_name LIKE '/%' THEN v_badge.icon_name
    ELSE '/badges/' || v_badge.icon_name
  END;

  PERFORM public.create_badge_notification(
    NEW.user_id,
    NEW.badge_id,
    v_badge.name,
    v_icon
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to ensure it points to the updated function
DROP TRIGGER IF EXISTS trigger_notify_badge_earned ON public.user_badges;
CREATE TRIGGER trigger_notify_badge_earned
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_badge_earned();
