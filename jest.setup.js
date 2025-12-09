// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  useParams() {
    return {};
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href}>{children}</a>;
  };
});

// Suppress console errors in tests (optional - remove if you want to see them)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
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

// Polyfill Request/Response/Headers for Next.js API route testing
// IMPORTANT: In Node.js 18+ environment, Request/Response are available natively
// Do NOT polyfill Request in Node.js - it conflicts with NextRequest's getter-only properties
// Only polyfill in jsdom environment where these might be missing

if (typeof window !== 'undefined') {
  // We're in jsdom environment - may need polyfills for Response/Headers
  if (typeof global.Response === 'undefined') {
    try {
      const { Response, Headers } = require('undici');
      global.Response = Response;
      global.Headers = Headers;
      // Do NOT polyfill Request in jsdom - let Next.js handle it
    } catch (e) {
      try {
        require('whatwg-fetch');
        // whatwg-fetch polyfills Request, but we need to be careful
        // NextRequest should handle this, but if it conflicts, we may need to delete it
      } catch (fetchError) {
        // Silently fail
      }
    }
  }
} else {
  // We're in Node.js environment (Node 18+)
  // Request/Response/Headers should be available natively
  // Do NOT polyfill - Node.js native implementation works with NextRequest
  // Only polyfill if absolutely necessary and native is missing
  if (typeof global.Request === 'undefined' && typeof global.Response === 'undefined') {
    try {
      const { Request, Response, Headers } = require('undici');
      // Only set if native is truly missing (shouldn't happen in Node 18+)
      global.Request = Request;
      global.Response = Response;
      global.Headers = Headers;
    } catch (e) {
      console.warn('Request/Response not available. Ensure Node.js 18+ is being used.');
    }
  }
}

