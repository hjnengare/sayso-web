-- Permissions update: open event creation + restricted specials creation.

-- 1) Schema updates for community events.
ALTER TABLE public.events_and_specials
  ALTER COLUMN business_id DROP NOT NULL;

ALTER TABLE public.events_and_specials
  ADD COLUMN IF NOT EXISTS is_community_event boolean NOT NULL DEFAULT false;

ALTER TABLE public.events_and_specials
  DROP CONSTRAINT IF EXISTS events_and_specials_type_business_community_check;

ALTER TABLE public.events_and_specials
  ADD CONSTRAINT events_and_specials_type_business_community_check
  CHECK (
    (
      type = 'event'
      AND (
        (business_id IS NULL AND is_community_event = true)
        OR (business_id IS NOT NULL AND is_community_event = false)
      )
    )
    OR
    (
      type = 'special'
      AND business_id IS NOT NULL
      AND is_community_event = false
    )
  );

-- 2) Replace insert RLS with explicit event/special permission matrix.
DROP POLICY IF EXISTS "Allow business owner to insert events_and_specials" ON public.events_and_specials;
DROP POLICY IF EXISTS "Allow insert with event and special permissions" ON public.events_and_specials;

CREATE POLICY "Allow insert with event and special permissions"
  ON public.events_and_specials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      -- Community-hosted event: any authenticated user.
      (
        type = 'event'
        AND business_id IS NULL
        AND is_community_event = true
      )
      OR
      -- Business-linked event: authenticated user must own or have verified access to business.
      (
        type = 'event'
        AND business_id IS NOT NULL
        AND is_community_event = false
        AND (
          EXISTS (
            SELECT 1
            FROM public.businesses b
            WHERE b.id = events_and_specials.business_id
              AND b.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.business_owners bo
            WHERE bo.business_id = events_and_specials.business_id
              AND bo.user_id = auth.uid()
          )
        )
      )
      OR
      -- Special: only business_owner role with verified business access.
      (
        type = 'special'
        AND business_id IS NOT NULL
        AND is_community_event = false
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.user_id = auth.uid()
            AND (
              p.role IN ('business_owner', 'both')
              OR p.account_role = 'business_owner'
            )
        )
        AND (
          EXISTS (
            SELECT 1
            FROM public.businesses b
            WHERE b.id = events_and_specials.business_id
              AND b.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.business_owners bo
            WHERE bo.business_id = events_and_specials.business_id
              AND bo.user_id = auth.uid()
          )
        )
      )
    )
  );
