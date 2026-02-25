-- =============================================
-- Harden delete_user_account and clean non-cascading user references
-- =============================================
-- This migration upgrades public.delete_user_account to:
-- 1) only allow self-delete for authenticated users (service role remains allowed)
-- 2) proactively clear/delete rows tied to auth.users via NO ACTION/RESTRICT FKs
-- 3) preserve existing auth.users hard-delete as final step

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

  -- Explicit cleanup for DM rows to avoid legacy-schema edge cases.
  DELETE FROM public.messages
  WHERE sender_id = p_user_id
     OR sender_user_id = p_user_id;

  DELETE FROM public.conversations
  WHERE user_id = p_user_id
     OR owner_id = p_user_id;

  -- For auth.users FKs that are still NO ACTION/RESTRICT:
  -- - nullable columns: null them out
  -- - non-nullable columns: hard-delete rows that reference this user
  FOR fk_record IN
    SELECT DISTINCT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      rc.delete_rule,
      cols.is_nullable
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
      AND rc.unique_constraint_schema = ccu.constraint_schema
    JOIN information_schema.columns cols
      ON cols.table_schema = tc.table_schema
      AND cols.table_name = tc.table_name
      AND cols.column_name = kcu.column_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
      AND rc.delete_rule IN ('NO ACTION', 'RESTRICT')
  LOOP
    IF fk_record.is_nullable = 'YES' THEN
      EXECUTE format(
        'UPDATE %I.%I SET %I = NULL WHERE %I = $1',
        fk_record.table_schema,
        fk_record.table_name,
        fk_record.column_name,
        fk_record.column_name
      ) USING p_user_id;
    ELSE
      EXECUTE format(
        'DELETE FROM %I.%I WHERE %I = $1',
        fk_record.table_schema,
        fk_record.table_name,
        fk_record.column_name
      ) USING p_user_id;
    END IF;
  END LOOP;

  DELETE FROM auth.users
  WHERE id = p_user_id;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
