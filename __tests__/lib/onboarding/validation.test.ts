/**
 * Unit tests for onboarding validation utilities
 */

import {
  validateSelectionCount,
  validateSelectionIds,
  validateRequiredSelections,
  validateOnboardingPrerequisites,
  validateInterestIds,
  validateSubcategoryIds,
  validateDealbreakerIds,
} from '@/app/lib/onboarding/validation';

describe('Onboarding Validation Utilities', () => {
  describe('validateSelectionCount', () => {
    it('should validate selections within limits', () => {
      const result = validateSelectionCount(['a', 'b', 'c'], { min: 2, max: 5 }, 'items');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when below minimum', () => {
      const result = validateSelectionCount(['a'], { min: 2, max: 5 }, 'items');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Please select at least 2 items');
    });

    it('should fail when above maximum', () => {
      const result = validateSelectionCount(['a', 'b', 'c', 'd', 'e', 'f'], { min: 2, max: 5 }, 'items');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum 5 items allowed');
    });

    it('should fail when not an array', () => {
      const result = validateSelectionCount(null as any, { min: 2, max: 5 }, 'items');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('items must be an array');
    });

    it('should handle empty array', () => {
      const result = validateSelectionCount([], { min: 0, max: 5 }, 'items');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSelectionIds', () => {
    it('should validate valid IDs', () => {
      const result = validateSelectionIds(['id1', 'id2', 'id3'], 'items');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with invalid IDs', () => {
      const result = validateSelectionIds(['id1', '', 'id3', null as any], 'items');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail when not an array', () => {
      const result = validateSelectionIds(null as any, 'items');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('items must be an array');
    });

    it('should handle empty array', () => {
      const result = validateSelectionIds([], 'items');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateRequiredSelections', () => {
    it('should validate when all required are present', () => {
      const result = validateRequiredSelections(['a', 'b', 'c'], ['a', 'b'], 'items');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when required selections are missing', () => {
      const result = validateRequiredSelections(['a'], ['a', 'b', 'c'], 'items');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Missing required items');
    });

    it('should fail when not an array', () => {
      const result = validateRequiredSelections(null as any, ['a'], 'items');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('items must be an array');
    });
  });

  describe('validateOnboardingPrerequisites', () => {
    it('should validate complete prerequisites for complete step', () => {
      const result = validateOnboardingPrerequisites({
        interests: ['food-drink'],
        subcategories: ['restaurants'],
        dealbreakers: ['trustworthiness'],
        requiredStep: 'complete',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when interests missing for subcategories step', () => {
      const result = validateOnboardingPrerequisites({
        interests: [],
        subcategories: ['restaurants'],
        dealbreakers: [],
        requiredStep: 'subcategories',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Interests are required');
    });

    it('should fail when subcategories missing for deal-breakers step', () => {
      const result = validateOnboardingPrerequisites({
        interests: ['food-drink'],
        subcategories: [],
        dealbreakers: [],
        requiredStep: 'deal-breakers',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subcategories are required');
    });

    it('should fail when dealbreakers missing for complete step', () => {
      const result = validateOnboardingPrerequisites({
        interests: ['food-drink'],
        subcategories: ['restaurants'],
        dealbreakers: [],
        requiredStep: 'complete',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deal-breakers are required');
    });

    it('should pass for interests step (no prerequisites)', () => {
      const result = validateOnboardingPrerequisites({
        interests: [],
        subcategories: [],
        dealbreakers: [],
        requiredStep: 'interests',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateInterestIds', () => {
    const validIds = ['food-drink', 'beauty-wellness', 'professional-services'];

    it('should validate valid interest IDs', () => {
      const result = validateInterestIds(['food-drink', 'beauty-wellness'], validIds);
      expect(result.valid).toBe(true);
    });

    it('should fail with invalid interest IDs', () => {
      const result = validateInterestIds(['food-drink', 'invalid-id'], validIds);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid interest IDs');
    });

    it('should fail when not an array', () => {
      const result = validateInterestIds(null as any, validIds);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Interests must be an array');
    });
  });

  describe('validateSubcategoryIds', () => {
    const validIds = ['restaurants', 'cafes', 'bars'];

    it('should validate valid subcategory IDs', () => {
      const result = validateSubcategoryIds(['restaurants', 'cafes'], validIds);
      expect(result.valid).toBe(true);
    });

    it('should fail with invalid subcategory IDs', () => {
      const result = validateSubcategoryIds(['restaurants', 'invalid-id'], validIds);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid subcategory IDs');
    });

    it('should fail when not an array', () => {
      const result = validateSubcategoryIds(null as any, validIds);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subcategories must be an array');
    });
  });

  describe('validateDealbreakerIds', () => {
    const validIds = ['trustworthiness', 'punctuality', 'friendliness'];

    it('should validate valid dealbreaker IDs', () => {
      const result = validateDealbreakerIds(['trustworthiness', 'punctuality'], validIds);
      expect(result.valid).toBe(true);
    });

    it('should fail with invalid dealbreaker IDs', () => {
      const result = validateDealbreakerIds(['trustworthiness', 'invalid-id'], validIds);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid deal-breaker IDs');
    });

    it('should fail when not an array', () => {
      const result = validateDealbreakerIds(null as any, validIds);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deal-breakers must be an array');
    });
  });
});

