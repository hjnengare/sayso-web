# Onboarding Workflow Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan to make the onboarding workflow production-ready and bug-free. The current implementation has multiple sources of truth, inconsistent error handling, and complex state management that needs to be simplified and standardized.

## Current Issues

### 1. Data Flow Complexity
- **Problem**: Multiple sources of truth (URL params, localStorage, context, database)
- **Impact**: Confusion about which source is authoritative, data inconsistency
- **Examples**: 
  - Interests page loads from localStorage first, then DB
  - Subcategories page loads from URL params first, then localStorage, then DB
  - Deal-breakers page loads from URL params, then localStorage, then DB
  - Complete page loads from URL params, then localStorage fallback

### 2. Error Handling
- **Problem**: Inconsistent error handling across pages
- **Impact**: Poor user experience, unclear error messages
- **Examples**:
  - Some pages show toast notifications, others show inline errors
  - API errors are sometimes swallowed, sometimes displayed
  - Network errors not properly handled

### 3. State Management
- **Problem**: Complex state synchronization between local state, context, and localStorage
- **Impact**: Race conditions, stale data, difficult to debug
- **Examples**:
  - `OnboardingContext` manages state but pages also have local state
  - localStorage updates happen in multiple places
  - Context updates can happen during render (React warnings)

### 4. Validation
- **Problem**: Inconsistent validation logic across pages
- **Impact**: Invalid data can reach the API, poor UX
- **Examples**:
  - Min/max selections validated differently on each page
  - URL param validation happens at different times
  - No centralized validation utilities

### 5. Navigation Logic
- **Problem**: Complex navigation logic with multiple fallbacks
- **Impact**: Users can get stuck, unexpected redirects
- **Examples**:
  - Multiple redirect mechanisms (router.push, router.replace, window.location)
  - Race conditions between navigation and save operations
  - Inconsistent back navigation behavior

### 6. Code Duplication
- **Problem**: Similar patterns repeated across pages
- **Impact**: Hard to maintain, bugs propagate
- **Examples**:
  - Similar useEffect hooks for loading data
  - Similar validation logic
  - Similar error handling patterns

### 7. Type Safety
- **Problem**: Some areas lack proper TypeScript types
- **Impact**: Runtime errors, poor IDE support
- **Examples**:
  - `any` types in some places
  - Missing interfaces for API responses
  - Inconsistent type definitions

## Refactoring Strategy

### Phase 1: Core Infrastructure (Foundation)

#### 1.1 Create Unified Data Layer
**Goal**: Single source of truth for onboarding data

**Implementation**:
- Create `useOnboardingData` hook that manages all data sources
- Priority order: URL params > localStorage > Database
- Automatic synchronization between sources
- Type-safe data access

**Files to create**:
- `src/app/hooks/useOnboardingData.ts`
- `src/app/lib/onboarding/dataManager.ts`

#### 1.2 Standardize Error Handling
**Goal**: Consistent error handling across all pages

**Implementation**:
- Create `OnboardingErrorBoundary` component
- Create `useOnboardingError` hook
- Standardize error messages and display
- Add retry logic for network errors

**Files to create**:
- `src/app/components/Onboarding/OnboardingErrorBoundary.tsx`
- `src/app/hooks/useOnboardingError.ts`
- `src/app/lib/onboarding/errorHandling.ts`

#### 1.3 Create Validation Utilities
**Goal**: Centralized validation logic

**Implementation**:
- Create validation schemas using Zod
- Validate at component level and API level
- Provide clear error messages

**Files to create**:
- `src/app/lib/onboarding/validation.ts`
- `src/app/lib/onboarding/schemas.ts`

### Phase 2: State Management Refactoring

#### 2.1 Simplify OnboardingContext
**Goal**: Remove redundant state management

**Implementation**:
- Keep context for global state only
- Remove localStorage management from context
- Use `useOnboardingData` hook in pages instead

**Files to modify**:
- `src/app/contexts/OnboardingContext.tsx`

#### 2.2 Create Page-Specific Hooks
**Goal**: Encapsulate page logic in reusable hooks

**Implementation**:
- `useInterestsPage` hook
- `useSubcategoriesPage` hook
- `useDealBreakersPage` hook
- `useCompletePage` hook

**Files to create**:
- `src/app/hooks/useInterestsPage.ts`
- `src/app/hooks/useSubcategoriesPage.ts`
- `src/app/hooks/useDealBreakersPage.ts`
- `src/app/hooks/useCompletePage.ts`

### Phase 3: Page Refactoring

#### 3.1 Refactor Interests Page
**Goal**: Simplify and standardize

**Changes**:
- Use `useInterestsPage` hook
- Use `useOnboardingData` for data management
- Use standardized error handling
- Remove duplicate logic

#### 3.2 Refactor Subcategories Page
**Goal**: Simplify and standardize

**Changes**:
- Use `useSubcategoriesPage` hook
- Use `useOnboardingData` for data management
- Use standardized error handling
- Remove duplicate logic

#### 3.3 Refactor Deal-Breakers Page
**Goal**: Simplify and standardize

**Changes**:
- Use `useDealBreakersPage` hook
- Use `useOnboardingData` for data management
- Use standardized error handling
- Remove duplicate logic

#### 3.4 Refactor Complete Page
**Goal**: Simplify and standardize

**Changes**:
- Use `useCompletePage` hook
- Use `useOnboardingData` for data management
- Use standardized error handling
- Ensure race condition is fixed

### Phase 4: API & Navigation Improvements

#### 4.1 Optimize API Calls
**Goal**: Reduce API calls and improve reliability

**Implementation**:
- Add request deduplication
- Add retry logic with exponential backoff
- Add request cancellation
- Cache responses appropriately

**Files to create**:
- `src/app/lib/onboarding/apiClient.ts`

#### 4.2 Improve Navigation
**Goal**: Reliable navigation with proper guards

**Implementation**:
- Create `useOnboardingNavigation` hook
- Add navigation guards
- Ensure proper cleanup
- Handle edge cases (browser back/forward)

**Files to create**:
- `src/app/hooks/useOnboardingNavigation.ts`

### Phase 5: Testing & Documentation

#### 5.1 Add Unit Tests
**Goal**: Ensure reliability

**Implementation**:
- Test validation logic
- Test data management
- Test error handling
- Test navigation logic

#### 5.2 Add Integration Tests
**Goal**: Test full flow

**Implementation**:
- Test complete onboarding flow
- Test error scenarios
- Test edge cases

#### 5.3 Update Documentation
**Goal**: Clear documentation for future maintenance

**Implementation**:
- Document data flow
- Document error handling
- Document validation rules
- Document navigation logic

## Implementation Order

1. **Week 1**: Phase 1 (Core Infrastructure)
   - Create unified data layer
   - Standardize error handling
   - Create validation utilities

2. **Week 2**: Phase 2 (State Management)
   - Simplify OnboardingContext
   - Create page-specific hooks

3. **Week 3**: Phase 3 (Page Refactoring)
   - Refactor all pages one by one
   - Test each page thoroughly

4. **Week 4**: Phase 4 & 5 (Polish & Testing)
   - Optimize API calls
   - Improve navigation
   - Add tests
   - Update documentation

## Success Criteria

1. ✅ Single source of truth for data
2. ✅ Consistent error handling across all pages
3. ✅ No race conditions
4. ✅ Proper TypeScript types throughout
5. ✅ No code duplication
6. ✅ Comprehensive test coverage
7. ✅ Clear documentation
8. ✅ Production-ready error handling
9. ✅ Reliable navigation
10. ✅ Optimized performance

## Risk Mitigation

1. **Breaking Changes**: Implement behind feature flags
2. **Data Loss**: Ensure backward compatibility with localStorage
3. **User Experience**: Maintain current UX while refactoring
4. **Testing**: Test thoroughly before deploying

## Next Steps

1. Review and approve this plan
2. Create feature branch for refactoring
3. Start with Phase 1 implementation
4. Regular code reviews and testing
5. Gradual rollout with monitoring

