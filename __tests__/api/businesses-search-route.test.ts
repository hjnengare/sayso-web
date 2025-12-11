/**
 * Backend API tests for /api/businesses/search route
 * 
 * Tests:
 * - Search query validation
 * - Business search results
 * - Claim status for authenticated users
 * - Claim status for unauthenticated users
 * - Empty search results
 * - Error handling
 */

import { GET } from '../../src/app/api/businesses/search/route';
import { createTestRequest } from '../../__test-utils__/helpers/create-test-request';
import { getServerSupabase } from '../../src/app/lib/supabase/server';

// Mock Supabase
jest.mock('../../src/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

describe('GET /api/businesses/search', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect = jest.fn().mockReturnThis();
    const mockQueryChain = {
      select: mockSelect,
      or: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    mockFrom = jest.fn().mockReturnValue(mockQueryChain);

    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    };

    mockSupabase = {
      from: mockFrom,
      auth: mockAuth,
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Query Validation', () => {
    it('should return empty results when query is missing', async () => {
      const req = createTestRequest('/api/businesses/search');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should return empty results when query is too short (< 2 characters)', async () => {
      const req = createTestRequest('/api/businesses/search', { query: { query: 'a' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should return empty results when query is empty string', async () => {
      const req = createTestRequest('/api/businesses/search', { query: { query: '' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses).toEqual([]);
    });

    it('should process query when it is 2 or more characters', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          category: 'Cafe',
          location: 'Cape Town',
          verified: true,
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockBusinesses,
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'co' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith('businesses');
    });
  });

  describe('Search Results', () => {
    it('should return businesses matching search query', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          category: 'Cafe',
          location: 'Cape Town',
          address: '123 Main St',
          phone: '+27123456789',
          email: 'info@coffeeshop.com',
          website: 'https://coffeeshop.com',
          image_url: 'https://example.com/image.jpg',
          verified: true,
        },
        {
          id: '2',
          name: 'Coffee Bar',
          category: 'Cafe',
          location: 'Cape Town',
          verified: false,
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockBusinesses,
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses).toHaveLength(2);
      expect(data.businesses[0].name).toBe('Coffee Shop');
      expect(data.businesses[1].name).toBe('Coffee Bar');
    });

    it('should search in name, description, and category fields', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'restaurant' } });

      await GET(req);

      const orCall = mockFrom().or;
      expect(orCall).toHaveBeenCalledWith(
        expect.stringContaining('name.ilike'),
        expect.stringContaining('description.ilike'),
        expect.stringContaining('category.ilike')
      );
    });

    it('should limit results to 20 businesses', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      await GET(req);

      const limitCall = mockFrom().limit;
      expect(limitCall).toHaveBeenCalledWith(20);
    });
  });

  describe('Claim Status - Authenticated Users', () => {
    it('should include claim status for authenticated users', async () => {
      const mockUser = { id: 'user-123' };
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          category: 'Cafe',
          location: 'Cape Town',
          verified: true,
        },
      ];

      const mockOwners = [
        { business_id: '1', user_id: 'user-123' },
      ];

      const mockOwnersQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: mockOwners,
          error: null,
        }),
      };

      const mockPendingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: mockBusinesses,
            error: null,
          }),
        })
        .mockReturnValueOnce(mockOwnersQuery)
        .mockReturnValueOnce(mockPendingQuery)
        .mockReturnValueOnce(mockOwnersQuery);

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses[0]).toHaveProperty('claim_status');
      expect(data.businesses[0]).toHaveProperty('claimed_by_user');
      expect(data.businesses[0]).toHaveProperty('pending_by_user');
    });

    it('should mark business as claimed_by_user when user owns it', async () => {
      const mockUser = { id: 'user-123' };
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockBusinesses = [
        {
          id: '1',
          name: 'My Coffee Shop',
          category: 'Cafe',
          location: 'Cape Town',
          verified: true,
        },
      ];

      const mockOwners = [
        { business_id: '1', user_id: 'user-123' },
      ];

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: mockBusinesses,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: mockOwners,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: mockOwners,
            error: null,
          }),
        });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses[0].claim_status).toBe('claimed');
      expect(data.businesses[0].claimed_by_user).toBe(true);
      expect(data.businesses[0].pending_by_user).toBe(false);
    });

    it('should mark business as pending_by_user when user has pending request', async () => {
      const mockUser = { id: 'user-123' };
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          category: 'Cafe',
          location: 'Cape Town',
          verified: true,
        },
      ];

      const mockPendingRequests = [
        { business_id: '1', user_id: 'user-123' },
      ];

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: mockBusinesses,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: mockPendingRequests,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses[0].claim_status).toBe('pending');
      expect(data.businesses[0].pending_by_user).toBe(true);
      expect(data.businesses[0].claimed_by_user).toBe(false);
    });
  });

  describe('Claim Status - Unauthenticated Users', () => {
    it('should include claim status for unauthenticated users', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          category: 'Cafe',
          location: 'Cape Town',
          verified: true,
        },
      ];

      const mockOwners = [
        { business_id: '1', user_id: 'other-user' },
      ];

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: mockBusinesses,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: mockOwners,
            error: null,
          }),
        });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses[0]).toHaveProperty('claim_status');
      expect(data.businesses[0].claim_status).toBe('claimed');
      expect(data.businesses[0].claimed_by_user).toBe(false);
      expect(data.businesses[0].pending_by_user).toBe(false);
    });

    it('should mark unclaimed businesses correctly', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          category: 'Cafe',
          location: 'Cape Town',
          verified: true,
        },
      ];

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: mockBusinesses,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses[0].claim_status).toBe('unclaimed');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' },
        }),
      });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search businesses');
    });

    it('should handle authentication errors gracefully', async () => {
      mockAuth.getUser.mockRejectedValue(new Error('Auth error'));

      const mockBusinesses = [
        {
          id: '1',
          name: 'Coffee Shop',
          category: 'Cafe',
          location: 'Cape Town',
          verified: true,
        },
      ];

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: mockBusinesses,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'coffee' } });

      const response = await GET(req);
      const data = await response.json();

      // Should still return results even if auth fails
      expect(response.status).toBe(200);
      expect(data.businesses).toHaveLength(1);
    });
  });

  describe('Empty Results', () => {
    it('should return empty array when no businesses match', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/search', { query: { query: 'nonexistent12345' } });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses).toEqual([]);
    });
  });
});

