/**
 * Test helper utilities
 */

import { waitFor } from '@testing-library/react';

/**
 * Wait for async state updates
 */
export async function waitForAsync() {
  await waitFor(() => {
    // Wait for next tick
  });
}

/**
 * Mock fetch with response
 */
export function mockFetchResponse(data: any, status: number = 200) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers(),
    } as Response)
  ) as jest.Mock;
}

/**
 * Mock fetch with error
 */
export function mockFetchError(error: Error) {
  global.fetch = jest.fn(() => Promise.reject(error)) as jest.Mock;
}

/**
 * Create a mock file for upload testing
 */
export function createMockFile(name: string = 'test.jpg', size: number = 1024, type: string = 'image/jpeg'): File {
  const blob = new Blob(['test content'], { type });
  return new File([blob], name, { type });
}

/**
 * Create mock FormData
 */
export function createMockFormData(data: Record<string, any>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
}

/**
 * Advance timers and wait for async updates
 */
export async function advanceTimersAndWait(ms: number = 0) {
  jest.advanceTimersByTime(ms);
  await waitForAsync();
}

/**
 * Mock window.location
 */
export function mockWindowLocation(url: string) {
  delete (window as any).location;
  (window as any).location = new URL(url);
}

/**
 * Mock navigator.share
 */
export function mockNavigatorShare() {
  (global.navigator as any).share = jest.fn(() => Promise.resolve());
}

/**
 * Mock navigator.clipboard
 */
export function mockNavigatorClipboard() {
  (global.navigator as any).clipboard = {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  };
}

/**
 * Create a delay for testing async behavior
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

