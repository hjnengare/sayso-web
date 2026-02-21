# Blabbr Design System

A comprehensive, accessible, and consistent design system for the Blabbr application.

## 🚀 Overview

The Blabbr Design System provides a unified set of design tokens, components, and guidelines that ensure visual consistency, accessibility compliance, and optimal user experience across the entire application.

### Key Features

- **🎨 Design Tokens**: Centralized color, typography, spacing, and component tokens
- **♿ Accessibility First**: WCAG 2.1 AA compliant components
- **📱 Mobile-First**: Responsive design with mobile-optimized touch targets
- **🎭 Motion-Safe**: Respects user motion preferences
- **🔧 Developer-Friendly**: TypeScript support with excellent DX
- **🎯 Performance-Focused**: Optimized for fast rendering and interactions

## 📦 Installation

The design system is part of the Blabbr codebase. Import components directly:

```tsx
import { Button, Input, Card, Typography } from '@/app/design-system';
```

## 🎨 Design Tokens

### Colors

```tsx
// Primary colors
sage-500    // Main sage (#749176)
coral-500   // Main coral (#d67469)

// Neutrals
charcoal-500  // Main text (#404040)
off-white-100 // Main background (#fafafa)

// Semantic colors
success-500   // Success states
error-500     // Error states
warning-500   // Warning states
info-500      // Info states
```

### Typography

```tsx
// Display sizes (mobile-first)
display-lg    // 34px - Hero headings
display-md    // 28px - Page headings

// Heading sizes
heading-lg    // 22px - Section headings
heading-md    // 20px - Subsection headings
heading-sm    // 18px - Small headings

// Body sizes
body-lg       // 17px - Large body text
body-md       // 16px - Regular body text
body-sm       // 14px - Small text

// Utility sizes
footnote      // 13px - Footnotes
caption       // 12px - Captions
```

### Spacing

Based on a 4px grid system:

```tsx
1  // 4px   - Micro spacing
2  // 8px   - Tight spacing
3  // 12px  - Small spacing
4  // 16px  - Base spacing
6  // 24px  - Large spacing
8  // 32px  - Section spacing
```

## 🧩 Components

### Button

Standardized button component with multiple variants and states.

```tsx
import { Button } from '@/app/design-system';

// Basic usage
<Button variant="primary" size="md">
  Click me
</Button>

// With icons and premium effects
<Button
  variant="primary"
  premium
  loading
  iconBefore={<Icon />}
>
  Save Changes
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- `premium`: boolean (enables motion effects)
- `fullWidth`: boolean
- `iconBefore` | `iconAfter`: ReactNode

### Input

Accessible form input with validation states and built-in icons.

```tsx
import { Input } from '@/app/design-system';

// Basic usage
<Input
  label="Email Address"
  type="email"
  required
  placeholder="Enter your email"
/>

// With validation
<Input
  label="Password"
  type="password"
  showPasswordToggle
  error="Password must be at least 6 characters"
/>
```

**Props:**
- `label`: string
- `error` | `success` | `helperText`: string
- `size`: 'sm' | 'md' | 'lg'
- `variant`: 'default' | 'filled' | 'outlined'
- `iconBefore` | `iconAfter`: ReactNode
- `showPasswordToggle`: boolean

### Card

Flexible card component for content containers.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/app/design-system';

// Basic usage
<Card variant="elevated" hoverable premium>
  <CardHeader>
    <CardTitle>Business Name</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

**Props:**
- `variant`: 'default' | 'elevated' | 'outlined' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `hoverable`: boolean
- `premium`: boolean (enables motion effects)
- `clickable`: boolean

### Typography

Semantic typography component with consistent styling.

```tsx
import { Typography, Heading, Text } from '@/app/design-system';

// Heading component
<Heading level={1}>Page Title</Heading>
<Heading level={2} color="sage">Section Title</Heading>

// Text component
<Text size="lg" weight="medium">
  Large body text
</Text>

// Custom typography
<Typography variant="heading-lg" as="h3" color="coral">
  Custom heading
</Typography>
```

### Toast

Accessible toast notifications for user feedback.

```tsx
import { Toast, ToastContainer } from '@/app/design-system';

// Basic usage
<Toast
  variant="success"
  title="Success!"
  open={showToast}
  onDismiss={() => setShowToast(false)}
>
  Your changes have been saved.
</Toast>
```

## 🎯 Usage Guidelines

### Do's ✅

- **Use design tokens** instead of hardcoded values
- **Maintain consistent spacing** with the 4px grid system
- **Follow the typography hierarchy** for proper content structure
- **Test with screen readers** and keyboard navigation
- **Respect motion preferences** in animations
- **Use semantic colors** for their intended purposes

### Don'ts ❌

- **Don't use hardcoded colors** outside the token system
- **Don't create custom button variants** without design approval
- **Don't ignore accessibility** requirements
- **Don't override component styles** without good reason
- **Don't break the typography scale** with custom font sizes

### Color Usage

```tsx
// ✅ Good
<div className="text-charcoal-500 bg-card-bg-50">

// ❌ Avoid
<div className="text-gray-600 bg-green-100">
```

### Spacing Usage

```tsx
// ✅ Good - Using design tokens
<div className="p-6 mb-4">

// ❌ Avoid - Hardcoded values
<div className="p-[24px] mb-[16px]">
```

## 🔄 Migration Guide

### Phase 1: Update Imports

Replace ad-hoc components with design system imports:

```tsx
// Before
import Button from '../components/Button/Button';

// After
import { Button } from '@/app/design-system';
```

### Phase 2: Update Props

Migrate to standardized prop names:

```tsx
// Before
<Button color="sage" large loading>

// After
<Button variant="primary" size="lg" loading>
```

### Phase 3: Color Migration

Replace hardcoded colors with tokens:

```tsx
// Before
className="text-[#749176] bg-[#f2e3da]"

// After
className="text-sage-500  bg-off-white  -200"
```

### Phase 4: Typography Migration

Use the new typography scale:

```tsx
// Before
className="text-xl font-bold"

// After - Option 1: Component
<Heading level={3}>Title</Heading>

// After - Option 2: Classes
className="text-heading-lg font-bold"
```

## 🧪 Testing

### Accessibility Testing

- Use `@axe-core/react` for automated testing
- Test keyboard navigation manually
- Verify screen reader compatibility
- Check color contrast ratios

### Visual Testing

- Test at multiple screen sizes
- Verify dark mode compatibility
- Check motion preferences
- Validate across browsers

## 📱 Responsive Design

The design system is mobile-first with breakpoints:

- `sm`: 640px (Mobile landscape)
- `md`: 768px (Tablet portrait)
- `lg`: 1024px (Tablet landscape)
- `xl`: 1280px (Desktop)

### Typography Scaling

Typography automatically scales on larger screens:

```tsx
// This scales from mobile to desktop sizes
<Typography variant="display-lg">Hero Title</Typography>
```

## ⚡ Performance

### Optimizations

- Tree-shakeable components
- Minimal runtime overhead
- Efficient CSS-in-JS usage
- Hardware-accelerated animations

### Bundle Size

The design system adds approximately:
- Core tokens: ~2KB
- Base components: ~5KB per component
- Full system: ~15KB (gzipped)

## 🛠️ Development

### Adding New Components

1. Follow the existing component structure
2. Include full TypeScript support
3. Add accessibility features
4. Write comprehensive tests
5. Update documentation

### Component Template

```tsx
/**
 * COMPONENT_NAME - BLABBR DESIGN SYSTEM
 */

import React, { forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface ComponentProps extends React.HTMLAttributes<HTMLElement> {
  // Component-specific props
}

const componentVariants = {
  base: [
    // Base styles
  ],
  variants: {
    // Variant styles
  },
} as const;

export const Component = forwardRef<HTMLElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    return (
      <element
        ref={ref}
        className={cn(componentVariants.base, className)}
        {...props}
      />
    );
  }
);

Component.displayName = 'Component';

export default Component;
```

## 🤝 Contributing

### Design System Team

For questions or contributions, contact:
- Design System Lead: [Email]
- Frontend Architecture: [Email]
- Accessibility Specialist: [Email]

### Process

1. Create issue for new component/token requests
2. Design review and approval
3. Implementation with accessibility testing
4. Documentation and migration guide
5. Team review and approval

## 📋 Changelog

### v1.0.0 (Current)
- ✨ Initial design system implementation
- 🎨 Complete design token system
- 🧩 Core component library (Button, Input, Card, Typography, Toast)
- ♿ WCAG 2.1 AA compliance
- 📱 Mobile-first responsive design
- 🔧 TypeScript support
- 📚 Comprehensive documentation

## 📚 Resources

- [Accessibility Guidelines](./accessibility.md)
- [Design Tokens Reference](./tokens.ts)
- [Component Examples](./examples/)
- [Migration Guide](./migration.md)

---

**Version:** 1.0.0
**Last Updated:** September 2025
**License:** MIT