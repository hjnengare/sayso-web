/**
 * Vitest setup file
 * Runs before each test file
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useParams: () => ({}),
  useSearchParams: () => ({
    get: vi.fn((key: string) => null),
    getAll: vi.fn((key: string) => []),
    has: vi.fn((key: string) => false),
    toString: vi.fn(() => ''),
  }),
  usePathname: () => '/',
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  },
}));

// Mock Supabase client
vi.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: vi.fn(),
}));

vi.mock('@/app/lib/supabase/client', () => ({
  getBrowserSupabase: vi.fn(),
}));

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
