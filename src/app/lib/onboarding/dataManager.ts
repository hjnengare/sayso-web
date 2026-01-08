/**
 * Onboarding Data Manager
 * Simplified - DB is the single source of truth
 */

export interface OnboardingData {
  interests: string[];
  subcategories: string[];
  dealbreakers: string[];
}

/**
 * Load data from database
 */
export async function loadFromDatabase(): Promise<Partial<OnboardingData>> {
  try {
    const response = await fetch('/api/user/onboarding');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      interests: data.interests || [],
      subcategories: data.subcategories?.map((s: { subcategory_id: string }) => s.subcategory_id) || [],
      dealbreakers: data.dealbreakers || [],
    };
  } catch (error) {
    console.error('[Data Manager] Error loading from database:', error);
    return {};
  }
}
