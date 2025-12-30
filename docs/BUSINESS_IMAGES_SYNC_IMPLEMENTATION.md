# Business Images Sync Implementation

## Overview

This document describes the complete implementation of the business images sync system that keeps **Supabase Storage** (`business-images` bucket) and the **`public.business_images`** database table in sync, ensuring the UI always reflects the latest image state.

## Architecture

### Storage + DB Source of Truth

- **Storage Bucket**: `business-images` (Supabase Storage)
  - Stores actual image files
  - Public bucket for public business listings
  - Path structure: `{businessId}/{filename}`

- **Database Table**: `public.business_images`
  - Stores image metadata and URLs
  - **This is the query source for the UI**
  - URLs must remain valid against the bucket

### Database Schema

```sql
CREATE TABLE public.business_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,  -- Public URL from Supabase Storage
  type TEXT DEFAULT 'gallery' CHECK (type IN ('cover', 'logo', 'gallery')),
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,  -- Only one per business
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Key Features

### 1. Automatic Primary Image Promotion

When a primary image is deleted, the system automatically promotes the next best candidate:

```sql
CREATE FUNCTION promote_next_primary_image()
RETURNS TRIGGER AS $$
DECLARE
  next_primary_id UUID;
BEGIN
  IF OLD.is_primary = true THEN
    -- Find next best: lowest sort_order, then newest
    SELECT id INTO next_primary_id
    FROM public.business_images
    WHERE business_id = OLD.business_id AND id != OLD.id
    ORDER BY sort_order ASC, created_at DESC
    LIMIT 1;
    
    IF next_primary_id IS NOT NULL THEN
      UPDATE public.business_images
      SET is_primary = true
      WHERE id = next_primary_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

### 2. Single Primary Image Enforcement

Database trigger ensures only one `is_primary = true` per business:

```sql
CREATE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.business_images
    SET is_primary = false
    WHERE business_id = NEW.business_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Implementation Details

### Upload Flow

**Location**: `src/app/add-business/page.tsx`

```typescript
// 1. Upload to storage bucket
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

// 3. Insert into business_images table (REQUIRED)
const imageRecords = uploadedUrls.map((url, index) => ({
  business_id: businessId,
  url: url,
  type: index === 0 ? 'cover' : 'gallery',
  sort_order: index,
  is_primary: index === 0,  // First image is primary
}));

await supabase
  .from('business_images')
  .insert(imageRecords);
```

**Key Points**:
- ✅ Always inserts into `business_images` table after successful upload
- ✅ First image is automatically set as primary
- ✅ No fallback to legacy `uploaded_image` field (removed)

### Delete Flow

**Location**: `src/app/api/businesses/[id]/images/[imageId]/route.ts`

```typescript
// 1. Get image details (need URL for storage deletion)
const { data: imageData } = await supabase
  .from('business_images')
  .select('id, url, is_primary')
  .eq('id', imageId)
  .single();

// 2. Extract storage path from URL
const pathMatch = url.match(/\/business-images\/(.+)$/);
const storagePath = pathMatch?.[1];

// 3. Delete from storage bucket
if (storagePath) {
  await supabase.storage
    .from('business-images')
    .remove([storagePath]);
}

// 4. Delete from database (trigger promotes next image if primary)
await supabase
  .from('business_images')
  .delete()
  .eq('id', imageId);
```

**Key Points**:
- ✅ Deletes from both storage and database
- ✅ Continues with DB deletion even if storage deletion fails
- ✅ Database trigger automatically promotes next image if primary was deleted

### UI Display Priority

**Location**: `src/app/components/BusinessCard/BusinessCard.tsx`

```typescript
const getDisplayImage = useMemo(() => {
  // Priority 1: business_images table (new source of truth)
  if (business.business_images?.length > 0) {
    const primaryImage = business.business_images.find(img => img.is_primary);
    const firstImage = primaryImage || business.business_images[0];
    if (firstImage?.url && !isPngIcon(firstImage.url)) {
      return { image: firstImage.url, isPng: false };
    }
  }

  // Priority 2: Legacy uploaded_image (backward compatibility)
  // Priority 3: External image_url
  // Priority 4: Legacy image field
  // Priority 5: Category PNG fallback
  // ...
}, [business.business_images, ...]);
```

**Key Points**:
- ✅ Checks `business_images` table first
- ✅ Falls back to legacy fields for backward compatibility
- ✅ Always has a fallback (category PNG) so cards never break

### API Queries

**Location**: `src/app/api/businesses/route.ts`

All business queries now include `business_images`:

```typescript
const BUSINESS_SELECT = `
  id, name, description, category, ...
  business_stats (...),
  business_images (
    id, url, type, sort_order, is_primary, created_at
  )
`;
```

**Key Points**:
- ✅ All business queries include `business_images` array
- ✅ Images are ordered by `is_primary DESC, sort_order ASC`
- ✅ UI components receive images automatically

## UI Update Rules

### After Upload

1. **Immediate UI Update**: After successful upload + DB insert:
   - Business Card thumbnail updates
   - Business Profile header/cover updates
   - Gallery grid updates
   - Any listing previews update

2. **Implementation**: 
   - Optimistic updates (update UI immediately)
   - Re-fetch from API if needed
   - Use `router.refresh()` or refetch queries

### After Delete

1. **Automatic Promotion**: If primary image deleted:
   - Next best image automatically promoted (via database trigger)
   - UI reflects new primary image

2. **Fallback**: If no images remain:
   - Display default placeholder PNG
   - No broken images anywhere

## Integrity Rules

### Already Enforced

1. **CASCADE Delete**: 
   ```sql
   business_id UUID REFERENCES businesses(id) ON DELETE CASCADE
   ```
   - Deleting a business automatically deletes all its images

2. **Single Primary**: 
   - Database trigger ensures only one `is_primary = true` per business
   - Function: `ensure_single_primary_image()`

3. **Updated At**: 
   - Trigger automatically updates `updated_at` on changes
   - Function: `update_business_images_updated_at()`

## API Endpoints

### GET `/api/businesses/[id]/images`
Fetch all images for a business, ordered by primary first, then sort_order.

**Response**:
```json
{
  "images": [
    {
      "id": "uuid",
      "url": "https://...",
      "type": "cover",
      "sort_order": 0,
      "is_primary": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/api/businesses/[id]/images`
Add images to a business (requires business owner authentication).

**Request**:
```json
{
  "images": [
    {
      "url": "https://...",
      "type": "cover",
      "sort_order": 0,
      "is_primary": true
    }
  ]
}
```

### DELETE `/api/businesses/[id]/images/[imageId]`
Delete a business image (requires business owner authentication).

**Response**:
```json
{
  "success": true,
  "was_primary": true,
  "message": "Primary image deleted. Next image has been automatically promoted."
}
```

## Migration

### Running the Migration

1. **Run SQL Migration**:
   ```bash
   # File: supabase/migrations/20250112_business_images_table.sql
   ```
   Or run directly in Supabase SQL Editor.

2. **Migration Includes**:
   - Creates `business_images` table
   - Sets up indexes for performance
   - Creates triggers (single primary, promote next, updated_at)
   - Sets up RLS policies
   - Migrates existing `uploaded_image` data to `business_images` table

3. **Backward Compatibility**:
   - Existing `uploaded_image` values are migrated to `business_images`
   - UI components check both new and legacy fields
   - No breaking changes for existing businesses

## Testing Checklist

### Upload Flow
- [ ] Upload images when creating new business
- [ ] Verify images appear in `business_images` table
- [ ] Verify images appear in UI immediately
- [ ] Verify first image is marked as primary

### Delete Flow
- [ ] Delete non-primary image
- [ ] Delete primary image (verify promotion)
- [ ] Delete all images (verify placeholder)
- [ ] Verify storage file is deleted
- [ ] Verify database record is deleted

### UI Updates
- [ ] Business card shows primary image
- [ ] Business profile shows primary image
- [ ] Gallery shows all images
- [ ] No broken images anywhere
- [ ] Fallback to placeholder when no images

### Edge Cases
- [ ] Upload fails but DB insert succeeds (should handle gracefully)
- [ ] Storage delete fails but DB delete succeeds (should continue)
- [ ] Multiple images uploaded simultaneously
- [ ] Business deleted (images cascade delete)

## Files Modified

1. **Migration**: `supabase/migrations/20250112_business_images_table.sql`
2. **API Endpoints**:
   - `src/app/api/businesses/[id]/images/route.ts` (GET, POST)
   - `src/app/api/businesses/[id]/images/[imageId]/route.ts` (DELETE)
   - `src/app/api/businesses/route.ts` (includes business_images in queries)
3. **Upload Logic**: `src/app/add-business/page.tsx`
4. **UI Components**: `src/app/components/BusinessCard/BusinessCard.tsx`

## Future Enhancements

- [ ] Image optimization/processing pipeline
- [ ] Image alt text and captions
- [ ] Image dimensions storage
- [ ] Bulk image operations API
- [ ] Image reordering UI
- [ ] Set primary image from UI
- [ ] Image upload progress indicators
- [ ] Image error handling and retry logic

