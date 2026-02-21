# Error Pages System - Complete Documentation

## 📋 Overview

The Error Pages System is a unified, premium design system for all error states across the KLIO platform. It provides a consistent, accessible, and customizable approach to displaying errors while maintaining the site's brand identity.

## 🎯 Key Features

- **✨ Premium Design**: Minimal, intentional, professional
- **🎨 Consistent Colors**: Sage (#7D9B76), Charcoal, Off-white palette
- **📐 Unified Typography**: Urbanist font with consistent scale
- **🔄 Reusable Component**: Single ErrorPage component for all error types
- **♿ Accessible**: WCAG AA compliant, keyboard navigable
- **📱 Responsive**: Mobile, tablet, desktop optimized
- **🎬 Animated**: Smooth, subtle animations
- **🛠️ Customizable**: Props-based customization
- **📚 Well-Documented**: Comprehensive guides and examples

## 📂 Directory Structure

```
ErrorPages/
├── README.md                        (This file)
├── ERROR_DESIGN_SYSTEM.md           (Design specifications)
├── IMPLEMENTATION_EXAMPLES.md       (Usage patterns)
├── QUICK_REFERENCE.md              (Developer reference)
├── MIGRATION_GUIDE.md              (Refactoring documentation)
└── SOURCE_COMPONENT.md             (Component file reference)
```

## 📖 Documentation Files

### 1. **QUICK_REFERENCE.md**
Quick lookups for developers while coding - error types table, props reference, common implementations, FAQ

### 2. **ERROR_DESIGN_SYSTEM.md**
Complete design system guide - principles, colors, typography, spacing, component structure, animations

### 3. **IMPLEMENTATION_EXAMPLES.md**
Practical code examples for all error types, error boundaries, advanced patterns, API integration

### 4. **MIGRATION_GUIDE.md**
Details on what changed and refactoring - before/after, files modified, statistics, customization guide

## 🎨 Design System at a Glance

### Colors
```
Primary:    Sage (#7D9B76)      - CTAs, accents, focus states
Text:       Charcoal (#2D2D2D)  - Headings and body text
Background: Off-white (#E5E0E5) - Page background
```

## 🛠️ Error Types

| Type | Use Case | Default CTA |
|------|----------|------------|
| **404** | Page not found | Go Home |
| **401** | Authentication required | Go Home |
| **403** | Access denied | Go Home |
| **500** | Server error | Go Home |
| **503** | Service unavailable | Check Status |
| **error** | Generic/custom error | Go Home |

## 📁 Source Files Location

- **Component**: `src/app/components/ErrorPages/ErrorPage.tsx`
- **Error Boundary**: `src/app/components/ErrorBoundary/ErrorBoundary.tsx`
- **Onboarding Boundary**: `src/app/components/Onboarding/OnboardingErrorBoundary.tsx`
- **404 Page**: `src/app/not-found.tsx`
- **Auth Error**: `src/app/auth/auth-code-error/page.tsx`

## 📊 Statistics

- Main component: 280 lines
- Documentation: 2000+ lines
- Error types: 6 supported
- 404 page reduction: 86% (132 → 18 lines)
- Auth error reduction: 68% (74 → 24 lines)

## ✅ Design System Alignment

✅ Uses core brand colors (Sage, navbar-bg, off-white)
✅ Premium, minimal, intentional design
✅ Responsive across all device sizes
✅ WCAG AA accessible
✅ Consistent typography and spacing
✅ Smooth animations
✅ Fully documented

---

**For quick start**: See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
**For design details**: See [ERROR_DESIGN_SYSTEM.md](./ERROR_DESIGN_SYSTEM.md)
**For code examples**: See [IMPLEMENTATION_EXAMPLES.md](./IMPLEMENTATION_EXAMPLES.md)
**For migration details**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

Last Updated: January 2026 | Version: 1.0
