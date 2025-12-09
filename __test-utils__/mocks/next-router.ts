/**
 * Mock Next.js router for testing
 */

// Jest globals: jest is available globally

export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
};

export const mockUseRouter = () => mockRouter;

export const mockUseParams = jest.fn(() => ({}));

export const mockUseSearchParams = jest.fn(() => ({
  get: jest.fn((key: string) => null),
  getAll: jest.fn((key: string) => []),
  has: jest.fn((key: string) => false),
  toString: jest.fn(() => ''),
}));

