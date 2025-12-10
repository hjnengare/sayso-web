/**
 * Regression guardrails for onboarding workflow
 * 
 * Prerequisite Rule: no interests = no subcategories = no deal-breakers = no complete
 * 
 * Tests critical error handling scenarios to prevent regressions.
 * All tests assume prerequisites are met (enforced by guards) unless testing error cases.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, renderHook, act } from '@testing-library/react';
import { useOnboarding, OnboardingProvider } from '@/app/contexts/OnboardingContext';
import DealBreakersPage from '@/app/deal-breakers/page';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { createUser } from '@test-utils/factories/userFactory';

// Mock dependencies
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockGet = jest.fn();

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

jest.mock('@/app/contexts/AuthContext');
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
  default: () => <div>Select Deal-Breakers</div>,
}));
jest.mock('@/app/components/DealBreakers/DealBreakerSelection', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
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
      Complete
    </button>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Onboarding Regression Guardrails', () => {
  const mockUser = createUser({
    email_verified: true,
    profile: {
      onboarding_step: 'deal-breakers',
      onboarding_complete: false,
    },
  });

  const mockShowToast = jest.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('interests');
    mockSearchParams.delete('subcategories');
    mockPush.mockClear();
    mockReplace.mockClear();
    mockGet.mockClear();
    mockGet.mockImplementation((key: string) => mockSearchParams.get(key));

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: jest.fn(),
    });
    (global.fetch as jest.Mock).mockClear();
  });

  describe('API Failure Handling', () => {
    it('should still land on /complete even if /api/user/onboarding fails with 500 error', async () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      // Mock API failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Internal server error' }),
      });

      const { container } = render(<DealBreakersPage />);

      // Select a deal-breaker
      await waitFor(() => {
        expect(screen.getByTestId('dealbreaker-grid')).toBeInTheDocument();
      });

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        // Click complete button
        await waitFor(() => {
          const completeButton = screen.getByTestId('complete-button');
          if (!completeButton.hasAttribute('disabled')) {
            fireEvent.click(completeButton);
          }
        });

        // Should still navigate to /complete (graceful degradation)
        await waitFor(() => {
          expect(mockReplace).toHaveBeenCalledWith('/complete');
        }, { timeout: 3000 });
      }
    });

    it('should still land on /complete even if /api/user/onboarding fails with network error', async () => {
      mockSearchParams.set('interests', 'food-drink');
      mockSearchParams.set('subcategories', 'sushi');

      // Mock network error (rejected promise)
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<DealBreakersPage />);

      // Select a deal-breaker
      await waitFor(() => {
        expect(screen.getByTestId('dealbreaker-grid')).toBeInTheDocument();
      });

      const dealbreakerButtons = container.querySelectorAll('[data-dealbreaker-id]');
      if (dealbreakerButtons.length > 0) {
        fireEvent.click(dealbreakerButtons[0] as HTMLElement);

        // Click complete button
        await waitFor(() => {
          const completeButton = screen.getByTestId('complete-button');
          if (!completeButton.hasAttribute('disabled')) {
            fireEvent.click(completeButton);
          }
        });

        // Should still navigate to /complete (graceful degradation)
        await waitFor(() => {
          expect(mockReplace).toHaveBeenCalledWith('/complete');
        }, { timeout: 3000 });

        // Should show error toast
        expect(mockShowToast).toHaveBeenCalledWith(
          'Failed to save onboarding data, but continuing...',
          'sage'
        );
      }
    });
  });

  describe('Interests API Fallback', () => {
    it('should use fallback interests if /api/interests fails', async () => {
      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnboardingProvider>{children}</OnboardingProvider>
      );

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Load interests
      await act(async () => {
        await result.current.loadInterests();
      });

      // Should have fallback interests loaded
      await waitFor(() => {
        expect(result.current.interests.length).toBeGreaterThan(0);
        // Should have fallback interests (from FALLBACK_INTERESTS in context)
        expect(result.current.interests).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
            }),
          ])
        );
      });
    });

    it('should use fallback interests if /api/interests returns invalid data', async () => {
      // Mock API returning invalid data
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ interests: null }), // Invalid data
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnboardingProvider>{children}</OnboardingProvider>
      );

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Load interests
      await act(async () => {
        await result.current.loadInterests();
      });

      // Should have fallback interests loaded
      await waitFor(() => {
        expect(result.current.interests.length).toBeGreaterThan(0);
      });
    });

    it('should use fallback interests if /api/interests returns non-array', async () => {
      // Mock API returning wrong format
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ interests: 'not-an-array' }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnboardingProvider>{children}</OnboardingProvider>
      );

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Load interests
      await act(async () => {
        await result.current.loadInterests();
      });

      // Should have fallback interests loaded
      await waitFor(() => {
        expect(result.current.interests.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error State Management', () => {
    it('should set error state when interests API fails but still provide fallback', async () => {
      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnboardingProvider>{children}</OnboardingProvider>
      );

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Load interests
      await act(async () => {
        await result.current.loadInterests();
      });

      // Should have error set
      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load interests');
      });

      // But should still have fallback interests
      expect(result.current.interests.length).toBeGreaterThan(0);
    });
  });
});

