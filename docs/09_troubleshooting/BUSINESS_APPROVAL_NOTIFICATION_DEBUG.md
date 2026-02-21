## Business Approval Notification Debugging Guide

### Issue
Notifications are not being created when a business gets approved by an admin.

### Potential Root Causes

1. **Database function doesn't exist** - The `create_business_approved_notification` function may not be deployed to your database
2. **Migration not applied** - The migration `20260217_add_badge_and_helpful_notification_types.sql` may not have run
3. **RPC call failing silently** - The function exists but is encountering errors
4. **Missing owner_id** - The business being approved doesn't have an `owner_id` set

---

### Debugging Steps

#### Step 1: Check if the database function exists

1. Go to your Supabase Dashboard → SQL Editor
2. Run the test script: `/scripts/test-notification-function.sql`
3. Check the results:
   - If `routine_name` is empty → Function doesn't exist, proceed to Step 5
   - If function exists → Proceed to Step 2

#### Step 2: Test the debug endpoint (Requires Admin Access)

1. Start your dev server: `npm run dev`
2. Login as an admin user
3. Visit: `http://localhost:3000/api/admin/debug/check-notification-function`
4. Check the response:
   - `functionExists: false` with code `42883` → Function missing, go to Step 5
   - `functionExists: true` with error → Function exists but has issues, check error details
   - `functionExists: true` with success → Function works, go to Step 3

#### Step 3: Check server logs when approving a business

1. Open your terminal and watch the console output
2. As admin, approve a pending business
3. Look for log messages starting with `[Admin]`:
   ```
   [Admin] Creating business approval notification...
   [Admin] RPC error creating business approval notification:
   [Admin] Business approval notification created successfully:
   ```
4. If you see "RPC error", the error details will show you what's wrong
5. If you see "No owner_id found", the business doesn't have an owner

#### Step 4: Verify business has owner_id

Run this in Supabase SQL Editor (replace `BUSINESS_ID` with actual ID):
```sql
SELECT id, name, owner_id, status 
FROM businesses 
WHERE id = 'BUSINESS_ID';
```

If `owner_id` is NULL, notifications can't be sent. You need to assign an owner first.

#### Step 5: Apply the migration

If the function doesn't exist, you need to run the migration:

**Option A: Through Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of: `supabase/migrations/20260217_add_badge_and_helpful_notification_types.sql`
3. Paste and run it

**Option B: Through Supabase CLI** (if you have it set up)
```bash
supabase db push
```

#### Step 6: Verify the notification type is valid

Check if your notifications table accepts the `business_approved` type:

```sql
-- Check the constraint on the type column
SELECT 
  conname,
  pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
  AND contype = 'c';
```

If `business_approved` is not in the CHECK constraint list, you need to add it.

---

### Quick Fix Checklist

- [ ] Database function `create_business_approved_notification` exists
- [ ] Migration `20260217_add_badge_and_helpful_notification_types.sql` has been applied
- [ ] Business being approved has an `owner_id` (not NULL)
- [ ] Notification type `business_approved` is in the notifications table type constraint
- [ ] No RPC errors in server logs when approving
- [ ] Test notification created successfully via debug endpoint

---

### Improved Error Logging

The approval endpoint has been enhanced with detailed logging at:
`src/app/api/admin/businesses/[id]/approve/route.ts` (lines 137-162)

Now when you approve a business, you'll see:
- What owner_id, business_id, and business_name are being used
- Detailed RPC error information if the call fails
- Success confirmation if notification is created

---

### Testing After Fix

1. Create a test business as a business owner
2. As admin, approve the business
3. Check the business owner's notifications page
4. Verify a "✅ Business Approved!" notification appears
5. Click it to confirm it links to the business management page

---

### Common Issues & Solutions

**Issue: Function not found error (code 42883)**
- **Solution**: Run the migration file to create the function

**Issue: "No owner_id found for business"**
- **Solution**: Assign ownership before approving:
  ```sql
  UPDATE businesses 
  SET owner_id = 'USER_UUID_HERE' 
  WHERE id = 'BUSINESS_ID_HERE';
  ```

**Issue: Notifications created but not showing**
- Check notifications page displays `business_approved` type correctly
- Verify user_id in notification matches the business owner
- Check if notification context is loading correctly

**Issue: Permission denied on RPC call**
- Ensure service role client is being used (not user client)
- Check RLS policies on notifications table
