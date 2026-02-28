-- =============================================
-- Full-sweep delete_user_account
-- =============================================
-- Replaces the previous version with an explicit, ordered delete across
-- every user-owned table, then falls back to the dynamic FK loop for
-- anything added in the future that references auth.users directly.
--
-- Deletion order: most-dependent first, profiles near end, auth.users last.

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fk_record RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF COALESCE(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- ── DMs (explicit, legacy-schema safe) ─────────────────────────────────────
  DELETE FROM public.messages
  WHERE sender_id = p_user_id
     OR sender_user_id = p_user_id;

  DELETE FROM public.conversations
  WHERE user_id = p_user_id
     OR owner_id = p_user_id;

  -- ── Activity / tracking ────────────────────────────────────────────────────
  DELETE FROM public.search_history           WHERE user_id = p_user_id;
  DELETE FROM public.saved_searches           WHERE user_id = p_user_id;
  DELETE FROM public.user_reco_impressions    WHERE user_id = p_user_id;
  DELETE FROM public.event_special_cta_clicks WHERE user_id = p_user_id;

  -- ── Notifications ──────────────────────────────────────────────────────────
  DELETE FROM public.notifications            WHERE user_id = p_user_id;

  -- ── Saved / bookmarks ─────────────────────────────────────────────────────
  DELETE FROM public.saved_businesses         WHERE user_id = p_user_id;
  DELETE FROM public.saved_events             WHERE user_id = p_user_id;
  DELETE FROM public.saved_specials           WHERE user_id = p_user_id;

  -- ── Preferences ───────────────────────────────────────────────────────────
  DELETE FROM public.user_interests           WHERE user_id = p_user_id;
  DELETE FROM public.user_subcategories       WHERE user_id = p_user_id;
  DELETE FROM public.user_dealbreakers        WHERE user_id = p_user_id;

  -- ── Badges ────────────────────────────────────────────────────────────────
  DELETE FROM public.user_badges              WHERE user_id = p_user_id;
  DELETE FROM public.user_badge_progress      WHERE user_id = p_user_id;

  -- ── Review interactions ───────────────────────────────────────────────────
  DELETE FROM public.review_helpful_votes     WHERE user_id = p_user_id;
  DELETE FROM public.review_replies           WHERE user_id = p_user_id;

  -- ── Reviews (must come before profiles) ───────────────────────────────────
  DELETE FROM public.event_reviews            WHERE user_id = p_user_id;
  DELETE FROM public.special_reviews          WHERE user_id = p_user_id;
  DELETE FROM public.reviews                  WHERE user_id = p_user_id;

  -- ── Stats ─────────────────────────────────────────────────────────────────
  DELETE FROM public.user_stats               WHERE user_id = p_user_id;

  -- ── Business ownership / claims ───────────────────────────────────────────
  DELETE FROM public.business_ownership_requests WHERE user_id = p_user_id;
  DELETE FROM public.business_owners             WHERE user_id = p_user_id;
  DELETE FROM public.business_claims             WHERE claimant_user_id = p_user_id;

  -- ── Profile ───────────────────────────────────────────────────────────────
  DELETE FROM public.profiles                 WHERE user_id = p_user_id;

  -- ── Dynamic safety net: any remaining NO ACTION / RESTRICT FKs on auth.users
  FOR fk_record IN
    SELECT DISTINCT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      cols.is_nullable
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
     AND tc.table_schema    = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name  = ccu.constraint_name
     AND rc.unique_constraint_schema = ccu.constraint_schema
    JOIN information_schema.columns cols
      ON cols.table_schema  = tc.table_schema
     AND cols.table_name    = tc.table_name
     AND cols.column_name   = kcu.column_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'public'
      AND ccu.table_schema   = 'auth'
      AND ccu.table_name     = 'users'
      AND rc.delete_rule     IN ('NO ACTION', 'RESTRICT')
  LOOP
    IF fk_record.is_nullable = 'YES' THEN
      EXECUTE format(
        'UPDATE %I.%I SET %I = NULL WHERE %I = $1',
        fk_record.table_schema, fk_record.table_name,
        fk_record.column_name,  fk_record.column_name
      ) USING p_user_id;
    ELSE
      EXECUTE format(
        'DELETE FROM %I.%I WHERE %I = $1',
        fk_record.table_schema, fk_record.table_name,
        fk_record.column_name
      ) USING p_user_id;
    END IF;
  END LOOP;

  -- ── Hard-delete the auth user (final step) ─────────────────────────────────
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
