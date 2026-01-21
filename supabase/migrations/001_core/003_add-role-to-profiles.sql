-- Add role field to profiles table
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database

-- Add role column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'business_owner', 'admin'));

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing business owners to have business_owner role
-- This will be done automatically when ownership is verified, but we can set it manually if needed
-- UPDATE profiles SET role = 'business_owner' WHERE user_id IN (SELECT user_id FROM business_owners);

