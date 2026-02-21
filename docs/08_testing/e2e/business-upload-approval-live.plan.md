# Business Upload → Admin Approval → Goes Live E2E Test Plan

## Application Overview

Comprehensive E2E test plan for validating the complete business lifecycle from initial upload by business owner through admin approval to the business going live and being publicly visible. This plan ensures proper workflow states, permissions, notifications, and user experience throughout the business approval process.

## Test Scenarios

### 1. Pre-conditions Setup

**Seed:** `e2e/seed.spec.ts`

#### 1.1. TC001 - Verify Account Pre-conditions

**File:** `e2e/business-lifecycle/pre-conditions.spec.ts`

**Steps:**
  1. Login as business account using E2E_BUSINESS_ACCOUNT_EMAIL/PASSWORD
  2. Verify business account has valid session
  3. Verify business account can access business dashboard
  4. Login as admin account using E2E_ADMIN_EMAIL/PASSWORD
  5. Verify admin account has valid session
  6. Verify admin can access admin dashboard at /admin
  7. Check pending businesses queue is empty or manageable
  8. Clear any test businesses from previous runs

**Expected Results:**
  - Business account successfully authenticated
  - Admin account successfully authenticated
  - No pending businesses in queue
  - Database in clean state

#### 1.2. TC002 - Verify Business Creation Form Accessibility

**File:** `e2e/business-lifecycle/pre-conditions.spec.ts`

**Steps:**
  1. Login as business account
  2. Navigate to business creation page
  3. Verify form loads completely
  4. Check all required fields present: name, category, subcategory, location
  5. Test category dropdown population
  6. Test subcategory dropdown dependent on category selection
  7. Verify location field accepts valid Cape Town locations
  8. Test basic form validation (required field errors)

**Expected Results:**
  - Business creation form loads without errors
  - All required fields are present
  - Category/subcategory dropdowns populated
  - Location field functional
  - Form validation working correctly

### 2. Business Upload and Submission

**Seed:** `e2e/seed.spec.ts`

#### 2.1. TC003 - Valid Business Upload and Submission

**File:** `e2e/business-lifecycle/business-upload.spec.ts`

**Steps:**
  1. Login as business account
  2. Navigate to create business page
  3. Fill business name with unique identifier: 'E2E Test Business {timestamp}'
  4. Select category: 'Food & Drink'
  5. Select subcategory: 'Restaurant' or 'Cafe'
  6. Fill location: 'Cape Town, V&A Waterfront'
  7. Add business description (optional)
  8. Submit business creation form
  9. Verify success message: 'Business submitted for review' or similar
  10. Verify redirect to confirmation or dashboard page
  11. Check business appears in owner's business dashboard
  12. Verify business status shows 'Pending' or 'Under Review'
  13. Confirm business is NOT publicly accessible via direct URL

**Expected Results:**
  - Business successfully created with unique name
  - Business saved to database with pending status
  - Business submission confirmation displayed
  - Business not publicly visible yet
  - Business appears in business owner's dashboard
  - Proper metadata captured (creation timestamp, owner, etc.)

#### 2.2. TC004 - Business Upload Validation and Error Handling

**File:** `e2e/business-lifecycle/business-upload.spec.ts`

**Steps:**
  1. Login as business account
  2. Navigate to create business page
  3. Test missing required fields:
  4. - Submit with empty business name
  5. - Submit without selecting category
  6. - Submit without selecting subcategory
  7. - Submit without location
  8. Verify appropriate error messages for each field
  9. Verify form highlights missing/invalid fields
  10. Fill valid data and verify errors clear
  11. Test duplicate business name handling
  12. Test invalid location handling
  13. Successfully submit valid business after corrections

**Expected Results:**
  - Form validation prevents submission
  - Clear error messages displayed
  - Required field highlighting
  - User can correct errors and resubmit
  - No invalid data saved to database

#### 2.3. TC005 - Multiple Business Submissions by Same Owner

**File:** `e2e/business-lifecycle/business-upload.spec.ts`

**Steps:**
  1. Login as business account
  2. Create first business: 'E2E Test Restaurant {timestamp}'
  3. Verify first business submitted successfully
  4. Create second business: 'E2E Test Cafe {timestamp}'
  5. Verify second business submitted successfully
  6. Navigate to business owner dashboard
  7. Verify both businesses appear in dashboard
  8. Verify both show 'Pending' status
  9. Verify each has correct creation timestamp
  10. Verify business details are independent and correct

**Expected Results:**
  - Multiple businesses can be submitted by same account
  - Each business tracked independently
  - Business owner dashboard shows all submitted businesses
  - Status tracking works for multiple submissions
  - No interference between multiple business submissions

### 3. Admin Review and Approval Process

**Seed:** `e2e/seed.spec.ts`

#### 3.1. TC006 - Business Appears in Admin Pending Queue

**File:** `e2e/business-lifecycle/admin-approval.spec.ts`

**Steps:**
  1. Business submitted from previous test case
  2. Login as admin account
  3. Navigate to admin dashboard
  4. Navigate to pending businesses section (/admin/pending-businesses)
  5. Verify test business appears in pending queue
  6. Verify business shows correct status 'Pending'
  7. Click on business to view details
  8. Verify all submitted information displayed correctly:
  9. - Business name
  10. - Category and subcategory
  11. - Location
  12. - Description
  13. - Submission timestamp
  14. - Business owner information
  15. Verify approve/reject buttons available

**Expected Results:**
  - Pending business appears in admin queue
  - Business details correctly displayed
  - Admin can access business review interface
  - All submitted information visible to admin
  - Review actions available (approve/reject)

#### 3.2. TC007 - Admin Approves Business Successfully

**File:** `e2e/business-lifecycle/admin-approval.spec.ts`

**Steps:**
  1. Login as admin with pending business in queue
  2. Navigate to admin pending businesses
  3. Find test business in pending list
  4. Click 'Review' or 'View Details' for test business
  5. Review business information thoroughly
  6. Click 'Approve' button
  7. Confirm approval action if prompted
  8. Verify success message: 'Business approved successfully'
  9. Verify business removed from pending queue
  10. Check business status updated to 'approved' in admin list
  11. Verify business now appears in public business listings
  12. Test direct business URL accessibility
  13. Verify business searchable in public search

**Expected Results:**
  - Approval process completes successfully
  - Business status updates to 'approved' in database
  - Business becomes publicly accessible
  - Business appears in public listings
  - Business owner receives confirmation
  - Admin dashboard updates to reflect approval

#### 3.3. TC008 - Admin Rejects Business with Reason

**File:** `e2e/business-lifecycle/admin-approval.spec.ts`

**Steps:**
  1. Submit a business for rejection testing
  2. Login as admin
  3. Navigate to pending businesses
  4. Select test business for rejection
  5. Click 'Reject' or 'Disapprove' button
  6. Fill rejection reason: 'Invalid location information'
  7. Confirm rejection action
  8. Verify success message: 'Business rejected'
  9. Verify business status updated to 'rejected'
  10. Verify business removed from pending queue
  11. Confirm business NOT accessible publicly
  12. Verify business owner can see rejection in dashboard
  13. Check rejection reason visible to business owner

**Expected Results:**
  - Rejection process completes successfully
  - Business status updates to 'rejected' in database
  - Business remains hidden from public
  - Business owner receives rejection notification
  - Clear rejection reason recorded
  - Admin dashboard reflects rejection

### 4. Business Goes Live Validation

**Seed:** `e2e/seed.spec.ts`

#### 4.1. TC009 - Approved Business Public Accessibility

**File:** `e2e/business-lifecycle/business-live.spec.ts`

**Steps:**
  1. Ensure business approved from TC007
  2. Test direct URL access: /business/{business-slug}
  3. Verify business page loads without errors
  4. Verify all business information displayed:
  5. - Business name
  6. - Category and location
  7. - Description
  8. - Contact information if provided
  9. Test business appears in search results:
  10. - Search by business name
  11. - Search by category
  12. - Search by location
  13. Navigate to category browsing page
  14. Verify business appears in correct category listings
  15. Test business page SEO elements (title, meta description)

**Expected Results:**
  - Business accessible via direct URL
  - Business appears in search results
  - Business shows in category browsing
  - All business information correctly displayed
  - Business page fully functional
  - SEO metadata properly set

#### 4.2. TC010 - Business Discoverability and Search Integration

**File:** `e2e/business-lifecycle/business-live.spec.ts`

**Steps:**
  1. With approved business live
  2. Test homepage business listings:
  3. - Check if business appears in 'New Businesses'
  4. - Verify business in category sections if applicable
  5. Test search functionality:
  6. - Exact business name search
  7. - Partial business name search
  8. - Category-based search
  9. - Location-based search
  10. Test filtering:
  11. - Filter by business category
  12. - Filter by location/area
  13. Verify business appears in correct filtered results
  14. Test business appears in map view if available
  15. Verify business social sharing functionality

**Expected Results:**
  - Business discoverable through multiple channels
  - Search functionality returns business correctly
  - Category filtering includes business
  - Location-based filtering works
  - Business ranking appropriate for new business

#### 4.3. TC011 - Live Business Review Functionality

**File:** `e2e/business-lifecycle/business-live.spec.ts`

**Steps:**
  1. Navigate to approved business page
  2. Verify 'Write a Review' button present
  3. Click to write review
  4. Submit test review:
  5. - Rating: 4/5 stars
  6. - Review text: 'Great new business!'
  7. Verify review submission successful
  8. Verify review appears on business page
  9. Check review count updated
  10. Verify business rating updated
  11. Test review helps business discoverability
  12. Verify business owner can see review in dashboard

**Expected Results:**
  - Review submission works on live business
  - Reviews appear correctly
  - Business owner receives review notifications
  - Review count and ratings update
  - Business statistics function properly

### 5. Workflow State Management

**Seed:** `e2e/seed.spec.ts`

#### 5.1. TC012 - Business Status Tracking Throughout Lifecycle

**File:** `e2e/business-lifecycle/state-management.spec.ts`

**Steps:**
  1. Login as business owner
  2. Create business and verify status 'Pending'
  3. Check timestamp shows recent creation time
  4. Verify business in 'Submitted' or 'Pending' section of dashboard
  5. Admin approves business
  6. Return to business owner dashboard
  7. Verify status updated to 'Approved' or 'Live'
  8. Verify approval timestamp updated
  9. Check business moved to 'Live Businesses' section
  10. Verify business owner can edit live business details
  11. Test status history if available

**Expected Results:**
  - Business owner sees accurate status throughout process
  - Status transitions clear and logical
  - Timestamps accurately tracked
  - Business owner notifications work
  - Dashboard updates reflect current state

#### 5.2. TC013 - Admin Dashboard Business Management

**File:** `e2e/business-lifecycle/state-management.spec.ts`

**Steps:**
  1. Login as admin
  2. Navigate to businesses management section
  3. Test pending businesses list functionality:
  4. - Sort by submission date
  5. - Filter by category
  6. - Search by business name
  7. Test bulk approval actions if available
  8. Test individual business edit functionality
  9. Verify admin can modify business details
  10. Test admin can change business status manually
  11. Verify audit trail records admin actions
  12. Test pagination if many businesses present

**Expected Results:**
  - Admin dashboard provides clear business management
  - Bulk actions work correctly
  - Search/filter functionality in admin works
  - Business details editable by admin
  - Audit trail maintained

#### 5.3. TC014 - Notification and Communication System

**File:** `e2e/business-lifecycle/state-management.spec.ts`

**Steps:**
  1. Configure test email/notification monitoring
  2. Submit business as business owner
  3. Verify submission confirmation notification
  4. Admin approves business
  5. Verify business owner receives approval notification
  6. Check notification includes:
  7. - Business name
  8. - Approval timestamp
  9. - Next steps/instructions
  10. Test rejection notification flow
  11. Submit business for rejection
  12. Admin rejects with reason
  13. Verify business owner receives rejection notification
  14. Verify rejection reason included

**Expected Results:**
  - Email notifications sent correctly
  - In-app notifications work
  - Notification timing appropriate
  - Notification content accurate
  - User preferences respected

### 6. Edge Cases and Security

**Seed:** `e2e/seed.spec.ts`

#### 6.1. TC015 - Access Control and Permissions

**File:** `e2e/business-lifecycle/security-edge-cases.spec.ts`

**Steps:**
  1. Test unauthorized admin access:
  2. - Logout from admin account
  3. - Try to access /admin/pending-businesses directly
  4. - Verify redirect to login
  5. Test business owner permissions:
  6. - Login as different business owner
  7. - Try to access another owner's business
  8. - Verify access denied
  9. Test business visibility before approval:
  10. - Submit business as owner
  11. - Logout
  12. - Try to access business URL directly
  13. - Verify business not accessible
  14. Test admin permission boundaries
  15. Verify proper session timeout handling

**Expected Results:**
  - Unauthorized access blocked
  - Business data only visible to authorized users
  - Admin actions require proper permissions
  - No data leakage between accounts
  - Session management secure

#### 6.2. TC016 - Edge Cases and Error Handling

**File:** `e2e/business-lifecycle/security-edge-cases.spec.ts`

**Steps:**
  1. Test duplicate business submission:
  2. - Submit business with name 'Duplicate Test'
  3. - Submit another business with same name
  4. - Verify system handles gracefully
  5. Test network interruption:
  6. - Start business submission
  7. - Simulate network failure mid-submission
  8. - Verify no partial data saved
  9. Test concurrent admin actions:
  10. - Two admins review same business simultaneously
  11. - Verify proper conflict resolution
  12. Test malformed business data submission
  13. Test extremely long business names/descriptions
  14. Verify proper validation and error handling

**Expected Results:**
  - Duplicate business names handled gracefully
  - System recovers from network failures
  - Concurrent submissions managed correctly
  - Data integrity maintained
  - Clear error messages for edge cases

#### 6.3. TC017 - Performance and Scalability Validation

**File:** `e2e/business-lifecycle/security-edge-cases.spec.ts`

**Steps:**
  1. Monitor page load times:
  2. - Business creation form load time < 3s
  3. - Admin dashboard load time < 3s
  4. - Business approval process < 5s
  5. Test with multiple businesses:
  6. - Submit 10 businesses rapidly
  7. - Verify admin dashboard handles load
  8. Monitor database query performance
  9. Check for N+1 queries in admin dashboard
  10. Verify proper pagination in business lists
  11. Test search performance with many businesses
  12. Monitor memory usage throughout workflow

**Expected Results:**
  - System performs well under normal load
  - Database queries optimized
  - Page load times acceptable
  - Memory usage stable
  - No performance degradation
