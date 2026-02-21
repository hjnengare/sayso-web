-- =============================================
-- Fix account deletion: ensure all user-linked FKs cascade or nullify
-- =============================================
-- business_claim_events.created_by references auth.users(id) WITHOUT CASCADE.
-- This would cause a FK violation when deleting a user who has created claim events.
-- Fix: drop the plain FK and re-add it as ON DELETE SET NULL (preserving the audit trail).

ALTER TABLE public.business_claim_events
  DROP CONSTRAINT IF EXISTS business_claim_events_created_by_fkey;

ALTER TABLE public.business_claim_events
  ADD CONSTRAINT business_claim_events_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
