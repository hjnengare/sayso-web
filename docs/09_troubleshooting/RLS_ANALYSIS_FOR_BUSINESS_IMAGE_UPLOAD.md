# RLS Analysis for Business Image Upload

## Tables Involved

### 1. **`businesses` table** (Primary table)
- **Column being updated:** `uploaded_images` (TEXT[])
- **RLS Status:** ✅ Enabled
- **Why it matters:** This is where image URLs are stored

### 2. **`business_owners` table** (Supporting table)
- **Purpose:** Links users to businesses they own
- **Used by RLS:** The UPDATE policy checks this table to verify ownership
- **Columns:** `business_id`, `user_id`, `role`

### 3. **`profiles` table** (Supporting table)
- **Purpose:** Stores user profile data including admin role
- **Used by RLS:** The UPDATE policy checks for admin role
- **Columns:** `user_id`, `role`

---

## Why RPC Function Bypasses RLS

### The RPC Function: `append_business_images`

```sql
CREATE OR REPLACE FUNCTION public.append_business_images(
  p_business_id UUID,
  p_image_urls TEXT[]
)
RETURNS TABLE(uploaded_images TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚠️ THIS IS THE KEY
SET search_path = public
```

**`SECURITY DEFINER` means:**
- The function runs with the privileges of the **function owner** (usually `postgres` superuser)
- It **bypasses RLS policies** completely
- The function can UPDATE any row in `businesses` table, regardless of RLS

**Why this works:**
- The function owner has full database privileges
- RLS is not checked when the function executes
- This is why the RPC method should always work (if the function exists)

---

## Why Fallback Method Requires RLS Policies

### The Fallback Method (Direct UPDATE)

```typescript
const { data, error } = await supabase
  .from('businesses')
  .update({ uploaded_images: updatedImages })
  .eq('id', businessId)
  .select('id, uploaded_images')
  .single();
```

**This is a direct UPDATE query:**
- Runs with the **current user's privileges** (not superuser)
- **RLS policies ARE checked** before the update
- Must pass both `USING` and `WITH CHECK` clauses

---

## Current RLS Policy: `businesses_update_owner`

```sql
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
```

### What This Policy Checks:

1. **Direct ownership:** `auth.uid() = owner_id`
   - Checks if the current user's ID matches the business's `owner_id`

2. **Ownership via business_owners table:**
   - Checks if there's a row in `business_owners` linking the user to the business

3. **Admin role:**
   - Checks if the user has `role = 'admin'` in the `profiles` table

---

## Potential Issues

### Issue #1: Timing Problem
**Scenario:** Business is created, but `business_owners` entry might not exist yet

**When business is created:**
```typescript
// Business is created with owner_id
const business = await createBusiness({ owner_id: user.id });

// business_owners entry is created separately
await createBusinessOwner({ business_id: business.id, user_id: user.id });
```

**If there's a race condition:**
- Business exists with `owner_id` ✅
- But `business_owners` entry might not exist yet ❌
- RLS policy checks `owner_id` first, so this should work ✅

**However:** If `owner_id` is NULL or not set correctly, the policy will fail.

---

### Issue #2: RLS Policy Not Matching
**Scenario:** The `USING` clause passes, but `WITH CHECK` fails

**PostgreSQL RLS has two checks:**
1. **USING:** Can the user see/select the row? (for UPDATE, checks if row exists)
2. **WITH CHECK:** Can the user modify the row to this new state? (validates the new values)

**If `WITH CHECK` fails:**
- The update is silently rejected
- No error is returned (in some cases)
- The database appears unchanged

---

### Issue #3: Missing business_owners Entry
**Scenario:** Business was created, but `business_owners` entry was never created

**Check this:**
```sql
-- Verify business_owners entry exists
SELECT * FROM business_owners 
WHERE business_id = 'your-business-id' 
AND user_id = auth.uid();
```

**If missing:**
- The RLS policy will only work if `owner_id` matches
- If `owner_id` is NULL or wrong, update will fail

---

## Debugging Steps

### 1. Check if RPC function exists
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'append_business_images';
```

**Expected:** `prosecdef = true` (SECURITY DEFINER)

---

### 2. Check RLS policies on businesses table
```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'businesses' 
AND cmd = 'UPDATE';
```

**Expected:** Should see `businesses_update_owner` policy

---

### 3. Test RLS manually
```sql
-- As the business owner, try to update
SET ROLE authenticated;
SET request.jwt.claim.sub = 'your-user-id';

UPDATE businesses 
SET uploaded_images = ARRAY['https://test.com/image.jpg']
WHERE id = 'your-business-id';

-- Check if it worked
SELECT uploaded_images FROM businesses WHERE id = 'your-business-id';
```

---

### 4. Verify business ownership
```sql
-- Check owner_id
SELECT id, name, owner_id 
FROM businesses 
WHERE id = 'your-business-id';

-- Check business_owners entry
SELECT * FROM business_owners 
WHERE business_id = 'your-business-id';
```

---

## Solution Summary

### ✅ RPC Function (Preferred)
- **Bypasses RLS** via `SECURITY DEFINER`
- **Always works** if function exists
- **Atomic operation** (prevents race conditions)

### ⚠️ Fallback Method (Requires RLS)
- **Subject to RLS policies**
- **Must pass `businesses_update_owner` policy**
- **Requires:**
  1. `owner_id = auth.uid()` OR
  2. Entry in `business_owners` table OR
  3. Admin role in `profiles` table

---

## Recommended Fix

If the fallback is failing, ensure:

1. **Business has correct `owner_id`:**
   ```sql
   UPDATE businesses 
   SET owner_id = auth.uid() 
   WHERE id = 'business-id' AND owner_id IS NULL;
   ```

2. **Business_owners entry exists:**
   ```sql
   INSERT INTO business_owners (business_id, user_id, role)
   VALUES ('business-id', auth.uid(), 'owner')
   ON CONFLICT DO NOTHING;
   ```

3. **RLS policy is correct:**
   - The policy should allow updates when `owner_id` matches
   - Both `USING` and `WITH CHECK` should be identical

---

## Why This Matters

When a business owner uploads images:
1. ✅ Images upload to storage (works)
2. ❌ Database update fails silently (RLS blocks it)
3. ❌ `uploaded_images` stays empty `[]`
4. ❌ UI shows placeholder (no images to display)

**The fix ensures the database update succeeds by:**
- Using RPC function (bypasses RLS) OR
- Ensuring RLS policy allows the update (fallback)

