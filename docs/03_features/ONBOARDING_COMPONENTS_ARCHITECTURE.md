# Onboarding Components - Architecture Summary

## New Components Created

### 1. **OnboardingStepHeader** ✨ NEW
- **Purpose**: Display step title, description, and subtitle
- **Reuses**: Typography consistency across all steps
- **Props**: title, description, subtitle, children, className
- **File**: `src/app/components/Onboarding/OnboardingStepHeader.tsx`

### 2. **OnboardingSelectionInfo** ✨ NEW
- **Purpose**: Show selection count with min/max validation feedback
- **Features**: 
  - Color-coded status (red=max, green=ready, gray=in-progress)
  - Dynamic text based on singular/plural
  - Progress indication
- **File**: `src/app/components/Onboarding/OnboardingSelectionInfo.tsx`

### 3. **OnboardingErrorBanner** ✨ NEW
- **Purpose**: Consistent error display with icon
- **Replaces**: Manual error divs scattered in pages
- **Features**: Alert icon, auto-formatting of Error/string types
- **File**: `src/app/components/Onboarding/OnboardingErrorBanner.tsx`

### 4. **OnboardingActionBar** ✨ NEW
- **Purpose**: Container for action buttons (Continue, Complete, Back)
- **Features**: Alignment options (left, center, right), animated entry
- **File**: `src/app/components/Onboarding/OnboardingActionBar.tsx`

### 5. **OnboardingItemGrid** ✨ NEW
- **Purpose**: Responsive grid layout (1-4 columns)
- **Features**: Gap options (sm, md, lg), animations built-in
- **Replaces**: Manual grid divs
- **File**: `src/app/components/Onboarding/OnboardingItemGrid.tsx`

### 6. **OnboardingItemCard** ✨ NEW
- **Purpose**: Individual selectable item
- **Features**: 
  - Selection state visual feedback
  - Icon + label + description support
  - Checkmark indicator on selection
  - Hover animations
  - Shake animation support
- **File**: `src/app/components/Onboarding/OnboardingItemCard.tsx`

### 7. **OnboardingBackButton** ✨ NEW
- **Purpose**: Consistent back navigation
- **Features**: Icon + label, customizable text
- **Replaces**: Manual back buttons
- **File**: `src/app/components/Onboarding/OnboardingBackButton.tsx`

### 8. **OnboardingProgressIndicator** ✨ NEW
- **Purpose**: Visual progress through onboarding steps
- **Features**: 
  - Progress bar animation
  - Optional step labels
  - Numeric indicator fallback
- **File**: `src/app/components/Onboarding/OnboardingProgressIndicator.tsx`

## Existing Components (Enhanced)

### OnboardingLayout
- Already exists - still provides page wrapper
- Works with new components seamlessly

### OnboardingCard
- Already exists - base styling for content containers
- New ItemCard component builds on this

### OnboardingButton
- Already exists - primary action button
- Still handles Continue/Complete variants

### OnboardingErrorBoundary
- Already exists - error boundary wrapper
- Works with new ErrorBanner component

## Component Dependency Tree

```
OnboardingLayout (existing)
├── OnboardingProgressIndicator (new)
├── OnboardingStepHeader (new)
├── OnboardingSelectionInfo (new)
├── OnboardingErrorBanner (new)
├── OnboardingItemGrid (new)
│   └── OnboardingItemCard (new) [repeating]
└── OnboardingActionBar (new)
    └── OnboardingButton (existing)
        └── OnboardingBackButton (new)
```

## Benefits of New Architecture

| Aspect | Before | After |
|--------|--------|-------|
| **Reusability** | Low - custom divs per page | High - compose standardized pieces |
| **Maintainability** | Scattered styling/logic | Centralized, single responsibility |
| **Consistency** | Manual alignment needed | Built-in consistency |
| **Testing** | Hard to unit test | Easy to test individual components |
| **Props** | Implicit/magic strings | Explicit, typed interfaces |
| **Code Duplication** | High (error divs, grids) | Eliminated |
| **Accessibility** | Varied | Consistent (icons, labels) |

## Quick Migration Guide

### Common Patterns

**Pattern 1: Error Display**
```tsx
// BEFORE
<div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center mb-4">
  <p className="text-sm font-semibold text-red-600">{error.message}</p>
</div>

// AFTER
<OnboardingErrorBanner error={error} className="mb-4" />
```

**Pattern 2: Item Grids**
```tsx
// BEFORE
<div className="grid grid-cols-2 gap-3 sm:gap-4">
  {items.map(item => <div key={item.id}>{item.name}</div>)}
</div>

// AFTER
<OnboardingItemGrid columns={2} gap="md">
  {items.map(item => (
    <OnboardingItemCard key={item.id} label={item.name} />
  ))}
</OnboardingItemGrid>
```

**Pattern 3: Status Display**
```tsx
// BEFORE
<div className="inline-block px-4 py-2 rounded-full text-sm">
  {selectedCount} items selected
</div>

// AFTER
<OnboardingSelectionInfo selectedCount={selectedCount} />
```

## Files Structure

```
src/app/components/Onboarding/
├── index.ts                           (new - barrel export)
├── OnboardingLayout.tsx               (existing)
├── OnboardingCard.tsx                 (existing)
├── OnboardingButton.tsx               (existing)
├── OnboardingErrorBoundary.tsx        (existing)
├── PageTransition.tsx                 (existing)
├── OnboardingStepHeader.tsx          (new ✨)
├── OnboardingSelectionInfo.tsx       (new ✨)
├── OnboardingErrorBanner.tsx         (new ✨)
├── OnboardingActionBar.tsx           (new ✨)
├── OnboardingItemGrid.tsx            (new ✨)
├── OnboardingItemCard.tsx            (new ✨)
├── OnboardingBackButton.tsx          (new ✨)
└── OnboardingProgressIndicator.tsx   (new ✨)
```

## Import Examples

```tsx
// Import individual components
import { OnboardingItemCard, OnboardingItemGrid } from "../components/Onboarding";

// Or use barrel export (index.ts)
import {
  OnboardingStepHeader,
  OnboardingSelectionInfo,
  OnboardingErrorBanner,
  OnboardingActionBar,
  OnboardingItemGrid,
  OnboardingItemCard,
  OnboardingButton,
} from "../components/Onboarding";
```

## Next Steps for Refactoring Pages

Current pages that can use new components:
1. `/interests` - Use ItemGrid + ItemCard
2. `/subcategories` - Use ItemGrid + ItemCard + grouping
3. `/deal-breakers` - Use ItemGrid + ItemCard
4. `/complete` - Use summary cards

See `ONBOARDING_COMPONENTS_GUIDE.md` for detailed refactoring examples.
