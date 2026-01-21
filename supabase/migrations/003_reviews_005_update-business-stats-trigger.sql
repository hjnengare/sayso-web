-- Ensure the business stats trigger function bypasses RLS

CREATE OR REPLACE FUNCTION public.update_business_stats_on_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_uuid UUID;
BEGIN
  -- Determine business id based on operation
  IF TG_OP = 'DELETE' THEN
    business_uuid := OLD.business_id;
  ELSE
    business_uuid := NEW.business_id;
  END IF;

  -- Call the RPC-style helper to perform the update
  PERFORM update_business_stats(business_uuid);

  -- Return appropriate row
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

