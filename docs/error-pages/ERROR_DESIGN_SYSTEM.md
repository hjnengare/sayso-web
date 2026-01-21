# Error Page Design System

## Overview

This document outlines the unified, consistent error page design system for the KLIO platform. All error states now use a premium, minimal, intentional design that feels like a natural extension of the product rather than an afterthought.

## Design Principles

### 1. **Premium & Minimal**
- Clean, spacious layouts with purposeful whitespace
- No visual clutter or over-decoration
- Sophisticated typography and spacing hierarchy
- Subtle animations that enhance rather than distract

### 2. **Intentional Visual Language**
- Every element serves a purpose
- Consistent iconography and visual patterns
- Thoughtful use of color and contrast
- Premium feel through restraint, not excess

### 3. **Brand Cohesion**
- All error pages feel like natural extensions of the product
- Typography, spacing, and layout align with site design language
- Consistent use of brand colors and design tokens
- Same quality and care as main application

## Color Palette

The error design system uses three core brand colors:

```
Sage          #7D9B76  - Primary brand color (buttons, accents)
Navbar-bg     #722F37  - Secondary brand color (reserved for special emphasis)
Off-white     #E5E0E5  - Background color (page backgrounds)
Charcoal      #2D2D2D  - Primary text color
```

### Color Usage Guidelines

- **Sage (#7D9B76)**: Primary CTAs, interactive elements, accents, focus states
- **Charcoal (#2D2D2D)**: Body text, headings, icons
- **Off-white (#E5E0E5)**: Page backgrounds, subtle borders
- **Navbar-bg (#722F37)**: Reserved for special emphasis (rarely used in error pages)

### Accessibility

- All text meets WCAG AA contrast ratios
- Color is never the only means of conveying information
- Focus states are clearly visible with sage-colored rings

## Typography

Uses the Urbanist font family for consistency with the main application.

### Type Scale

| Element | Mobile | Desktop | Weight | Usage |
|---------|--------|---------|--------|-------|
| Error Code (404, 500, etc) | 56px | 64px | 800 | Large display of error numbers |
| Title | 24px | 32px | 700 | Main error heading |
| Description | 16px | 18px | 500 | Error context and explanation |
| Button Text | 16px | 16px | 600 | CTA labels |
| Support Text | 14px | 14px | 500 | Help and contact info |

## Best Practices

1. **Be Specific, Not Generic** - Provide clear, specific error messages
2. **Provide Clear Action** - Always include at least one primary CTA
3. **Maintain Tone** - Professional but approachable
4. **Consider Context** - Tailor messaging to error type
5. **Accessibility** - Ensure sufficient color contrast and focus states

---

**For implementation details**: See IMPLEMENTATION_EXAMPLES.md
**For quick reference**: See QUICK_REFERENCE.md
