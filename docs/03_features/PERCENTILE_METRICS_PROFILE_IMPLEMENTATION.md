# Percentile Metrics on Business Profiles - Implementation Guide

## Overview

Added premium, simple, and elegant percentile metric chips to business profile pages that display the same data as the business cards but optimized for the profile view.

## What Was Added

### 1. **New Component: PercentileChipsSection**
- **Location**: `src/app/components/BusinessDetail/PercentileChipsSection.tsx`
- **Purpose**: Display performance metrics in a premium, minimal design
- **Features**:
  - Shows 4 key metrics: Punctuality, Value for Money, Friendliness, Trustworthiness
  - Color-coded based on percentile values (green for high, amber for medium, coral for low)
  - Smooth animations using Framer Motion
  - Premium tooltips with detailed descriptions
  - Responsive design for mobile and desktop
  - Only displays if there is actual data (gracefully hides if no metrics available)

### 2. **Integration into Business Profile Page**
- **Location**: `src/app/business/[id]/page.tsx`
- **Placement**: Below the Business Details Card, above the Location Map
- **Data Source**: `business.stats?.percentiles` from API response

### 3. **Component Architecture**

```typescript
interface PercentileChipsSectionProps {
  punctuality?: number;              // 0-100%
  costEffectiveness?: number;        // 0-100% (Value for Money)
  friendliness?: number;             // 0-100%
  trustworthiness?: number;          // 0-100%
}
```

## Visual Design

### Metrics Grid
- **Layout**: 2 columns on mobile, 4 columns on desktop
- **Spacing**: 12px gap on mobile, 16px on desktop
- **Cards**: Individual metric cards with:
  - Icon (Clock, Dollar Sign, Smile, Shield)
  - Label (Punctuality, Value for Money, etc.)
  - Percentage value
  - Hover effects for interactivity

### Color System
- **No Data**: Gray (`charcoal/30`)
- **Low Score (< 40%)**: Coral
- **Medium Score (40-60%)**: Amber
- **High Score (60-80%)**: Sage
- **Excellent Score (80%+)**: Green

### Premium Features
- Glassmorphism background with backdrop blur
- Smooth entrance animation
- Staggered item animations
- Interactive tooltips with descriptions
- Verified reviews badge in footer

## Data Mapping

The component maps API percentile data to user-friendly labels:

| API Field | Display Name | Icon | Meaning |
|-----------|-------------|------|---------|
| `punctuality` | Punctuality | ⏰ | How well the business keeps appointments |
| `cost-effectiveness` | Value for Money | 💰 | Fair pricing and value |
| `friendliness` | Friendliness | 😊 | Welcoming and approachable staff |
| `trustworthiness` | Trustworthiness | 🛡️ | Reliability and credibility |

## Usage Example

```tsx
import { PercentileChipsSection } from "../../components/BusinessDetail";

// In your component:
<PercentileChipsSection
  punctuality={85}
  costEffectiveness={75}
  friendliness={90}
  trustworthiness={88}
/>
```

## Data Flow

1. **API Response** (`/api/businesses/{id}`)
   ```json
   {
     "stats": {
       "percentiles": {
         "punctuality": 85,
         "cost-effectiveness": 75,
         "friendliness": 90,
         "trustworthiness": 88
       }
     }
   }
   ```

2. **Profile Page** passes data to component:
   ```tsx
   <PercentileChipsSection
     punctuality={business.stats?.percentiles?.punctuality || 0}
     costEffectiveness={business.stats?.percentiles?.['cost-effectiveness'] || 0}
     friendliness={business.stats?.percentiles?.friendliness || 0}
     trustworthiness={business.stats?.percentiles?.trustworthiness || 0}
   />
   ```

3. **Component** renders metrics with styling

## Styling Details

### Container
- Rounded corners: `20px`
- Glassmorphic background
- Border: `white/60` with backdrop blur
- Shadow: Medium shadow for depth
- Padding: `20px` desktop, `20px` mobile

### Individual Chips
- Rounded: `16px`
- Background: `white/40` → `white/60` on hover
- Smooth color transitions
- Border indicator: `white/30`

### Typography
- Header: `font-semibold text-charcoal`
- Label: `text-xs font-medium text-charcoal/70`
- Value: `text-lg sm:text-lg font-bold`
- Footer: `text-xs font-medium text-charcoal/60`

## Responsive Behavior

### Mobile (< 640px)
- 2-column grid
- Smaller icons and text
- Optimized spacing
- Full-width layout

### Desktop (640px+)
- 4-column grid
- Larger icons
- More generous spacing
- Enhanced hover effects

## Animation Details

- **Container**: Fade-in + slide-up (400ms)
- **Metric Cards**: Staggered scale animation (300ms each, 50ms stagger)
- **Transitions**: All color changes use 200ms easing

## Accessibility Features

- Semantic HTML structure
- ARIA labels with tooltip descriptions
- Keyboard navigable (hover states)
- Color not used as sole indicator (icons + text)
- Proper contrast ratios
- Screen reader friendly descriptions

## Integration Checklist

✅ Component created and exported
✅ Added to BusinessDetail index exports
✅ Imported in business profile page
✅ Integrated into profile layout
✅ Data passed from API response
✅ Responsive design implemented
✅ Animations added
✅ Color coding implemented
✅ Tooltips implemented
✅ Accessibility features included
✅ No TypeScript errors
✅ Premium, minimal design aligned with brand

## Same Data as Business Cards

The PercentileChipsSection displays **identical data** to the percentile chips shown on business cards:
- Same metrics (punctuality, cost-effectiveness, friendliness, trustworthiness)
- Same data source (stats.percentiles from API)
- Consistent percentile values
- Different presentation optimized for profile page (larger, 4-column grid vs inline chips)

## Component Files

- **Component**: `src/app/components/BusinessDetail/PercentileChipsSection.tsx`
- **Export**: `src/app/components/BusinessDetail/index.ts`
- **Integration**: `src/app/business/[id]/page.tsx`

## Future Enhancements

Potential improvements:
- Add animated progress rings/circles for each metric
- Show metric trends over time (up/down indicators)
- Add detailed breakdown modal on click
- Integrate with personalization system for tailored insights
- Add comparison with category averages
- Show metric change over last month/quarter

---

**Implemented**: January 20, 2026  
**Status**: ✅ Complete and ready for deployment
