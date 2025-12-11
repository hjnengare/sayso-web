/**
 * Backend API tests for saving businesses functionality
 * 
 * Tests:
 * - POST /api/user/saved - Save a business
 * - GET /api/user/saved - Get saved businesses
 * - DELETE /api/user/saved - Unsave a business
 * - Authentication requirements
 * - Business validation
 * - Duplicate saving prevention
 * - Error handling
 */

import { GET, POST, DELETE } from '../../src/app/api/user/saved/route';
import { createTestRequest } from '../../__test-utils__/helpers/create-test-request';
import { getServerSupabase } from '../../src/app/lib/supabase/server';

// Mock Supabase
jest.mock('../../src/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

describe('POST /api/user/saved - Save Business', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn();
    const mockMaybeSingle = jest.fn();
    const mockInsert = jest.fn().mockReturnThis();
    const mockDelete = jest.fn().mockReturnThis();

    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      insert: mockInsert,
      delete: mockDelete,
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    });

    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      }),
    };

    mockSupabase = {
      from: mockFrom,
      auth: mockAuth,
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should require authentication to save a business', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'business-1' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('You must be logged in to save businesses');
    });

    it('should handle auth errors gracefully', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'business-1' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('You must be logged in to save businesses');
    });
  });

  describe('Input Validation', () => {
    it('should require business_id', async () => {
      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Business ID is required');
    });

    it('should validate that business exists', async () => {
      // Mock business not found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'nonexistent-business' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Business not found');
    });
  });

  describe('Saving Business', () => {
    it('should save a business successfully', async () => {
      const mockBusiness = { id: 'business-1', name: 'Test Business' };
      const mockSavedRecord = {
        id: 'saved-1',
        user_id: 'user-123',
        business_id: 'business-1',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Mock business exists
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock check existing (not found)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })
      // Mock RLS read test
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })
      // Mock insert
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSavedRecord,
          error: null,
        }),
      })
      // Mock verification query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockSavedRecord,
          error: null,
        }),
      });

      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'business-1' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isSaved).toBe(true);
      expect(data.message).toBe('Business saved successfully');
    });

    it('should prevent duplicate saves', async () => {
      const mockBusiness = { id: 'business-1', name: 'Test Business' };
      const mockExisting = { id: 'saved-1' };

      // Mock business exists
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock check existing (found)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockExisting,
          error: null,
        }),
      });

      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'business-1' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isSaved).toBe(true);
      expect(data.message).toBe('Business already saved');
    });

    it('should handle unique constraint violation as duplicate', async () => {
      const mockBusiness = { id: 'business-1', name: 'Test Business' };

      // Mock business exists
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock check existing (not found)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })
      // Mock RLS read test
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })
      // Mock insert with unique constraint violation
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Unique constraint violation' },
        }),
      });

      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'business-1' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isSaved).toBe(true);
      expect(data.message).toBe('Business already saved');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockBusiness = { id: 'business-1', name: 'Test Business' };

      // Mock business exists
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock check existing (not found)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })
      // Mock RLS read test
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })
      // Mock insert with error
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '500', message: 'Database error' },
        }),
      });

      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'business-1' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save business');
    });

    it('should handle table/permission errors', async () => {
      const mockBusiness = { id: 'business-1', name: 'Test Business' };

      // Mock business exists
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock check existing (not found)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })
      // Mock RLS read test
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })
      // Mock insert with table error
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'relation does not exist' },
        }),
      });

      const req = createTestRequest('/api/user/saved', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'business-1' }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('not available');
    });
  });
});

describe('GET /api/user/saved - Get Saved Businesses', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom = jest.fn();
    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      }),
    };

    mockSupabase = {
      from: mockFrom,
      auth: mockAuth,
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should require authentication to get saved businesses', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = createTestRequest('/api/user/saved');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('You must be logged in to view saved businesses');
    });
  });

  describe('Getting Saved Businesses', () => {
    it('should return empty array when no businesses are saved', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/user/saved');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.businesses).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should return saved businesses with full details', async () => {
      const mockSavedRecords = [
        {
          id: 'saved-1',
          created_at: '2024-01-01T00:00:00Z',
          businesses: {
            id: 'business-1',
            name: 'Test Business',
            category: 'Restaurant',
            location: 'Cape Town',
            image_url: 'https://example.com/image.jpg',
            verified: true,
            price_range: '$$',
            slug: 'test-business',
          },
        },
      ];

      const mockStats = [
        {
          business_id: 'business-1',
          total_reviews: 10,
          average_rating: 4.5,
          percentiles: { punctuality: 90 },
        },
      ];

      // Mock saved records query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockSavedRecords,
          error: null,
        }),
      })
      // Mock business stats query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: mockStats,
          error: null,
        }),
      });

      const req = createTestRequest('/api/user/saved');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.businesses).toHaveLength(1);
      expect(data.businesses[0].id).toBe('business-1');
      expect(data.businesses[0].name).toBe('Test Business');
      expect(data.businesses[0].rating).toBeDefined();
      expect(data.businesses[0].reviews).toBe(10);
      expect(data.count).toBe(1);
    });

    it('should handle missing business stats gracefully', async () => {
      const mockSavedRecords = [
        {
          id: 'saved-1',
          created_at: '2024-01-01T00:00:00Z',
          businesses: {
            id: 'business-1',
            name: 'Test Business',
            category: 'Restaurant',
            location: 'Cape Town',
          },
        },
      ];

      // Mock saved records query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockSavedRecords,
          error: null,
        }),
      })
      // Mock business stats query (empty)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/user/saved');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses).toHaveLength(1);
      expect(data.businesses[0].reviews).toBe(0);
      expect(data.businesses[0].rating).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: '500' },
        }),
      });

      const req = createTestRequest('/api/user/saved');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch saved businesses');
    });
  });
});

describe('DELETE /api/user/saved - Unsave Business', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom = jest.fn();
    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      }),
    };

    mockSupabase = {
      from: mockFrom,
      auth: mockAuth,
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should require authentication to unsave a business', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = createTestRequest('/api/user/saved?business_id=business-1', {
        method: 'DELETE',
      });

      const response = await DELETE(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('You must be logged in to unsave businesses');
    });
  });

  describe('Input Validation', () => {
    it('should require business_id parameter', async () => {
      const req = createTestRequest('/api/user/saved', {
        method: 'DELETE',
      });

      const response = await DELETE(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Business ID is required');
    });
  });

  describe('Unsaving Business', () => {
    it('should unsave a business successfully', async () => {
      mockFrom.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Fix: The delete chain needs to be properly mocked
      const mockDelete = jest.fn().mockResolvedValue({ error: null });
      const mockEq = jest.fn().mockReturnValue({ error: null });
      
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          error: null,
        }),
      });

      // Override the chain to return the final result
      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((field: string, value: any) => {
          if (field === 'business_id') {
            return {
              eq: jest.fn().mockResolvedValue({ error: null }),
            };
          }
          return {
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }),
      };

      mockFrom.mockReturnValue(deleteChain);

      const req = createTestRequest('/api/user/saved?business_id=business-1', {
        method: 'DELETE',
      });

      const response = await DELETE(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isSaved).toBe(false);
      expect(data.message).toBe('Business unsaved successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle delete errors gracefully', async () => {
      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((field: string, value: any) => {
          if (field === 'business_id') {
            return {
              eq: jest.fn().mockResolvedValue({ 
                error: { message: 'Delete failed' } 
              }),
            };
          }
          return {
            eq: jest.fn().mockResolvedValue({ 
              error: { message: 'Delete failed' } 
            }),
          };
        }),
      };

      mockFrom.mockReturnValue(deleteChain);

      const req = createTestRequest('/api/user/saved?business_id=business-1', {
        method: 'DELETE',
      });

      const response = await DELETE(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to unsave business');
    });
  });
});

