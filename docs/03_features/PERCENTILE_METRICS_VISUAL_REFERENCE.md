# Percentile Metrics Chips - Visual Reference

## Component Appearance

### Desktop View (4-Column Grid)
```
┌─────────────────────────────────────────────────────────────┐
│  ◆ Performance Insights                  Based on reviews    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │    ⏰     │  │    💰     │  │    😊     │  │    🛡️     │    │
│  │   85%    │  │   75%    │  │   90%    │  │   88%    │    │
│  │Punctu.  │  │Value for │  │Friendly │  │Trustw.   │    │
│  │         │  │  Money   │  │         │  │         │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  ✓ Community verified metrics from verified reviews        │
└─────────────────────────────────────────────────────────────┘
```

### Mobile View (2-Column Grid)
```
┌──────────────────────────────────────┐
│  ◆ Performance Insights  Based on... │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────┐      ┌──────────┐    │
│  │    ⏰     │      │    💰     │    │
│  │   85%    │      │   75%    │    │
│  │Punctu.   │      │Value for │    │
│  │         │      │  Money   │    │
│  └──────────┘      └──────────┘    │
│                                      │
│  ┌──────────┐      ┌──────────┐    │
│  │    😊     │      │    🛡️     │    │
│  │   90%    │      │   88%    │    │
│  │Friendly  │      │Trustw.   │    │
│  │         │      │         │    │
│  └──────────┘      └──────────┘    │
│                                      │
├──────────────────────────────────────┤
│  ✓ Community verified metrics from   │
│     verified reviews                 │
└──────────────────────────────────────┘
```

## Color Coding by Score

| Score Range | Color | Hex | Display |
|-------------|-------|-----|---------|
| 0% (No Data) | Gray | #7F7F7F | — |
| 1-39% | Coral | #F4735A | 🔴 |
| 40-59% | Amber | #DC9A3C | 🟠 |
| 60-79% | Sage | #7D9B76 | 🟢 |
| 80-100% | Green | #22C55E | 🟢✓ |

## Icon Legend

| Icon | Metric | Meaning |
|------|--------|---------|
| ⏰ Clock | **Punctuality** | On-time service, keeps appointments |
| 💰 Dollar Sign | **Value for Money** | Fair pricing, good value |
| 😊 Smile | **Friendliness** | Welcoming staff, good service |
| 🛡️ Shield | **Trustworthiness** | Reliable, honest, credible |

## Hover Behavior

**Desktop Only:**
```
┌────────────────┐
│ Hover Tooltip  │
│ Detailed text  │
├────────────────┤
│      ▼         │  (Arrow pointing down to chip)
│  ┌──────────┐  │
│  │    ⏰     │  │
│  │   85%    │  │
│  └──────────┘  │
```

**Mobile:** No hover tooltip (touch devices)

## Placement in Business Profile

```
Business Profile Page
├── Header (Navigation)
├── Hero Image & Rating Badge
├── Business Name & Info
├── Business Description
├── Business Details Card (Hours, Price, Verified)
│
├── ✨ PERCENTILE CHIPS SECTION (NEW)
│   └── Punctuality | Value for Money | Friendliness | Trustworthiness
│
├── Location Map
├── Events & Specials
├── Contact Information
├── [Sidebar on Desktop]
│   ├── Action Card (Review, Share, etc.)
│   ├── Personalization Insights
│   └── Contact Info
└── Community Reviews Section
```

## Animation Timeline

### Container
- **0ms**: Opacity 0%, translateY(8px)
- **400ms**: Opacity 100%, translateY(0)
- **Easing**: `easeOut`

### Metric Cards (Staggered)
- **Card 1 (Punctuality)**: 0ms → 300ms (delay: 0ms)
- **Card 2 (Value for Money)**: 0ms → 300ms (delay: 50ms)
- **Card 3 (Friendliness)**: 0ms → 300ms (delay: 100ms)
- **Card 4 (Trustworthiness)**: 0ms → 300ms (delay: 150ms)

## Design System Alignment

### Colors Used
- **Background**: Sage (#7D9B76) - Primary accent
- **Text**: Charcoal (#2D2D2D) - Primary text
- **Off-white**: #E5E0E5 - Backgrounds
- **Navbar-bg**: Used in related components
- **Coral**: #F4735A - Icons for metrics

### Typography
- **Font**: Urbanist (system fallback: -apple-system, BlinkMacSystemFont)
- **Header**: semibold, text-charcoal
- **Label**: medium, text-charcoal/70
- **Value**: bold, text-charcoal
- **Footer**: medium, text-charcoal/60

### Spacing
- **Gap between cards**: 12px (mobile) / 16px (desktop)
- **Card padding**: 16px (mobile) / 14px (desktop)
- **Section padding**: 20px
- **Container gap**: 16px

### Borders & Shadows
- **Container border**: 1px, white/60 with backdrop blur
- **Card border**: 1px, white/30
- **Container shadow**: Medium shadow for depth
- **Border radius**: 20px (container), 16px (cards)

## Responsive Breakpoints

### Mobile-First (< 640px)
- 2-column grid
- Icon size: 24px
- Font size: text-xs for labels, text-base for values
- Full width with padding

### Desktop (≥ 640px)
- 4-column grid
- Icon size: 20px
- Font size: text-xs for labels, text-lg for values
- Enhanced spacing

## Data Source

**API Endpoint**: `/api/businesses/{id}`

**Response Structure**:
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

## Same Data as Business Cards

The percentile metrics shown on business profiles display **identical data** to:
- Business card percentile chips
- Similar businesses list
- Business search results

**Key Difference**: 
- **Business Cards**: Compact inline layout (4 chips in a row)
- **Business Profile**: Larger, premium grid layout with detailed tooltips

---

**Last Updated**: January 20, 2026
**Component Status**: ✅ Production Ready
