-- =============================================
-- BADGES SYSTEM SCHEMA
-- Complete table definitions for badge system
-- =============================================

-- =============================================
-- 1. BADGES CATALOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  
  -- Display information
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL, -- e.g., '011-compass.png'
  
  -- Classification
  badge_group TEXT NOT NULL CHECK (badge_group IN ('explorer', 'specialist', 'milestone', 'community')),
  category_key TEXT, -- e.g., 'food-drink', 'beauty-wellness', NULL for explorer/milestone/community
  
  -- Badge rules
  rule_type TEXT NOT NULL, -- e.g., 'achievement', 'review_count', 'category_count'
  threshold INTEGER, -- minimum count needed to earn badge
  
  -- Metadata
  meta JSONB, -- flexible data structure for additional badge config
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_group ON public.badges(badge_group);
CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges(category_key) WHERE category_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_badges_rule_type ON public.badges(rule_type);

-- =============================================
-- 2. USER BADGES TABLE
-- Track which badges each user has earned
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  
  -- When the badge was awarded
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional: criteria values when badge was earned
  criteria_data JSONB,
  
  PRIMARY KEY (user_id, badge_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_awarded ON public.user_badges(awarded_at DESC);

-- =============================================
-- 3. GRANT PERMISSIONS
-- =============================================

-- Allow authenticated users to read badges catalog
GRANT SELECT ON public.badges TO authenticated;

-- Allow authenticated users to read their own badges
GRANT SELECT ON public.user_badges TO authenticated;

-- =============================================
-- 4. COLUMN DOCUMENTATION
-- =============================================
/*

BADGES TABLE:
  id: Unique badge identifier (e.g., 'explorer_dabbler', 'milestone_new_voice')
  name: Display name (e.g., 'The Dabbler', 'New Voice')
  description: User-friendly description of what the badge represents
  icon_name: PNG filename stored in /public/badges/ (e.g., '011-compass.png')
  badge_group: Category of badge (explorer, specialist, milestone, community)
  category_key: For specialist badges, the category it applies to (NULL for others)
  rule_type: How badge is earned (achievement, review_count, category_count, etc.)
  threshold: Minimum count needed (e.g., 3 reviews for first specialist level)
  meta: Flexible JSON for storing additional config (colors, multipliers, etc.)
  created_at: When badge definition was created
  updated_at: When badge definition was last modified

USER_BADGES TABLE:
  user_id: Foreign key to auth.users
  badge_id: Foreign key to badges
  awarded_at: When user earned this badge
  criteria_data: JSON storing the exact criteria values when badge was earned
  
  Example criteria_data for 'specialist_food_taste_tester':
  {"reviews": 3, "category": "food-drink", "earned_date": "2026-01-20"}

INDEXES:
  - badges: by group, category (where not null), and rule_type
  - user_badges: by user (find all badges for a user), by badge (find all users),
    and by awarded_at (recent badges first)

*/

-- =============================================
-- SCHEMA COMPLETE
-- =============================================
