/**
 * Unit tests for onboarding data manager utilities
 * Tests simplified DB-only architecture
 */

import { loadFromDatabase, OnboardingData } from '@/app/lib/onboarding/dataManager';

// Mock fetch
global.fetch = jest.fn();

describe('Onboarding Data Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadFromDatabase', () => {
    it('should load data from /api/user/onboarding', async () => {
      const mockData = {
        interests: ['food-drink', 'beauty-wellness'],
        subcategories: [
          { subcategory_id: 'restaurants', interest_id: 'food-drink' },
          { subcategory_id: 'cafes', interest_id: 'food-drink' },
        ],
        dealbreakers: ['trustworthiness', 'punctuality'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await loadFromDatabase();

      expect(global.fetch).toHaveBeenCalledWith('/api/user/onboarding');
      expect(result.interests).toEqual(['food-drink', 'beauty-wellness']);
      expect(result.subcategories).toEqual(['restaurants', 'cafes']);
      expect(result.dealbreakers).toEqual(['trustworthiness', 'punctuality']);
    });

    it('should return empty arrays if API returns empty data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await loadFromDatabase();

      expect(result.interests).toEqual([]);
      expect(result.subcategories).toEqual([]);
      expect(result.dealbreakers).toEqual([]);
    });

    it('should handle missing subcategories array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          interests: ['food-drink'],
          dealbreakers: ['trustworthiness'],
        }),
      });

      const result = await loadFromDatabase();

      expect(result.interests).toEqual(['food-drink']);
      expect(result.subcategories).toEqual([]);
      expect(result.dealbreakers).toEqual(['trustworthiness']);
    });

    it('should map subcategories to IDs correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          interests: ['food-drink'],
          subcategories: [
            { subcategory_id: 'restaurants', interest_id: 'food-drink' },
            { subcategory_id: 'cafes', interest_id: 'food-drink' },
          ],
          dealbreakers: [],
        }),
      });

      const result = await loadFromDatabase();

      expect(result.subcategories).toEqual(['restaurants', 'cafes']);
    });

    it('should return empty object on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await loadFromDatabase();

      expect(result).toEqual({});
    });

    it('should return empty object on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await loadFromDatabase();

      expect(result).toEqual({});
    });

    it('should handle null/undefined values gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          interests: null,
          subcategories: null,
          dealbreakers: undefined,
        }),
      });

      const result = await loadFromDatabase();

      expect(result.interests).toEqual([]);
      expect(result.subcategories).toEqual([]);
      expect(result.dealbreakers).toEqual([]);
    });
  });
});

