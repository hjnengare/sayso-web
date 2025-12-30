# Business Images Storage Setup Guide

This guide explains how to set up the `business-images` Supabase Storage bucket for storing and serving uploaded business images.

## 📋 Overview

Business images are stored in **Supabase Storage**, not in the database. The database only stores the **public URLs** of uploaded images in the `uploaded_image` field of the `businesses` table.

## 🔄 Image Upload Flow

```
1. User uploads image → 
2. Image uploaded to Supabase Storage bucket `business-images` → 
3. Public URL generated → 
4. URL saved to `businesses.uploaded_image` field → 
5. Image displayed on business card & profile page
```

## ✅ Step-by-Step Setup

### Step 1: Create Storage Bucket

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **"Create bucket"** or **"New bucket"**
4. Configure the bucket:
   - **Name**: `business-images` (must match exactly)
   - **Public**: ✅ **Yes** (required for public business listings)
   - **File size limit**: 5MB (or adjust as needed)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/png`
     - `image/webp`
     - `image/gif`

5. Click **"Create bucket"**

### Step 2: Set Up RLS Policies

Run the SQL migration file to set up Row Level Security (RLS) policies:

```bash
# The migration file is located at:
src/app/lib/migrations/002_business/008_business-images-storage.sql
```

Or run the SQL directly in Supabase SQL Editor:

```sql
-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public read access to business images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-images');

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Authenticated users can upload business images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-images');

-- Allow business owners to update their images
CREATE POLICY IF NOT EXISTS "Business owners can update their images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'business-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Allow business owners to delete their images
CREATE POLICY IF NOT EXISTS "Business owners can delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);
```

### Step 3: Verify Setup

1. **Check bucket exists:**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'business-images';
   ```

2. **Check policies are active:**
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'business-images';
   ```

3. **Test upload:**
   - Go to `/add-business` page
   - Upload an image
   - Check if it appears in Storage > business-images bucket

4. **Test public access:**
   - Copy the image URL from the database
   - Open in incognito/private browser window
   - Should load without authentication

## 📁 Storage Path Structure

Images are organized by business ID:

```
business-images/
  └── {business_id}/
      ├── {business_id}_0_{timestamp}.jpg
      ├── {business_id}_1_{timestamp}.png
      └── {business_id}_2_{timestamp}.webp
```

**Example:**
```
business-images/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── 123e4567-e89b-12d3-a456-426614174000_0_1699123456789.jpg
```

This structure:
- ✅ Organizes images by business
- ✅ Prevents filename conflicts
- ✅ Makes RLS policies work correctly
- ✅ Easy to find all images for a business

## 🔍 How It Works in Code

### Upload Process (`src/app/add-business/page.tsx`)

```typescript
// 1. Upload image to storage
const { error: uploadError } = await supabase.storage
  .from('business-images')
  .upload(filePath, image, {
    cacheControl: '3600',
    upsert: false
  });

// 2. Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('business-images')
  .getPublicUrl(filePath);

// 3. Save URL to database
await supabase
  .from('businesses')
  .update({ uploaded_image: publicUrl })
  .eq('id', businessId);
```

### Display Process

**Business Card** (`src/app/components/BusinessCard/BusinessCard.tsx`):
- Checks `business.uploaded_image` first
- Falls back to `business.image_url` if no uploaded image
- Falls back to category PNG if neither exists

**Business Profile** (`src/app/business/[id]/page.tsx`):
- Uses `business.uploaded_image` as primary image
- Displays in `BusinessHeroImage` component
- Shows in gallery if multiple images exist

## ⚠️ Common Issues & Solutions

### Issue: Images don't appear after upload

**Possible causes:**
1. ❌ Bucket doesn't exist → Create bucket in Supabase Dashboard
2. ❌ Bucket is private → Set bucket to public
3. ❌ RLS policies not set → Run the migration SQL
4. ❌ URL not saved to database → Check browser console for errors
5. ❌ Wrong bucket name → Ensure it's exactly `business-images`

### Issue: "Bucket not found" error

**Solution:**
- Verify bucket name is exactly `business-images` (case-sensitive)
- Check bucket exists in Supabase Dashboard > Storage

### Issue: "Permission denied" error

**Solution:**
- Ensure RLS policies are set up correctly
- Verify user is authenticated when uploading
- Check that business owner matches authenticated user

### Issue: Images load slowly

**Solution:**
- Enable CDN in Supabase project settings
- Consider image optimization before upload
- Use WebP format for better compression

## 🔐 Security Considerations

1. **Public Bucket**: Required for public business listings
   - Anyone can view images (by design)
   - Only authenticated users can upload
   - Only business owners can update/delete their images

2. **File Size Limits**: Set appropriate limits (5MB recommended)
   - Prevents abuse
   - Reduces storage costs
   - Improves performance

3. **MIME Type Validation**: Only allow image types
   - Prevents malicious file uploads
   - Ensures only images are stored

4. **RLS Policies**: Enforce ownership
   - Users can only modify their own business images
   - Prevents unauthorized access

## 📊 Database Schema

The `businesses` table stores the image URL:

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  uploaded_image TEXT,  -- Public URL from Supabase Storage
  image_url TEXT,        -- External image URL (fallback)
  -- ... other fields
);
```

**Current Implementation:**
- `uploaded_image`: Single primary image URL (owner-uploaded)
- `image_url`: External image URL (from Foursquare, etc.)

**Future Enhancement:**
- Consider adding `images TEXT[]` array for multiple images
- First image in array = primary/cover image
- Remaining images = gallery images

## 🧪 Testing

### Manual Test

1. Create a new business via `/add-business`
2. Upload an image
3. Verify image appears in:
   - Business card on home/explore pages
   - Business profile page hero image
   - Business edit page

### Automated Test

```typescript
// Test bucket exists
const { data: buckets } = await supabase.storage.listBuckets();
expect(buckets).toContainEqual(
  expect.objectContaining({ id: 'business-images' })
);

// Test upload
const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
const { error } = await supabase.storage
  .from('business-images')
  .upload('test/test.jpg', file);
expect(error).toBeNull();
```

## 📚 Related Files

- **Upload Logic**: `src/app/add-business/page.tsx` (lines 540-613)
- **Display Logic**: 
  - `src/app/components/BusinessCard/BusinessCard.tsx`
  - `src/app/business/[id]/page.tsx`
- **API Endpoints**: 
  - `src/app/api/businesses/[id]/route.ts` (PUT for updating images)
- **Migration**: `src/app/lib/migrations/002_business/008_business-images-storage.sql`

## 🚀 Next Steps

1. ✅ Create bucket in Supabase Dashboard
2. ✅ Run RLS policies migration
3. ✅ Test image upload
4. ✅ Verify images display correctly
5. 🔄 Consider adding image optimization/processing
6. 🔄 Consider supporting multiple images per business
7. 🔄 Consider implementing image cleanup on business deletion

