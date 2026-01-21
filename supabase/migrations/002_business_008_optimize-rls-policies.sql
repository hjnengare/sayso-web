-- =============================================
-- Optimize RLS Policies to Use Indexed Columns
-- Ensure all RLS policies reference indexed columns for performance
-- =============================================

-- =============================================
-- 1. DROP EXISTING POLICIES
-- =============================================

-- Businesses table policies
DROP POLICY IF EXISTS "Allow public read access to active businesses" ON businesses;
DROP POLICY IF EXISTS "Allow authenticated users to insert businesses" ON businesses;
DROP POLICY IF EXISTS "Allow owners to update their businesses" ON businesses;
DROP POLICY IF EXISTS "Allow owners to delete their businesses" ON businesses;

-- Business stats policies
DROP POLICY IF EXISTS "Allow authenticated users to read business stats" ON business_stats;
DROP POLICY IF EXISTS "Allow public read access to business stats" ON business_stats;

-- =============================================
-- 2. OPTIMIZED BUSINESSES TABLE POLICIES
-- =============================================

-- Public read access (uses indexed status column)
CREATE POLICY "businesses_select_active"
  ON businesses
  FOR SELECT
  USING (status = 'active');

-- Authenticated users can insert (no complex filters needed)
CREATE POLICY "businesses_insert_authenticated"
  ON businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Owners can update their own businesses (uses indexed owner_id)
CREATE POLICY "businesses_update_owner"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id 
    OR 
    -- Allow admins to update any business
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = owner_id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Owners can delete their own businesses (uses indexed owner_id)
CREATE POLICY "businesses_delete_owner"
  ON businesses
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = owner_id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =============================================
-- 3. OPTIMIZED BUSINESS STATS POLICIES
-- =============================================

-- Public can read all business stats (no complex filter)
-- Stats are already joined via business_id which is indexed
CREATE POLICY "business_stats_select_public"
  ON business_stats
  FOR SELECT
  USING (true);

-- Only system/triggers can insert stats
CREATE POLICY "business_stats_insert_system"
  ON business_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (false);  -- Prevent manual inserts

-- Only system/triggers can update stats
CREATE POLICY "business_stats_update_system"
  ON business_stats
  FOR UPDATE
  TO authenticated
  USING (false);  -- Prevent manual updates

-- =============================================
-- 4. ADD INDEX FOR PROFILE ROLE LOOKUPS
-- =============================================

-- Index on profiles.role for admin checks in RLS policies
CREATE INDEX IF NOT EXISTS idx_profiles_user_role 
  ON profiles(user_id, role) 
  WHERE role = 'admin';

-- Index on profiles.user_id (likely already exists via PK, but ensure)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
  ON profiles(user_id);

-- =============================================
-- 5. REVIEWS TABLE RLS OPTIMIZATION
-- =============================================

-- Check if reviews table exists and optimize its policies
DO $$
DECLARE
  v_has_status_column BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    
    -- Check if status column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'reviews' 
      AND column_name = 'status'
    ) INTO v_has_status_column;
    
    -- Drop existing review policies
    DROP POLICY IF EXISTS "Allow public read access to published reviews" ON reviews;
    DROP POLICY IF EXISTS "reviews_select_published" ON reviews;
    DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
    DROP POLICY IF EXISTS "Allow users to create their own reviews" ON reviews;
    DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
    DROP POLICY IF EXISTS "Allow users to update their own reviews" ON reviews;
    DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
    DROP POLICY IF EXISTS "Allow users to delete their own reviews" ON reviews;
    DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
    
    -- Public read for reviews
    IF v_has_status_column THEN
      -- If status column exists, filter by published
      CREATE POLICY "reviews_select_public"
        ON reviews
        FOR SELECT
        USING (status = 'published');
      
      -- Create index on status column
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status) WHERE status = 'published';
    ELSE
      -- If no status column, allow reading all reviews
      CREATE POLICY "reviews_select_public"
        ON reviews
        FOR SELECT
        USING (true);
    END IF;
    
    -- Users can insert their own reviews (uses indexed user_id)
    CREATE POLICY "reviews_insert_own"
      ON reviews
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    
    -- Users can update their own reviews (uses indexed user_id)
    CREATE POLICY "reviews_update_own"
      ON reviews
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    -- Users can delete their own reviews (uses indexed user_id)
    CREATE POLICY "reviews_delete_own"
      ON reviews
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
    
    -- Ensure index exists on user_id
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
    
  END IF;
END $$;

-- =============================================
-- 6. USER INTERESTS/PREFERENCES RLS OPTIMIZATION
-- =============================================

-- User interests - users can only access their own
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_interests') THEN
    
    DROP POLICY IF EXISTS "Users can manage their own interests" ON user_interests;
    
    CREATE POLICY "user_interests_manage_own"
      ON user_interests
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    -- Ensure index exists (likely exists via PK)
    CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
    
  END IF;
END $$;

-- User subcategories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subcategories') THEN
    
    DROP POLICY IF EXISTS "Users can manage their own subcategories" ON user_subcategories;
    
    CREATE POLICY "user_subcategories_manage_own"
      ON user_subcategories
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    CREATE INDEX IF NOT EXISTS idx_user_subcategories_user_id ON user_subcategories(user_id);
    
  END IF;
END $$;

-- User dealbreakers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_dealbreakers') THEN
    
    DROP POLICY IF EXISTS "Users can manage their own dealbreakers" ON user_dealbreakers;
    
    CREATE POLICY "user_dealbreakers_manage_own"
      ON user_dealbreakers
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    CREATE INDEX IF NOT EXISTS idx_user_dealbreakers_user_id ON user_dealbreakers(user_id);
    
  END IF;
END $$;

-- =============================================
-- 7. PROFILES TABLE RLS OPTIMIZATION
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    
    DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
    
    -- Users can read and update their own profile
    CREATE POLICY "profiles_manage_own"
      ON profiles
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    -- Public can read profiles (for reviews, etc.)
    CREATE POLICY "profiles_select_public"
      ON profiles
      FOR SELECT
      USING (true);
    
  END IF;
END $$;

-- =============================================
-- 8. BUSINESS OWNERSHIP CLAIMS RLS OPTIMIZATION
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_ownership_claims') THEN
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own claims" ON business_ownership_claims;
    DROP POLICY IF EXISTS "Users can create claims" ON business_ownership_claims;
    DROP POLICY IF EXISTS "Admins can view all claims" ON business_ownership_claims;
    DROP POLICY IF EXISTS "Admins can update claims" ON business_ownership_claims;
    
    -- Users can view their own claims (uses indexed user_id)
    CREATE POLICY "ownership_claims_select_own"
      ON business_ownership_claims
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id
        OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE user_id = auth.uid() 
          AND role = 'admin'
        )
      );
    
    -- Users can create claims
    CREATE POLICY "ownership_claims_insert_own"
      ON business_ownership_claims
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    
    -- Only admins can update claims
    CREATE POLICY "ownership_claims_update_admin"
      ON business_ownership_claims
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE user_id = auth.uid() 
          AND role = 'admin'
        )
      );
    
    -- Ensure indexes exist
    CREATE INDEX IF NOT EXISTS idx_ownership_claims_user_id ON business_ownership_claims(user_id);
    CREATE INDEX IF NOT EXISTS idx_ownership_claims_business_id ON business_ownership_claims(business_id);
    CREATE INDEX IF NOT EXISTS idx_ownership_claims_status ON business_ownership_claims(status);
    
  END IF;
END $$;

-- =============================================
-- 9. ANALYZE TABLES
-- =============================================

-- Update table statistics after index changes
ANALYZE businesses;
ANALYZE business_stats;
ANALYZE profiles;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    ANALYZE reviews;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_interests') THEN
    ANALYZE user_interests;
  END IF;
END $$;

-- =============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON POLICY "businesses_select_active" ON businesses IS 
'Public read access to active businesses - uses indexed status column for performance';

COMMENT ON POLICY "businesses_update_owner" ON businesses IS 
'Owners and admins can update businesses - uses indexed owner_id and role check';

COMMENT ON INDEX idx_profiles_user_role IS 
'Index for efficient admin role checks in RLS policies';

-- =============================================
-- 11. PERFORMANCE VERIFICATION QUERY
-- =============================================

-- You can run this query to verify RLS policies use indexes:
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM businesses WHERE status = 'active' LIMIT 10;

-- Expected: Should use idx_businesses_status_category or similar composite index

