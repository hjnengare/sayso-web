# Business Upload → For You: End-to-End Trace

This document traces what happens when a business owner uploads a business and how it links to the For You section and page.

---

## 1. Business Owner Uploads a Business

### Entry Point
- **Page:** `src/app/add-business/page.tsx`
- **API:** `POST /api/businesses` in `src/app/api/businesses/route.ts`

### On Creation
On successful creation, the business is saved with:

```ts
status: 'pending_approval',  // Requires admin approval before public visibility
is_hidden: true,             // Not live until admin approves
```

**Source:** `src/app/api/businesses/route.ts` ~lines 3553–3554

### Post-Creation Actions
- `business_owners` entry is created (owner_id → user)
- User profile is updated to `role: 'business_owner'`
- Images are uploaded to Supabase Storage
- `business_stats` is created via DB trigger

**Important:** Newly uploaded businesses do **not** appear in any public feed until admin approval.

---

## 2. Admin Approval Flow

### Endpoint
- **API:** `POST /api/admin/businesses/[id]/approve`
- **File:** `src/app/api/admin/businesses/[id]/approve/route.ts`

### When Admin Approves
The approve handler:

1. Validates business has `status === 'pending_approval'`
2. Ensures required fields (name, category, address, lat/lng) are present
3. Updates the business:

   ```ts
   status: 'active',
   is_hidden: false,
   verified: true,
   approved_at: new Date().toISOString(),
   approved_by: user.id,
   rejection_reason: null,
   ```

4. Invalidates caches and revalidates pages:

   ```ts
   invalidateBusinessCache(businessId, slug);
   revalidatePath('/');
   revalidatePath('/home');
   revalidatePath('/for-you');  // ← For You page cache invalidated
   ```

5. Creates a `business_approved` notification for the owner

**Source:** `src/app/api/admin/businesses/[id]/approve/route.ts` ~lines 100–132

---

## 3. For You Section and Page

### Where For You Appears
- **Home:** “For You” carousel/section on `/home` (HomeClient)
- **Dedicated page:** `/for-you` (ForYouClient)

### Data Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | `/for-you` page (SSR) | Fetches preferences + `GET /api/businesses?feed_strategy=mixed&limit=120&interest_ids=...` |
| 2 | Home “For You” section | Uses `useForYouBusinesses` → same API with `feed=for-you` or `feed_strategy=mixed` |
| 3 | API route | `src/app/api/businesses/route.ts` detects `feed=for-you` or `feed_strategy=mixed` |
| 4 | RPC calls | Calls `recommend_for_you_cold_start` or `recommend_for_you_v2_seeded` / `recommend_for_you_v2` |

**Source:** `src/app/api/businesses/route.ts` ~lines 611–615, 1672, 1929, 1954–1961

---

## 4. For You Recommendation Logic (Database)

### RPCs Used
- `recommend_for_you_cold_start` – zero or minimal engagement
- `recommend_for_you_v2_seeded` – preferred, falls back to `recommend_for_you_v2`

### Hard Filter in All Recommend Functions

```sql
WHERE b.status = 'active'
```

**Source:** e.g. `supabase/migrations/20260216_recommend_for_you_cold_start.sql` line 70, and `20260126_create_recommend_for_you_v2.sql`

**Implication:** Only businesses with `status = 'active'` are eligible for For You. `pending_approval`, `rejected`, etc. are excluded.

---

## 5. Summary: When Does an Uploaded Business Appear in For You?

| Stage | status | is_hidden | In For You? |
|-------|--------|-----------|-------------|
| Owner submits | `pending_approval` | `true` | No |
| Admin approves | `active` | `false` | Yes |
| Admin disapproves | `rejected` | `true` | No |

### Timeline

1. Owner creates business → row inserted with `status = 'pending_approval'`, `is_hidden = true`
2. Admin reviews pending businesses (e.g. via `/api/admin/businesses/pending`)
3. Admin approves → `status = 'active'`, `is_hidden = false`
4. `revalidatePath('/for-you')` invalidates Next.js cache
5. Next For You request hits `/api/businesses` → RPC `recommend_for_you_*` → only `status = 'active'` rows are returned

**Result:** An uploaded business appears in For You only after an admin approves it. There is no automatic approval or direct path from upload to For You without admin review.

---

## 6. Related Files

| Purpose | Path |
|---------|------|
| Add business page | `src/app/add-business/page.tsx` |
| Create business API | `src/app/api/businesses/route.ts` (POST handler) |
| Admin approve API | `src/app/api/admin/businesses/[id]/approve/route.ts` |
| Admin list pending | `src/app/api/admin/businesses/pending/route.ts` |
| For You page | `src/app/for-you/page.tsx`, `ForYouClient.tsx` |
| Home For You section | `src/app/home/HomeClient.tsx` |
| Businesses API (For You logic) | `src/app/api/businesses/route.ts` (feed detection, RPC calls) |
| Cold start RPC | `supabase/migrations/20260216_recommend_for_you_cold_start.sql` |
| V2 recommend RPC | `supabase/migrations/20260126_create_recommend_for_you_v2.sql` |
| Approval workflow migration | `supabase/migrations/20260222_business_approval_workflow.sql` |
