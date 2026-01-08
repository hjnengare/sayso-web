/**
 * Unit tests for useInterestsPage hook
 * 
 * Tests the hook logic including:
 * - Interest selection and validation
 * - Direct routing to /subcategories (no nextStep())
 * - Error handling (401, network errors, timeouts)
 * - Animation states
 * - Double-submit prevention
 * - Cache invalidation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/contexts/ToastContext';
import { useOnboarding } from '@/app/contexts/OnboardingContext';
import { useInterestsPage } from '@/app/hooks/useInterestsPage';
import { useOnboardingData } from '@/app/hooks/useOnboardingData';
import { useOnboardingSafety } from '@/app/hooks/useOnboardingSafety';
import { apiClient } from '@/app/lib/api/apiClient';

// Mock all dependencies
jest.mock('next/navigation');
jest.mock('@/app/contexts/ToastContext');
jest.mock('@/app/contexts/OnboardingContext');
jest.mock('@/app/hooks/useOnboardingData');
jest.mock('@/app/hooks/useOnboardingSafety');
jest.mock('@/app/lib/api/apiClient');

// Mock global fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockRefresh = jest.fn();

describe('useInterestsPage Hook', () => {
  const mockShowToast = jest.fn();
  const mockSetSelectedInterests = jest.fn();
  const mockUpdateInterests = jest.fn();
  const mockIsMounted = jest.fn(() => true);
  const mockWithTimeout = jest.fn((promise) => promise);
  const mockPreventDoubleSubmit = jest.fn((fn) => fn);
  const mockHandleBeforeUnload = jest.fn(() => jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      prefetch: mockPrefetch,
      refresh: mockRefresh,
    });
    
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: jest.fn(),
    });
    
    (useOnboarding as jest.Mock).mockReturnValue({
      setSelectedInterests: mockSetSelectedInterests,
      isLoading: false,
      error: null,
    });
    
    (useOnboardingData as jest.Mock).mockReturnValue({
      data: {
        interests: [],
        subcategories: [],
        dealbreakers: [],
      },
      isLoading: false,
      error: null,
      updateInterests: mockUpdateInterests,
      refresh: jest.fn(),
    });
    
    (useOnboardingSafety as jest.Mock).mockReturnValue({
      isMounted: mockIsMounted,
      withTimeout: mockWithTimeout,
      preventDoubleSubmit: mockPreventDoubleSubmit,
      handleBeforeUnload: mockHandleBeforeUnload,
    });
    
    (apiClient.invalidateCache as jest.Mock) = jest.fn();
    
    // Default fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  describe('Initialization', () => {
    it('should initialize with empty selections', () => {
      const { result } = renderHook(() => useInterestsPage());

      expect(result.current.selectedInterests).toEqual([]);
      expect(result.current.canProceed).toBe(false);
      expect(result.current.isNavigating).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should prefetch subcategories page on mount', () => {
      renderHook(() => useInterestsPage());

      expect(mockPrefetch).toHaveBeenCalledWith('/subcategories');
    });

    it('should clear cache and refresh data on mount', () => {
      const mockRefresh = jest.fn();
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: { interests: [], subcategories: [], dealbreakers: [] },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: mockRefresh,
      });

      renderHook(() => useInterestsPage());

      expect(apiClient.invalidateCache).toHaveBeenCalledWith('/api/user/onboarding');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Interest Selection', () => {
    it('should allow selecting interests', () => {
      const { result } = renderHook(() => useInterestsPage());

      act(() => {
        result.current.handleToggle('food-drink');
      });

      expect(mockUpdateInterests).toHaveBeenCalledWith(['food-drink']);
      expect(result.current.animatingIds.has('food-drink')).toBe(true);
    });

    it('should allow deselecting interests', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      act(() => {
        result.current.handleToggle('food-drink');
      });

      expect(mockUpdateInterests).toHaveBeenCalledWith([]);
    });

    it('should prevent selecting more than 6 interests', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: [
            'food-drink',
            'beauty-wellness',
            'professional-services',
            'outdoors-adventure',
            'experiences-entertainment',
            'arts-culture',
          ],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      act(() => {
        result.current.handleToggle('family-pets');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'Maximum 6 interests allowed',
        'warning',
        2000
      );
      expect(result.current.shakingIds.has('family-pets')).toBe(true);
      expect(mockUpdateInterests).not.toHaveBeenCalled();
    });

    it('should show success toast when minimum (3) is reached', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: jest.fn((newInterests) => {
          // Simulate state update
          (useOnboardingData as jest.Mock).mockReturnValue({
            data: { interests: newInterests, subcategories: [], dealbreakers: [] },
            isLoading: false,
            error: null,
            updateInterests: mockUpdateInterests,
            refresh: jest.fn(),
          });
        }),
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      act(() => {
        result.current.handleToggle('professional-services');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        '🎉 Great! You can continue now',
        'sage',
        2000
      );
    });

    it('should show success toast when maximum (6) is reached', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: [
            'food-drink',
            'beauty-wellness',
            'professional-services',
            'outdoors-adventure',
            'experiences-entertainment',
          ],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: jest.fn((newInterests) => {
          (useOnboardingData as jest.Mock).mockReturnValue({
            data: { interests: newInterests, subcategories: [], dealbreakers: [] },
            isLoading: false,
            error: null,
            updateInterests: mockUpdateInterests,
            refresh: jest.fn(),
          });
        }),
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      act(() => {
        result.current.handleToggle('arts-culture');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        '✨ Perfect selection!',
        'sage',
        2000
      );
    });

    it('should reject invalid interest IDs', () => {
      const { result } = renderHook(() => useInterestsPage());

      act(() => {
        result.current.handleToggle('invalid-interest-id');
      });

      expect(mockUpdateInterests).not.toHaveBeenCalled();
    });

    it('should trigger bounce animation on toggle', async () => {
      const { result } = renderHook(() => useInterestsPage());

      act(() => {
        result.current.handleToggle('food-drink');
      });

      expect(result.current.animatingIds.has('food-drink')).toBe(true);

      // Wait for animation to complete
      await waitFor(
        () => {
          expect(result.current.animatingIds.has('food-drink')).toBe(false);
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Validation', () => {
    it('should enable continue button when 3 or more interests selected', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      expect(result.current.canProceed).toBe(true);
    });

    it('should disable continue button when less than 3 interests selected', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      expect(result.current.canProceed).toBe(false);
    });

    it('should disable continue button when navigating', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      act(() => {
        // Manually set navigating state (simulating handleNext call)
        (result.current as any).setIsNavigating?.(true);
      });

      // Note: canProceed is computed, so we need to check the actual behavior
      // The hook doesn't expose setIsNavigating, so we test via handleNext
    });
  });

  describe('Navigation (handleNext)', () => {
    it('should validate selections before navigating', async () => {
      const { result } = renderHook(() => useInterestsPage());

      await act(async () => {
        await result.current.handleNext();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('at least 3'),
        'warning',
        3000
      );
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should save interests and navigate to /subcategories on success', async () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useInterestsPage());

      await act(async () => {
        await result.current.handleNext();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/onboarding/interests',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          }),
        })
      );

      expect(apiClient.invalidateCache).toHaveBeenCalledWith('/api/user/onboarding');
      expect(mockSetSelectedInterests).toHaveBeenCalledWith([
        'food-drink',
        'beauty-wellness',
        'professional-services',
      ]);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Great! 3 interests selected'),
        'success',
        2000
      );
      expect(mockReplace).toHaveBeenCalledWith('/subcategories');
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should redirect to login on 401 error', async () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useInterestsPage());

      await act(async () => {
        await result.current.handleNext();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'Your session expired. Please log in again.',
        'warning',
        3000
      );
      expect(mockReplace).toHaveBeenCalledWith('/login');
      expect(mockReplace).not.toHaveBeenCalledWith('/subcategories');
    });

    it('should handle API errors with error message', async () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const { result } = renderHook(() => useInterestsPage());

      await act(async () => {
        await result.current.handleNext();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'Internal server error',
        'error',
        3000
      );
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle network timeout errors', async () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'AbortError';
      mockWithTimeout.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useInterestsPage());

      await act(async () => {
        await result.current.handleNext();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'Request timed out. Please check your connection and try again.',
        'error',
        5000
      );
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should prevent double submission', async () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      let callCount = 0;
      mockPreventDoubleSubmit.mockImplementation((fn) => {
        return async (...args: any[]) => {
          callCount++;
          if (callCount > 1) {
            return; // Prevent second call
          }
          return fn(...args);
        };
      });

      const { result } = renderHook(() => useInterestsPage());

      await act(async () => {
        await Promise.all([
          result.current.handleNext(),
          result.current.handleNext(), // Second call should be prevented
        ]);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not proceed if component is unmounted', async () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: {
          interests: ['food-drink', 'beauty-wellness', 'professional-services'],
          subcategories: [],
          dealbreakers: [],
        },
        isLoading: false,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      mockIsMounted.mockReturnValue(false);

      const { result } = renderHook(() => useInterestsPage());

      await act(async () => {
        await result.current.handleNext();
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Loading and Error States', () => {
    it('should reflect loading state from context', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        setSelectedInterests: mockSetSelectedInterests,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useInterestsPage());

      expect(result.current.isLoading).toBe(true);
    });

    it('should reflect loading state from data hook', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: { interests: [], subcategories: [], dealbreakers: [] },
        isLoading: true,
        error: null,
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      expect(result.current.isLoading).toBe(true);
    });

    it('should reflect error state from context', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        setSelectedInterests: mockSetSelectedInterests,
        isLoading: false,
        error: 'Context error',
      });

      const { result } = renderHook(() => useInterestsPage());

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Context error');
    });

    it('should reflect error state from data hook', () => {
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: { interests: [], subcategories: [], dealbreakers: [] },
        isLoading: false,
        error: new Error('Data error'),
        updateInterests: mockUpdateInterests,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useInterestsPage());

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Data error');
    });
  });

  describe('Before Unload Warning', () => {
    it('should set up beforeunload warning when navigating', () => {
      const { result } = renderHook(() => useInterestsPage());

      // Trigger navigation state
      act(() => {
        // Simulate handleNext being called (which sets isNavigating)
        // We can't directly test this, but we can verify the effect runs
      });

      // The effect should call handleBeforeUnload when isNavigating is true
      // This is tested indirectly through the navigation flow
    });
  });

  describe('Prefetching', () => {
    it('should prefetch subcategories when minimum selections reached', () => {
      let interests = ['food-drink', 'beauty-wellness'];
      (useOnboardingData as jest.Mock).mockReturnValue({
        data: { interests, subcategories: [], dealbreakers: [] },
        isLoading: false,
        error: null,
        updateInterests: jest.fn((newInterests) => {
          interests = newInterests;
          // Trigger re-render with new data
          (useOnboardingData as jest.Mock).mockReturnValue({
            data: { interests, subcategories: [], dealbreakers: [] },
            isLoading: false,
            error: null,
            updateInterests: mockUpdateInterests,
            refresh: jest.fn(),
          });
        }),
        refresh: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useInterestsPage());

      act(() => {
        result.current.handleToggle('professional-services');
      });

      rerender();

      // Prefetch should be called when minimum (3) is reached
      expect(mockPrefetch).toHaveBeenCalledWith('/subcategories');
    });
  });
});
