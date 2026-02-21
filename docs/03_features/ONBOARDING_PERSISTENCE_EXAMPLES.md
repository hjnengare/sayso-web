# Onboarding Persistence Examples

## Overview

All selections MUST be persisted to the database so back navigation shows previous choices.

## Data Storage

- **Interests**: `user_interests` join table (maintained by `replace_user_interests` RPC)
- **Subcategories**: `user_subcategories` join table (maintained by `replace_user_subcategories` RPC)
- **Deal-breakers**: `user_dealbreakers` join table (maintained by `replace_user_dealbreakers` RPC)

## Loading Existing Selections

### Example: Interests Page

```typescript
// src/app/interests/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function InterestsPage() {
  const { user } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load existing selections from DB
  useEffect(() => {
    async function loadSelections() {
      if (!user) return;
      
      try {
        const response = await fetch('/api/user/onboarding');
        if (response.ok) {
          const data = await response.json();
          // Pre-populate selections from DB
          setSelectedInterests(data.interests || []);
        }
      } catch (error) {
        console.error('Failed to load interests:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadSelections();
  }, [user]);

  // Save selections (idempotent - can be called multiple times)
  const handleSave = async () => {
    if (selectedInterests.length === 0) {
      // Validation: require at least 1 interest
      return;
    }

    try {
      const response = await fetch('/api/onboarding/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: selectedInterests }),
      });

      if (!response.ok) {
        throw new Error('Failed to save interests');
      }

      // API route automatically:
      // 1. Saves to user_interests (upsert via replace_user_interests RPC)
      // 2. Updates profiles.onboarding_step = 'subcategories'
      // 3. Updates profiles.interests_count

      // Navigate to next step
      router.push('/subcategories');
    } catch (error) {
      console.error('Error saving interests:', error);
    }
  };

  // ... rest of component
}
```

### Example: Subcategories Page

```typescript
// src/app/subcategories/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SubcategoriesPage() {
  const { user } = useAuth();
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load existing selections from DB
  useEffect(() => {
    async function loadSelections() {
      if (!user) return;
      
      try {
        const response = await fetch('/api/user/onboarding');
        if (response.ok) {
          const data = await response.json();
          // Pre-populate selections from DB
          // subcategories come as array of { subcategory_id, interest_id }
          const subcategoryIds = data.subcategories?.map((s: any) => s.subcategory_id) || [];
          setSelectedSubcategories(subcategoryIds);
        }
      } catch (error) {
        console.error('Failed to load subcategories:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadSelections();
  }, [user]);

  // Save selections (idempotent - can be called multiple times)
  const handleSave = async () => {
    if (selectedSubcategories.length === 0) {
      // Validation: require at least 1 subcategory
      return;
    }

    try {
      // Map selected subcategory IDs to format expected by API
      const subcategoryData = selectedSubcategories.map(subId => {
        // Find the subcategory to get its interest_id
        const sub = subcategories.find(s => s.id === subId);
        return {
          subcategory_id: subId,
          interest_id: sub?.interest_id || '', // Must have interest_id
        };
      });

      const response = await fetch('/api/onboarding/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subcategories: subcategoryData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subcategories');
      }

      // API route automatically:
      // 1. Saves to user_subcategories (upsert via replace_user_subcategories RPC)
      // 2. Updates profiles.onboarding_step = 'deal-breakers'
      // 3. Updates profiles.subcategories_count

      // Navigate to next step
      router.push('/deal-breakers');
    } catch (error) {
      console.error('Error saving subcategories:', error);
    }
  };

  // ... rest of component
}
```

### Example: Deal-breakers Page

```typescript
// src/app/deal-breakers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function DealBreakersPage() {
  const { user } = useAuth();
  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load existing selections from DB
  useEffect(() => {
    async function loadSelections() {
      if (!user) return;
      
      try {
        const response = await fetch('/api/user/onboarding');
        if (response.ok) {
          const data = await response.json();
          // Pre-populate selections from DB
          setSelectedDealbreakers(data.dealbreakers || []);
        }
      } catch (error) {
        console.error('Failed to load deal-breakers:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadSelections();
  }, [user]);

  // Save selections (idempotent - can be called multiple times)
  const handleSave = async () => {
    // Validation: require at least 1 deal-breaker (or adjust based on product requirements)
    if (selectedDealbreakers.length === 0) {
      return;
    }

    try {
      const response = await fetch('/api/onboarding/deal-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealbreakers: selectedDealbreakers }),
      });

      if (!response.ok) {
        throw new Error('Failed to save deal-breakers');
      }

      // API route automatically:
      // 1. Saves to user_dealbreakers (upsert via replace_user_dealbreakers RPC)
      // 2. Updates profiles.onboarding_step = 'complete'
      // 3. Updates profiles.dealbreakers_count
      // NOTE: onboarding_complete stays false until /complete page

      // Navigate to next step
      router.push('/complete');
    } catch (error) {
      console.error('Error saving deal-breakers:', error);
    }
  };

  // ... rest of component
}
```

## Key Points

1. **Idempotent Saves**: All save operations use `replace_*` RPC functions that do upserts, so calling save multiple times is safe.

2. **Pre-loading**: Each page loads existing selections from `/api/user/onboarding` on mount, so back navigation shows previous choices.

3. **Step Transitions**: API routes handle step transitions automatically:
   - Save interests → `onboarding_step = 'subcategories'`
   - Save subcategories → `onboarding_step = 'deal-breakers'`
   - Save deal-breakers → `onboarding_step = 'complete'`
   - Complete page → `onboarding_complete = true`

4. **Validation**: Each step validates required data before allowing save (e.g., at least 1 interest, 1 subcategory, 1 deal-breaker).

5. **Back Navigation**: Since selections are persisted, users can go back and see/edit their previous choices.

