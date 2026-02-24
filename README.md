# sayso

Hyper-local business discovery and review platform for South Africa. Find, review, and engage with businesses near you — with personalised recommendations, real-time notifications, and community-driven rankings.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion 12 |
| Data fetching | SWR 2 |
| Database / Auth | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Maps | Mapbox GL 3 |
| AI | OpenAI 4 |
| Email | Resend / Postmark |
| Testing | Jest + Playwright |
| Deployment | Vercel |

---

## Features

**Discovery**
- Search businesses with live suggestions and full-text ranking
- Browse by category, subcategory, and interest-based "For You" feed
- Trending businesses, events, and specials

**Reviews**
- Star ratings with sub-dimensions (service, price, ambience)
- Photo uploads, edit, and delete
- Gamified achievements and leaderboard

**Business owners**
- Claim and verify ownership
- Manage listings, photos, events, and specials
- Dedicated portal with mobile sidebar

**Notifications**
- Real-time via Supabase Realtime (postgres_changes)
- SWR fallback polling when socket is down
- In-app toast queue

**Admin**
- Business approval workflow
- Claim verification
- Seed data management

---

## Getting started

### Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project
- A [Mapbox](https://mapbox.com) access token

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` in the project root:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Maps (required)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ...

# Email (optional)
RESEND_API_KEY=re_...
POSTMARK_API_TOKEN=...

# AI features (optional)
OPENAI_API_KEY=sk-...

# Event ingestion (optional)
TICKETMASTER_API_KEY=...

# Mobile push dispatch (optional for Expo app)
PUSH_DISPATCH_SECRET=...
EXPO_ACCESS_TOKEN=...
```

### 3. Run locally

```bash
npm run dev          # standard (Turbopack)
npm run dev:fast     # faster rebuild, less diagnostics
```

---

## Scripts

```bash
# Development
npm run dev               # start dev server
npm run build             # production build
npm run start             # start production server
npm run type-check        # TypeScript check without emit

# Code quality
npm run lint              # ESLint
npm run lint:fix          # ESLint with auto-fix

# Testing
npm run test              # unit tests
npm run test:watch        # unit tests in watch mode
npm run test:e2e          # Playwright end-to-end
npm run test:e2e:ui       # Playwright with interactive UI
npm run test:all          # all test suites

# Utilities
npm run build:analyze     # bundle size analysis
npm run clean             # remove .next and build artifacts
npm run seed:fsq          # seed businesses from Foursquare
npm run seed:osm          # seed businesses from OpenStreetMap
npm run fetch-events      # ingest events from Ticketmaster/Quicket
```

---

## Architecture

### Data fetching
All client-side data fetching uses **SWR**. Global config lives in `src/app/lib/swrConfig.ts`. Prefer `useSWR` / `useSWRInfinite`; use `mutate` for optimistic updates with rollback.

### State management
React Context + hooks — no Redux. Contexts: `AuthContext`, `NotificationsContext`, `SavedItemsContext`, `ToastContext`, `RealtimeContext`, `OnboardingContext`.

### Authentication
Supabase Auth (email/password + phone OTP). Middleware handles token refresh. Three roles: `user`, `business_owner`, `admin`.

### Notifications pipeline
```
Supabase INSERT → postgres_changes event → toastQueue state → NotificationToasts → ToastContainer
```

### Performance
- Server Components by default; `"use client"` only where needed
- Dynamic imports for non-critical components
- Next.js Image with WebP/AVIF
- `optimizePackageImports` for large icon/chart libraries

### Database
PostgreSQL via Supabase with Row Level Security on all tables. Full-text search for business discovery. Supabase Storage for avatars, review photos, and business images.

---

## Project structure

```
src/app/
├── (routes)/           # Page routes (App Router)
├── api/                # Route handlers
├── components/         # UI components
│   ├── Header/
│   ├── BusinessDetail/
│   ├── ReviewForm/
│   ├── Notifications/
│   └── ...
├── contexts/           # React Context providers
├── hooks/              # Custom hooks
├── lib/                # Utilities, SWR config, SEO helpers
└── styles/             # Global CSS overrides

mobile/sayso-mobile/    # Expo React Native scaffold (bootstrap; move to separate repo for production)
```

---

## Deployment

The project is optimised for **Vercel**. Set all environment variables in the Vercel dashboard. `VERCEL_URL` is injected automatically.

For the Supabase Realtime + SWR notifications to work in production, ensure the Supabase project has Realtime enabled and the `postgres_changes` publication configured for the `notifications` table.
