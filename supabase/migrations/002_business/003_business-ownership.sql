-- Business Ownership Verification Schema
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database

-- Add verification fields to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS owner_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS owner_verification_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS owner_verification_method TEXT CHECK (owner_verification_method IN ('email', 'phone', 'document', 'manual')),
ADD COLUMN IF NOT EXISTS owner_verification_notes TEXT;

-- Create business_ownership_requests table
CREATE TABLE IF NOT EXISTS business_ownership_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  verification_method TEXT CHECK (verification_method IN ('email', 'phone', 'document', 'manual')),
  verification_data JSONB, -- Stores email, phone, document URLs, etc.
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id), -- Admin who reviewed
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id, status) -- One pending request per business-user pair
);

-- Create business_owners table (for verified owners)
CREATE TABLE IF NOT EXISTS business_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'admin')),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id), -- Admin who verified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id) -- One owner record per business-user pair
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_ownership_requests_business_id ON business_ownership_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_business_ownership_requests_user_id ON business_ownership_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_business_ownership_requests_status ON business_ownership_requests(status);
CREATE INDEX IF NOT EXISTS idx_business_ownership_requests_created_at ON business_ownership_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_owners_business_id ON business_owners(business_id);
CREATE INDEX IF NOT EXISTS idx_business_owners_user_id ON business_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_business_owners_role ON business_owners(role);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for business_ownership_requests
CREATE TRIGGER update_business_ownership_requests_updated_at 
  BEFORE UPDATE ON business_ownership_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for business_owners
CREATE TRIGGER update_business_owners_updated_at 
  BEFORE UPDATE ON business_owners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create business_owner record when request is approved
CREATE OR REPLACE FUNCTION handle_ownership_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request is approved, create business_owner record
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Insert or update business_owner record
    INSERT INTO business_owners (business_id, user_id, role, verified_by, verified_at)
    VALUES (NEW.business_id, NEW.user_id, 'owner', NEW.reviewed_by, NOW())
    ON CONFLICT (business_id, user_id) 
    DO UPDATE SET 
      role = 'owner',
      verified_by = NEW.reviewed_by,
      verified_at = NOW(),
      updated_at = NOW();
    
    -- Update businesses table
    UPDATE businesses 
    SET 
      owner_id = NEW.user_id,
      owner_verified = TRUE,
      owner_verification_requested_at = NEW.requested_at,
      owner_verification_method = NEW.verification_method,
      updated_at = NOW()
    WHERE id = NEW.business_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to handle approval
CREATE TRIGGER on_ownership_approval
  AFTER UPDATE ON business_ownership_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION handle_ownership_approval();

-- RLS Policies for business_ownership_requests
ALTER TABLE business_ownership_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own ownership requests"
  ON business_ownership_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create ownership requests
CREATE POLICY "Users can create ownership requests"
  ON business_ownership_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending requests (to cancel)
CREATE POLICY "Users can update their own pending requests"
  ON business_ownership_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can view all requests (Note: This requires a 'role' column in profiles table)
-- For now, we'll allow authenticated users to view all requests
-- You can add role-based admin checks later when role system is implemented
CREATE POLICY "Authenticated users can view all ownership requests"
  ON business_ownership_requests
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can update their own requests
-- Note: Admin role checks can be added later when role system is implemented
CREATE POLICY "Users can update their own requests"
  ON business_ownership_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for business_owners
ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY;

-- Users can view their own owner records
CREATE POLICY "Users can view their own owner records"
  ON business_owners
  FOR SELECT
  USING (auth.uid() = user_id);

-- Public can view owner records (for business pages)
CREATE POLICY "Public can view owner records"
  ON business_owners
  FOR SELECT
  USING (TRUE);

-- Admins can manage all owner records (Note: This requires a 'role' column in profiles table)
-- For now, we'll allow only the owner to manage their own records
-- You can add role-based admin checks later when role system is implemented
CREATE POLICY "Users can manage their own owner records"
  ON business_owners
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

