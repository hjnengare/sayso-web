/**
 * Unit tests for SubcategoriesPage
 * 
 * Prerequisite Rule: no interests = no subcategories = no deal-breakers = no complete
 * 
 * This page requires:
 * - Interests must be selected (passed via URL params)
 * 
 * Guards enforce this prerequisite, but tests verify the page handles it correctly.
 * 
 * Tests validation, selection limits, loading states, and URL parameter handling
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SubcategoriesPage from '@/app/subcategories/page';
import { useOnboarding } from '@/app/contexts/OnboardingContext';
import { useToast } from '@/app/contexts/ToastContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { createUser } from '@test-utils/factories/userFactory';

// Mock all dependencies
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockBack = jest.fn();
const mockGet = jest.fn();

jest.mock('@/app/contexts/OnboardingContext');
jest.mock('@/app/contexts/ToastContext');
jest.mock('@/app/contexts/AuthContext');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useParams: () => ({}),
  useSearchParams: () => ({
    get: mockGet,
    getAll: jest.fn(() => []),
    has: jest.fn(() => false),
    toString: jest.fn(() => ''),
  }),
  usePathname: () => '/',
}));
jest.mock('@/app/components/ProtectedRoute/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/app/components/Onboarding/OnboardingLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="onboarding-layout">{children}</div>
  ),
}));
jest.mock('@/app/components/Subcategories/SubcategoryStyles', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/app/components/Subcategories/SubcategoryHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="subcategory-header">Select Subcategories</div>,
}));
jest.mock('@/app/components/Subcategories/SubcategorySelection', () => ({
  __esModule: true,
  default: ({ children, selectedCount, maxSelections }: any) => (
    <div data-testid="subcategory-selection">
      Selected: {selectedCount} / Max: {maxSelections}
      {children}
    </div>
  ),
}));
jest.mock('@/app/components/Subcategories/SubcategoryGrid', () => ({
  __esModule: true,
  default: ({ groupedSubcategories, selectedSubcategories, onToggle, subcategories }: any) => {
    // Helper to check if a subcategory is selected (handles both ID strings and objects with id property)
    const isSelected = (subId: string) => {
      if (!selectedSubcategories || selectedSubcategories.length === 0) return false;
      return selectedSubcategories.some((s: any) => {
        if (typeof s === 'string') return s === subId;
        return s?.id === subId;
      });
    };

    // Handle both grouped and flat subcategories
    const hasGrouped = groupedSubcategories && Object.keys(groupedSubcategories).length > 0;
    
    return (
      <div data-testid="subcategory-grid">
        {hasGrouped ? (
          Object.entries(groupedSubcategories).map(([interestId, group]: [string, any]) => (
            <div key={interestId} data-interest-group={interestId}>
              <h3>{group.title}</h3>
              {group.items.map((sub: any) => (
                <button
                  key={sub.id}
                  data-subcategory-id={sub.id}
                  data-selected={isSelected(sub.id)}
                  onClick={() => onToggle(sub.id, sub.interest_id)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          ))
        ) : (
          // Fallback to flat subcategories array if grouped is not available
          (subcategories || []).map((sub: any) => (
            <button
              key={sub.id}
              data-subcategory-id={sub.id}
              data-selected={isSelected(sub.id)}
              onClick={() => onToggle(sub.id, sub.interest_id)}
            >
              {sub.label}
            </button>
          ))
        )}
      </div>
    );
  },
}));
jest.mock('@/app/components/Subcategories/SubcategoryActions', () => ({
  __esModule: true,
  default: ({ canProceed, onContinue }: any) => (
    <button
      data-testid="continue-button"
      disabled={!canProceed}
      onClick={onContinue}
    >
      Continue
    </button>
  ),
}));
jest.mock('@/app/components/Subcategories/SubcategoryGridSkeleton', () => ({
  __esModule: true,
  default: () => <div data-testid="subcategory-grid-skeleton">Loading subcategories...</div>,
}));
jest.mock('@/app/components/Loader', () => ({
  Loader: ({ size, variant, color }: any) => (
    <div data-testid="loader">Loading...</div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe('SubcategoriesPage', () => {
  // Create user and manually add profile since createUser doesn't handle profile
  const baseUser = createUser({
    email_verified: true,
  });
  const mockUser = {
    ...baseUser,
    email_confirmed_at: baseUser.verified ? new Date().toISOString() : null,
    profile: {
      onboarding_step: 'subcategories',
      onboarding_complete: false,
      interests_count: 2, // User has interests
      subcategories_count: 0, // No subcategories yet
    },
  };

  const mockSearchParams = new URLSearchParams();
  const mockShowToast = jest.fn();

  const mockSetSelectedSubInterests = jest.fn();

  const defaultOnboardingContext = {
    selectedSubInterests: [],
    setSelectedSubInterests: mockSetSelectedSubInterests,
    isLoading: false,
    error: null,
    interests: [],
    subInterests: [],
    selectedInterests: [],
    selectedDealbreakers: [],
    setSelectedInterests: jest.fn(),
    setSelectedDealbreakers: jest.fn(),
    loadInterests: jest.fn(),
    loadSubInterests: jest.fn(),
    nextStep: jest.fn(),
    completeOnboarding: jest.fn(),
    resetOnboarding: jest.fn(),
    currentStep: 'subcategories',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('interests');
    mockPush.mockClear();
    mockReplace.mockClear();
    mockGet.mockClear();
    mockGet.mockImplementation((key: string) => mockSearchParams.get(key));

    // Mocks are already set up via jest.mock above
    // Ensure mockUser has profile with interests_count > 0 to prevent redirect
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          interests_count: mockUser.profile?.interests_count || 2,
          subcategories_count: mockUser.profile?.subcategories_count || 0,
        },
      },
      isLoading: false,
      refreshUser: jest.fn(),
    });
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: jest.fn(),
    });
    (useOnboarding as jest.Mock).mockReturnValue(defaultOnboardingContext);
    (global.fetch as jest.Mock).mockClear();
    
    // Reset mockGet implementation
    mockGet.mockImplementation((key: string) => mockSearchParams.get(key));
  });

  describe('Rendering', () => {
    it('should render the subcategories page with all components', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
        { id: 'italian', label: 'Italian', interest_id: 'food-drink' },
        { id: 'spa', label: 'Spa', interest_id: 'beauty-wellness' },
      ];

      // Mock fetch: first call to get interests, second call to get subcategories
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink', 'beauty-wellness'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      render(<SubcategoriesPage />);

      // Should show skeleton initially
      expect(screen.getByTestId('subcategory-grid-skeleton')).toBeInTheDocument();

      // Wait for data to load and header to appear
      const header = await screen.findByTestId('subcategory-header');
      expect(header).toBeInTheDocument();

      // Wait for subcategories to load (skeleton should be replaced by grid)
      await waitFor(() => {
        expect(screen.queryByTestId('subcategory-grid-skeleton')).not.toBeInTheDocument();
      });

      // Now assert other components are present
      expect(screen.getByTestId('subcategory-selection')).toBeInTheDocument();
      expect(screen.getByTestId('subcategory-grid')).toBeInTheDocument();
      expect(screen.getByTestId('continue-button')).toBeInTheDocument();
    });

    it('should display selection count correctly', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedSubInterests: ['sushi'],
      });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Selected: 1 \/ Max: 10/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state when fetching subcategories', () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<SubcategoriesPage />);

      expect(screen.getByTestId('subcategory-grid-skeleton')).toBeInTheDocument();
    });

    it('should hide loading state after subcategories are loaded', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      render(<SubcategoriesPage />);

      // Should show skeleton initially
      expect(screen.getByTestId('subcategory-grid-skeleton')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('subcategory-grid-skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('should fetch interests from API then load subcategories', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
        { id: 'spa', label: 'Spa', interest_id: 'beauty-wellness' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink', 'beauty-wellness'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/onboarding');
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/subcategories?interests=food-drink,beauty-wellness'
        );
      });
    });

    // Note: Missing interests handling is enforced by OnboardingGuard
    // Page has defensive redirect if no interests found
    it('should redirect to interests if no interests found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ interests: [] }), // No interests
      });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/interests');
      }, { timeout: 3000 });
    });
  });

  describe('Subcategory Selection', () => {
    // Prerequisite rule: requires interests
    it('should allow selecting subcategories up to maximum (10)', async () => {
      const mockSubcategories = Array.from({ length: 12 }, (_, i) => ({
        id: `sub-${i}`,
        label: `Subcategory ${i}`,
        interest_id: 'food-drink',
      }));

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      render(<SubcategoriesPage />);

      // Wait for subcategories to load and render
      await waitFor(() => {
        expect(screen.getByTestId('subcategory-grid')).toBeInTheDocument();
      });

      // Wait for buttons to appear
      const subcategoryButtons = await screen.findAllByRole('button', {
        name: /Subcategory/,
      });

      expect(subcategoryButtons.length).toBeGreaterThanOrEqual(10);

      // Select 10 subcategories (should be allowed)
      for (let i = 0; i < 10; i++) {
        fireEvent.click(subcategoryButtons[i]);
      }

      expect(mockSetSelectedSubInterests).toHaveBeenCalled();
    });

    it('should prevent selecting more than 10 subcategories', async () => {
      const mockSubcategories = Array.from({ length: 12 }, (_, i) => ({
        id: `sub-${i}`,
        label: `Subcategory ${i}`,
        interest_id: 'food-drink',
      }));

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedSubInterests: Array.from({ length: 10 }, (_, i) => `sub-${i}`),
      });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('subcategory-grid')).toBeInTheDocument();
      });

      const subcategoryButtons = screen.getAllByRole('button', {
        name: /Subcategory/,
      });

      // Try to select an 11th subcategory
      fireEvent.click(subcategoryButtons[10]);

      expect(mockShowToast).toHaveBeenCalledWith(
        'Maximum 10 subcategories allowed',
        'warning',
        2000
      );
    });

    it('should allow deselecting subcategories', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
        { id: 'italian', label: 'Italian', interest_id: 'food-drink' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedSubInterests: ['sushi'],
      });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('subcategory-grid')).toBeInTheDocument();
      });

      const sushiButton = screen.getByRole('button', { name: 'Sushi' });
      fireEvent.click(sushiButton);

      expect(mockSetSelectedSubInterests).toHaveBeenCalled();
    });
  });

  describe('Continue Button', () => {
    it('should be disabled when no subcategories selected', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        const continueButton = screen.getByTestId('continue-button');
        expect(continueButton).toBeDisabled();
      });
    });

    it('should be enabled when at least 1 subcategory selected', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedSubInterests: ['sushi'],
      });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        const continueButton = screen.getByTestId('continue-button');
        expect(continueButton).not.toBeDisabled();
      });
    });

    it('should navigate to deal-breakers when continue is clicked', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
      ];

      // Create user with interests_count > 0 BEFORE setting up mocks
      const baseUser = createUser({ email_verified: true });
      const userWithInterests = {
        ...baseUser,
        email_confirmed_at: baseUser.verified ? new Date().toISOString() : null,
        profile: {
          onboarding_step: 'subcategories',
          onboarding_complete: false,
          interests_count: 2, // Has interests - prevents redirect to /interests
          subcategories_count: 0, // No subcategories yet - allows access to page
        },
      };

      // Set up mocks BEFORE render to prevent redirect
      (useAuth as jest.Mock).mockReturnValue({
        user: userWithInterests,
        isLoading: false,
        refreshUser: jest.fn(),
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink', 'beauty-wellness'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            ok: true,
            subcategoriesCount: 1,
          }),
        });

      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedSubInterests: ['sushi'],
      });

      render(<SubcategoriesPage />);

      // Wait for subcategories to load (skip skeleton)
      await waitFor(() => {
        expect(screen.getByTestId('subcategory-grid')).toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        const continueButton = screen.getByTestId('continue-button');
        expect(continueButton).not.toBeDisabled();
      });

      const continueButton = screen.getByTestId('continue-button');
      fireEvent.click(continueButton);

      // Wait for the API call to complete and navigation
      await waitFor(() => {
        // Verify API was called
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/onboarding/subcategories',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
        
        // Check all replace calls to see if deal-breakers was called
        // Note: The page may call replace multiple times, so we check if any call is to deal-breakers
        const replaceCalls = mockReplace.mock.calls.map((call: any[]) => call[0]);
        const hasDealBreakersCall = replaceCalls.includes('/deal-breakers');
        
        if (!hasDealBreakersCall) {
          // If not found, check what calls were made for debugging
          console.log('Replace calls made:', replaceCalls);
        }
        
        expect(hasDealBreakersCall).toBe(true);
      }, { timeout: 5000 });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<SubcategoriesPage />);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Failed to load subcategories',
          'error'
        );
      });
    });

    it('should display error from onboarding context', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        error: 'Failed to load sub-interests',
      });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load sub-interests')).toBeInTheDocument();
      });
    });
  });

  describe('Grouped Display', () => {
    it('should group subcategories by interest', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
        { id: 'italian', label: 'Italian', interest_id: 'food-drink' },
        { id: 'spa', label: 'Spa', interest_id: 'beauty-wellness' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ interests: ['food-drink', 'beauty-wellness'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subcategories: mockSubcategories }),
        });

      render(<SubcategoriesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('subcategory-grid')).toBeInTheDocument();
      });

      // Should have groups for each interest
      expect(screen.getByText('Food & Drink')).toBeInTheDocument();
      expect(screen.getByText('Beauty & Wellness')).toBeInTheDocument();
    });
  });
});

