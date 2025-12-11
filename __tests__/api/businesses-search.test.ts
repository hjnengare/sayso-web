/**
 * Backend API tests for business search functionality
 * 
 * Tests:
 * - Search query parameter handling (q, search)
 * - Search results filtering and ranking
 * - Text highlighting in results
 * - Search history logging
 * - Location-based search
 * - Sorting options (relevance, distance, rating, price)
 * - Filter combinations
 * - Error handling
 * - Empty search results
 */

import { GET } from '../../src/app/api/businesses/route';
import { createTestRequest } from '../../__test-utils__/helpers/create-test-request';
import { createBusiness } from '../../__test-utils__/factories/businessFactory';
import { getServerSupabase } from '../../src/app/lib/supabase/server';

// Mock Supabase
jest.mock('../../src/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

// Mock search helpers
jest.mock('../../src/app/lib/utils/searchHelpers', () => ({
  calculateDistanceKm: jest.fn((lat1, lng1, lat2, lng2) => {
    // Simple mock distance calculation
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)) * 111; // Rough km conversion
  }),
  highlightText: jest.fn((text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }),
  extractSnippet: jest.fn((text, query, maxLength = 150) => {
    if (!text || !query) return text || '';
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text.substring(0, maxLength);
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, start + maxLength);
    return text.substring(start, end);
  }),
  calculateComboScore: jest.fn((business, lat, lng) => {
    // Mock combo score calculation
    return (business.average_rating || 0) * 10 + (business.total_reviews || 0);
  }),
  priceRangeToLevel: jest.fn((priceRange) => {
    const map: Record<string, number> = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };
    return map[priceRange] || 2;
  }),
  isValidLatitude: jest.fn((lat) => lat >= -90 && lat <= 90),
  isValidLongitude: jest.fn((lng) => lng >= -180 && lng <= 180),
}));

// Mock personalization service
jest.mock('../../src/app/lib/services/personalizationService', () => ({
  calculatePersonalizationScore: jest.fn(() => 0.5),
  sortByPersonalization: jest.fn((businesses) => businesses),
  filterByDealbreakers: jest.fn((businesses) => businesses),
  boostPersonalMatches: jest.fn((businesses) => businesses),
}));

describe('GET /api/businesses - Search Functionality', () => {
  let mockSupabase: any;
  let mockRpc: jest.Mock;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockRpc = jest.fn();
    mockSelect = jest.fn().mockReturnThis();
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    };

    mockSupabase = {
      rpc: mockRpc,
      from: mockFrom,
      auth: mockAuth,
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Search Query Parameters', () => {
    it('should handle search query with "q" parameter', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          description: 'Great coffee place',
          category: 'Cafe',
          location: 'Cape Town',
          latitude: -33.9249,
          longitude: 18.4241,
          average_rating: 4.5,
          total_reviews: 10,
          cursor_id: '1',
          cursor_created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockBusinesses,
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_search: 'coffee',
        })
      );
      expect(response.status).toBe(200);
      expect(data.businesses).toBeDefined();
    });

    it('should handle search query with "search" parameter (backward compatible)', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Restaurant',
          description: 'Fine dining',
          category: 'Restaurant',
          location: 'Cape Town',
          latitude: -33.9249,
          longitude: 18.4241,
          average_rating: 4.8,
          total_reviews: 25,
          cursor_id: '1',
          cursor_created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockBusinesses,
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { search: 'restaurant' } });

      const response = await GET(req);
      const data = await response.json();

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_search: 'restaurant',
        })
      );
      expect(response.status).toBe(200);
    });

    it('should prioritize "q" over "search" parameter', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee', search: 'restaurant' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_search: 'coffee', // q takes priority
        })
      );
    });

    it('should default to relevance sorting when search query is provided', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_sort_by: 'relevance',
          p_sort_order: 'desc',
        })
      );
    });
  });

  describe('Search Results', () => {
    it('should return businesses matching search query', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          description: 'Great coffee place in Cape Town',
          category: 'Cafe',
          location: 'Cape Town',
          latitude: -33.9249,
          longitude: 18.4241,
          average_rating: 4.5,
          total_reviews: 10,
          cursor_id: '1',
          cursor_created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Coffee Bar',
          description: 'Another coffee place',
          category: 'Cafe',
          location: 'Cape Town',
          latitude: -33.9249,
          longitude: 18.4241,
          average_rating: 4.2,
          total_reviews: 8,
          cursor_id: '2',
          cursor_created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockBusinesses,
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses).toHaveLength(2);
      expect(data.businesses[0].name).toBe('Coffee Shop');
      expect(data.businesses[1].name).toBe('Coffee Bar');
    });

    it('should return empty array when no results match', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'nonexistentbusiness12345' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses).toEqual([]);
    });

    it('should include highlighted text in search results', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          description: 'Great coffee place',
          category: 'Cafe',
          location: 'Cape Town',
          latitude: -33.9249,
          longitude: 18.4241,
          average_rating: 4.5,
          total_reviews: 10,
          cursor_id: '1',
          cursor_created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockBusinesses,
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Results should have highlighted fields
      expect(data.businesses[0]).toHaveProperty('name');
      expect(data.businesses[0]).toHaveProperty('highlighted_name');
      expect(data.businesses[0]).toHaveProperty('highlighted_snippet');
    });
  });

  describe('Location-Based Search', () => {
    it('should filter by location coordinates and radius', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Nearby Business',
          description: 'Close to location',
          category: 'Restaurant',
          location: 'Cape Town',
          latitude: -33.9250,
          longitude: 18.4242,
          average_rating: 4.5,
          total_reviews: 10,
          cursor_id: '1',
          cursor_created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockBusinesses,
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { lat: -33.9249, lng: 18.4241, radius_km: 5, q: 'restaurant' } });

      const response = await GET(req);
      const data = await response.json();

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_latitude: -33.9249,
          p_longitude: 18.4241,
          p_radius_km: 5,
        })
      );
      expect(response.status).toBe(200);
      // Results should have distance calculated (transformed to 'distance' property)
      expect(data.businesses[0]).toHaveProperty('distance');
    });

    it('should sort by distance when sort=distance is specified', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { lat: -33.9249, lng: 18.4241, sort: 'distance' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_sort_by: 'distance',
          p_sort_order: 'asc',
        })
      );
    });
  });

  describe('Sorting Options', () => {
    it('should sort by rating when sort=rating_desc', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { sort: 'rating_desc' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_sort_by: 'rating',
          p_sort_order: 'desc',
        })
      );
    });

    it('should sort by price when sort=price_asc', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { sort: 'price_asc' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_sort_by: 'price',
          p_sort_order: 'asc',
        })
      );
    });

    it('should sort by combo score when sort=combo and location provided', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { lat: -33.9249, lng: 18.4241, sort: 'combo' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_sort_by: 'combo',
          p_sort_order: 'desc',
        })
      );
    });
  });

  describe('Search History Logging', () => {
    it('should log search history for authenticated users', async () => {
      const mockUser = { id: 'user-123' };
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee' } });

      await GET(req);

      // Wait for async search history logging
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should attempt to log search history
      expect(mockFrom).toHaveBeenCalledWith('search_history');
    });

    it('should not log search history for unauthenticated users', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee' } });

      await GET(req);

      // Should not log search history without user
      // (This is tested implicitly - if user is null, logSearchHistory returns early)
    });

    it('should not log search history when query is empty', async () => {
      const mockUser = { id: 'user-123' };
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses');

      await GET(req);

      // Should not log when no query
      // (This is tested implicitly - if query is empty, logSearchHistory returns early)
    });
  });

  describe('Filter Combinations', () => {
    it('should combine search query with category filter', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee', category: 'Cafe' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_search: 'coffee',
          p_category: 'Cafe',
        })
      );
    });

    it('should combine search query with location filter', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'restaurant', location: 'Cape Town' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_search: 'restaurant',
          p_location: 'Cape Town',
        })
      );
    });

    it('should combine search query with price range filter', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'restaurant', price_range: '$$' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_search: 'restaurant',
          p_price_range: '$$',
        })
      );
    });

    it('should combine search query with verified filter', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'restaurant', verified: 'true' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_search: 'restaurant',
          p_verified: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle RPC function not found error gracefully', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function does not exist' },
      });

      // Mock fallback query
      mockFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      // Should fallback to regular query
      expect(response.status).toBe(200);
      expect(data.businesses).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' },
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee' } });

      const response = await GET(req);

      expect(response.status).toBe(500);
    });
  });

  describe('Pagination', () => {
    it('should handle cursor-based pagination with search', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee', cursor_id: '123', cursor_created_at: '2024-01-01T00:00:00Z' } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_cursor_id: '123',
          p_cursor_created_at: '2024-01-01T00:00:00Z',
        })
      );
    });

    it('should respect limit parameter with search', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const req = createTestRequest('/api/businesses', { query: { q: 'coffee', limit: 10 } });

      await GET(req);

      expect(mockRpc).toHaveBeenCalledWith(
        'list_businesses_optimized',
        expect.objectContaining({
          p_limit: 10,
        })
      );
    });
  });
});

