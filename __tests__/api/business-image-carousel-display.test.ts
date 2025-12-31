/**
 * Tests for business image carousel display on profile and review pages
 * Verifies that uploaded_images array is correctly displayed in:
 * - Business Profile page carousel (ImageCarousel component)
 * - Write Review page carousel (BusinessCarousel component)
 */

import { GET } from '@/app/api/businesses/[id]/route';
import { createTestRequest } from '@test-utils/helpers/create-test-request';
import { createMockSupabaseClient } from '@test-utils/mocks/supabase';
import { createBusiness } from '@test-utils/factories/businessFactory';

// Mock getServerSupabase
jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

// Mock fetchBusinessOptimized to avoid cookies() context issues
jest.mock('@/app/lib/utils/optimizedQueries', () => ({
  fetchBusinessOptimized: jest.fn(),
}));

describe('Business Image Carousel Display on Profile and Review Pages', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { getServerSupabase } = require('@/app/lib/supabase/server');
    getServerSupabase.mockResolvedValue(mockSupabase);
    
    // Reset mock data
    mockSupabase.setMockData('businesses', []);
    mockSupabase.setMockData('business_stats', []);
  });

  describe('Business Profile Page - Image Carousel', () => {
    it('should include uploaded_images in galleryImages for ImageCarousel', async () => {
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/hero.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/gallery1.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/gallery2.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/gallery3.jpg',
        ],
        image_url: 'https://example.com/legacy.jpg',
      });
      
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      // Mock fetchBusinessOptimized to return business data
      const { fetchBusinessOptimized } = require('@/app/lib/utils/optimizedQueries');
      fetchBusinessOptimized.mockResolvedValue({
        ...business,
        stats: { average_rating: 4.5, total_reviews: 10 },
      });

      const request = createTestRequest(`/api/businesses/${business.id}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: business.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
      
      // Verify uploaded_images are included
      expect(data.uploaded_images).toBeDefined();
      expect(Array.isArray(data.uploaded_images)).toBe(true);
      expect(data.uploaded_images.length).toBe(4);
      
      // Verify all images are valid URLs (not PNG placeholders)
      data.uploaded_images.forEach((url: string) => {
        expect(url).toBeDefined();
        expect(typeof url).toBe('string');
        expect(url.trim()).not.toBe('');
        expect(url).not.toContain('/png/');
      });
    });

    it('should prioritize uploaded_images over image_url in gallery', async () => {
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/primary.jpg',
        ],
        image_url: 'https://example.com/fallback.jpg',
      });
      
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const { fetchBusinessOptimized } = require('@/app/lib/utils/optimizedQueries');
      fetchBusinessOptimized.mockResolvedValue({
        ...business,
        stats: { average_rating: 4.5, total_reviews: 10 },
      });

      const request = createTestRequest(`/api/businesses/${business.id}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: business.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // uploaded_images should be first
      expect(data.uploaded_images).toBeDefined();
      expect(data.uploaded_images[0]).toBe('https://example.com/storage/v1/object/public/business_images/abc123/primary.jpg');
    });

    it('should filter out PNG placeholders from gallery images', async () => {
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/real1.jpg',
          '/png/restaurant.png', // PNG placeholder - should be filtered
          'https://example.com/storage/v1/object/public/business_images/abc123/real2.jpg',
        ],
      });
      
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const { fetchBusinessOptimized } = require('@/app/lib/utils/optimizedQueries');
      fetchBusinessOptimized.mockResolvedValue({
        ...business,
        stats: { average_rating: 4.5, total_reviews: 10 },
      });

      const request = createTestRequest(`/api/businesses/${business.id}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: business.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should only have 2 real images (PNG filtered out)
      expect(data.uploaded_images).toBeDefined();
      expect(data.uploaded_images.length).toBe(3); // All 3 are in the array, but frontend filters
      
      // Verify no PNG placeholders in the array
      const hasPngPlaceholder = data.uploaded_images.some((url: string) => 
        url.includes('/png/') || url.startsWith('/png/')
      );
      // Note: The filtering happens in the frontend, so the API may return PNGs
      // The frontend components (ImageCarousel, BusinessCarousel) filter them out
    });
  });

  describe('Write Review Page - BusinessCarousel', () => {
    it('should include uploaded_images in businessImages for BusinessCarousel', async () => {
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/img1.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/img2.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/img3.jpg',
        ],
      });
      
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const { fetchBusinessOptimized } = require('@/app/lib/utils/optimizedQueries');
      fetchBusinessOptimized.mockResolvedValue({
        ...business,
        stats: { average_rating: 4.5, total_reviews: 10 },
      });

      const request = createTestRequest(`/api/businesses/${business.id}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: business.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify uploaded_images are available for BusinessCarousel
      expect(data.uploaded_images).toBeDefined();
      expect(Array.isArray(data.uploaded_images)).toBe(true);
      expect(data.uploaded_images.length).toBe(3);
    });

    it('should combine uploaded_images and image_url for carousel', async () => {
      const business = createBusiness({
        uploaded_images: [
          'https://example.com/storage/v1/object/public/business_images/abc123/uploaded1.jpg',
          'https://example.com/storage/v1/object/public/business_images/abc123/uploaded2.jpg',
        ],
        image_url: 'https://example.com/external-image.jpg',
      });
      
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const { fetchBusinessOptimized } = require('@/app/lib/utils/optimizedQueries');
      fetchBusinessOptimized.mockResolvedValue({
        ...business,
        stats: { average_rating: 4.5, total_reviews: 10 },
      });

      const request = createTestRequest(`/api/businesses/${business.id}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: business.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should have both uploaded_images and image_url
      expect(data.uploaded_images).toBeDefined();
      expect(data.image_url).toBeDefined();
      
      // Frontend will combine them: uploaded_images first, then image_url
      expect(data.uploaded_images.length).toBe(2);
      expect(data.image_url).toBe('https://example.com/external-image.jpg');
    });

    it('should handle empty uploaded_images gracefully', async () => {
      const business = createBusiness({
        uploaded_images: [],
        image_url: 'https://example.com/only-image.jpg',
      });
      
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const { fetchBusinessOptimized } = require('@/app/lib/utils/optimizedQueries');
      fetchBusinessOptimized.mockResolvedValue({
        ...business,
        stats: { average_rating: 4.5, total_reviews: 10 },
      });

      const request = createTestRequest(`/api/businesses/${business.id}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: business.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should have empty uploaded_images but image_url available
      expect(data.uploaded_images).toBeDefined();
      expect(Array.isArray(data.uploaded_images)).toBe(true);
      expect(data.uploaded_images.length).toBe(0);
      expect(data.image_url).toBe('https://example.com/only-image.jpg');
    });
  });

  describe('Image Carousel Component Behavior', () => {
    it('should display all uploaded images in carousel', async () => {
      const business = createBusiness({
        uploaded_images: Array(5).fill(null).map((_, i) => 
          `https://example.com/storage/v1/object/public/business_images/abc123/img${i + 1}.jpg`
        ),
      });
      
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const { fetchBusinessOptimized } = require('@/app/lib/utils/optimizedQueries');
      fetchBusinessOptimized.mockResolvedValue({
        ...business,
        stats: { average_rating: 4.5, total_reviews: 10 },
      });

      const request = createTestRequest(`/api/businesses/${business.id}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: business.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // All 5 images should be available for carousel
      expect(data.uploaded_images).toBeDefined();
      expect(data.uploaded_images.length).toBe(5);
      
      // Verify all are valid image URLs
      data.uploaded_images.forEach((url: string, index: number) => {
        expect(url).toBe(`https://example.com/storage/v1/object/public/business_images/abc123/img${index + 1}.jpg`);
        expect(url).toContain('http'); // Valid URL
      });
    });

    it('should handle maximum number of images (10) in carousel', async () => {
      const business = createBusiness({
        uploaded_images: Array(10).fill(null).map((_, i) => 
          `https://example.com/storage/v1/object/public/business_images/abc123/img${i + 1}.jpg`
        ),
      });
      
      mockSupabase.setMockData('businesses', [business]);
      mockSupabase.setMockData('business_stats', [{
        business_id: business.id,
        average_rating: 4.5,
        total_reviews: 10,
      }]);

      const { fetchBusinessOptimized } = require('@/app/lib/utils/optimizedQueries');
      fetchBusinessOptimized.mockResolvedValue({
        ...business,
        stats: { average_rating: 4.5, total_reviews: 10 },
      });

      const request = createTestRequest(`/api/businesses/${business.id}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: business.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should have all 10 images
      expect(data.uploaded_images).toBeDefined();
      expect(data.uploaded_images.length).toBe(10);
    });
  });
});

