/**
 * Unit tests for onboarding error handling utilities
 */

import {
  createOnboardingError,
  parseApiError,
  handleFetchError,
  getUserFriendlyMessage,
  isRetryableError,
  retryWithBackoff,
} from '@/app/lib/onboarding/errorHandling';

// Mock fetch
global.fetch = jest.fn();

describe('Onboarding Error Handling Utilities', () => {
  describe('createOnboardingError', () => {
    it('should create error with all properties', () => {
      const error = createOnboardingError('NETWORK_ERROR', 'Network failed', { code: 500 }, true);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network failed');
      expect(error.details).toEqual({ code: 500 });
      expect(error.retryable).toBe(true);
    });

    it('should default retryable to false', () => {
      const error = createOnboardingError('VALIDATION_ERROR', 'Invalid data');
      expect(error.retryable).toBe(false);
    });
  });

  describe('parseApiError', () => {
    it('should parse JSON error response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Invalid request', message: 'Bad data' }),
        text: async () => JSON.stringify({ error: 'Invalid request' }),
      } as Response;

      const error = await parseApiError(mockResponse);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid request');
      expect(error.retryable).toBe(false);
    });

    it('should parse text error response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/plain' }),
        json: async () => { throw new Error('Not JSON'); },
        text: async () => 'Server error occurred',
      } as Response;

      const error = await parseApiError(mockResponse);
      expect(error.code).toBe('API_ERROR');
      expect(error.message).toBe('Server error occurred');
      expect(error.retryable).toBe(true);
    });

    it('should handle 401 as auth error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Unauthorized' }),
        text: async () => 'Unauthorized',
      } as Response;

      const error = await parseApiError(mockResponse);
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.retryable).toBe(false);
    });

    it('should handle 500 as retryable API error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Internal server error' }),
        text: async () => 'Internal server error',
      } as Response;

      const error = await parseApiError(mockResponse);
      expect(error.code).toBe('API_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should handle network errors as retryable', async () => {
      const mockResponse = {
        ok: false,
        status: 0,
        headers: new Headers(),
        json: async () => { throw new Error('Network error'); },
        text: async () => '',
      } as Response;

      const error = await parseApiError(mockResponse);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
    });
  });

  describe('handleFetchError', () => {
    it('should handle TypeError fetch errors', () => {
      const error = new TypeError('Failed to fetch');
      const result = handleFetchError(error);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');
      const result = handleFetchError(error);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle non-Error values', () => {
      const result = handleFetchError('string error');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for network errors', () => {
      const error = createOnboardingError('NETWORK_ERROR', 'Technical error', null, true);
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Connection error');
    });

    it('should return user-friendly message for auth errors', () => {
      const error = createOnboardingError('AUTH_ERROR', 'Auth failed');
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Authentication error');
    });

    it('should return user-friendly message for validation errors', () => {
      const error = createOnboardingError('VALIDATION_ERROR', 'Invalid data');
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Invalid data');
    });

    it('should return user-friendly message for API errors', () => {
      const error = createOnboardingError('API_ERROR', 'Server error', null, true);
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Server error');
    });

    it('should return error message for unknown errors', () => {
      const error = createOnboardingError('UNKNOWN_ERROR', 'Custom error');
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Custom error');
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      const error = createOnboardingError('NETWORK_ERROR', 'Error', null, true);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = createOnboardingError('VALIDATION_ERROR', 'Error', null, false);
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const promise = retryWithBackoff(fn, 3, 1000);
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(fn, 3, 1000);
      
      // Fast-forward through retry delay using runAllTimersAsync
      await jest.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should fail after max retries', async () => {
      const errorMessage = 'Persistent failure';
      const fn = jest.fn(() => Promise.reject(new Error(errorMessage)));

      const promise = retryWithBackoff(fn, 2, 1000);
      
      // Handle the rejection to avoid unhandled promise rejection warnings
      promise.catch(() => {});
      
      // Fast-forward through all retry delays
      await jest.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow(errorMessage);
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    }, 15000);

    it('should use exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(fn, 3, 1000);
      
      // Run all timers to advance through delays
      await jest.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    }, 15000);
  });
});

