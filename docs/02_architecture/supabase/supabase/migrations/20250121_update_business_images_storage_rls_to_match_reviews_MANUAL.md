# Manual Storage Policy Update Instructions

This migration updates storage RLS policies but requires elevated permissions. 
Run these SQL statements manually via **Supabase Dashboard > Storage > Policies**.

## Steps

1. Go to **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click on the **`business_images`** bucket
4. Go to **Policies** tab
5. Delete existing policies (or they will be replaced):
   - "Public read access to business images"
   - "Authenticated users can upload business images" (or "Business owners can upload their images")
   - "Authenticated users can update business images" (or "Business owners can update their images")
   - "Business owners can delete their images" (or "Users can delete their own business images")

6. Click **"New Policy"** and create these policies one by one:

---

## Policy 1: Public Read Access

**Policy Name:** `Public read access to business images`

**Allowed Operation:** SELECT

**Target Roles:** `public`

**USING expression:**
```sql
bucket_id = 'business_images'
```

---

## Policy 2: Authenticated Users Can Upload

**Policy Name:** `Authenticated users can upload business images`

**Allowed Operation:** INSERT

**Target Roles:** `authenticated`

**WITH CHECK expression:**
```sql
bucket_id = 'business_images' AND
(storage.foldername(name))[1] IS NOT NULL
```

**Note:** This matches the review_images pattern - permissive for authenticated users, ownership enforced by database RLS.

---

## Policy 3: Authenticated Users Can Update

**Policy Name:** `Authenticated users can update business images`

**Allowed Operation:** UPDATE

**Target Roles:** `authenticated`

**USING expression:**
```sql
bucket_id = 'business_images'
```

**WITH CHECK expression:**
```sql
bucket_id = 'business_images'
```

**Note:** This matches the review_images pattern - permissive for authenticated users.

---

## Policy 4: Users Can Delete Their Own Images

**Policy Name:** `Users can delete their own business images`

**Allowed Operation:** DELETE

**Target Roles:** `authenticated`

**USING expression:**
```sql
bucket_id = 'business_images' AND
EXISTS (
  SELECT 1 FROM businesses
  WHERE businesses.id::text = (storage.foldername(name))[1]
  AND businesses.owner_id = auth.uid()
)
```

**Note:** This enforces ownership via database (businesses.owner_id), matching the review_images pattern.

---

## Verification

After creating all policies, verify by:

1. Checking that all 4 policies exist in the Dashboard
2. Testing image upload (should work for any authenticated user)
3. Testing image deletion (should only work for business owners)

---

## Alternative: Run with Service Role Key

If you prefer to run via SQL, use the service role key:

```bash
# Set service role key
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run migration via Supabase CLI
supabase db push
```

Or run the SQL directly in SQL Editor with service role permissions (requires database admin access).

