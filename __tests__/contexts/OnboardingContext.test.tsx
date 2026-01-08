/**
 * Unit tests for OnboardingContext
 * Tests submit functions and state management (no localStorage)
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnboarding, OnboardingProvider } from '@/app/contexts/OnboardingContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';

// Mock dependencies
jest.mock('@/app/contexts/AuthContext');
jest.mock('@/app/contexts/ToastContext');

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('OnboardingContext', () => {
  const mockShowToast = jest.fn();
  const mockRefreshUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: jest.fn(),
    } as any);
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        profile: {
          onboarding_step: 'interests',
          onboarding_complete: false,
        },
      },
      refreshUser: mockRefreshUser,
    } as any);
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <OnboardingProvider>{children}</OnboardingProvider>
  );

  describe('submitInterests', () => {
    it('should submit interests and navigate to subcategories', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          interestsCount: 3,
          onboarding_step: 'subcategories',
        }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink', 'beauty-wellness', 'arts-culture']);
      });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitInterests();
      });

      await waitFor(() => {
        expect(submitResult!).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/onboarding/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: ['food-drink', 'beauty-wellness', 'arts-culture'],
        }),
      });
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/subcategories');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Great!'),
        'success',
        3000
      );
    });

    it('should return false if user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        refreshUser: mockRefreshUser,
      } as any);

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink']);
      });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitInterests();
      });

      expect(submitResult!).toBe(false);
      expect(result.current.error).toBe('User not authenticated');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return false if no interests selected', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitInterests();
      });

      expect(submitResult!).toBe(false);
      expect(result.current.error).toBe('Please select at least one interest');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to save' }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedInterests(['food-drink']);
      });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitInterests();
      });

      expect(submitResult!).toBe(false);
      expect(result.current.error).toBe('Failed to save');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('submitSubcategories', () => {
    it('should submit subcategories and navigate to deal-breakers', async () => {
      // Mock loadSubInterests API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subcategories: [
            { id: 'restaurants', label: 'Restaurants', interest_id: 'food-drink' },
            { id: 'cafes', label: 'Cafes', interest_id: 'food-drink' },
          ],
        }),
      });

      // Mock submitSubcategories API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          subcategoriesCount: 2,
          onboarding_step: 'deal-breakers',
        }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // First load subInterests to populate the context
      await act(async () => {
        await result.current.loadSubInterests(['food-drink']);
      });

      // Wait for subInterests to be loaded
      await waitFor(() => {
        expect(result.current.subInterests.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setSelectedSubInterests(['restaurants', 'cafes']);
      });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitSubcategories();
      });

      await waitFor(() => {
        expect(submitResult!).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/onboarding/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcategories: [
            { subcategory_id: 'restaurants', interest_id: 'food-drink' },
            { subcategory_id: 'cafes', interest_id: 'food-drink' },
          ],
        }),
      });
      expect(mockPush).toHaveBeenCalledWith('/deal-breakers');
    });

    it('should return false if no subcategories selected', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitSubcategories();
      });

      expect(submitResult!).toBe(false);
      expect(result.current.error).toBe('Please select at least one subcategory');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return false if subcategories have no valid interest_id', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedSubInterests(['invalid-subcategory']);
      });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitSubcategories();
      });

      expect(submitResult!).toBe(false);
      expect(result.current.error).toBe('Invalid subcategory selections');
    });
  });

  describe('submitDealbreakers', () => {
    it('should submit dealbreakers and navigate to complete', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          dealbreakersCount: 2,
          onboarding_step: 'complete',
        }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setSelectedDealbreakers(['trustworthiness', 'punctuality']);
      });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitDealbreakers();
      });

      expect(submitResult!).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/onboarding/deal-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealbreakers: ['trustworthiness', 'punctuality'],
        }),
      });
      expect(mockPush).toHaveBeenCalledWith('/complete');
    });
  });

  describe('submitComplete', () => {
    it('should mark onboarding as complete and navigate to home', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          success: true,
        }),
      });

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      let submitResult: boolean;
      await act(async () => {
        submitResult = await result.current.submitComplete();
      });

      expect(submitResult!).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(mockPush).toHaveBeenCalledWith('/home');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Welcome'),
        'success',
        4000
      );
    });
  });
});

