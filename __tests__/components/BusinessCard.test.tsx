/**
 * Unit tests for BusinessCard component
 * 
 * Tests:
 * - Clicking business card navigates to business profile
 * - Keyboard navigation (Enter/Space) navigates to business profile
 * - Route prefetching on mount
 * - Route prefetching on hover
 * - Navigation uses slug when available, falls back to ID
 * - Card renders with business data
 * - Accessibility features
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BusinessCard from '../../src/app/components/BusinessCard/BusinessCard';
import { createBusiness } from '../../__test-utils__/factories/businessFactory';

// Mock next/navigation
const mockPush = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
  }),
}));

// Mock contexts
const mockToggleSavedItem = jest.fn().mockResolvedValue(true);
const mockIsItemSaved = jest.fn().mockReturnValue(false);
const mockShowToast = jest.fn();

jest.mock('../../src/app/contexts/SavedItemsContext', () => ({
  useSavedItems: () => ({
    toggleSavedItem: mockToggleSavedItem,
    isItemSaved: mockIsItemSaved,
  }),
}));

jest.mock('../../src/app/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock hooks
jest.mock('../../src/app/hooks/useReviews', () => ({
  useUserHasReviewed: () => ({
    hasReviewed: false,
  }),
}));

// Mock child components
jest.mock('../../src/app/components/Stars/Stars', () => {
  return function MockStars({ rating }: { rating: number }) {
    return <div data-testid="stars">{rating}</div>;
  };
});

jest.mock('../../src/app/components/PercentileChip/PercentileChip', () => {
  return function MockPercentileChip() {
    return <div data-testid="percentile-chip">Percentile</div>;
  };
});

jest.mock('../../src/app/components/VerifiedBadge/VerifiedBadge', () => {
  return function MockVerifiedBadge() {
    return <div data-testid="verified-badge">Verified</div>;
  };
});

jest.mock('../../src/app/components/Performance/OptimizedImage', () => {
  return function MockOptimizedImage({ alt, src }: { alt: string; src: string }) {
    return <img src={src} alt={alt} data-testid="optimized-image" />;
  };
});

jest.mock('../../src/app/components/Tooltip/Tooltip', () => {
  return function MockTooltip({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  };
});

// Helper to get the main card element (not the map link)
const getMainCard = (container: HTMLElement) => {
  return container.querySelector('[role="link"][tabindex="0"]') as HTMLElement;
};

describe('BusinessCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Navigation to Business Profile', () => {
    it('should navigate to business profile when card is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const business = createBusiness({ 
        id: 'business-123', 
        name: 'Test Restaurant',
        slug: 'test-restaurant'
      });

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
      await user.click(card);

      expect(mockPush).toHaveBeenCalledWith('/business/test-restaurant');
    });

    it('should use slug for navigation when available', async () => {
      const user = userEvent.setup({ delay: null });
      const business = createBusiness({ 
        id: 'business-456', 
        name: 'Coffee Shop',
        slug: 'coffee-shop'
      });

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
      await user.click(card);

      expect(mockPush).toHaveBeenCalledWith('/business/coffee-shop');
      expect(mockPush).not.toHaveBeenCalledWith('/business/business-456');
    });

    it('should fall back to ID when slug is not available', async () => {
      const user = userEvent.setup({ delay: null });
      const business = createBusiness({ 
        id: 'business-789', 
        name: 'No Slug Business'
      });
      delete business.slug;

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
      await user.click(card);

      expect(mockPush).toHaveBeenCalledWith('/business/business-789');
    });

    it('should navigate when clicking on the image area', async () => {
      const user = userEvent.setup({ delay: null });
      const business = createBusiness({ 
        id: 'business-image', 
        name: 'Image Click Test'
      });

      render(<BusinessCard business={business} />);

      const image = screen.getByTestId('optimized-image');
      await user.click(image);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/business/'));
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to business profile when Enter key is pressed', async () => {
      const user = userEvent.setup({ delay: null });
      const business = createBusiness({ 
        id: 'business-keyboard-1', 
        name: 'Keyboard Test 1'
      });

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
      card.focus();
      await user.keyboard('{Enter}');

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/business/'));
    });

    it('should navigate to business profile when Space key is pressed', async () => {
      const user = userEvent.setup({ delay: null });
      const business = createBusiness({ 
        id: 'business-keyboard-2', 
        name: 'Keyboard Test 2'
      });

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
      card.focus();
      await user.keyboard(' ');

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/business/'));
    });

    it('should have correct tabIndex for keyboard accessibility', () => {
      const business = createBusiness({ id: 'business-accessibility' });

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Route Prefetching', () => {
    it('should prefetch business profile route on mount', async () => {
      const business = createBusiness({ 
        id: 'business-prefetch-1',
        name: 'prefetch-test'
      });
      business.slug = 'prefetch-test';

      render(<BusinessCard business={business} />);

      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/business/prefetch-test');
      });
    });

    it('should prefetch review route on mount', async () => {
      const business = createBusiness({ 
        id: 'business-prefetch-2',
        name: 'prefetch-review'
      });
      business.slug = 'prefetch-review';

      render(<BusinessCard business={business} />);

      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/business/prefetch-review/review');
      });
    });

    it('should prefetch routes on hover with debouncing', async () => {
      const user = userEvent.setup({ delay: null });
      const business = createBusiness({ 
        id: 'business-hover',
        name: 'hover-test'
      });
      business.slug = 'hover-test';

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
      
      // Clear initial prefetch calls
      mockPrefetch.mockClear();

      // Hover over card
      await user.hover(card);

      // Fast-forward time to trigger debounced prefetch
      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/business/hover-test');
      });
    });

    it('should cancel prefetch on hover if user moves away quickly', async () => {
      const user = userEvent.setup({ delay: null });
      const business = createBusiness({ 
        id: 'business-hover-cancel',
        slug: 'hover-cancel'
      });

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
      
      // Clear initial prefetch calls
      mockPrefetch.mockClear();

      // Hover and quickly unhover
      await user.hover(card);
      jest.advanceTimersByTime(50); // Less than debounce delay
      await user.unhover(card);
      jest.advanceTimersByTime(100); // Complete debounce delay

      // Should not prefetch if user moved away
      expect(mockPrefetch).not.toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should render business name', () => {
      const business = createBusiness({ 
        id: 'business-render-1',
        name: 'Rendered Business'
      });

      render(<BusinessCard business={business} />);

      expect(screen.getByText('Rendered Business')).toBeInTheDocument();
    });

    it('should render business address when available', () => {
      const business = createBusiness({ 
        id: 'business-render-2',
        location: 'Cape Town'
      });
      business.address = '123 Main Street, Cape Town';

      render(<BusinessCard business={business} />);

      expect(screen.getByText('123 Main Street, Cape Town')).toBeInTheDocument();
    });

    it('should fall back to location when address is not available', () => {
      const business = createBusiness({ 
        id: 'business-render-3',
        location: 'Cape Town'
      });

      render(<BusinessCard business={business} />);

      expect(screen.getByText('Cape Town')).toBeInTheDocument();
    });

    it('should render verified badge when business is verified', () => {
      const business = createBusiness({ 
        id: 'business-verified',
        verified: true
      });

      render(<BusinessCard business={business} />);

      expect(screen.getByTestId('verified-badge')).toBeInTheDocument();
    });

    it('should not render verified badge when business is not verified', () => {
      const business = createBusiness({ 
        id: 'business-not-verified',
        verified: false
      });

      render(<BusinessCard business={business} />);

      expect(screen.queryByTestId('verified-badge')).not.toBeInTheDocument();
    });

    it('should render rating when available', () => {
      const business = createBusiness({ 
        id: 'business-rating',
        average_rating: 4.5,
        total_reviews: 10
      });
      // Set hasRating explicitly or ensure stats are set correctly
      business.hasRating = true;
      business.stats = { average_rating: 4.5 };

      render(<BusinessCard business={business} />);

      // Rating is formatted with toFixed(1), so it should be "4.5"
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('should render "New" badge when business has no rating', () => {
      const business = createBusiness({ 
        id: 'business-new',
        average_rating: 0,
        total_reviews: 0
      });

      render(<BusinessCard business={business} />);

      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });

  describe('Card Variants', () => {
    it('should render in compact mode', () => {
      const business = createBusiness({ id: 'business-compact' });

      const { container } = render(<BusinessCard business={business} compact />);

      const card = container.querySelector('li');
      expect(card).toBeInTheDocument();
    });

    it('should render in grid mode', () => {
      const business = createBusiness({ id: 'business-grid' });

      const { container } = render(<BusinessCard business={business} inGrid />);

      const card = container.querySelector('li');
      expect(card).toBeInTheDocument();
    });

    it('should hide star rating when hideStar is true', () => {
      const business = createBusiness({ 
        id: 'business-hide-star',
        average_rating: 4.5
      });

      render(<BusinessCard business={business} hideStar />);

      // Should not show rating badge
      expect(screen.queryByText('4.5')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct role attribute', () => {
      const business = createBusiness({ id: 'business-aria-1' });

      const { container } = render(<BusinessCard business={business} />);

      const card = getMainCard(container);
      expect(card).toBeInTheDocument();
    });

    it('should have correct snap ID for scroll snapping', () => {
      const business = createBusiness({ id: 'business-snap-1' });

      const { container } = render(<BusinessCard business={business} />);

      const card = container.querySelector('#business-business-snap-1');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle business with no image gracefully', () => {
      const business = createBusiness({ 
        id: 'business-no-image',
        name: 'No Image Business'
      });
      delete business.image_url;

      render(<BusinessCard business={business} />);

      expect(screen.getByText('No Image Business')).toBeInTheDocument();
    });

    it('should handle business with special characters in name', () => {
      const business = createBusiness({ 
        id: 'business-special',
        name: "Joe's Café & Restaurant"
      });

      render(<BusinessCard business={business} />);

      expect(screen.getByText("Joe's Café & Restaurant")).toBeInTheDocument();
    });

    it('should handle business with very long name', () => {
      const business = createBusiness({ 
        id: 'business-long-name',
        name: 'A'.repeat(100)
      });

      render(<BusinessCard business={business} />);

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });
  });
});

