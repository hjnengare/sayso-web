-- Migration: Ensure business owners can UPDATE their businesses
-- This ensures owners can update uploaded_images and other fields via RLS

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "businesses_update_owner" ON businesses;
DROP POLICY IF EXISTS "Allow owners to update their businesses" ON businesses;

-- Create comprehensive UPDATE policy that allows:
-- 1. Direct owners (owner_id = auth.uid())
-- 2. Business owners from business_owners table
-- 3. Admins
CREATE POLICY "businesses_update_owner"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    -- Direct owner
    auth.uid() = owner_id 
    OR 
    -- Owner via business_owners table
    EXISTS (
      SELECT 1 FROM business_owners
      WHERE business_owners.business_id = businesses.id
      AND business_owners.user_id = auth.uid()
    )
    OR
    -- Admins can update any business
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    -- Same checks for WITH CHECK clause
    auth.uid() = owner_id 
    OR 
    EXISTS (
      SELECT 1 FROM business_owners
      WHERE business_owners.business_id = businesses.id
      AND business_owners.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Add comment
COMMENT ON POLICY "businesses_update_owner" ON businesses IS 
  'Allows business owners (via owner_id or business_owners table) and admins to update businesses. Required for updating uploaded_images array and other business fields.';

