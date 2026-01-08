/**
 * Unit tests for useOnboardingData hook
 * Tests DB-only data loading (simplified architecture)
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useOnboardingData } from '@/app/hooks/useOnboardingData';
import { loadFromDatabase } from '@/app/lib/onboarding/dataManager';

jest.mock('@/app/lib/onboarding/dataManager');

const mockLoadFromDatabase = loadFromDatabase as jest.MockedFunction<typeof loadFromDatabase>;

describe('useOnboardingData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty data and load from database', async () => {
    mockLoadFromDatabase.mockResolvedValue({
      interests: ['food-drink', 'beauty-wellness'],
      subcategories: ['restaurants', 'cafes'],
      dealbreakers: ['trustworthiness'],
    });

    const { result } = renderHook(() => useOnboardingData());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.interests).toEqual(['food-drink', 'beauty-wellness']);
    expect(result.current.data.subcategories).toEqual(['restaurants', 'cafes']);
    expect(result.current.data.dealbreakers).toEqual(['trustworthiness']);
    expect(mockLoadFromDatabase).toHaveBeenCalledTimes(1);
  });

  it('should initialize with empty arrays if database returns empty data', async () => {
    mockLoadFromDatabase.mockResolvedValue({});

    const { result } = renderHook(() => useOnboardingData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.interests).toEqual([]);
    expect(result.current.data.subcategories).toEqual([]);
    expect(result.current.data.dealbreakers).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    mockLoadFromDatabase.mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useOnboardingData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Database error');
    expect(result.current.data.interests).toEqual([]);
  });

  it('should not load from database if loadFromDatabase is false', async () => {
    const { result } = renderHook(() =>
      useOnboardingData({ loadFromDatabase: false })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockLoadFromDatabase).not.toHaveBeenCalled();
    expect(result.current.data.interests).toEqual([]);
  });

  it('should update interests locally', async () => {
    mockLoadFromDatabase.mockResolvedValue({});

    const { result } = renderHook(() => useOnboardingData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.updateInterests(['food-drink', 'beauty-wellness']);
    });

    expect(result.current.data.interests).toEqual(['food-drink', 'beauty-wellness']);
  });

  it('should update subcategories locally', async () => {
    mockLoadFromDatabase.mockResolvedValue({});

    const { result } = renderHook(() => useOnboardingData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.updateSubcategories(['restaurants', 'cafes']);
    });

    expect(result.current.data.subcategories).toEqual(['restaurants', 'cafes']);
  });

  it('should update dealbreakers locally', async () => {
    mockLoadFromDatabase.mockResolvedValue({});

    const { result } = renderHook(() => useOnboardingData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.updateDealbreakers(['trustworthiness']);
    });

    expect(result.current.data.dealbreakers).toEqual(['trustworthiness']);
  });

  it('should update multiple fields at once', async () => {
    mockLoadFromDatabase.mockResolvedValue({});

    const { result } = renderHook(() => useOnboardingData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.updateData({
        interests: ['food-drink'],
        subcategories: ['restaurants'],
      });
    });

    expect(result.current.data.interests).toEqual(['food-drink']);
    expect(result.current.data.subcategories).toEqual(['restaurants']);
    expect(result.current.data.dealbreakers).toEqual([]);
  });

  it('should clear all data', async () => {
    mockLoadFromDatabase.mockResolvedValue({
      interests: ['food-drink'],
      subcategories: ['restaurants'],
      dealbreakers: ['trustworthiness'],
    });

    const { result } = renderHook(() => useOnboardingData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.clearData();
    });

    expect(result.current.data.interests).toEqual([]);
    expect(result.current.data.subcategories).toEqual([]);
    expect(result.current.data.dealbreakers).toEqual([]);
  });

  it('should refresh data from database', async () => {
    mockLoadFromDatabase
      .mockResolvedValueOnce({ interests: ['food-drink'] })
      .mockResolvedValueOnce({ interests: ['beauty-wellness'] });

    const { result } = renderHook(() => useOnboardingData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.interests).toEqual(['food-drink']);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data.interests).toEqual(['beauty-wellness']);
    });

    expect(mockLoadFromDatabase).toHaveBeenCalledTimes(2);
  });
});

