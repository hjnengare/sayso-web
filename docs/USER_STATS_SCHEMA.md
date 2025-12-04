# User Stats Schema

## TypeScript Interface

```typescript
export interface UserStats {
  totalReviewsWritten: number;        // Count of reviews written by user
  totalHelpfulVotesGiven: number;     // Count of helpful votes user has given to others
  totalBusinessesSaved: number;       // Count of businesses user has saved
  accountCreationDate: string;        // ISO timestamp from profiles.created_at
  lastActiveDate: string;             // ISO timestamp from profiles.last_active_at (or created_at if null)
  helpfulVotesReceived: number;       // Count of helpful votes received on user's reviews
}
```

## Database Tables Used

User stats are **computed/aggregated** from the following database tables:

### 1. `profiles` table
**Fields used:**
- `id` (UUID) - User ID (primary key)
- `created_at` (TIMESTAMPTZ) - Account creation date
- `last_active_at` (TIMESTAMPTZ) - Last active timestamp

**Query:**
```sql
SELECT created_at, last_active_at 
FROM profiles 
WHERE id = :userId;
```

### 2. `reviews` table
**Fields used:**
- `user_id` (UUID) - Foreign key to auth.users(id)
- `id` (UUID) - Review ID (used for helpful votes calculation)

**Queries:**
```sql
-- Count total reviews written
SELECT COUNT(*) 
FROM reviews 
WHERE user_id = :userId;

-- Get review IDs for helpful votes calculation
SELECT id 
FROM reviews 
WHERE user_id = :userId;
```

### 3. `review_helpful_votes` table
**Fields used:**
- `user_id` (UUID) - User who gave the helpful vote
- `review_id` (UUID) - Review that received the vote

**Queries:**
```sql
-- Count helpful votes given by user
SELECT COUNT(*) 
FROM review_helpful_votes 
WHERE user_id = :userId;

-- Count helpful votes received on user's reviews
SELECT COUNT(*) 
FROM review_helpful_votes 
WHERE review_id IN (
  SELECT id FROM reviews WHERE user_id = :userId
);
```

### 4. `saved_businesses` table
**Fields used:**
- `user_id` (UUID) - User who saved the business

**Query:**
```sql
SELECT COUNT(*) 
FROM saved_businesses 
WHERE user_id = :userId;
```

## Computation Logic

The `getUserStats` function in `src/app/lib/services/userService.ts`:

1. **Fetches profile data** to get account creation and last active dates
2. **Counts reviews** where `user_id` matches the user
3. **Counts helpful votes given** where `user_id` matches the user
4. **Counts saved businesses** where `user_id` matches the user
5. **Calculates helpful votes received** by:
   - Getting all review IDs for the user
   - Counting helpful votes where `review_id` is in that list

## API Endpoint

**GET** `/api/user/stats`

**Response:**
```json
{
  "data": {
    "totalReviewsWritten": 42,
    "totalHelpfulVotesGiven": 15,
    "totalBusinessesSaved": 8,
    "accountCreationDate": "2024-01-15T10:30:00Z",
    "lastActiveDate": "2024-01-20T14:22:00Z",
    "helpfulVotesReceived": 127
  },
  "error": null
}
```

**Error Response:**
```json
{
  "data": null,
  "error": {
    "message": "Unauthorized",
    "code": "UNAUTHORIZED"
  }
}
```

## Notes

- User stats are **not stored** in a separate table - they are computed on-demand
- All queries use `user_id` to filter data
- The function handles errors gracefully and returns `null` if profile is not found
- Individual query failures are logged but don't stop the entire operation
- Default values of `0` are used if any count query fails

