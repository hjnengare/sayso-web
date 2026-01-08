/**
 * Onboarding Validation Utilities
 * Centralized validation logic for all onboarding steps
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SelectionLimits {
  min: number;
  max: number;
}

/**
 * Validate selection count against limits
 */
export function validateSelectionCount(
  selections: string[],
  limits: SelectionLimits,
  itemName: string = 'items'
): ValidationResult {
  const errors: string[] = [];
  
  if (!Array.isArray(selections)) {
    errors.push(`${itemName} must be an array`);
    return { valid: false, errors };
  }

  const count = selections.length;

  if (count < limits.min) {
    errors.push(`Please select at least ${limits.min} ${itemName}`);
  }

  if (count > limits.max) {
    errors.push(`Maximum ${limits.max} ${itemName} allowed`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that selections are valid IDs (non-empty strings)
 */
export function validateSelectionIds(
  selections: string[],
  itemName: string = 'items'
): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(selections)) {
    errors.push(`${itemName} must be an array`);
    return { valid: false, errors };
  }

  const invalidIds = selections.filter(
    (id) => !id || typeof id !== 'string' || id.trim().length === 0
  );

  if (invalidIds.length > 0) {
    errors.push(`Invalid ${itemName} IDs found`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that all required selections are present
 */
export function validateRequiredSelections(
  selections: string[],
  required: string[],
  itemName: string = 'items'
): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(selections)) {
    errors.push(`${itemName} must be an array`);
    return { valid: false, errors };
  }

  const missing = required.filter((req) => !selections.includes(req));

  if (missing.length > 0) {
    errors.push(`Missing required ${itemName}: ${missing.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate onboarding step prerequisites
 */
export function validateOnboardingPrerequisites(params: {
  interests?: string[];
  subcategories?: string[];
  dealbreakers?: string[];
  requiredStep: 'interests' | 'subcategories' | 'deal-breakers' | 'complete';
}): ValidationResult {
  const errors: string[] = [];

  // Interests are required for all steps after interests
  if (
    params.requiredStep !== 'interests' &&
    (!params.interests || params.interests.length === 0)
  ) {
    errors.push('Interests are required');
  }

  // Subcategories are required for deal-breakers and complete
  if (
    (params.requiredStep === 'deal-breakers' || params.requiredStep === 'complete') &&
    (!params.subcategories || params.subcategories.length === 0)
  ) {
    errors.push('Subcategories are required');
  }

  // Deal-breakers are required for complete
  if (
    params.requiredStep === 'complete' &&
    (!params.dealbreakers || params.dealbreakers.length === 0)
  ) {
    errors.push('Deal-breakers are required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate interest IDs against known interests
 */
export function validateInterestIds(
  interestIds: string[],
  validInterestIds: string[]
): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(interestIds)) {
    errors.push('Interests must be an array');
    return { valid: false, errors };
  }

  const invalidIds = interestIds.filter((id) => !validInterestIds.includes(id));

  if (invalidIds.length > 0) {
    errors.push(`Invalid interest IDs: ${invalidIds.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate subcategory IDs against known subcategories
 */
export function validateSubcategoryIds(
  subcategoryIds: string[],
  validSubcategoryIds: string[]
): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(subcategoryIds)) {
    errors.push('Subcategories must be an array');
    return { valid: false, errors };
  }

  const invalidIds = subcategoryIds.filter(
    (id) => !validSubcategoryIds.includes(id)
  );

  if (invalidIds.length > 0) {
    errors.push(`Invalid subcategory IDs: ${invalidIds.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate dealbreaker IDs against known dealbreakers
 */
export function validateDealbreakerIds(
  dealbreakerIds: string[],
  validDealbreakerIds: string[]
): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(dealbreakerIds)) {
    errors.push('Deal-breakers must be an array');
    return { valid: false, errors };
  }

  const invalidIds = dealbreakerIds.filter(
    (id) => !validDealbreakerIds.includes(id)
  );

  if (invalidIds.length > 0) {
    errors.push(`Invalid deal-breaker IDs: ${invalidIds.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

