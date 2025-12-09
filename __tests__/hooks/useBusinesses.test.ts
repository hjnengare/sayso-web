/**
 * Unit tests for useBusinesses hook
 */

// Jest globals: describe, it, expect, beforeEach are available globally
import { renderHook, waitFor } from '@testing-library/react';
import { useBusinesses } from '@/app/hooks/useBusinesses';
import { mockFetchResponse, mockFetchError } from '@test-utils/helpers/test-helpers';
import { createBusinessArray } from '@test-utils/factories/businessFactory';

describe('useBusinesses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should fetch businesses successfully', async () => {
    const mockBusinesses = createBusinessArray(5);
    mockFetchResponse({ data: mockBusinesses });

    const { result } = renderHook(() => useBusinesses({ limit: 5 }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.businesses).toHaveLength(5);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetchError(new Error('Network error'));

    const { result } = renderHook(() => useBusinesses());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.businesses).toEqual([]);
  });

  it('should skip fetching when skip option is true', async () => {
    const { result } = renderHook(() => useBusinesses({ skip: true }));

    expect(result.current.loading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should pass query parameters correctly', async () => {
    const mockBusinesses = createBusinessArray(3);
    mockFetchResponse({ data: mockBusinesses });

    renderHook(() =>
      useBusinesses({
        category: 'Restaurant',
        limit: 10,
        sortBy: 'rating',
        sortOrder: 'desc',
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('category=Restaurant');
    expect(fetchCall).toContain('limit=10');
    expect(fetchCall).toContain('sort_by=rating');
    expect(fetchCall).toContain('sort_order=desc');
  });

  it('should refetch when refetch is called', async () => {
    const mockBusinesses = createBusinessArray(3);
    mockFetchResponse({ data: mockBusinesses });

    const { result } = renderHook(() => useBusinesses());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    result.current.refetch();

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it('should handle interestIds parameter', async () => {
    const mockBusinesses = createBusinessArray(3);
    mockFetchResponse({ data: mockBusinesses });

    renderHook(() =>
      useBusinesses({
        interestIds: ['food-drink', 'arts-culture'],
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('interest_ids=food-drink%2Carts-culture');
  });

  it('should handle distance-based filtering', async () => {
    const mockBusinesses = createBusinessArray(3);
    mockFetchResponse({ data: mockBusinesses });

    renderHook(() =>
      useBusinesses({
        radiusKm: 10,
        latitude: -33.9249,
        longitude: 18.4241,
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('radius_km=10');
    expect(fetchCall).toContain('lat=-33.9249');
    expect(fetchCall).toContain('lng=18.4241');
  });
});

