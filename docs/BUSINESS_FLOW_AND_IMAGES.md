# Business Flow & Image Handling Explained

## 📊 Complete Flow: Businesses List → Business Card

### 1. **Data Fetching Flow**

```
Page Component (Home/Explore/For-You/etc.)
    ↓
useBusinesses Hook
    ↓
GET /api/businesses?limit=20&sort_by=rating
    ↓
Supabase Query (businesses table + business_stats join)
    ↓
Returns: Array of Business objects with image fields
    ↓
BusinessCard Component receives business prop
```

### 2. **Key Files in the Flow**

#### **Frontend Pages** (Where businesses are displayed)
- `src/app/home/page.tsx` - Home page with business feed
- `src/app/explore/page.tsx` - Explore/search page
- `src/app/for-you/page.tsx` - Personalized feed
- `src/app/[city-slug]/page.tsx` - City-specific listings
- `src/app/category/[slug]/page.tsx` - Category pages

#### **Data Fetching Hook**
- `src/app/hooks/useBusinesses.ts` - React hook that:
  - Builds query parameters
  - Calls `/api/businesses`
  - Manages loading/error states
  - Returns businesses array

#### **API Endpoint**
- `src/app/api/businesses/route.ts` - Server-side endpoint that:
  - Accepts filters (category, location, interests, search query)
  - Queries Supabase `businesses` table
  - Joins with `business_stats` for ratings
  - Applies sorting, pagination, distance filtering
  - Returns JSON: `{ businesses: [...], cursorId: ... }`

#### **Business Card Component**
- `src/app/components/BusinessCard/BusinessCard.tsx` - Displays:
  - Business image (with fallback logic)
  - Business name, category, location
  - Rating, review count
  - Click handler → navigates to `/business/[slug]`

---

## 🖼️ Image Handling System

### **Image Priority Order** (Fallback Chain)

The `BusinessCard` component uses this priority order to determine which image to display:

```typescript
1. uploaded_image (highest priority)
   ↓ If not available or is PNG icon
2. image_url (external URL from Foursquare, etc.)
   ↓ If not available or is PNG icon
3. image (legacy field)
   ↓ If not available
4. Category PNG (fallback icon based on category/subcategory)
```

### **Image Source Types**

#### **1. Uploaded Images** (`uploaded_image`)
- **Source**: Supabase Storage bucket `business-images`
- **Upload Flow**:
  ```
  User uploads image → 
  Upload to Supabase Storage (`business-images` bucket) → 
  Get public URL → 
  Save URL to `businesses.uploaded_image` field
  ```
- **Location**: `business-images/{businessId}/{filename}`
- **Example URL**: `https://[project].supabase.co/storage/v1/object/public/business-images/abc123/image.jpg`
- **Used in**: Business cards, profile pages, edit pages

#### **2. External Images** (`image_url`)
- **Source**: External APIs (Foursquare, Google Places, etc.)
- **Example**: `https://images.unsplash.com/photo-...`
- **Used as**: Fallback when no uploaded image exists

#### **3. Category PNG Icons** (Fallback)
- **Source**: Local static assets in `/public/png/`
- **Mapping**: `src/app/utils/categoryToPngMapping.ts`
- **Logic**: Maps category/subcategory → PNG icon path
- **Example**: `food-drink` → `/png/food-drink.png`
- **Used when**: No uploaded or external image available

### **Image Detection Logic**

The system detects PNG icons vs. real images:

```typescript
// Checks if image is a PNG icon (not a real photo)
function isPngIcon(url: string): boolean {
  return url.includes('/png/') || 
         url.endsWith('.png') || 
         url.includes('category-icon');
}

// If detected as PNG, uses different display style:
// - Centered, smaller size (object-contain)
// - Background gradient
// - vs. Real photos: full cover (object-cover)
```

### **Image Display in BusinessCard**

```typescript
// From BusinessCard.tsx (lines 232-268)
const getDisplayImage = useMemo(() => {
  // Priority 1: uploaded_image (from Supabase Storage)
  const uploadedImage = business.uploaded_image || business.uploadedImage;
  if (uploadedImage && !isPngIcon(uploadedImage)) {
    return { image: uploadedImage, isPng: false };
  }

  // Priority 2: image_url (external)
  if (business.image_url && !isPngIcon(business.image_url)) {
    return { image: business.image_url, isPng: false };
  }

  // Priority 3: image (legacy)
  if (business.image && !isPngIcon(business.image)) {
    return { image: business.image, isPng: false };
  }

  // Priority 4: Category PNG fallback
  const categoryPng = getCategoryPngFromLabels([
    business.subInterestId,
    business.subInterestLabel,
    business.category
  ]);
  return { image: categoryPng, isPng: true };
}, [business.uploaded_image, business.image_url, business.image, ...]);
```

### **Image Rendering**

```typescript
// Real photos (uploaded_image, image_url)
<OptimizedImage
  src={displayImage}
  width={340}
  height={400}
  className="w-full h-full object-cover"  // Full cover
  quality={90}
/>

// PNG icons (category fallback)
<div className="bg-gradient-to-br from-off-white/95 to-off-white/85">
  <OptimizedImage
    src={categoryPng}
    width={320}
    height={350}
    className="w-32 h-32 object-contain"  // Centered, smaller
    quality={90}
  />
</div>
```

### **OptimizedImage Component**

Located at `src/app/components/Performance/OptimizedImage.tsx`:

- **Wraps Next.js Image** component
- **Features**:
  - Automatic quality optimization
  - Responsive sizing
  - Loading states with spinner
  - Error handling with fallback
  - Lazy loading (except priority images)
  - Smooth fade-in animation

---

## 🔄 Complete Data Flow Example

### **Scenario: User views Home page**

```
1. Home Page Loads
   └─> useBusinesses({ limit: 20, sortBy: 'rating' })
       └─> GET /api/businesses?limit=20&sort_by=rating

2. API Endpoint Processes Request
   └─> Queries Supabase:
       SELECT id, name, slug, uploaded_image, image_url, 
              category, location, ...
       FROM businesses
       JOIN business_stats ON businesses.id = business_stats.business_id
       WHERE status = 'active'
       ORDER BY business_stats.average_rating DESC
       LIMIT 20

3. API Returns JSON
   {
     businesses: [
       {
         id: "abc123",
         name: "Joe's Pizza",
         uploaded_image: "https://...supabase.co/.../pizza.jpg",  // ✅ Has uploaded image
         image_url: null,
         category: "Restaurant",
         ...
       },
       {
         id: "def456",
         name: "Coffee Shop",
         uploaded_image: null,  // ❌ No uploaded image
         image_url: "https://images.unsplash.com/coffee.jpg",  // ✅ Has external image
         category: "Cafe",
         ...
       },
       {
         id: "ghi789",
         name: "Gym",
         uploaded_image: null,  // ❌ No uploaded image
         image_url: null,  // ❌ No external image
         category: "Fitness",  // ✅ Will use category PNG
         ...
       }
     ]
   }

4. BusinessCard Components Render
   └─> For each business:
       ├─> getDisplayImage() determines image source
       ├─> If uploaded_image exists → use it
       ├─> Else if image_url exists → use it
       └─> Else → use category PNG fallback
       
       └─> OptimizedImage component loads image
           ├─> Shows loading spinner
           ├─> Loads image (lazy or eager)
           └─> Fades in when loaded
```

---

## 📦 Database Schema

### **businesses Table**

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  
  -- Image fields (priority order)
  uploaded_image TEXT,  -- Supabase Storage URL (highest priority)
  image_url TEXT,       -- External URL (fallback)
  image TEXT,           -- Legacy field (deprecated)
  
  category TEXT,
  location TEXT,
  ...
);
```

### **Storage Bucket**

- **Name**: `business-images`
- **Type**: Public (anyone can view)
- **Path Structure**: `{businessId}/{filename}`
- **Example**: `abc123/image_1234567890.jpg`

---

## 🎯 Key Takeaways

1. **Image Priority**: `uploaded_image` > `image_url` > `image` > category PNG
2. **Storage**: Uploaded images stored in Supabase Storage, not database
3. **Database**: Only stores URLs, not image files
4. **Fallback**: Always has a fallback (category PNG) so cards never break
5. **Performance**: Uses Next.js Image optimization + lazy loading
6. **Detection**: Automatically detects PNG icons vs. real photos for different display styles

---

## 🔍 Debugging Image Issues

### **Check Image Source**
```typescript
// In BusinessCard component, log the image source:
console.log('Business:', business.name);
console.log('uploaded_image:', business.uploaded_image);
console.log('image_url:', business.image_url);
console.log('Final displayImage:', displayImage);
```

### **Common Issues**

1. **Image not showing**
   - Check if `uploaded_image` URL is valid
   - Verify Supabase Storage bucket exists and is public
   - Check browser console for 404 errors

2. **Wrong image displayed**
   - Check priority order (uploaded_image should override image_url)
   - Verify `isPngIcon()` detection logic

3. **Slow image loading**
   - Check if using `OptimizedImage` component
   - Verify lazy loading is enabled
   - Check image file size (should be optimized before upload)

