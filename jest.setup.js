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

// IMPORTANT: Do NOT polyfill Request/Response/Headers
// 
// In Node.js 20+ (which this project uses), Request/Response/Headers are available natively.
// Polyfilling with whatwg-fetch causes conflicts with NextRequest's getter-only properties.
//
// For API route tests:
// - Use testEnvironment: 'node' (see jest.api.config.js)
// - Node's native Request/Response work perfectly with NextRequest
//
// For component tests:
// - Use testEnvironment: 'jest-environment-jsdom' (see jest.config.js)
// - jsdom may need Response/Headers polyfills, but NOT Request
// - Next.js handles Request internally

if (typeof window !== 'undefined') {
  // We're in jsdom environment (component tests)
  // Only polyfill Response/Headers if missing, but NEVER Request
  if (typeof global.Response === 'undefined') {
    try {
      const { Response, Headers } = require('undici');
      global.Response = Response;
      global.Headers = Headers;
      // Do NOT polyfill Request - Next.js handles it internally
    } catch (e) {
      // Silently fail - native should be available in Node 20+
    }
  }
} else {
  // We're in Node.js environment (API route tests)
  // Node 20+ has native Request/Response/Headers - do NOT polyfill
  // If they're missing, something is wrong with the environment
  if (typeof global.Request === 'undefined' || typeof global.Response === 'undefined') {
    console.warn(
      'Request/Response not available. Ensure Node.js 20+ is being used and testEnvironment is set to "node" for API tests.'
    );
  }
}

