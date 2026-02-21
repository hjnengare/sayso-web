# Supabase Migrations - Consolidated Directory

## Overview

All Supabase migrations have been consolidated into a single directory: `supabase/migrations/`

This unified approach makes it easier to:
- Track migration history
- Ensure sequential ordering
- Avoid duplication
- Maintain consistency

## Migration Organization

Migrations are organized by category and execution order:

### Core Migrations (001_core_*)
- Database setup and initialization
- Profile table creation
- Role management

### Business Migrations (002_business_*)
- Business schema creation
- Business ownership
- Business images
- Performance indexes
- Materialized views

### Review Migrations (003_reviews_*)
- Reviews schema
- Review images storage
- Review helpful votes
- Business stats updates

### Event Review Migrations (004_event_reviews_*)
- Event reviews schema

### Storage Migrations (004_storage_*)
- Storage bucket setup

### Function Migrations (005_functions_*)
- Database functions
- RPC procedures
- Business recommendation logic

### Special Review Migrations (005_special_reviews_*)
- Special reviews schema

### Saved Businesses Migrations (006_saved_businesses_*)
- Saved businesses schema

## File Structure

```
supabase/
├── migrations/
│   ├── 001_core_*.sql          (Core database setup)
│   ├── 002_business_*.sql      (Business features)
│   ├── 003_reviews_*.sql       (Review system)
│   ├── 004_event_reviews_*.sql (Event reviews)
│   ├── 004_storage_*.sql       (Storage setup)
│   ├── 005_functions_*.sql     (Database functions)
│   ├── 005_special_reviews_*.sql (Special reviews)
│   ├── 006_saved_businesses_*.sql (Saved features)
│   ├── 20250102_*.sql          (Recent migrations)
│   └── 20260128_*.sql          (Latest migrations)
├── functions/
│   └── [Edge functions]
└── seed.sql
```

## Total Migrations

**92 SQL migration files** organized in a single consolidated directory

## Execution Order

Migrations are executed in alphabetical order. The directory structure follows this pattern:

1. **Core (001)** - Database foundation
2. **Business (002)** - Main business features
3. **Reviews (003)** - Review system
4. **Event Reviews (004)** - Event-specific reviews
5. **Storage (004)** - File storage setup
6. **Functions (005)** - RPC functions and procedures
7. **Special Reviews (005)** - Special features reviews
8. **Saved Businesses (006)** - Bookmark functionality
9. **Dated migrations** - Recent changes and fixes (20250102, 20260112, etc.)

## Adding New Migrations

When adding new migrations:

1. Follow the naming convention: `YYYYMMDD_descriptive_name.sql`
2. Place in `supabase/migrations/`
3. Include clear comments explaining the changes
4. Reference related migrations in comments
5. Test locally before committing

## Previous Structure

Migrations were previously scattered across:
- `src/app/lib/migrations/001_core/`
- `src/app/lib/migrations/002_business/`
- `src/app/lib/migrations/003_reviews/`
- `src/app/lib/migrations/004_event_reviews/`
- `src/app/lib/migrations/004_storage/`
- `src/app/lib/migrations/005_functions/`
- `src/app/lib/migrations/005_special_reviews/`
- `src/app/lib/migrations/006_saved_businesses/`

This structure has been **consolidated into a single directory** for easier maintenance.

## Benefits of Consolidation

✅ Single source of truth for all migrations
✅ Easier to track execution order
✅ Simplified deployment process
✅ Better version control
✅ Consistent naming conventions
✅ Reduced complexity in codebase

## Migration Dependencies

Some migrations depend on others. Key dependencies:

- Database core (001) must run first
- Business tables (002) depend on profiles (001)
- Reviews (003) depend on businesses (002)
- Functions (005) depend on all table schemas
- Storage (004) should run early for file handling

## Notes

- All migrations are idempotent where possible (use IF NOT EXISTS)
- Rollback procedures should be tested before deployment
- Large migrations should be split across multiple files
- Comments explain the purpose of each migration

---

**Consolidated**: January 20, 2026
**Total Files**: 92 SQL migration files
**Location**: `supabase/migrations/`

For detailed migration information, see individual SQL files.
