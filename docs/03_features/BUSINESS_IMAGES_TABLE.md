# Business Images Table Implementation

This document describes the `business_images` table implementation for managing multiple images per business.

## Overview

The `business_images` table replaces the single `uploaded_image` field with a more flexible structure that supports:
- Multiple images per business
- Image types (cover, logo, gallery)
- Sort ordering for gallery display
- Primary image flag for business cards
- Easy add/delete/reorder operations

## Database Schema

```sql
CREATE TABLE public.business_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'gallery' CHECK (type IN ('cover', 'logo', 'gallery')),
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Key Features

### 1. Primary Image
- Only one image per business can be marked as `is_primary = true`
- Database trigger ensures only one primary image exists
- Primary image is used for business cards and hero image

### 2. Image Types
- `cover`: Hero/primary image for business profile
- `logo`: Business logo
- `gallery`: Additional gallery images

### 3. Sort Order
- `sort_order` determines display order in gallery
- Lower numbers appear first
- Primary image is always shown first regardless of sort_order

## Migration

Run the migration file:
```sql
src/app/lib/migrations/002_business/009_business-images-table.sql
```

This migration:
1. Creates the `business_images` table
2. Sets up indexes for performance
3. Creates triggers for:
   - `updated_at` timestamp updates
   - Ensuring only one primary image per business
4. Sets up RLS policies
5. Migrates existing `uploaded_image` data to `business_images` table

## API Endpoints

### GET `/api/businesses/[id]/images`
Fetch all images for a business, ordered by primary first, then sort_order.

**Response:**
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

**Request:**
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

## Usage in Code

### Fetching Images

**Business Profile Page:**
```typescript
// Images are automatically included in business data
const business = await fetch(`/api/businesses/${id}`);
const images = business.business_images || [];

// Primary image (for hero)
const primaryImage = images.find(img => img.is_primary)?.url || images[0]?.url;

// All images (for gallery)
const galleryImages = images.map(img => img.url);
```

**Business Card:**
```typescript
// Primary image is used for card thumbnail
const cardImage = business.business_images?.find(img => img.is_primary)?.url 
  || business.uploaded_image 
  || business.image_url;
```

### Adding Images

**Add Business Page:**
```typescript
// After uploading to storage
const imageRecords = uploadedUrls.map((url, index) => ({
  business_id: businessId,
  url: url,
  type: index === 0 ? 'cover' : 'gallery',
  sort_order: index,
  is_primary: index === 0,
}));

await supabase
  .from('business_images')
  .insert(imageRecords);
```

## Query Examples

### Get Primary Image
```sql
SELECT url 
FROM business_images 
WHERE business_id = $1 
  AND is_primary = true 
LIMIT 1;
```

### Get All Images Ordered
```sql
SELECT * 
FROM business_images 
WHERE business_id = $1 
ORDER BY is_primary DESC, sort_order ASC;
```

### Set New Primary Image
```sql
-- The trigger automatically unsets other primary images
UPDATE business_images 
SET is_primary = true 
WHERE id = $1 AND business_id = $2;
```

## Backward Compatibility

The implementation maintains backward compatibility:
- Legacy `uploaded_image` field is still supported
- API endpoints return both `images` array and `business_images` array
- Frontend components check `business_images` first, then fall back to legacy fields

## Benefits Over TEXT[] Array

1. **Easy Management**: Add/delete/reorder images without updating entire array
2. **Metadata**: Store type, sort order, and primary flag per image
3. **Performance**: Indexed queries for primary image lookup
4. **Flexibility**: Support different image types (cover, logo, gallery)
5. **Cleaner Data**: No need to parse/manipulate array strings
6. **Simpler UI Logic**: Direct queries instead of array manipulation

## Future Enhancements

- [ ] Image optimization/processing pipeline
- [ ] Image alt text and captions
- [ ] Image dimensions storage
- [ ] Bulk image operations API
- [ ] Image reordering UI
- [ ] Set primary image from UI

