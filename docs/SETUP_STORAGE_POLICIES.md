# Setting Up Storage Policies for business_images Bucket

## Error: "must be owner of relation objects"

If you encounter this error when running the migration, you need to create the storage policies manually through the Supabase Dashboard.

## Method 1: Via Supabase Dashboard (Recommended)

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click on the **`business_images`** bucket
4. Click on the **Policies** tab
5. Click **New Policy** for each policy below

### Policy 1: Public Read Access

- **Policy Name**: `Public read access to business images`
- **Allowed Operation**: `SELECT`
- **Target Roles**: `public`
- **USING expression**:
  ```sql
  bucket_id = 'business_images'
  ```

### Policy 2: Authenticated Users Can Upload

- **Policy Name**: `Authenticated users can upload business images`
- **Allowed Operation**: `INSERT`
- **Target Roles**: `authenticated`
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'business_images'
  ```

### Policy 3: Authenticated Users Can Update

- **Policy Name**: `Authenticated users can update business images`
- **Allowed Operation**: `UPDATE`
- **Target Roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'business_images'
  ```
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'business_images'
  ```

### Policy 4: Business Owners Can Delete

- **Policy Name**: `Business owners can delete their images`
- **Allowed Operation**: `DELETE`
- **Target Roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'business_images' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT business_id::text 
      FROM business_owners 
      WHERE user_id = auth.uid()
    )
  )
  ```

## Method 2: Via SQL Editor (If You Have Permissions)

If you have database superuser or service role access, you can run the migration file directly:

```bash
# Using Supabase CLI with service role
supabase db push --db-url "postgresql://postgres:[SERVICE_ROLE_PASSWORD]@[HOST]:[PORT]/postgres"
```

Or run the SQL from `supabase/migrations/20250115_fix_business_images_rls_policies.sql` in the SQL Editor.

## Verify Policies Are Created

After creating the policies, verify they exist:

```sql
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%business images%';
```

You should see 4 policies listed.

## Troubleshooting

### Still Getting RLS Errors?

1. **Check bucket name**: Ensure the bucket is named exactly `business_images` (with underscore, not hyphen)
2. **Check bucket exists**: Verify the bucket exists in Storage > Buckets
3. **Check bucket is public**: The bucket should be set to public for read access
4. **Verify policies**: Use the SQL query above to verify all 4 policies exist
5. **Check user authentication**: Ensure the user is authenticated when trying to upload

### Policy Not Working?

- Make sure the policy is enabled (not disabled in the Dashboard)
- Check that the bucket_id matches exactly: `'business_images'`
- For UPDATE policy, ensure both USING and WITH CHECK expressions are set correctly

