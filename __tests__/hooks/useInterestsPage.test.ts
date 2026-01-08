/**
 * Unit tests for useInterestsPage hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/contexts/ToastContext';
import { useInterestsPage } from '@/app/hooks/useInterestsPage';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/app/contexts/ToastContext');
jest.mock('@/app/hooks/useOnboardingData');

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

describe('useInterestsPage Hook', () => {
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      prefetch: mockPrefetch,
    });
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: jest.fn(),
    });

    // Mock useOnboardingData
    const { useOnboardingData } = require('@/app/hooks/useOnboardingData');
    useOnboardingData.mockReturnValue({
      data: {
        interests: [],
        subcategories: [],
        dealbreakers: [],
      },
      isLoading: false,
      error: null,
      updateInterests: jest.fn((interests) => {
        useOnboardingData.mockReturnValue({
          data: { interests, subcategories: [], dealbreakers: [] },
          isLoading: false,
          error: null,
          updateInterests: useOnboardingData().updateInterests,
        });
      }),
    });
  });

  it('should initialize with empty selections', () => {
    const { result } = renderHook(() => useInterestsPage());

    expect(result.current.selectedInterests).toEqual([]);
    expect(result.current.canProceed).toBe(false);
  });

  it('should prefetch subcategories page on mount', () => {
    renderHook(() => useInterestsPage());

    expect(mockPrefetch).toHaveBeenCalledWith('/subcategories');
  });

  it('should allow selecting interests up to maximum', () => {
    const { result } = renderHook(() => useInterestsPage());

    act(() => {
      result.current.handleToggle('food-drink');
    });

    expect(result.current.selectedInterests).toContain('food-drink');
  });

  it('should prevent selecting more than maximum interests', () => {
    // Mock 6 interests already selected
    const { useOnboardingData } = require('@/app/hooks/useOnboardingData');
    useOnboardingData.mockReturnValue({
      data: {
        interests: ['food-drink', 'beauty-wellness', 'professional-services', 'outdoors-adventure', 'experiences-entertainment', 'arts-culture'],
        subcategories: [],
        dealbreakers: [],
      },
      isLoading: false,
      error: null,
      updateInterests: jest.fn(),
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
  });

  it('should show success toast when minimum is reached', () => {
    // Mock 2 interests selected
    const { useOnboardingData } = require('@/app/hooks/useOnboardingData');
    let interests = ['food-drink', 'beauty-wellness'];
    useOnboardingData.mockReturnValue({
      data: { interests, subcategories: [], dealbreakers: [] },
      isLoading: false,
      error: null,
      updateInterests: jest.fn((newInterests) => {
        interests = newInterests;
      }),
    });

    const { result } = renderHook(() => useInterestsPage());

    act(() => {
      result.current.handleToggle('professional-services');
    });

    // Should show toast when minimum (3) is reached
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('should enable continue button when minimum selections reached', () => {
    // Mock 3 interests selected
    const { useOnboardingData } = require('@/app/hooks/useOnboardingData');
    useOnboardingData.mockReturnValue({
      data: {
        interests: ['food-drink', 'beauty-wellness', 'professional-services'],
        subcategories: [],
        dealbreakers: [],
      },
      isLoading: false,
      error: null,
      updateInterests: jest.fn(),
    });

    const { result } = renderHook(() => useInterestsPage());

    expect(result.current.canProceed).toBe(true);
  });

  it('should navigate to subcategories on next', async () => {
    // Mock 3 interests selected
    const { useOnboardingData } = require('@/app/hooks/useOnboardingData');
    useOnboardingData.mockReturnValue({
      data: {
        interests: ['food-drink', 'beauty-wellness', 'professional-services'],
        subcategories: [],
        dealbreakers: [],
      },
      isLoading: false,
      error: null,
      updateInterests: jest.fn(),
    });

    const { result } = renderHook(() => useInterestsPage());

    await act(async () => {
      await result.current.handleNext();
    });

    expect(mockReplace).toHaveBeenCalled();
    expect(mockReplace.mock.calls[0][0]).toContain('/subcategories');
  });

  it('should not navigate when minimum not reached', async () => {
    const { result } = renderHook(() => useInterestsPage());

    await act(async () => {
      await result.current.handleNext();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('should trigger animations on toggle', () => {
    const { result } = renderHook(() => useInterestsPage());

    act(() => {
      result.current.handleToggle('food-drink');
    });

    // Animation should be triggered
    expect(result.current.animatingIds.has('food-drink')).toBe(true);
  });

  it('should trigger shake animation when max reached', () => {
    // Mock 6 interests already selected
    const { useOnboardingData } = require('@/app/hooks/useOnboardingData');
    useOnboardingData.mockReturnValue({
      data: {
        interests: ['food-drink', 'beauty-wellness', 'professional-services', 'outdoors-adventure', 'experiences-entertainment', 'arts-culture'],
        subcategories: [],
        dealbreakers: [],
      },
      isLoading: false,
      error: null,
      updateInterests: jest.fn(),
    });

    const { result } = renderHook(() => useInterestsPage());

    act(() => {
      result.current.handleToggle('family-pets');
    });

    expect(result.current.shakingIds.has('family-pets')).toBe(true);
  });
});

