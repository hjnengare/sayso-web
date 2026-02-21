# Server Optimization & Async Query Utilities

This directory contains utilities for optimizing server-side data fetching with connection pooling, parallel queries, and caching.

## Features

### 1. Connection Pooling (`supabase/pool.ts`)
- **Request-scoped client caching**: Reuses Supabase clients within the same request lifecycle
- **Global singleton**: Shared client for non-request-scoped operations
- **Parallel client creation**: Create multiple clients for independent parallel queries

### 2. Async Query Execution (`utils/asyncQueries.ts`)
- **Parallel execution**: Run multiple queries simultaneously
- **Batch processing**: Execute queries with concurrency limits
- **Timeout protection**: Prevent queries from hanging indefinitely
- **Retry logic**: Automatic retry with exponential backoff
- **Batch fetching**: Efficiently fetch multiple records by ID

### 3. Query Caching (`cache/queryCache.ts`)
- **In-memory caching**: Fast access to frequently queried data
- **TTL support**: Automatic cache expiration
- **Prefix-based invalidation**: Clear related cache entries
- **Cache statistics**: Monitor cache performance

### 4. Optimized Query Utilities (`utils/optimizedQueries.ts`)
- **High-level abstractions**: Combine caching, parallel execution, and pooling
- **Business data fetching**: Optimized for common use cases
- **Automatic cache management**: Handles cache invalidation

## Usage Examples

### Basic Connection Pooling

```typescript
import { getServerSupabase } from '@/app/lib/supabase/server';

// In API route - pass request for connection pooling
export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase(req);
  // Client is cached for this request
}
```

### Parallel Queries

```typescript
import { createParallelClients } from '@/app/lib/supabase/pool';
import { executeParallelQueries } from '@/app/lib/utils/asyncQueries';

// Create multiple clients for parallel operations
const [client1, client2] = await createParallelClients(2);

// Execute queries in parallel
const [result1, result2] = await executeParallelQueries([
  async () => {
    const { data, error } = await client1.from('table1').select('*');
    return { data, error };
  },
  async () => {
    const { data, error } = await client2.from('table2').select('*');
    return { data, error };
  },
]);
```

### Using Caching

```typescript
import { queryCache } from '@/app/lib/cache/queryCache';

// Check cache
const cacheKey = queryCache.key('business', { id: '123' });
const cached = queryCache.get(cacheKey);

if (!cached) {
  // Fetch data
  const data = await fetchData();
  // Cache for 5 minutes
  queryCache.set(cacheKey, data, 300000);
}
```

### Optimized Business Fetching

```typescript
import { fetchBusinessOptimized } from '@/app/lib/utils/optimizedQueries';

// Automatically uses caching, parallel queries, and connection pooling
const business = await fetchBusinessOptimized(businessId, request, true);
```

### Batch Operations

```typescript
import { batchFetchByIds } from '@/app/lib/utils/asyncQueries';

// Fetch multiple businesses efficiently
const result = await batchFetchByIds(
  supabase,
  'businesses',
  ['id1', 'id2', 'id3', ...],
  '*',
  100 // chunk size
);
```

### Retry with Exponential Backoff

```typescript
import { executeWithRetry } from '@/app/lib/utils/asyncQueries';

const result = await executeWithRetry(
  async () => {
    const { data, error } = await supabase.from('table').select('*');
    return { data, error };
  },
  3, // max retries
  100 // initial delay in ms
);
```

## Performance Benefits

1. **Connection Pooling**: Reduces connection overhead by reusing clients
2. **Parallel Queries**: Cuts query time by running independent queries simultaneously
3. **Caching**: Eliminates redundant database calls for frequently accessed data
4. **Batch Operations**: Reduces round trips when fetching multiple records

## Best Practices

1. **Always pass request object** to `getServerSupabase()` in API routes for connection pooling
2. **Use parallel queries** for independent data fetching operations
3. **Cache frequently accessed data** with appropriate TTL values
4. **Invalidate cache** when data is updated
5. **Use batch operations** when fetching multiple records by ID
6. **Set reasonable timeouts** to prevent hanging queries

## Cache Invalidation

```typescript
import { invalidateBusinessCache } from '@/app/lib/utils/optimizedQueries';

// Invalidate specific business
invalidateBusinessCache('business-id');

// Invalidate all business caches
invalidateBusinessCache();
```

## Monitoring

```typescript
import { queryCache } from '@/app/lib/cache/queryCache';

// Get cache statistics
const stats = queryCache.getStats();
console.log('Cache stats:', stats);
```

