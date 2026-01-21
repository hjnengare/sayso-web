-- =============================================
-- MIGRATION: Add Profile Fields for Avatar, Username, Display Name
-- Run this in your Supabase SQL editor
-- =============================================

-- Add profile fields for avatar, username, display name, etc.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_top_reviewer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badges_count INTEGER DEFAULT 0;

