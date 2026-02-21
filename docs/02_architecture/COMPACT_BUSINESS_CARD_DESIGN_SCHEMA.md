# Compact Business Card Design Schema Analysis

## Overview
The BusinessCard component supports two modes: **regular** and **compact**. The compact mode is optimized for space-constrained layouts while maintaining visual hierarchy and functionality.

---

## Component Structure

### Root Container (`<li>`)
```typescript
className: `snap-start snap-always flex-shrink-0 ${compact ? 'w-auto' : 'w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] xl:min-w-[25%]'}`
```

**Compact Mode:**
- Width: `w-auto` (flexible, adapts to content)
- No minimum width constraints

**Regular Mode:**
- Mobile: `w-[100vw]` (full viewport width)
- Tablet+: `sm:w-auto sm:min-w-[25%]` (minimum 25% width)
- Desktop: `md:min-w-[25%] xl:min-w-[25%]` (maintains 25% minimum)

---

## Card Container

### Main Card Wrapper
```typescript
className: `${compact ? "md:h-[416px]" : "h-[650px] sm:h-auto md:w-[340px]"}`
maxWidth: compact ? "100%" : "540px"
```

**Compact Mode:**
- Height: `md:h-[416px]` (416px on desktop, auto on mobile)
- Max Width: `100%` (no constraint)
- No fixed width

**Regular Mode:**
- Height: `h-[650px]` (mobile) → `sm:h-auto` (tablet+) → `md:w-[340px]` (desktop fixed width)
- Max Width: `540px`

---

## Media Section (Image Area)

### Media Container
```typescript
const mediaClass = compact
  ? `${mediaBaseClass} h-[300px] lg:h-[260px]`
  : `${mediaBaseClass} h-[490px] sm:h-[320px] md:h-[240px]`
```

**Compact Mode:**
- Mobile: `h-[300px]` (300px)
- Desktop (lg): `h-[260px]` (260px)
- **Reduction:** ~40% smaller than regular mode

**Regular Mode:**
- Mobile: `h-[490px]` (490px)
- Tablet: `sm:h-[320px]` (320px)
- Desktop: `md:h-[240px]` (240px)

**Base Classes (Both Modes):**
- `relative overflow-hidden z-10 cursor-pointer`
- `rounded-t-[12px]` (top corners only)
- `bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95`
- `border-b border-white/60`
- `backdrop-blur-xl`

---

## Content Section

### Content Container
```typescript
className: `${compact ? "lg:py-3 lg:pb-4 lg:min-h-[200px]" : "flex-1"}`
```

**Compact Mode:**
- Padding: `lg:py-3 lg:pb-4` (12px top, 16px bottom on desktop)
- Min Height: `lg:min-h-[200px]` (200px minimum on desktop)
- Layout: `flex flex-col` (stacked)

**Regular Mode:**
- Padding: `px-4 sm:px-5 pt-2 pb-2` (standard padding)
- Layout: `flex-1 flex flex-col` (takes available space)

### Content Wrapper
```typescript
className: `${compact ? "flex flex-col" : "flex-1 flex flex-col"}`
```

**Compact Mode:**
- Simple flex column (no flex-1, doesn't expand)

**Regular Mode:**
- `flex-1` (expands to fill available space)

---

## Typography & Spacing

### Business Name
**Both Modes:**
- Container Height: `h-[3.5rem] sm:h-[4rem]` (56px mobile, 64px tablet+)
- Font: `text-h2 sm:text-h1` (responsive heading sizes)
- Weight: `font-bold` (700)
- Alignment: `text-center`
- Truncation: `truncate` (single line with ellipsis)

### Category & Location
**Both Modes:**
- Font Size: `text-caption sm:text-xs`
- Color: `text-charcoal/60`
- Height: `h-5 min-h-[12px] max-h-[12px]`
- Spacing: `gap-1.5`

---

## Reviews Section

### Reviews Container
```typescript
className: `${compact ? 'lg:flex-col lg:items-center lg:gap-1.5' : ''}`
```

**Compact Mode (Desktop):**
- Layout: `lg:flex-col` (vertical stack)
- Alignment: `lg:items-center`
- Gap: `lg:gap-1.5` (6px)

**Regular Mode:**
- Layout: Horizontal (default flex-row)
- Gap: `gap-2` (8px)

### Review Text Ordering
```typescript
className: `${compact ? 'lg:order-1 lg:mb-1' : ''}`
```

**Compact Mode (Desktop):**
- "Be the first to review" text: `lg:order-1 lg:mb-1` (appears first, margin bottom)

### Stars Ordering
```typescript
className: `${compact ? 'lg:order-2' : ''}`
```

**Compact Mode (Desktop):**
- Stars component: `lg:order-2` (appears second, below review text)

---

## Visual Design Elements

### Background & Effects
**Both Modes:**
- Card Background: `bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95`
- Content Background: `bg-card-bg/10` (10% sage tint)
- Border: `border-none`
- Ring: ``
- Shadow: `shadow-premiumElevated`
- Hover Shadow: `hover:shadow-premiumElevatedHover`
- Backdrop: `backdrop-blur-xl`

### Glass Morphism Overlays
**Both Modes:**
1. Top overlay: `bg-gradient-to-br from-off-white/8 via-transparent to-transparent`
2. Bottom overlay: `bg-gradient-to-t from-black/5 via-transparent to-transparent`

### Hover Effects
**Both Modes:**
- Border: `hover:border-white/80`
- Transform: `hover:-translate-y-1` (lifts 4px on hover)
- Transition: `transition-all duration-300`

---

## Interactive Elements

### Desktop Actions (Hidden on Mobile)
**Both Modes:**
- Position: `absolute right-4 top-1/2 -translate-y-1/2`
- Visibility: Hidden by default, shown on `group-hover`
- Animation: `translate-x-12 opacity-0` → `translate-x-0 opacity-100`
- Buttons: 3 action buttons (Review, Save, Share)
- Size: `w-12 h-10` (48px × 40px)
- Shape: `rounded-[12px]`

### Mobile Actions
**Both Modes:**
- Info Button: `w-10 h-10` (40px × 40px)
- Position: `absolute left-4 bottom-4`
- Popup: Share and Save options
- Review Button: Full-width at bottom, `min-h-[48px]`

---

## Percentile Chips

**Both Modes:**
- Container: `flex items-center justify-between sm:justify-center`
- Gap: `gap-2 sm:gap-1`
- Min Height: `min-h-[28px] sm:min-h-[28px]`
- Desktop Background: `md:bg-off-white/50 md:backdrop-blur-sm`
- Desktop Border: `md:rounded-[12px] md:border md:border-white/40`
- 4 Chips: punctuality, cost-effectiveness, friendliness, trustworthiness

---

## Responsive Breakpoints

### Mobile (< 640px)
**Compact:**
- Card Height: Auto
- Media Height: `300px`
- Content Padding: Standard
- Layout: Vertical stack

**Regular:**
- Card Height: `650px`
- Media Height: `490px`
- Width: `100vw` (full width)

### Tablet (640px - 1024px)
**Compact:**
- Card Height: Auto
- Media Height: `300px`
- Content: Standard layout

**Regular:**
- Card Height: Auto
- Media Height: `320px`
- Width: Auto with 25% minimum

### Desktop (1024px+)
**Compact:**
- Card Height: `416px` (fixed)
- Media Height: `260px`
- Content Min Height: `200px`
- Reviews: Vertical layout (`lg:flex-col`)
- Content Padding: `lg:py-3 lg:pb-4`

**Regular:**
- Card Width: `340px` (fixed)
- Media Height: `240px`
- Content: Flex-1 (expands)

### Large Desktop (1280px+)
**Compact:**
- Same as Desktop (no additional changes)

**Regular:**
- Same as Desktop (no additional changes)

---

## Key Design Differences Summary

| Element | Compact Mode | Regular Mode |
|---------|-------------|--------------|
| **Card Height** | `md:h-[416px]` | `h-[650px]` → `sm:h-auto` |
| **Card Width** | `w-auto` (flexible) | `md:w-[340px]` (fixed) |
| **Max Width** | `100%` | `540px` |
| **Media Height** | `300px` → `lg:260px` | `490px` → `sm:320px` → `md:240px` |
| **Content Layout** | `flex flex-col` | `flex-1 flex flex-col` |
| **Content Padding** | `lg:py-3 lg:pb-4` | `pt-2 pb-2` |
| **Content Min Height** | `lg:min-h-[200px]` | None (flex-1) |
| **Reviews Layout** | `lg:flex-col` (vertical) | Horizontal |
| **Review Text Order** | `lg:order-1` (first) | Default order |
| **Stars Order** | `lg:order-2` (second) | Default order |

---

## Design Principles

### Compact Mode Goals
1. **Space Efficiency**: Reduced height and flexible width
2. **Vertical Stacking**: Reviews section stacks vertically on desktop
3. **Fixed Desktop Height**: Predictable layout with `416px` height
4. **Content Optimization**: Minimum height ensures content visibility

### Regular Mode Goals
1. **Consistent Width**: Fixed `340px` width for grid layouts
2. **Flexible Height**: Adapts to content with flex-1
3. **Horizontal Flow**: Reviews and stars side-by-side
4. **Premium Feel**: Larger media area for visual impact

---

## Accessibility Features

**Both Modes:**
- Keyboard navigation: `tabIndex={0}`, `onKeyDown` handlers
- ARIA labels: `aria-label`, `aria-expanded`, `aria-disabled`
- Focus states: `focus:outline-none focus:ring-2`
- Touch targets: `min-h-[44px]` for mobile buttons
- Screen reader support: Semantic HTML, proper roles

---

## Performance Optimizations

**Both Modes:**
- Image optimization: `OptimizedImage` component with lazy loading
- Route prefetching: On mount and hover (debounced)
- Memoization: `useMemo` for image logic, `memo()` for component
- Conditional rendering: Only render badges/actions when needed

---

## Color Palette

**Card Background:**
- Base: `card-bg` (custom color)
- Gradient: `from-card-bg via-card-bg to-card-bg/95`
- Content: `bg-card-bg/10` (10% sage tint)

**Borders:**
- Main: `border-white/60` (60% white opacity)
- Hover: `hover:border-white/80` (80% white opacity)
- Ring: `ring-white/30` (30% white opacity)

**Text:**
- Primary: `text-charcoal`
- Secondary: `text-charcoal/60`
- Interactive: `text-navbar-bg`
- Hover: `hover:text-coral`

---

## Animation & Transitions

**Both Modes:**
- Card Hover: `transition-all duration-300`
- Transform: `hover:-translate-y-1` (4px lift)
- Desktop Actions: `translate-x-12 opacity-0` → `translate-x-0 opacity-100`
- Mobile Popup: `fadeInUp 0.2s ease-out`
- Button Press: `active:scale-95`

---

## Usage Recommendations

### Use Compact Mode When:
- Space is limited (sidebars, narrow columns)
- Showing many cards in a grid
- Mobile-first layouts
- Need consistent card heights

### Use Regular Mode When:
- Main content area with ample space
- Showcase/featured sections
- Need larger visual impact
- Grid layouts with fixed widths

