-- Audit columns for business disapproval (mirrors approved_at / approved_by)
-- rejected_by: admin who rejected; rejected_at: timestamp
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.businesses.rejected_at IS 'Timestamp when admin disapproved the business.';
COMMENT ON COLUMN public.businesses.rejected_by IS 'Admin user who disapproved the business.';
