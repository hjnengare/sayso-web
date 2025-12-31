/**
 * Comprehensive tests for the business adding flow
 * Tests both API route and full integration scenarios
 */

import { POST } from '@/app/api/businesses/route';
import { createTestRequest } from '@test-utils/helpers/create-test-request';
import { createMockSupabaseClient } from '@test-utils/mocks/supabase';
import { createUser } from '@test-utils/factories/userFactory';

// Mock getServerSupabase
jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

describe('Business Adding Flow', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { getServerSupabase } = require('@/app/lib/supabase/server');
    getServerSupabase.mockResolvedValue(mockSupabase);
    
    // Reset mock data
    mockSupabase.setMockData('businesses', []);
    mockSupabase.setMockData('business_owners', []);
    mockSupabase.setMockData('business_stats', []);
  });

  describe('POST /api/businesses - Success Scenarios', () => {
    it('should create a business with all required fields successfully', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Test Restaurant',
        category: 'Restaurant',
        location: 'Cape Town',
        description: 'A great restaurant',
        address: '123 Main St',
        phone: '+27123456789',
        email: 'contact@testrestaurant.com',
        website: 'https://testrestaurant.com',
        priceRange: '$$$',
        hours: {
          monday: '9:00 AM - 5:00 PM',
          tuesday: '9:00 AM - 5:00 PM',
        },
        lat: -33.9249,
        lng: 18.4241,
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.business).toBeDefined();
      expect(data.business.name).toBe(businessData.name);
      expect(data.business.category).toBe(businessData.category);
      expect(data.business.location).toBe(businessData.location);
      expect(data.business.description).toBe(businessData.description);
      expect(data.business.address).toBe(businessData.address);
      expect(data.business.phone).toBe(businessData.phone);
      expect(data.business.email).toBe(businessData.email);
      expect(data.business.website).toBe(businessData.website);
      expect(data.business.price_range).toBe(businessData.priceRange);
      expect(data.business.hours).toEqual(businessData.hours);
      expect(data.business.lat).toBe(businessData.lat);
      expect(data.business.lng).toBe(businessData.lng);
      expect(data.business.owner_id).toBe(user.id);
      expect(data.business.verified).toBe(false);
      expect(data.business.status).toBe('active');
      expect(data.business.slug).toBe('test-restaurant');
      expect(data.business.id).toBeDefined();
    });

    it('should create a business with minimal required fields only', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Minimal Business',
        category: 'Cafe',
        location: 'Johannesburg',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.business.name).toBe(businessData.name);
      expect(data.business.category).toBe(businessData.category);
      expect(data.business.location).toBe(businessData.location);
      expect(data.business.description).toBeNull();
      expect(data.business.address).toBeNull();
      expect(data.business.phone).toBeNull();
      expect(data.business.email).toBeNull();
      expect(data.business.website).toBeNull();
      expect(data.business.price_range).toBe('$$'); // Default
      expect(data.business.hours).toBeNull();
      expect(data.business.lat).toBeNull();
      expect(data.business.lng).toBeNull();
    });

    it('should generate unique slug when business name already exists', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      // Create existing business with same name
      const existingBusiness = {
        id: 'existing-id',
        name: 'Test Business',
        slug: 'test-business',
        category: 'Restaurant',
        location: 'Cape Town',
      };
      mockSupabase.setMockData('businesses', [existingBusiness]);

      const businessData = {
        name: 'Test Business',
        category: 'Cafe',
        location: 'Johannesburg',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.slug).toBe('test-business-1');
    });

    it('should create business_owners entry when business is created', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Owner Test Business',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      
      // Verify business_owners entry was created by querying
      const { data: ownersData, error: ownersError } = await mockSupabase
        .from('business_owners')
        .select()
        .eq('business_id', data.business.id);
      
      expect(ownersError).toBeNull();
      expect(ownersData).toBeDefined();
      expect(ownersData.length).toBeGreaterThan(0);
      
      // Verify the owner entry matches the created business
      const ownerEntry = ownersData[0];
      expect(ownerEntry.business_id).toBe(data.business.id);
      expect(ownerEntry.user_id).toBe(user.id);
      expect(ownerEntry.role).toBe('owner');
    });

    it('should initialize business_stats when business is created', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Stats Test Business',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      
      // Verify business_stats entry was created by checking mock data
      const allStats = mockSupabase.from('business_stats').select().then((result: any) => result.data);
      const statsData = await allStats;
      
      // Should have at least one stats entry
      expect(statsData.length).toBeGreaterThan(0);
      // Verify the stats entry matches the created business
      const statsEntry = statsData.find((s: any) => s.business_id === data.business.id);
      expect(statsEntry).toBeDefined();
      expect(statsEntry.total_reviews).toBe(0);
      expect(statsEntry.average_rating).toBe(0.0);
    });

    it('should handle business with special characters in name', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: "Joe's Café & Restaurant!",
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.name).toBe("Joe's Café & Restaurant!");
      // Slug should be sanitized
      expect(data.business.slug).toMatch(/^joes-caf-restaurant/);
    });

    it('should trim whitespace from all text fields', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: '  Trimmed Business  ',
        category: '  Restaurant  ',
        location: '  Cape Town  ',
        description: '  Description with spaces  ',
        address: '  123 Main St  ',
        phone: '  +27123456789  ',
        email: '  contact@test.com  ',
        website: '  https://test.com  ',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.name).toBe('Trimmed Business');
      expect(data.business.category).toBe('Restaurant');
      expect(data.business.location).toBe('Cape Town');
      expect(data.business.description).toBe('Description with spaces');
      expect(data.business.address).toBe('123 Main St');
      expect(data.business.phone).toBe('+27123456789');
      expect(data.business.email).toBe('contact@test.com');
      expect(data.business.website).toBe('https://test.com');
    });

    it('should handle empty optional fields as null', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Optional Fields Test',
        category: 'Restaurant',
        location: 'Cape Town',
        description: '',
        address: '',
        phone: '',
        email: '',
        website: '',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.description).toBeNull();
      expect(data.business.address).toBeNull();
      expect(data.business.phone).toBeNull();
      expect(data.business.email).toBeNull();
      expect(data.business.website).toBeNull();
    });
  });

  describe('POST /api/businesses - Authentication & Authorization', () => {
    it('should require authentication', async () => {
      mockSupabase.setMockUser(null);

      const businessData = {
        name: 'Test Business',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
      expect(data.error).toContain('log in');
    });

    it('should set owner_id to authenticated user id', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Owner ID Test',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.owner_id).toBe(user.id);
    });
  });

  describe('POST /api/businesses - Validation', () => {
    it('should validate required fields: name', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should validate required fields: category', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Test Business',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should validate required fields: location', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Test Business',
        category: 'Restaurant',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should validate all required fields are present', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {};

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Name, category, and location are required');
    });
  });

  describe('POST /api/businesses - Slug Generation', () => {
    it('should generate slug from business name', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'My Awesome Business',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.slug).toBe('my-awesome-business');
    });

    it('should handle multiple duplicate slugs', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      // Create multiple existing businesses with same base name
      const existingBusinesses = [
        { id: '1', name: 'Test Business', slug: 'test-business', category: 'Restaurant', location: 'Cape Town' },
        { id: '2', name: 'Test Business', slug: 'test-business-1', category: 'Restaurant', location: 'Cape Town' },
        { id: '3', name: 'Test Business', slug: 'test-business-2', category: 'Restaurant', location: 'Cape Town' },
      ];
      mockSupabase.setMockData('businesses', existingBusinesses);

      const businessData = {
        name: 'Test Business',
        category: 'Cafe',
        location: 'Johannesburg',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.slug).toBe('test-business-3');
    });
  });

  describe('POST /api/businesses - Business Stats Initialization', () => {
    it('should initialize business_stats with zero values', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Stats Initialization Test',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      
      // Verify stats entry was created with correct initial values
      const allStats = mockSupabase.from('business_stats').select().then((result: any) => result.data);
      const statsData = await allStats;
      
      const statsEntry = statsData.find((s: any) => s.business_id === data.business.id);
      expect(statsEntry).toBeDefined();
      expect(statsEntry.business_id).toBe(data.business.id);
      expect(statsEntry.total_reviews).toBe(0);
      expect(statsEntry.average_rating).toBe(0.0);
      expect(statsEntry.rating_distribution).toEqual({ "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 });
      expect(statsEntry.percentiles).toEqual({});
    });
  });

  describe('POST /api/businesses - Error Handling', () => {
    it('should handle database insert errors gracefully', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      // Mock insert to fail
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation', code: '23505' },
      });
      
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'businesses') {
          return {
            insert: mockInsert,
            select: jest.fn().mockReturnThis(),
            single: jest.fn(),
          };
        }
        return mockSupabase.from(table);
      });

      const businessData = {
        name: 'Database Error Test',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to create business');
    });

    it('should cleanup business if owner creation fails', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      // Track if delete was called
      let deleteCalled = false;
      const originalFrom = mockSupabase.from.bind(mockSupabase);
      
      // Override the from method to intercept business_owners insert
      mockSupabase.from = jest.fn((table: string) => {
        if (table === 'business_owners') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Owner insert failed' },
            }),
          };
        }
        if (table === 'businesses') {
          const businessBuilder = originalFrom(table);
          // Override delete to track calls
          const originalDelete = businessBuilder.delete;
          businessBuilder.delete = jest.fn(() => {
            deleteCalled = true;
            return {
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          });
          return businessBuilder;
        }
        return originalFrom(table);
      });

      const businessData = {
        name: 'Owner Error Test',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to assign ownership');
      
      // Verify cleanup was attempted
      expect(deleteCalled).toBe(true);
    });
  });

  describe('POST /api/businesses - Business State', () => {
    it('should set verified to false for new businesses', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Unverified Business',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.verified).toBe(false);
    });

    it('should set status to active for new businesses', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Active Business',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.status).toBe('active');
    });

    it('should set default price_range to $$ if not provided', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const businessData = {
        name: 'Default Price Range',
        category: 'Restaurant',
        location: 'Cape Town',
      };

      const request = createTestRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.business.price_range).toBe('$$');
    });
  });
});

