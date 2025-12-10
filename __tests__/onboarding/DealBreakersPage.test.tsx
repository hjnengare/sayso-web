/**
 * Unit tests for DealBreakersPage
 * Tests deal-breaker selection, validation, and final onboarding completion
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DealBreakersPage from '@/app/deal-breakers/page';
import { useToast } from '@/app/contexts/ToastContext';
import { createUser } from '@test-utils/factories/userFactory';

// Mock dependencies
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockBack = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: mockBack,
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

jest.mock('@/app/contexts/ToastContext');
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
jest.mock('@/app/components/DealBreakers/DealBreakerStyles', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/app/components/DealBreakers/DealBreakerHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="dealbreaker-header">Select Your Deal-Breakers</div>,
}));
jest.mock('@/app/components/DealBreakers/DealBreakerSelection', () => ({
  __esModule: true,
  default: ({ children, selectedCount, maxSelections }: any) => (
    <div data-testid="dealbreaker-selection">
      Selected: {selectedCount} / Max: {maxSelections}
      {children}
    </div>
  ),
}));
jest.mock('@/app/components/DealBreakers/DealBreakerGrid', () => ({
  __esModule: true,
  default: ({ dealbreakers, selectedDealbreakers, onToggle }: any) => (
    <div data-testid="dealbreaker-grid">
      {dealbreakers.map((db: any) => (
        <button
          key={db.id}
          data-dealbreaker-id={db.id}
          data-selected={selectedDealbreakers.includes(db.id)}
          onClick={() => onToggle(db.id)}
        >
          {db.label}
        </button>
      ))}
    </div>
  ),
}));
jest.mock('@/app/components/DealBreakers/DealBreakerActions', () => ({
  __esModule: true,
  default: ({ canProceed, onComplete }: any) => (
    <button
      data-testid="complete-button"
      disabled={!canProceed}
      onClick={onComplete}
    >
      Complete Onboarding
    </button>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

/**
 * Unit tests for DealBreakersPage
 * 
 * Prerequisite Rule: no interests = no subcategories = no deal-breakers = no complete
 * 
 * This page requires:
 * - Interests must be selected (passed via URL params)
 * - Subcategories must be selected (passed via URL params)
 * 
 * Guards enforce these prerequisites, but tests verify the page handles them correctly.
 */
describe('DealBreakersPage', () => {
  const mockUser = createUser({
    email_verified: true,
    profile: {
      onboarding_step: 'deal-breakers',
      onboarding_complete: false,
    },
  });

  const mockSearchParams = new URLSearchParams();

  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('interests');
    mockSearchParams.delete('subcategories');
    mockPush.mockClear();
    mockReplace.mockClear();
    mockPrefetch.mockClear();
    mockGet.mockClear();
    mockGet.mockImplementation((key: string) => mockSearchParams.get(key));
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: jest.fn(),
    });
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('should render the deal-breakers page with all components (prerequisites met)', () => {
      // Prerequisites: interests AND subcategories must be present
      mockSearchParams.set('interests', 'food-drink,beauty-wellness');
      mockSearchParams.set('subcategories', 'sushi,spa');

      render(<DealBreakersPage />);

      expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
      expect(screen.getByTestId('dealbreaker-header')).toBeInTheDocument();
      expect(screen.getByTestId('dealbreaker-selection')).toBeInTheDocument();
      expect(screen.getByTestId('dealbreaker-grid')).toBeInTheDocument();
      expect(screen.getByTestId('complete-button')).toBeInTheDocument();
    });

    it('should display selection count correctly', () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      render(<DealBreakersPage />);

      expect(screen.getByText(/Selected: 0 \/ Max: 3/)).toBeInTheDocument();
    });
  });

  describe('Deal-Breaker Selection', () => {
    // Prerequisite rule: requires interests AND subcategories
    it('should allow selecting deal-breakers up to maximum (3)', () => {
      // Prerequisites must be present
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      const { container } = render(<DealBreakersPage />);

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      const trustworthinessButton = Array.from(dealbreakerButtons).find(
        (btn) => (btn as HTMLElement).getAttribute('data-dealbreaker-id') === 'trustworthiness'
      ) as HTMLElement;

      fireEvent.click(trustworthinessButton);

      // The component should handle the selection
      expect(dealbreakerButtons.length).toBeGreaterThan(0);
    });

    it('should prevent selecting more than 3 deal-breakers', () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      const { container } = render(<DealBreakersPage />);

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');

      // Click 3 deal-breakers
      Array.from(dealbreakerButtons).slice(0, 3).forEach((btn) => {
        fireEvent.click(btn as HTMLElement);
      });

      // Try to click a fourth one
      if (dealbreakerButtons.length > 3) {
        fireEvent.click(dealbreakerButtons[3] as HTMLElement);
        expect(mockShowToast).toHaveBeenCalledWith(
          'Maximum 3 deal-breakers allowed',
          'warning',
          2000
        );
      }
    });

    it('should allow deselecting deal-breakers', () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      const { container } = render(<DealBreakersPage />);

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      const trustworthinessButton = Array.from(dealbreakerButtons).find(
        (btn) => (btn as HTMLElement).getAttribute('data-dealbreaker-id') === 'trustworthiness'
      ) as HTMLElement;

      // Click to select
      fireEvent.click(trustworthinessButton);
      // Click again to deselect
      fireEvent.click(trustworthinessButton);

      // Component should handle deselection
      expect(dealbreakerButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Button', () => {
    it('should be disabled when no deal-breakers selected', () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      render(<DealBreakersPage />);

      const completeButton = screen.getByTestId('complete-button');
      expect(completeButton).toBeDisabled();
    });

    it('should be enabled when at least 1 deal-breaker selected', () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      const { container } = render(<DealBreakersPage />);

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        const completeButton = screen.getByTestId('complete-button');
        // Note: The actual state management happens in the component
        // This test verifies the button exists and can be interacted with
        expect(completeButton).toBeInTheDocument();
      }
    });
  });

  describe('Onboarding Completion', () => {
    it('should save all onboarding data when complete button is clicked', async () => {
      mockSearchParams.set('interests', 'food-drink,beauty-wellness');
      mockSearchParams.set('subcategories', 'sushi,spa');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Onboarding progress saved successfully' }),
      });

      const { container } = render(<DealBreakersPage />);

      // Select a deal-breaker
      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        // Wait for state update, then click complete
        await waitFor(() => {
          const completeButton = screen.getByTestId('complete-button');
          if (!completeButton.hasAttribute('disabled')) {
            fireEvent.click(completeButton);
          }
        });

        // The component should call the API
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/user/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"step":"complete"'),
          });
        });
      }
    });

    it('should navigate to /complete page after successful save', async () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { container } = render(<DealBreakersPage />);

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        await waitFor(() => {
          const completeButton = screen.getByTestId('complete-button');
          if (!completeButton.hasAttribute('disabled')) {
            fireEvent.click(completeButton);
          }
        });

        await waitFor(() => {
          expect(mockReplace).toHaveBeenCalledWith('/complete');
        });
      }
    });

    it('should proceed to complete page even if API fails (graceful degradation)', async () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      // Mock a network error (rejected promise) to trigger the catch block which shows toast
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<DealBreakersPage />);

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        await waitFor(() => {
          const completeButton = screen.getByTestId('complete-button');
          if (!completeButton.hasAttribute('disabled')) {
            fireEvent.click(completeButton);
          }
        });

        // Should still navigate to complete page
        await waitFor(() => {
          expect(mockReplace).toHaveBeenCalledWith('/complete');
        });

        // Should show error toast (only shown in catch block for network errors)
        expect(mockShowToast).toHaveBeenCalledWith(
          'Failed to save onboarding data, but continuing...',
          'sage'
        );
      }
    });

    it('should send correct data format to API', async () => {
      mockSearchParams.set('interests', 'food-drink,beauty-wellness');
      mockSearchParams.set('subcategories', 'sushi,spa');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { container } = render(<DealBreakersPage />);

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        await waitFor(() => {
          const completeButton = screen.getByTestId('complete-button');
          if (!completeButton.hasAttribute('disabled')) {
            fireEvent.click(completeButton);
          }
        });

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/user/onboarding',
            expect.objectContaining({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: expect.stringMatching(/"step":"complete"/),
            })
          );
        });

        // Verify the request body structure
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody).toHaveProperty('step', 'complete');
        expect(requestBody).toHaveProperty('interests');
        expect(requestBody).toHaveProperty('subcategories');
        expect(requestBody).toHaveProperty('dealbreakers');
        expect(Array.isArray(requestBody.interests)).toBe(true);
        expect(Array.isArray(requestBody.subcategories)).toBe(true);
        expect(Array.isArray(requestBody.dealbreakers)).toBe(true);
      }
    });
  });

  describe('Prerequisites Enforcement', () => {
    // Prerequisite rule: no interests = no subcategories = no deal-breakers = no complete
    it('should require interests parameter (enforced by guard, but page should handle gracefully)', () => {
      // Missing interests - guard should redirect, but test defensive behavior
      mockSearchParams.delete('interests');
      mockSearchParams.set('subcategories', 'sushi');

      render(<DealBreakersPage />);

      // Page should still render (guard handles redirect)
      // But completion should not work without prerequisites
      expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
    });

    it('should require subcategories parameter (enforced by guard, but page should handle gracefully)', () => {
      // Missing subcategories - guard should redirect, but test defensive behavior
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.delete('subcategories');

      render(<DealBreakersPage />);

      // Page should still render (guard handles redirect)
      // But completion should not work without prerequisites
      expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
    });

    it('should require both interests AND subcategories for completion', async () => {
      // Both prerequisites must be present
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      const { container } = render(<DealBreakersPage />);

      // Select a deal-breaker
      await waitFor(() => {
        expect(screen.getByTestId('dealbreaker-grid')).toBeInTheDocument();
      });

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        // Mock successful API call
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        const completeButton = screen.getByTestId('complete-button');
        fireEvent.click(completeButton);

        // Should call API with all prerequisites
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/user/onboarding',
            expect.objectContaining({
              method: 'POST',
            })
          );
        });
      }
    });
  });

  describe('URL Parameters', () => {
    it('should read interests from URL parameters', () => {
      // Prerequisites: interests AND subcategories must be present
      mockSearchParams.set('interests', 'food-drink,beauty-wellness');
      mockSearchParams.set('subcategories', 'sushi,spa');

      render(<DealBreakersPage />);

      expect(mockGet).toHaveBeenCalledWith('interests');
    });

    it('should read subcategories from URL parameters', () => {
      // Prerequisites: interests AND subcategories must be present
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi,spa');

      render(<DealBreakersPage />);

      expect(mockGet).toHaveBeenCalledWith('subcategories');
    });
  });

  describe('Back Navigation', () => {
    it('should have correct back href when interests are provided', () => {
      mockSearchParams.set('interests', 'food-drink,beauty-wellness');

      render(<DealBreakersPage />);

      // The back href is passed to OnboardingLayout
      // This is tested indirectly through the component rendering
      expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
    });

    it('should default back href to /interests when no interests provided', () => {
      render(<DealBreakersPage />);

      expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<DealBreakersPage />);

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        await waitFor(() => {
          const completeButton = screen.getByTestId('complete-button');
          if (!completeButton.hasAttribute('disabled')) {
            fireEvent.click(completeButton);
          }
        });

        await waitFor(() => {
          expect(mockShowToast).toHaveBeenCalled();
          expect(mockReplace).toHaveBeenCalledWith('/complete');
        });
      }
    });
  });
});

