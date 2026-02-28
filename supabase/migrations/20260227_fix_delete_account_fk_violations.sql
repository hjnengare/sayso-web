-- =============================================
-- Fix account deletion FK constraint violations
-- =============================================
-- Several nullable admin/audit columns reference auth.users(id) WITHOUT
-- ON DELETE (default NO ACTION), causing FK violations when a user
-- account is deleted.  Convert all of them to ON DELETE SET NULL so the
-- audit trail is preserved while the deletion proceeds cleanly.
--
-- Tables / columns fixed:
--   business_ownership_requests  reviewed_by
--   business_owners              verified_by
--   business_claims              reviewed_by
--   business_claim_documents     reviewed_by
--   businesses                   approved_by, rejected_by
--   review_flags                 reviewed_by
-- =============================================

-- business_ownership_requests.reviewed_by
ALTER TABLE public.business_ownership_requests
  DROP CONSTRAINT IF EXISTS business_ownership_requests_reviewed_by_fkey;
ALTER TABLE public.business_ownership_requests
  ADD CONSTRAINT business_ownership_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- business_owners.verified_by
ALTER TABLE public.business_owners
  DROP CONSTRAINT IF EXISTS business_owners_verified_by_fkey;
ALTER TABLE public.business_owners
  ADD CONSTRAINT business_owners_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- business_claims.reviewed_by
ALTER TABLE public.business_claims
  DROP CONSTRAINT IF EXISTS business_claims_reviewed_by_fkey;
ALTER TABLE public.business_claims
  ADD CONSTRAINT business_claims_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- business_claim_documents.reviewed_by
ALTER TABLE public.business_claim_documents
  DROP CONSTRAINT IF EXISTS business_claim_documents_reviewed_by_fkey;
ALTER TABLE public.business_claim_documents
  ADD CONSTRAINT business_claim_documents_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- businesses.approved_by
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_approved_by_fkey;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- businesses.rejected_by
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_rejected_by_fkey;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_rejected_by_fkey
  FOREIGN KEY (rejected_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- review_flags.reviewed_by
ALTER TABLE public.review_flags
  DROP CONSTRAINT IF EXISTS review_flags_reviewed_by_fkey;
ALTER TABLE public.review_flags
  ADD CONSTRAINT review_flags_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
