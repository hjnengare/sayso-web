/**
 * Unit tests for BusinessRow component
 * 
 * Tests:
 * - Rendering with businesses
 * - Empty state (returns null)
 * - Title and CTA display
 * - Navigation on CTA click
 * - Route prefetching
 * - Business cards rendering
 * - Accessibility
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BusinessRow from '../../src/app/components/BusinessRow/BusinessRow';
import { createBusiness } from '../../__test-utils__/factories/businessFactory';
import { render as customRender } from '../../__test-utils__/helpers/render';

// Mock next/navigation
const mockPush = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
  }),
}));

// Mock BusinessCard
jest.mock('../../src/app/components/BusinessCard/BusinessCard', () => {
  return function MockBusinessCard({ business }: { business: any }) {
    return (
      <div data-testid={`business-card-${business.id}`}>
        {business.name}
      </div>
    );
  };
});

// Mock ScrollableSection
jest.mock('../../src/app/components/ScrollableSection/ScrollableSection', () => {
  return function MockScrollableSection({ children }: { children: React.ReactNode }) {
    return <div data-testid="scrollable-section">{children}</div>;
  };
});

describe('BusinessRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock requestIdleCallback
    (window as any).requestIdleCallback = jest.fn((callback: () => void) => {
      setTimeout(callback, 0);
      return 1;
    });
    (window as any).cancelIdleCallback = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render with businesses', () => {
      const businesses = [
        createBusiness({ id: '1', name: 'Business 1' }),
        createBusiness({ id: '2', name: 'Business 2' }),
      ];

      render(<BusinessRow title="Test Row" businesses={businesses} />);

      expect(screen.getByText('Test Row')).toBeInTheDocument();
      expect(screen.getByText('Business 1')).toBeInTheDocument();
      expect(screen.getByText('Business 2')).toBeInTheDocument();
    });

    it('should render with custom CTA', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} cta="See All" />);

      expect(screen.getByText('See All')).toBeInTheDocument();
    });

    it('should use default CTA when not provided', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} />);

      expect(screen.getByText('View All')).toBeInTheDocument();
    });

    it('should render section with correct aria-label', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="For You Now" businesses={businesses} />);

      const section = screen.getByRole('region', { name: 'For You Now' });
      expect(section).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should return null when businesses array is empty', () => {
      const { container } = render(<BusinessRow title="Test Row" businesses={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when businesses is null', () => {
      const { container } = render(<BusinessRow title="Test Row" businesses={null as any} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when businesses is undefined', () => {
      const { container } = render(<BusinessRow title="Test Row" businesses={undefined as any} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('should navigate to href when CTA button is clicked', async () => {
      const user = userEvent.setup();
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} href="/for-you" />);

      const ctaButton = screen.getByRole('button', { name: /view all: test row/i });
      await user.click(ctaButton);

      expect(mockPush).toHaveBeenCalledWith('/for-you');
    });

    it('should use default href when not provided', async () => {
      const user = userEvent.setup();
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} />);

      const ctaButton = screen.getByRole('button', { name: /view all: test row/i });
      await user.click(ctaButton);

      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  describe('Route Prefetching', () => {
    it('should prefetch route when component mounts', async () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} href="/for-you" />);

      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/for-you');
      });
    });

    it('should not prefetch if href does not start with /', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} href="invalid" />);

      expect(mockPrefetch).not.toHaveBeenCalled();
    });

    it('should not prefetch if href is empty', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} href="" />);

      expect(mockPrefetch).not.toHaveBeenCalled();
    });

    it('should use requestIdleCallback when available', async () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} href="/for-you" />);

      await waitFor(() => {
        expect((window as any).requestIdleCallback).toHaveBeenCalled();
      });
    });

    it('should fallback to setTimeout when requestIdleCallback is not available', async () => {
      const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
      delete (window as any).requestIdleCallback;

      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} href="/for-you" />);

      await waitFor(() => {
        expect(setTimeoutSpy).toHaveBeenCalled();
      });

      setTimeoutSpy.mockRestore();
    });

    it('should cleanup prefetch on unmount', () => {
      const cancelIdleCallbackSpy = jest.fn();
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
      (window as any).cancelIdleCallback = cancelIdleCallbackSpy;

      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      const { unmount } = render(<BusinessRow title="Test Row" businesses={businesses} href="/for-you" />);

      unmount();

      // Should cleanup if idle callback was used
      expect(cancelIdleCallbackSpy).toHaveBeenCalled();
    });
  });

  describe('Business Cards', () => {
    it('should render all business cards', () => {
      const businesses = [
        createBusiness({ id: '1', name: 'Business 1' }),
        createBusiness({ id: '2', name: 'Business 2' }),
        createBusiness({ id: '3', name: 'Business 3' }),
      ];

      render(<BusinessRow title="Test Row" businesses={businesses} />);

      expect(screen.getByTestId('business-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('business-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('business-card-3')).toBeInTheDocument();
    });

    it('should render cards inside ScrollableSection', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} />);

      expect(screen.getByTestId('scrollable-section')).toBeInTheDocument();
      expect(screen.getByTestId('business-card-1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label on section', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="For You Now" businesses={businesses} />);

      const section = screen.getByRole('region', { name: 'For You Now' });
      expect(section).toBeInTheDocument();
    });

    it('should have correct aria-label on CTA button', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      render(<BusinessRow title="Test Row" businesses={businesses} cta="See More" />);

      const button = screen.getByRole('button', { name: /see more: test row/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct font family', () => {
      const businesses = [createBusiness({ id: '1', name: 'Business 1' })];

      const { container } = render(<BusinessRow title="Test Row" businesses={businesses} />);

      const section = container.querySelector('section');
      expect(section).toHaveStyle({
        fontFamily: expect.stringContaining('Urbanist'),
      });
    });
  });
});

