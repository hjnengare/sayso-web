# Business Images Edge Cases Analysis

## 🔴 Critical Edge Cases (Must Fix)

### 1. **Orphaned Storage Files**
**Issue**: If storage upload succeeds but DB insert fails, files remain in storage bucket forever.

**Current Behavior**: 
- Upload to storage → ✅ Success
- Insert to DB → ❌ Fails
- Result: Orphaned file in storage, no DB record

**Location**: `src/app/add-business/page.tsx:556-595`

**Fix Needed**:
```typescript
// After DB insert fails, clean up storage
if (imagesError) {
  // Delete uploaded files from storage
  for (const url of uploadedUrls) {
    const pathMatch = url.match(/\/business-images\/(.+)$/);
    if (pathMatch?.[1]) {
      await supabase.storage
        .from('business-images')
        .remove([pathMatch[1]]);
    }
  }
}
```

**Risk**: High - Storage bloat over time

---

### 2. **Storage Path Extraction Failure**
**Issue**: If URL format doesn't match expected pattern, storage deletion silently fails.

**Current Behavior**:
```typescript
if (url.includes('/business-images/')) {
  const pathMatch = url.match(/\/business-images\/(.+)$/);
  if (pathMatch && pathMatch[1]) {
    storagePath = pathMatch[1];
  }
}
// If pathMatch fails, storagePath is null, deletion skipped
```

**Edge Cases**:
- URL uses different domain (CDN, custom domain)
- URL has query parameters
- URL is encoded differently
- URL points to external source (not Supabase storage)

**Fix Needed**:
```typescript
// More robust path extraction
function extractStoragePath(url: string): string | null {
  // Try multiple patterns
  const patterns = [
    /\/business-images\/(.+?)(?:\?|$)/,  // With query params
    /\/business-images\/(.+)$/,          // Standard
    /storage\/v1\/object\/public\/business-images\/(.+?)(?:\?|$)/,  // Full path
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  
  // If URL doesn't match, check if it's from our bucket
  if (!url.includes('business-images')) {
    console.warn('[DELETE] URL does not appear to be from business-images bucket:', url);
    return null;
  }
  
  return null;
}
```

**Risk**: Medium - Storage files not deleted, causing bloat

---

### 3. **Business Deletion - Storage Cleanup**
**Issue**: When business is deleted, images in storage are NOT deleted (only DB records via CASCADE).

**Current Behavior**: 
- Business deleted → ✅ DB records cascade delete
- Storage files → ❌ Remain forever

**Location**: Business deletion endpoint (if exists)

**Fix Needed**:
```typescript
// Before deleting business, delete all images from storage
const { data: images } = await supabase
  .from('business_images')
  .select('url')
  .eq('business_id', businessId);

if (images && images.length > 0) {
  const paths = images
    .map(img => extractStoragePath(img.url))
    .filter((path): path is string => path !== null);
  
  if (paths.length > 0) {
    await supabase.storage
      .from('business-images')
      .remove(paths);
  }
}

// Then delete business (CASCADE will handle DB records)
```

**Risk**: High - Significant storage bloat over time

---

### 4. **Orphaned DB Records (404 Images)**
**Issue**: DB record exists but storage file is missing (404 when loading).

**Current Behavior**: 
- Image URL returns 404
- UI shows broken image
- No cleanup mechanism

**Fix Needed**:
```typescript
// Periodic cleanup job or on-demand validation
async function validateImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Cleanup orphaned records
async function cleanupOrphanedImages() {
  const { data: images } = await supabase
    .from('business_images')
    .select('id, url');
  
  for (const image of images || []) {
    const exists = await validateImageExists(image.url);
    if (!exists) {
      await supabase
        .from('business_images')
        .delete()
        .eq('id', image.id);
    }
  }
}
```

**Risk**: Medium - Broken images in UI

---

## 🟡 Important Edge Cases (Should Fix)

### 5. **Concurrent Primary Image Operations**
**Issue**: Race condition when multiple users set primary image simultaneously.

**Current Behavior**: 
- Trigger ensures single primary, but race conditions possible
- Two images could both be set as primary briefly

**Fix Needed**:
```sql
-- Add unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS business_images_single_primary
ON public.business_images (business_id)
WHERE is_primary = true;
```

**Risk**: Low - Trigger handles it, but index adds safety

---

### 6. **Image File Validation**
**Issue**: No validation that uploaded file is actually an image.

**Current Behavior**: 
- Accepts any file type
- Could upload .exe, .pdf, etc. as "image"

**Fix Needed**:
```typescript
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check MIME type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only images are allowed.' };
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 5MB limit.' };
  }
  
  // Check file extension matches MIME type
  const ext = file.name.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string[]> = {
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'webp': ['image/webp'],
    'gif': ['image/gif'],
  };
  
  if (ext && extMap[ext] && !extMap[ext].includes(file.type)) {
    return { valid: false, error: 'File extension does not match file type.' };
  }
  
  return { valid: true };
}
```

**Risk**: Medium - Security and storage issues

---

### 7. **Storage Quota Exceeded**
**Issue**: No handling when storage quota is full.

**Current Behavior**: 
- Upload fails with generic error
- No user-friendly message

**Fix Needed**:
```typescript
if (uploadError) {
  if (uploadError.message?.includes('quota') || uploadError.message?.includes('storage limit')) {
    showToast('Storage quota exceeded. Please contact support or delete old images.', 'error', 5000);
  } else {
    // Other error handling
  }
}
```

**Risk**: Low - Rare, but poor UX when it happens

---

### 8. **Duplicate Image Uploads**
**Issue**: Same image can be uploaded multiple times.

**Current Behavior**: 
- No duplicate detection
- Wastes storage space

**Fix Needed**:
```typescript
// Option 1: Hash-based duplicate detection
import { createHash } from 'crypto';

async function checkDuplicateImage(file: File, businessId: string): Promise<boolean> {
  const arrayBuffer = await file.arrayBuffer();
  const hash = createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex');
  
  // Check if hash exists in business_images
  const { data: existing } = await supabase
    .from('business_images')
    .select('id')
    .eq('business_id', businessId)
    .eq('hash', hash) // Would need to add hash column
    .single();
  
  return !!existing;
}

// Option 2: File name + size check (simpler)
async function checkDuplicateImage(file: File, businessId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('business_images')
    .select('url')
    .eq('business_id', businessId);
  
  // Extract file names from URLs and compare
  // (Simpler but less reliable)
}
```

**Risk**: Low - Wastes storage but not critical

---

### 9. **Network Timeout Handling**
**Issue**: No timeout for storage operations.

**Current Behavior**: 
- Operations can hang indefinitely
- No retry logic

**Fix Needed**:
```typescript
// Add timeout wrapper
async function uploadWithTimeout(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  timeoutMs: number = 30000
): Promise<{ error: any }> {
  return Promise.race([
    supabase.storage.from(bucket).upload(path, file),
    new Promise<{ error: any }>((resolve) => 
      setTimeout(() => resolve({ error: { message: 'Upload timeout' } }), timeoutMs)
    )
  ]);
}
```

**Risk**: Low - Rare, but poor UX

---

### 10. **Image URL Format Changes**
**Issue**: If Supabase changes URL format, path extraction breaks.

**Current Behavior**: 
- Hardcoded regex patterns
- Breaks if URL format changes

**Fix Needed**:
```typescript
// Store storage path separately in DB
ALTER TABLE business_images ADD COLUMN storage_path TEXT;

// Or use more flexible URL parsing
function extractStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Extract path from URL object
    const pathMatch = urlObj.pathname.match(/\/business-images\/(.+)$/);
    return pathMatch?.[1] || null;
  } catch {
    return null;
  }
}
```

**Risk**: Low - Supabase URLs are stable, but should be defensive

---

## 🟢 Minor Edge Cases (Nice to Have)

### 11. **Empty business_images with Legacy uploaded_image**
**Issue**: After migration, some businesses might have both.

**Current Behavior**: 
- UI checks business_images first (correct)
- Legacy uploaded_image ignored if business_images exists

**Risk**: None - Already handled correctly

---

### 12. **Image Error Handling in UI**
**Issue**: What if image URL returns 404/403?

**Current Behavior**: 
- `OptimizedImage` component has `onError` handler
- Falls back to category PNG

**Risk**: None - Already handled

---

### 13. **Storage Path Conflicts**
**Issue**: Two images with same path (timestamp collision).

**Current Behavior**: 
```typescript
const fileName = `${businessId}_${i}_${timestamp}.${fileExt}`;
```

**Risk**: Very Low - Timestamp + index makes collision extremely unlikely

---

### 14. **Business Ownership Changes**
**Issue**: What if business owner changes after images uploaded?

**Current Behavior**: 
- RLS policies check current owner
- Old owner loses access (correct behavior)

**Risk**: None - Working as intended

---

### 15. **Transaction Rollback**
**Issue**: If multiple images uploaded, partial failure leaves inconsistent state.

**Current Behavior**: 
- Each image uploaded individually
- If one fails, others succeed
- DB insert happens after all uploads

**Fix Needed**:
```typescript
// Option 1: Upload all, then insert all (current approach - good)
// Option 2: Transaction-like behavior
const uploadedFiles: Array<{ path: string; url: string }> = [];

try {
  // Upload all
  for (const image of images) {
    const result = await uploadImage(image);
    uploadedFiles.push(result);
  }
  
  // Insert all
  await insertImages(uploadedFiles);
} catch (error) {
  // Rollback: Delete all uploaded files
  for (const file of uploadedFiles) {
    await deleteFromStorage(file.path);
  }
  throw error;
}
```

**Risk**: Low - Current approach is acceptable

---

## 📋 Summary of Missing Fixes

### Must Fix (High Priority):
1. ✅ **Orphaned Storage Files** - Clean up on DB insert failure
2. ✅ **Storage Path Extraction** - More robust URL parsing
3. ✅ **Business Deletion Cleanup** - Delete storage files when business deleted
4. ✅ **Orphaned DB Records** - Periodic cleanup of 404 images

### Should Fix (Medium Priority):
5. ✅ **Image File Validation** - MIME type, size, extension checks
6. ✅ **Concurrent Operations** - Unique index for primary images
7. ✅ **Storage Quota Handling** - Better error messages
8. ✅ **Network Timeouts** - Add timeout and retry logic

### Nice to Have (Low Priority):
9. ✅ **Duplicate Detection** - Hash-based duplicate checking
10. ✅ **URL Format Flexibility** - Store storage_path separately

---

## 🔧 Recommended Implementation Order

1. **Image File Validation** (Quick win, high impact)
2. **Orphaned Storage Cleanup** (Prevents storage bloat)
3. **Business Deletion Cleanup** (Prevents storage bloat)
4. **Storage Path Extraction** (More robust)
5. **Orphaned DB Records Cleanup** (Periodic job)
6. **Network Timeouts** (Better UX)
7. **Duplicate Detection** (Storage optimization)

