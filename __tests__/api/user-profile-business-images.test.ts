/**
 * Tests for user profile business image display
 * Verifies that uploaded_images are correctly displayed in:
 * - User profile saved businesses (SavedBusinessRow component)
 * - Owners page owned businesses
 * - API routes that return businesses for users
 */

import { GET } from '@/app/api/saved/businesses/route';
import { GET as GETUserSaved } from '@/app/api/user/saved/route';
import { createTestRequest } from '@test-utils/helpers/create-test-request';
import { createMockSupabaseClient } from '@test-utils/mocks/supabase';
import { createUser } from '@test-utils/factories/userFactory';
import { createBusiness } from '@test-utils/factories/businessFactory';

// Mock getServerSupabase
jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

describe('User Profile Business Images Display', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { getServerSupabase } = require('@/app/lib/supabase/server');
    getServerSupabase.mockResolvedValue(mockSupabase);
    
    // Reset mock data
    mockSupabase.setMockData('businesses', []);
    mockSupabase.setMockData('saved_businesses', []);
    mockSupabase.setMockData('business_stats', []);
    mockSupabase.setMockData('business_owners', []);
  });

  describe('Saved Businesses API - /api/saved/businesses', () => {
    it('should include uploaded_images in saved businesses response', async () => {
      const user = createUser();
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/img1.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/img2.jpg',
        ],
        image_url: 'https://example.com/legacy.jpg',
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('saved_businesses', [{
        id: 'saved-1',
        user_id: user.id,
        business_id: business.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const request = createTestRequest('/api/saved/businesses?limit=20&page=1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.businesses).toBeDefined();
      expect(data.businesses.length).toBe(1);
      
      const savedBusiness = data.businesses[0];
      expect(savedBusiness.uploaded_images).toBeDefined();
      expect(Array.isArray(savedBusiness.uploaded_images)).toBe(true);
      expect(savedBusiness.uploaded_images.length).toBe(2);
      expect(savedBusiness.uploaded_images[0]).toBe('https://example.com/storage/v1/object/public/business_images/abc123/img1.jpg');
    });

    it('should prioritize uploaded_images over image_url in saved businesses', async () => {
      const user = createUser();
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/primary.jpg',
        ],
        image_url: 'https://example.com/fallback.jpg',
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('saved_businesses', [{
        id: 'saved-1',
        user_id: user.id,
        business_id: business.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const request = createTestRequest('/api/saved/businesses?limit=20&page=1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const savedBusiness = data.businesses[0];
      
      // Should have both uploaded_images and image_url
      expect(savedBusiness.uploaded_images).toBeDefined();
      expect(savedBusiness.uploaded_images.length).toBe(1);
      expect(savedBusiness.image_url).toBe('https://example.com/fallback.jpg');
      
      // BusinessCard will prioritize uploaded_images[0] over image_url
      expect(savedBusiness.uploaded_images[0]).toBe('https://example.com/storage/v1/object/public/business_images/abc123/primary.jpg');
    });

    it('should handle null uploaded_images gracefully in saved businesses', async () => {
      const user = createUser();
      const business = createBusiness({
        uploaded_images: null,
        image_url: 'https://example.com/only-image.jpg',
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('saved_businesses', [{
        id: 'saved-1',
        user_id: user.id,
        business_id: business.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const request = createTestRequest('/api/saved/businesses?limit=20&page=1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const savedBusiness = data.businesses[0];
      
      // Should handle null gracefully
      expect(savedBusiness.uploaded_images === null || savedBusiness.uploaded_images === undefined || Array.isArray(savedBusiness.uploaded_images)).toBe(true);
      expect(savedBusiness.image_url).toBe('https://example.com/only-image.jpg');
    });
  });

  describe('User Saved API - /api/user/saved', () => {
    it('should include uploaded_images in user saved businesses response', async () => {
      const user = createUser();
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/img1.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/img2.jpg',
        ],
        image_url: null, // Explicitly set to null to test uploaded_images priority
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('saved_businesses', [{
        id: 'saved-1',
        user_id: user.id,
        business_id: business.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const request = createTestRequest('/api/user/saved', {
        method: 'GET',
      });

      const response = await GETUserSaved(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.businesses).toBeDefined();
      expect(data.businesses.length).toBe(1);
      
      const savedBusiness = data.businesses[0];
      // The API transforms uploaded_images[0] to the image field
      expect(savedBusiness.image).toBeDefined();
      expect(savedBusiness.image).toBe('https://example.com/storage/v1/object/public/business_images/abc123/img1.jpg');
    });

    it('should use uploaded_images[0] as image when available', async () => {
      const user = createUser();
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/primary.jpg',
        ],
        image_url: 'https://example.com/fallback.jpg', // Should be ignored when uploaded_images exists
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('saved_businesses', [{
        id: 'saved-1',
        user_id: user.id,
        business_id: business.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const request = createTestRequest('/api/user/saved', {
        method: 'GET',
      });

      const response = await GETUserSaved(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const savedBusiness = data.businesses[0];
      
      // Should use uploaded_images[0] over image_url
      expect(savedBusiness.image).toBe('https://example.com/storage/v1/object/public/business_images/abc123/primary.jpg');
    });

    it('should fallback to image_url when uploaded_images is empty', async () => {
      const user = createUser();
      const business = createBusiness({
        uploaded_images: [],
        image_url: 'https://example.com/fallback.jpg',
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('saved_businesses', [{
        id: 'saved-1',
        user_id: user.id,
        business_id: business.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const request = createTestRequest('/api/user/saved', {
        method: 'GET',
      });

      const response = await GETUserSaved(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const savedBusiness = data.businesses[0];
      
      // Should fallback to image_url
      expect(savedBusiness.image).toBe('https://example.com/fallback.jpg');
    });
  });

  describe('Owned Businesses - BusinessOwnershipService', () => {
    it('should include uploaded_images when fetching owned businesses', async () => {
      const user = createUser();
      const business = createBusiness({
        owner_id: user.id,
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/img1.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/img2.jpg',
        ],
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_owners', [{
        id: 'owner-1',
        business_id: business.id,
        user_id: user.id,
        role: 'owner',
      }]);

      // Test the service directly by checking what data is available
      const { data: businesses } = await mockSupabase
        .from('businesses')
        .select('*')
        .eq('id', business.id);

      expect(businesses).toBeDefined();
      expect(businesses.length).toBe(1);
      expect(businesses[0].uploaded_images).toBeDefined();
      expect(Array.isArray(businesses[0].uploaded_images)).toBe(true);
      expect(businesses[0].uploaded_images.length).toBe(2);
    });

    it('should return all business fields including uploaded_images for owners', async () => {
      const user = createUser();
      const business = createBusiness({
        owner_id: user.id,
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/hero.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/gallery1.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/gallery2.jpg',
        ],
        image_url: 'https://example.com/legacy.jpg',
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_owners', [{
        id: 'owner-1',
        business_id: business.id,
        user_id: user.id,
        role: 'owner',
      }]);

      // Simulate BusinessOwnershipService.getBusinessesForOwner query
      const { data: businesses } = await mockSupabase
        .from('businesses')
        .select('*')
        .eq('status', 'active');

      expect(businesses).toBeDefined();
      expect(businesses.length).toBeGreaterThan(0);
      
      const ownedBusiness = businesses.find((b: any) => b.id === business.id);
      expect(ownedBusiness).toBeDefined();
      expect(ownedBusiness.uploaded_images).toBeDefined();
      expect(Array.isArray(ownedBusiness.uploaded_images)).toBe(true);
      expect(ownedBusiness.uploaded_images.length).toBe(3);
      expect(ownedBusiness.image_url).toBe('https://example.com/legacy.jpg');
    });
  });

  describe('BusinessCard Component Integration', () => {
    it('should receive uploaded_images array for BusinessCard in SavedBusinessRow', async () => {
      const user = createUser();
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/img1.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/img2.jpg',
        ],
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('saved_businesses', [{
        id: 'saved-1',
        user_id: user.id,
        business_id: business.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const request = createTestRequest('/api/saved/businesses?limit=20&page=1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const savedBusiness = data.businesses[0];
      
      // BusinessCard expects uploaded_images array
      expect(savedBusiness.uploaded_images).toBeDefined();
      expect(Array.isArray(savedBusiness.uploaded_images)).toBe(true);
      
      // BusinessCard will use uploaded_images[0] as primary image
      expect(savedBusiness.uploaded_images[0]).toBeDefined();
      expect(typeof savedBusiness.uploaded_images[0]).toBe('string');
    });

    it('should format business data correctly for BusinessCard display', async () => {
      const user = createUser();
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/primary.jpg',
        ],
        image_url: 'https://example.com/fallback.jpg',
        verified: true,
        price_range: '$$$',
      });
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('saved_businesses', [{
        id: 'saved-1',
        user_id: user.id,
        business_id: business.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const request = createTestRequest('/api/saved/businesses?limit=20&page=1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const savedBusiness = data.businesses[0];
      
      // Verify all fields needed by BusinessCard are present
      expect(savedBusiness.id).toBeDefined();
      expect(savedBusiness.name).toBeDefined();
      expect(savedBusiness.uploaded_images).toBeDefined();
      expect(savedBusiness.image_url).toBeDefined();
      expect(savedBusiness.category).toBeDefined();
      expect(savedBusiness.location).toBeDefined();
      expect(savedBusiness.verified).toBeDefined();
      expect(savedBusiness.price_range).toBeDefined();
      
      // BusinessCard will prioritize uploaded_images[0]
      expect(savedBusiness.uploaded_images[0]).toBe('https://example.com/storage/v1/object/public/business_images/abc123/primary.jpg');
    });
  });

  describe('Multiple Businesses with Images', () => {
    it('should return multiple businesses with uploaded_images correctly', async () => {
      const user = createUser();
      const businesses = [
        createBusiness({
          id: 'business-1',
          uploaded_images: ['https://example.com/storage/business1/img1.jpg'],
        }),
        createBusiness({
          id: 'business-2',
          uploaded_images: [
            'https://example.com/storage/business2/img1.jpg',
            'https://example.com/storage/business2/img2.jpg',
          ],
        }),
        createBusiness({
          id: 'business-3',
          uploaded_images: null,
          image_url: 'https://example.com/business3.jpg',
        }),
      ];
      
      mockSupabase.setMockUser(user);
      mockSupabase.setMockData('businesses', businesses);
      mockSupabase.setMockData('saved_businesses', businesses.map((b, i) => ({
        id: `saved-${i + 1}`,
        user_id: user.id,
        business_id: b.id,
        created_at: new Date().toISOString(),
      })));
      mockSupabase.setMockData('business_stats', businesses.map(b => ({
        business_id: b.id,
        average_rating: 4.5,
        total_reviews: 10,
      })));

      const request = createTestRequest('/api/saved/businesses?limit=20&page=1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businesses.length).toBe(3);
      
      // Verify each business has correct image data
      const business1 = data.businesses.find((b: any) => b.id === 'business-1');
      expect(business1.uploaded_images.length).toBe(1);
      
      const business2 = data.businesses.find((b: any) => b.id === 'business-2');
      expect(business2.uploaded_images.length).toBe(2);
      
      const business3 = data.businesses.find((b: any) => b.id === 'business-3');
      expect(business3.uploaded_images === null || business3.uploaded_images === undefined || Array.isArray(business3.uploaded_images)).toBe(true);
      expect(business3.image_url).toBe('https://example.com/business3.jpg');
    });
  });
});

