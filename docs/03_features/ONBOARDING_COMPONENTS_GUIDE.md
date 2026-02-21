# Onboarding Components - Usage Guide

## Overview
The onboarding system has been componentized into smaller, reusable, manageable pieces. Each component has a single responsibility and can be composed together.

## Component Hierarchy

### Base Components (Lowest Level)
- **OnboardingCard** - Styled container with glass-morphism effect
- **OnboardingButton** - Multi-state button with loading indicators
- **OnboardingBackButton** - Simple back navigation button
- **OnboardingItemCard** - Selectable item card with visual feedback

### Layout Components
- **OnboardingLayout** - Page wrapper with step indicator, animations, back button
- **OnboardingProgressIndicator** - Step progress bar with labels
- **OnboardingActionBar** - Container for action buttons

### Information Components
- **OnboardingStepHeader** - Title, description, subtitle display
- **OnboardingSelectionInfo** - Shows count, min/max, selection status
- **OnboardingErrorBanner** - Error message display with icon

### Grid Component
- **OnboardingItemGrid** - Responsive grid layout for items (1-4 columns)

---

## Usage Examples

### Example 1: Simple Selection Page (Interests, Dealbreakers)

```tsx
import {
  OnboardingLayout,
  OnboardingStepHeader,
  OnboardingSelectionInfo,
  OnboardingErrorBanner,
  OnboardingItemGrid,
  OnboardingItemCard,
  OnboardingActionBar,
  OnboardingButton,
} from "../components/Onboarding";

function InterestsContent() {
  const { items, selected, error, handleToggle, handleNext } = useData();

  return (
    <OnboardingLayout step={1} backHref="/register">
      <OnboardingStepHeader
        title="What are your interests?"
        description="Select at least 3 interests to get started"
        subtitle="Step 1 of 4"
      />

      <OnboardingSelectionInfo
        selectedCount={selected.length}
        minSelections={3}
        maxSelections={6}
        singular="interest"
        plural="interests"
      />

      <OnboardingErrorBanner error={error} className="mb-6" />

      <OnboardingItemGrid columns={2} gap="md">
        {items.map((item) => (
          <OnboardingItemCard
            key={item.id}
            isSelected={selected.includes(item.id)}
            onClick={() => handleToggle(item.id)}
            label={item.name}
            icon={<item.icon className="w-6 h-6" />}
          />
        ))}
      </OnboardingItemGrid>

      <OnboardingActionBar>
        <OnboardingButton
          canProceed={selected.length >= 3}
          onClick={handleNext}
          selectedCount={selected.length}
        />
      </OnboardingActionBar>
    </OnboardingLayout>
  );
}
```

### Example 2: Grouped Selection Page (Subcategories)

```tsx
function SubcategoriesContent() {
  const { groups, selected, error, handleToggle, handleNext } = useData();

  return (
    <OnboardingLayout step={2} backHref="/interests">
      <OnboardingStepHeader
        title="Narrow it down"
        description="Select subcategories within your interests"
        subtitle="Step 2 of 4"
      />

      {groups.map((group) => (
        <div key={group.interestId} className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {group.interestName}
          </h2>

          <OnboardingItemGrid columns={2} gap="md">
            {group.items.map((item) => (
              <OnboardingItemCard
                key={item.id}
                isSelected={selected.includes(item.id)}
                onClick={() => handleToggle(item.id)}
                label={item.name}
              />
            ))}
          </OnboardingItemGrid>
        </div>
      ))}

      <OnboardingSelectionInfo
        selectedCount={selected.length}
        maxSelections={10}
      />

      <OnboardingErrorBanner error={error} />

      <OnboardingActionBar>
        <OnboardingButton
          canProceed={selected.length > 0}
          onClick={handleNext}
          selectedCount={selected.length}
        />
      </OnboardingActionBar>
    </OnboardingLayout>
  );
}
```

### Example 3: Complex Content Page (Complete)

```tsx
function CompleteContent() {
  const { selections, handleComplete } = useData();

  return (
    <OnboardingLayout step={4} backHref="/deal-breakers">
      <OnboardingStepHeader
        title="You're all set!"
        description="Here's a summary of your preferences"
      />

      {/* Summary cards */}
      <OnboardingCard className="mb-6">
        <h3 className="font-semibold mb-3">Your Interests</h3>
        <div className="flex flex-wrap gap-2">
          {selections.interests.map((int) => (
            <span key={int} className="px-3 py-1 bg-card-bg/10 text-sage rounded-full text-sm">
              {int}
            </span>
          ))}
        </div>
      </OnboardingCard>

      <OnboardingActionBar align="center">
        <OnboardingButton
          canProceed={true}
          onClick={handleComplete}
          variant="complete"
          text="Complete Setup"
        />
      </OnboardingActionBar>
    </OnboardingLayout>
  );
}
```

---

## Component Props Reference

### OnboardingStepHeader
```tsx
interface OnboardingStepHeaderProps {
  title: string;                    // Main heading
  description?: string;             // Description text
  subtitle?: string;                // Subheading (e.g., "Step 1 of 4")
  children?: ReactNode;             // Additional content
  className?: string;               // Extra CSS classes
}
```

### OnboardingSelectionInfo
```tsx
interface OnboardingSelectionInfoProps {
  selectedCount: number;            // Number of selected items
  minSelections?: number;           // Minimum required
  maxSelections?: number;           // Maximum allowed
  singular?: string;                // Singular form (default: "item")
  plural?: string;                  // Plural form (default: "items")
  children?: ReactNode;             // Additional content
  className?: string;
}
```

### OnboardingItemCard
```tsx
interface OnboardingItemCardProps {
  children?: ReactNode;             // Custom content
  isSelected?: boolean;             // Selection state
  onClick?: () => void;             // Click handler
  disabled?: boolean;               // Disabled state
  animated?: boolean;               // Hover animation
  shaking?: boolean;                // Shake animation
  icon?: ReactNode;                 // Icon element
  label?: string;                   // Item label
  description?: string;             // Item description
  className?: string;
}
```

### OnboardingItemGrid
```tsx
interface OnboardingItemGridProps {
  children: ReactNode;              // Grid items
  columns?: number;                 // 1-4 columns (default: 2)
  gap?: "sm" | "md" | "lg";        // Spacing (default: "md")
  className?: string;
}
```

### OnboardingActionBar
```tsx
interface OnboardingActionBarProps {
  children: ReactNode;              // Action buttons
  align?: "left" | "center" | "right"; // Button alignment
  className?: string;
}
```

### OnboardingErrorBanner
```tsx
interface OnboardingErrorBannerProps {
  error: Error | string | null;    // Error to display
  className?: string;
}
```

### OnboardingProgressIndicator
```tsx
interface OnboardingProgressIndicatorProps {
  currentStep: number;              // Current step (1-based)
  totalSteps: number;               // Total steps
  showLabels?: boolean;             // Show step labels
  labels?: string[];                // Step label texts
  className?: string;
}
```

---

## Migration Examples

### Before (Old Pattern)
```tsx
<div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center mb-4">
  <p className="text-sm font-semibold text-red-600">
    {error.message}
  </p>
</div>
```

### After (New Pattern)
```tsx
<OnboardingErrorBanner error={error} className="mb-4" />
```

---

## Best Practices

1. **Composition Over Deep Nesting**
   - Use small components and compose them
   - Avoid creating mega-components

2. **Keep State Logic Outside**
   - Components are presentation-focused
   - State management stays in hooks/pages

3. **Consistent Spacing**
   - Use OnboardingActionBar for button groups
   - Use mb-6, mb-4 for section spacing

4. **Error Handling**
   - Always wrap errors with OnboardingErrorBanner
   - Place errors near the affected section

5. **Animation Consistency**
   - Use delay-100, delay-200 for staggered animations
   - Respect user's prefers-reduced-motion

---

## CSS Classes Reference

The components use these utility classes:
- `animate-fade-in-up` - Fade in with upward movement
- `delay-100`, `delay-200` - Animation delays
- `animate-shake` - Shake animation (for max reached)
- All components follow Tailwind naming conventions

---

## Creating New Onboarding Pages

Template for new onboarding steps:

```tsx
"use client";

import { Suspense } from "react";
import {
  OnboardingLayout,
  OnboardingStepHeader,
  OnboardingSelectionInfo,
  OnboardingErrorBanner,
  OnboardingItemGrid,
  OnboardingItemCard,
  OnboardingActionBar,
  OnboardingButton,
} from "../components/Onboarding";
import { useYourHook } from "../hooks/useYourHook";

function YourPageContent() {
  const { data, selected, error, isLoading, handleToggle, handleNext } = useYourHook();

  return (
    <OnboardingLayout step={YOUR_STEP} backHref="/previous-step">
      <OnboardingStepHeader
        title="Your Title"
        description="Your description"
        subtitle={`Step YOUR_STEP of 4`}
      />

      <OnboardingSelectionInfo
        selectedCount={selected.length}
        minSelections={3}
        maxSelections={6}
      />

      <OnboardingErrorBanner error={error} className="mb-6" />

      <OnboardingItemGrid>
        {data.map((item) => (
          <OnboardingItemCard
            key={item.id}
            isSelected={selected.includes(item.id)}
            onClick={() => handleToggle(item.id)}
            label={item.name}
            icon={item.icon}
          />
        ))}
      </OnboardingItemGrid>

      <OnboardingActionBar>
        <OnboardingButton
          canProceed={selected.length >= 3}
          isLoading={isLoading}
          onClick={handleNext}
          selectedCount={selected.length}
        />
      </OnboardingActionBar>
    </OnboardingLayout>
  );
}

export default function YourPage() {
  return (
    <Suspense fallback={<OnboardingLayout step={YOUR_STEP} backHref="/previous-step"><Loader /></OnboardingLayout>}>
      <YourPageContent />
    </Suspense>
  );
}
```
