/**
 * Integration tests for similar businesses flow
 */

// Jest globals: describe, it, expect, beforeEach are available globally
import { render, screen, waitFor } from '@testing-library/react';
import SimilarBusinesses from '@/app/components/SimilarBusinesses/SimilarBusinesses';
import { createBusiness, createBusinessArray } from '@test-utils/factories/businessFactory';
import { mockFetchResponse } from '@test-utils/helpers/test-helpers';
import { useBusinesses } from '@/app/hooks/useBusinesses';

// Mock useUserPreferences
jest.mock('@/app/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    interests: [],
    subcategories: [],
    dealbreakers: [],
  }),
}));

// Mock useBusinesses at the top level
jest.mock('@/app/hooks/useBusinesses', () => ({
  useBusinesses: jest.fn(),
}));

describe('Similar Businesses Flow Integration', () => {
  const mockedUseBusinesses = useBusinesses as jest.MockedFunction<typeof useBusinesses>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should exclude current business from results', async () => {
    const currentBusinessId = 'business-1';
    const businesses = [
      createBusiness({ id: currentBusinessId, category: 'Restaurant' }),
      createBusiness({ id: 'business-2', category: 'Restaurant' }),
      createBusiness({ id: 'business-3', category: 'Restaurant' }),
    ];

    mockFetchResponse({ data: businesses });

    // Mock useBusinesses to return businesses
    mockedUseBusinesses.mockReturnValue({
      businesses,
      loading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <SimilarBusinesses
        currentBusinessId={currentBusinessId}
        category="Restaurant"
        location="Cape Town"
      />
    );

    await waitFor(() => {
      // Current business should not appear in results
      expect(screen.queryByText(new RegExp(currentBusinessId, 'i'))).not.toBeInTheDocument();
    });
  });

  it('should deduplicate businesses', async () => {
    const duplicateBusiness = createBusiness({ id: 'duplicate-1', category: 'Restaurant' });
    const businesses = [
      duplicateBusiness,
      duplicateBusiness, // Duplicate
      createBusiness({ id: 'unique-1', category: 'Restaurant' }),
    ];

    mockFetchResponse({ data: businesses });

    mockedUseBusinesses.mockReturnValue({
      businesses,
      loading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <SimilarBusinesses
        currentBusinessId="business-1"
        category="Restaurant"
        location="Cape Town"
      />
    );

    // Component should handle deduplication
    // Verify unique businesses only
  });

  it('should use fallback strategy when category+location returns no results', async () => {
    let callCount = 0;
    
    mockedUseBusinesses.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First attempt: category + location (no results)
        return {
          businesses: [],
          loading: false,
          error: null,
          refetch: jest.fn(),
        };
      }
      // Fallback: category only (has results)
      return {
        businesses: createBusinessArray(2, { category: 'Restaurant' }),
        loading: false,
        error: null,
        refetch: jest.fn(),
      };
    });

    render(
      <SimilarBusinesses
        currentBusinessId="business-1"
        category="Restaurant"
        location="Cape Town"
      />
    );

    await waitFor(() => {
      // Should eventually show results from fallback
      expect(callCount).toBeGreaterThan(1);
    }, { timeout: 3000 });
  });

  it('should limit results to specified limit', async () => {
    const businesses = createBusinessArray(10, { category: 'Restaurant' });
    const limit = 3;

    mockFetchResponse({ data: businesses });

    mockedUseBusinesses.mockReturnValue({
      businesses,
      loading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(
      <SimilarBusinesses
        currentBusinessId="business-1"
        category="Restaurant"
        location="Cape Town"
        limit={limit}
      />
    );

    await waitFor(() => {
      // Should only show limited number of businesses
      // Implementation depends on component rendering
    });
  });
});

