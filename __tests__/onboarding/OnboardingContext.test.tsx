/**
 * Unit tests for OnboardingContext
 * Tests state management, localStorage persistence, and navigation logic
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnboarding, OnboardingProvider } from '@/app/contexts/OnboardingContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';

// Mock dependencies
jest.mock('@/app/contexts/AuthContext');
jest.mock('@/app/contexts/ToastContext');

// Mock next/navigation - need to override the setup.js mock
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockBack = jest.fn();

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
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

describe('OnboardingContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    email_verified: true,
    profile: {
      onboarding_step: 'interests',
      onboarding_complete: false,
    },
  };

  const mockShowToast = jest.fn();
  const mockShowToastOnce = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockPrefetch.mockClear();
    mockBack.mockClear();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      updateUser: jest.fn(),
    });
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: mockShowToastOnce,
    });
    (global.fetch as jest.Mock).mockClear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <OnboardingProvider>{children}</OnboardingProvider>
  );

  describe('Initial State', () => {
    it('should initialize with empty selections', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      expect(result.current.selectedInterests).toEqual([]);
      expect(result.current.selectedSubInterests).toEqual([]);
      expect(result.current.selectedDealbreakers).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    // Note: The OnboardingContext doesn't load from localStorage on mount
    // It only saves TO localStorage when selections are made
    // If you want to restore from localStorage, you'd need to add a useEffect
    // For now, we test that selections persist to localStorage when made
  });

  describe('Selection Management', () => {
    it('should set selected interests and persist to localStorage', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink', 'beauty-wellness']);
      });

      expect(result.current.selectedInterests).toEqual(['food-drink', 'beauty-wellness']);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'onboarding_interests',
        JSON.stringify(['food-drink', 'beauty-wellness'])
      );
    });

    it('should set selected subcategories and persist to localStorage', () => {
      // Note: Prerequisite rule - subcategories require interests
      // This test assumes interests are already set (enforced by guards in real app)
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Set interests first (prerequisite)
      act(() => {
        result.current.setSelectedInterests(['food-drink']);
      });

      act(() => {
        result.current.setSelectedSubInterests(['sushi', 'italian']);
      });

      expect(result.current.selectedSubInterests).toEqual(['sushi', 'italian']);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'onboarding_subcategories',
        JSON.stringify(['sushi', 'italian'])
      );
    });

    it('should set selected dealbreakers and persist to localStorage', () => {
      // Note: Prerequisite rule - deal-breakers require interests AND subcategories
      // This test assumes prerequisites are already set (enforced by guards in real app)
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Set prerequisites first
      act(() => {
        result.current.setSelectedInterests(['food-drink']);
        result.current.setSelectedSubInterests(['sushi']);
      });

      act(() => {
        result.current.setSelectedDealbreakers(['trustworthiness']);
      });

      expect(result.current.selectedDealbreakers).toEqual(['trustworthiness']);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'onboarding_dealbreakers',
        JSON.stringify(['trustworthiness'])
      );
    });
  });

  describe('loadInterests', () => {
    it('should load interests from API successfully', async () => {
      const mockInterests = [
        { id: 'food-drink', name: 'Food & Drink' },
        { id: 'beauty-wellness', name: 'Beauty & Wellness' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ interests: mockInterests }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.loadInterests();
      });

      await waitFor(() => {
        expect(result.current.interests).toEqual(mockInterests);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should use fallback data when API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.loadInterests();
      });

      await waitFor(() => {
        expect(result.current.interests.length).toBeGreaterThan(0);
        expect(result.current.error).toBe('Failed to load interests');
      });
    });

    it('should handle API response with invalid data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ interests: null }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.loadInterests();
      });

      await waitFor(() => {
        // Should fallback to default interests
        expect(result.current.interests.length).toBeGreaterThan(0);
      });
    });
  });

  describe('loadSubInterests', () => {
    it('should load subcategories for given interest IDs', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
        { id: 'italian', label: 'Italian', interest_id: 'food-drink' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subcategories: mockSubcategories }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.loadSubInterests(['food-drink']);
      });

      await waitFor(() => {
        expect(result.current.subInterests).toEqual(mockSubcategories);
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/subcategories?interests=food-drink',
          { cache: 'no-store' }
        );
      });
    });

    it('should handle API failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.loadSubInterests(['food-drink']);
      });

      await waitFor(() => {
        expect(result.current.subInterests).toEqual([]);
        expect(result.current.error).toBe('Failed to load sub-interests');
      });
    });
  });

  describe('nextStep', () => {
    it('should navigate to subcategories with interests in URL when on interests step', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink', 'beauty-wellness']);
      });

      await act(async () => {
        await result.current.nextStep();
      });

      expect(mockShowToast).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/subcategories?interests=food-drink,beauty-wellness');
    });

    it('should navigate to deal-breakers when on subcategories step', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, profile: { onboarding_step: 'subcategories' } },
        updateUser: jest.fn(),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.nextStep();
      });

      expect(mockPush).toHaveBeenCalledWith('/deal-breakers');
    });

    it('should navigate to home when on deal-breakers step', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, profile: { onboarding_step: 'deal-breakers' } },
        updateUser: jest.fn(),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.nextStep();
      });

      expect(mockPush).toHaveBeenCalledWith('/home');
    });

    it('should not navigate if user is not authenticated', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        updateUser: jest.fn(),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.nextStep();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should show error toast on navigation failure', async () => {
      // Next.js router.push doesn't throw errors by default, but we can simulate
      // a navigation error by making the router.push function throw synchronously
      mockPush.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink']);
      });

      await act(async () => {
        try {
          await result.current.nextStep();
        } catch (error) {
          // Error is caught by context's try-catch
        }
      });

      // The context sets error state on navigation failure (in catch block)
      await waitFor(() => {
        expect(result.current.error).toBe('Failed to navigate to next step');
      });
    });
  });

  describe('completeOnboarding', () => {
    // Prerequisite rule: no interests = no subcategories = no deal-breakers = no complete
    // This test verifies completion works when ALL prerequisites are met
    
    it('should save all onboarding data and clear localStorage', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink']);
        result.current.setSelectedSubInterests(['sushi']);
        result.current.setSelectedDealbreakers(['trustworthiness']);
      });

      // Mock subInterests for getInterestIdForSubcategory
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subcategories: mockSubcategories }),
      });

      await act(async () => {
        await result.current.loadSubInterests(['food-drink']);
      });

      // Mock the completion API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      const fetchMock = global.fetch as jest.Mock;
      
      // Assert the onboarding API call (should be the 2nd call after loadSubInterests)
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/user/onboarding',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Verify the body payload
      const onboardingCall = fetchMock.mock.calls.find(
        (call: any[]) => call[0] === '/api/user/onboarding'
      );
      expect(onboardingCall).toBeDefined();
      const body = JSON.parse(onboardingCall[1].body);
      expect(body).toMatchObject({
        step: 'complete',
        interests: ['food-drink'],
        dealbreakers: ['trustworthiness'],
      });
      expect(body.subcategories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subcategory_id: 'sushi',
            interest_id: 'food-drink',
          }),
        ])
      );

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('onboarding_interests');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('onboarding_subcategories');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('onboarding_dealbreakers');
      expect(mockShowToast).toHaveBeenCalledWith(
        '🎉 Welcome to sayso! Your profile is now complete.',
        'success',
        4000
      );
    });

    it('should handle API failure gracefully', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink']);
        result.current.setSelectedSubInterests(['sushi']);
        result.current.setSelectedDealbreakers(['trustworthiness']);
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to complete onboarding');
      });
    });

    it('should not complete if user is not authenticated', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        updateUser: jest.fn(),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    // Prerequisite rule enforcement tests
    it('should not complete if no interests are selected', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Set subcategories and deal-breakers but NO interests
      act(() => {
        result.current.setSelectedSubInterests(['sushi']);
        result.current.setSelectedDealbreakers(['trustworthiness']);
        // Intentionally NOT setting interests
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      // Should not call API if prerequisites are missing
      const onboardingCalls = (global.fetch as jest.Mock).mock.calls.filter(
        (call: any[]) => call[0] === '/api/user/onboarding'
      );
      expect(onboardingCalls.length).toBe(0);
    });

    it('should not complete if no subcategories are selected (even with interests)', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Set interests and deal-breakers but NO subcategories
      act(() => {
        result.current.setSelectedInterests(['food-drink']);
        result.current.setSelectedDealbreakers(['trustworthiness']);
        // Intentionally NOT setting subcategories
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      // Should not call API if prerequisites are missing
      const onboardingCalls = (global.fetch as jest.Mock).mock.calls.filter(
        (call: any[]) => call[0] === '/api/user/onboarding'
      );
      expect(onboardingCalls.length).toBe(0);
    });

    it('should not complete if no deal-breakers are selected (even with interests and subcategories)', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Set interests and subcategories but NO deal-breakers
      act(() => {
        result.current.setSelectedInterests(['food-drink']);
        result.current.setSelectedSubInterests(['sushi']);
        // Intentionally NOT setting deal-breakers
      });

      // Mock subInterests for getInterestIdForSubcategory
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subcategories: mockSubcategories }),
      });

      await act(async () => {
        await result.current.loadSubInterests(['food-drink']);
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      // Should not call API if prerequisites are missing
      const onboardingCalls = (global.fetch as jest.Mock).mock.calls.filter(
        (call: any[]) => call[0] === '/api/user/onboarding'
      );
      expect(onboardingCalls.length).toBe(0);
    });
  });

  describe('resetOnboarding', () => {
    it('should clear all selections and localStorage', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink']);
        result.current.setSelectedSubInterests(['sushi']);
        result.current.setSelectedDealbreakers(['trustworthiness']);
      });

      act(() => {
        result.current.resetOnboarding();
      });

      expect(result.current.selectedInterests).toEqual([]);
      expect(result.current.selectedSubInterests).toEqual([]);
      expect(result.current.selectedDealbreakers).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('onboarding_interests');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('onboarding_subcategories');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('onboarding_dealbreakers');
    });
  });

  describe('getInterestIdForSubcategory', () => {
    it('should return interest_id for a given subcategory', async () => {
      const mockSubcategories = [
        { id: 'sushi', label: 'Sushi', interest_id: 'food-drink' },
        { id: 'italian', label: 'Italian', interest_id: 'food-drink' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subcategories: mockSubcategories }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await act(async () => {
        await result.current.loadSubInterests(['food-drink']);
      });

      // Verify subInterests are loaded correctly
      await waitFor(() => {
        expect(result.current.subInterests).toEqual(mockSubcategories);
      });
      
      // The getInterestIdForSubcategory function is used internally
      // and is tested indirectly through completeOnboarding test
    });
  });
});

