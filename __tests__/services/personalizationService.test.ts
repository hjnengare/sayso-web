/**
 * Unit tests for personalization service
 */

// Jest globals: describe, it, expect, beforeEach are available globally
import {
  calculatePersonalizationScore,
  filterByDealbreakers,
  sortByPersonalization,
  type BusinessForScoring,
  type UserPreferences,
} from '@/app/lib/services/personalizationService';
import { createBusiness } from '@test-utils/factories/businessFactory';

describe('PersonalizationService', () => {
  describe('calculatePersonalizationScore', () => {
    it('should calculate interest match score correctly', () => {
      const business = createBusiness({
        interest_id: 'food-drink',
      });

      const preferences: UserPreferences = {
        interestIds: ['food-drink'],
        subcategoryIds: [],
        dealbreakerIds: [],
      };

      const score = calculatePersonalizationScore(business, preferences);

      expect(score.breakdown.interestMatch).toBe(15);
      expect(score.totalScore).toBeGreaterThan(0);
    });

    it('should calculate subcategory match score correctly', () => {
      const business = createBusiness({
        interest_id: 'food-drink',
        sub_interest_id: 'sushi',
      });

      const preferences: UserPreferences = {
        interestIds: ['food-drink'],
        subcategoryIds: ['sushi'],
        dealbreakerIds: [],
      };

      const score = calculatePersonalizationScore(business, preferences);

      expect(score.breakdown.subcategoryMatch).toBe(25);
      expect(score.totalScore).toBeGreaterThan(15); // Should be higher than interest match alone
    });

    it('should apply deal breaker penalty correctly', () => {
      const business = createBusiness({
        verified: false, // Violates trustworthiness deal breaker
      });

      const preferences: UserPreferences = {
        interestIds: [],
        subcategoryIds: [],
        dealbreakerIds: ['trustworthiness'],
      };

      const score = calculatePersonalizationScore(business, preferences);

      expect(score.breakdown.dealbreakerPenalty).toBeLessThan(0);
      expect(score.breakdown.dealbreakerPenalty).toBe(-50);
    });

    it('should calculate distance score correctly', () => {
      const business = createBusiness({
        distance_km: 2.5,
      });

      const preferences: UserPreferences = {
        interestIds: [],
        subcategoryIds: [],
        dealbreakerIds: [],
        latitude: -33.9249,
        longitude: 18.4241,
      };

      const score = calculatePersonalizationScore(business, preferences);

      expect(score.breakdown.distanceScore).toBe(8); // 1-5km range
    });

    it('should calculate rating score correctly', () => {
      const business = createBusiness({
        average_rating: 4.5,
        total_reviews: 20,
        verified: true,
      });

      const preferences: UserPreferences = {
        interestIds: [],
        subcategoryIds: [],
        dealbreakerIds: [],
      };

      const score = calculatePersonalizationScore(business, preferences);

      expect(score.breakdown.ratingScore).toBeGreaterThan(0);
      // Rating score = (4.5 * 3) + log(21) * 0.5 + 2 (verified)
      // Actual calculation: 13.5 + 1.522 + 2 = 17.022
      expect(score.breakdown.ratingScore).toBeGreaterThan(15);
    });

    it('should calculate freshness score correctly', () => {
      const business = createBusiness({
        total_reviews: 15,
        updated_at: new Date().toISOString(), // Very recent
      });

      const preferences: UserPreferences = {
        interestIds: [],
        subcategoryIds: [],
        dealbreakerIds: [],
      };

      const score = calculatePersonalizationScore(business, preferences);

      expect(score.breakdown.freshnessScore).toBeGreaterThan(0);
      // Freshness score should be positive for businesses with reviews and recent updates
    });

    it('should generate insights for matching business', () => {
      const business = createBusiness({
        interest_id: 'food-drink',
        sub_interest_id: 'sushi',
        average_rating: 4.8,
      });

      const preferences: UserPreferences = {
        interestIds: ['food-drink'],
        subcategoryIds: ['sushi'],
        dealbreakerIds: [],
      };

      const score = calculatePersonalizationScore(business, preferences);

      expect(score.insights.length).toBeGreaterThan(0);
      expect(score.insights.some(i => i.includes('interest'))).toBe(true);
    });

    it('should handle missing user preferences gracefully', () => {
      const business = createBusiness();

      const preferences: UserPreferences = {
        interestIds: [],
        subcategoryIds: [],
        dealbreakerIds: [],
      };

      const score = calculatePersonalizationScore(business, preferences);

      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.breakdown.interestMatch).toBe(0);
      expect(score.breakdown.subcategoryMatch).toBe(0);
    });
  });

  describe('filterByDealbreakers', () => {
    it('should filter out businesses that violate deal breakers', () => {
      const businesses = [
        createBusiness({ verified: true }),
        createBusiness({ verified: false }), // Violates trustworthiness
        createBusiness({ verified: true }),
      ];

      const filtered = filterByDealbreakers(businesses, ['trustworthiness']);

      expect(filtered.length).toBe(2);
      expect(filtered.every(b => b.verified !== false)).toBe(true);
    });

    it('should filter by price range deal breaker', () => {
      const businesses = [
        createBusiness({ price_range: '$' }),
        createBusiness({ price_range: '$$$$' }), // Violates expensive deal breaker
        createBusiness({ price_range: '$$' }),
      ];

      const filtered = filterByDealbreakers(businesses, ['expensive']);

      expect(filtered.length).toBe(2);
      expect(filtered.every(b => b.price_range !== '$$$$' && b.price_range !== '$$$')).toBe(true);
    });

    it('should return all businesses when no deal breakers specified', () => {
      const businesses = [
        createBusiness(),
        createBusiness(),
        createBusiness(),
      ];

      const filtered = filterByDealbreakers(businesses, []);

      expect(filtered.length).toBe(3);
    });
  });

  describe('sortByPersonalization', () => {
    it('should sort businesses by personalization score (highest first)', () => {
      const businesses = [
        createBusiness({
          interest_id: 'food-drink',
          average_rating: 3.5,
        }),
        createBusiness({
          interest_id: 'food-drink',
          average_rating: 4.8,
        }),
        createBusiness({
          interest_id: 'arts-culture', // Different interest
          average_rating: 4.5,
        }),
      ];

      const preferences: UserPreferences = {
        interestIds: ['food-drink'],
        subcategoryIds: [],
        dealbreakerIds: [],
      };

      const sorted = sortByPersonalization(businesses, preferences);

      // Highest scoring should be first
      expect(sorted[0].interest_id).toBe('food-drink');
      expect(sorted[0].average_rating).toBe(4.8);
    });

    it('should handle empty businesses array', () => {
      const sorted = sortByPersonalization([], {
        interestIds: [],
        subcategoryIds: [],
        dealbreakerIds: [],
      });

      expect(sorted).toEqual([]);
    });
  });
});

