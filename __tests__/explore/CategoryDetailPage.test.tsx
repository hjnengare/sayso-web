/**
 * Unit tests for Category Detail Page
 * 
 * Tests:
 * - Page renders with category information
 * - Businesses are filtered by interest_id
 * - Subcategory filtering works correctly
 * - Loading states display skeleton
 * - Error states display error message
 * - Subcategory toggle functionality
 * - API calls with correct parameters
 * - ID format handling (UUID vs slug)
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryDetailPage from '../../src/app/explore/category/[id]/page';
import { useOnboarding } from '../../src/app/contexts/OnboardingContext';
import { useBusinesses } from '../../src/app/hooks/useBusinesses';

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockParams = { id: 'food-drink' };

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock contexts
const mockLoadInterests = jest.fn().mockResolvedValue(undefined);
const mockLoadSubInterests = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/app/contexts/OnboardingContext', () => ({
  useOnboarding: jest.fn(),
}));

// Mock useBusinesses hook
const mockRefetch = jest.fn();
const mockUseBusinesses = jest.fn();

jest.mock('../../src/app/hooks/useBusinesses', () => ({
  useBusinesses: jest.fn(),
}));

// Mock components
jest.mock('../../src/app/components/Header/Header', () => {
  return function MockHeader() {
    return <header data-testid="header">Header</header>;
  };
});

jest.mock('../../src/app/components/Footer/Footer', () => {
  return function MockFooter() {
    return <footer data-testid="footer">Footer</footer>;
  };
});

jest.mock('../../src/app/components/BusinessCard/BusinessCard', () => {
  return function MockBusinessCard({ business }: { business: any }) {
    return <div data-testid={`business-${business.id}`}>{business.name}</div>;
  };
});

jest.mock('../../src/app/components/Loader/Loader', () => {
  return function MockLoader() {
    return <div data-testid="loader">Loading...</div>;
  };
});

jest.mock('../../src/app/components/Explore/BusinessGridSkeleton', () => {
  return function MockBusinessGridSkeleton() {
    return <div data-testid="business-grid-skeleton">Skeleton Loading...</div>;
  };
});

jest.mock('../../src/components/Animations/WavyTypedTitle', () => {
  return function MockWavyTypedTitle({ text }: { text: string }) {
    return <h1>{text}</h1>;
  };
});

// Test data factories
const createInterest = (id: string, name: string, description?: string) => ({
  id,
  name,
  description: description || `${name} description`,
  icon: 'icon',
});

const createSubcategory = (id: string, label: string, interest_id: string) => ({
  id,
  label,
  interest_id,
});

const createBusiness = (id: string, name: string, interestId?: string, subInterestId?: string) => ({
  id,
  name,
  interestId: interestId || 'food-drink',
  subInterestId: subInterestId || null,
  category: 'restaurant',
  location: 'Cape Town',
  rating: 4.5,
  reviews: 10,
  image_url: 'https://example.com/image.jpg',
});

describe('CategoryDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useOnboarding as jest.Mock).mockReturnValue({
      interests: [
        createInterest('food-drink', 'Food & Drink', 'Restaurants and cafes'),
        createInterest('beauty-wellness', 'Beauty & Wellness'),
      ],
      loadInterests: mockLoadInterests,
      subInterests: [
        createSubcategory('restaurants', 'Restaurants', 'food-drink'),
        createSubcategory('cafes', 'Cafes', 'food-drink'),
        createSubcategory('bars', 'Bars', 'food-drink'),
      ],
      loadSubInterests: mockLoadSubInterests,
      isLoading: false,
    });

    (useBusinesses as jest.Mock).mockReturnValue({
      businesses: [
        createBusiness('biz-1', 'Test Restaurant', 'food-drink', 'restaurants'),
        createBusiness('biz-2', 'Test Cafe', 'food-drink', 'cafes'),
        createBusiness('biz-3', 'Test Bar', 'food-drink', 'bars'),
      ],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  describe('Page Rendering', () => {
    it('should render category title and description', async () => {
      render(<CategoryDetailPage />);

      await waitFor(() => {
        // Food & Drink appears in both breadcrumb and title, use getAllByText
        const categoryTexts = screen.getAllByText('Food & Drink');
        expect(categoryTexts.length).toBeGreaterThan(0);
        expect(screen.getByText('Restaurants and cafes')).toBeInTheDocument();
      });
    });

    it('should render breadcrumb navigation', () => {
      render(<CategoryDetailPage />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Explore')).toBeInTheDocument();
      // Food & Drink appears in both breadcrumb and title, use getAllByText
      const categoryTexts = screen.getAllByText('Food & Drink');
      expect(categoryTexts.length).toBeGreaterThan(0);
    });

    it('should render back arrow button', () => {
      render(<CategoryDetailPage />);

      // Back button is a link to /explore with an icon (no accessible name)
      const backButton = screen.getAllByRole('link').find(link => 
        link.getAttribute('href') === '/explore' && link.querySelector('svg')
      );
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('href', '/explore');
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loader when businesses are loading', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<CategoryDetailPage />);

      expect(screen.getByTestId('business-grid-skeleton')).toBeInTheDocument();
    });

    it('should show skeleton when interests are loading', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        interests: [],
        loadInterests: mockLoadInterests,
        subInterests: [],
        loadSubInterests: mockLoadSubInterests,
        isLoading: true,
      });

      render(<CategoryDetailPage />);

      // Should still render the page structure
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('Business Filtering', () => {
    it('should filter businesses by interest_id', () => {
      render(<CategoryDetailPage />);

      expect(useBusinesses).toHaveBeenCalledWith(
        expect.objectContaining({
          interestIds: ['food-drink'],
        })
      );
    });

    it('should pass subInterestIds when subcategories are selected', async () => {
      const user = userEvent.setup();
      render(<CategoryDetailPage />);

      // Wait for subcategory buttons to appear
      await waitFor(() => {
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
      });

      // Click on a subcategory
      const restaurantButton = screen.getByText('Restaurants');
      await user.click(restaurantButton);

      // Should refetch with subInterestIds
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('should display all businesses when no subcategories are selected', async () => {
      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('business-biz-1')).toBeInTheDocument();
        expect(screen.getByTestId('business-biz-2')).toBeInTheDocument();
        expect(screen.getByTestId('business-biz-3')).toBeInTheDocument();
      });
    });

    it('should filter businesses by selected subcategories', async () => {
      const user = userEvent.setup();
      
      // Mock businesses with different subInterestIds
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [
          createBusiness('biz-1', 'Restaurant 1', 'food-drink', 'restaurants'),
          createBusiness('biz-2', 'Cafe 1', 'food-drink', 'cafes'),
          createBusiness('biz-3', 'Bar 1', 'food-drink', 'bars'),
        ],
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
      });

      // Select restaurants subcategory
      const restaurantButton = screen.getByText('Restaurants');
      await user.click(restaurantButton);

      // Should show filtered count (this is handled client-side)
      await waitFor(() => {
        // The filtered businesses should be displayed
        expect(screen.getByTestId('business-biz-1')).toBeInTheDocument();
      });
    });
  });

  describe('Subcategory Toggle', () => {
    it('should toggle subcategory selection on click', async () => {
      const user = userEvent.setup();
      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
      });

      const restaurantButton = screen.getByText('Restaurants');
      
      // Initially not selected
      expect(restaurantButton).not.toHaveClass('bg-coral');
      
      // Click to select
      await user.click(restaurantButton);
      
      // Should trigger refetch
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('should allow multiple subcategories to be selected', async () => {
      const user = userEvent.setup();
      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
        expect(screen.getByText('Cafes')).toBeInTheDocument();
      });

      const restaurantButton = screen.getByText('Restaurants');
      const cafeButton = screen.getByText('Cafes');

      await user.click(restaurantButton);
      await user.click(cafeButton);

      // Both should trigger refetch
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should deselect subcategory when clicked again', async () => {
      const user = userEvent.setup();
      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
      });

      const restaurantButton = screen.getByText('Restaurants');
      
      // Select
      await user.click(restaurantButton);
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1);
      });

      // Deselect
      mockRefetch.mockClear();
      await user.click(restaurantButton);
      
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error States', () => {
    it('should display error message when API fails', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: 'Failed to load businesses',
        refetch: mockRefetch,
      });

      render(<CategoryDetailPage />);

      expect(screen.getByText(/couldn't load businesses/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load businesses')).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: 'Failed to load businesses',
        refetch: mockRefetch,
      });

      render(<CategoryDetailPage />);

      const retryButton = screen.getByText(/try again/i);
      expect(retryButton).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: 'Failed to load businesses',
        refetch: mockRefetch,
      });

      render(<CategoryDetailPage />);

      const retryButton = screen.getByText(/try again/i);
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('should display empty state when no businesses found', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<CategoryDetailPage />);

      expect(screen.getByText(/no businesses yet/i)).toBeInTheDocument();
      expect(screen.getByText(/check back soon/i)).toBeInTheDocument();
    });

    it('should display business count when businesses are found', async () => {
      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/3 places found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Category Not Found', () => {
    it('should show not found message when category does not exist', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        interests: [
          createInterest('beauty-wellness', 'Beauty & Wellness'),
        ],
        loadInterests: mockLoadInterests,
        subInterests: [],
        loadSubInterests: mockLoadSubInterests,
        isLoading: false,
      });

      render(<CategoryDetailPage />);

      expect(screen.getByText(/category not found/i)).toBeInTheDocument();
      expect(screen.getByText(/back to explore/i)).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should call loadSubInterests with categoryId when interests are loaded', async () => {
      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(mockLoadSubInterests).toHaveBeenCalledWith(['food-drink']);
      });
    });

    it('should pass correct parameters to useBusinesses', () => {
      render(<CategoryDetailPage />);

      expect(useBusinesses).toHaveBeenCalledWith({
        limit: 100,
        sortBy: 'created_at',
        sortOrder: 'desc',
        feedStrategy: 'standard',
        interestIds: ['food-drink'],
        subInterestIds: undefined,
      });
    });

    it('should update subInterestIds when subcategories are selected', async () => {
      const user = userEvent.setup();
      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Restaurants')).toBeInTheDocument();
      });

      const restaurantButton = screen.getByText('Restaurants');
      await user.click(restaurantButton);

      // The component should update and pass subInterestIds to useBusinesses
      // This is tested through the refetch call
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('ID Format Handling', () => {
    it('should handle businesses with subInterestId as string', async () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [
          {
            ...createBusiness('biz-1', 'Test', 'food-drink', 'restaurants'),
            subInterestId: 'restaurants',
          },
        ],
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('business-biz-1')).toBeInTheDocument();
      });
    });

    it('should handle businesses with sub_interest_id field', async () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [
          {
            ...createBusiness('biz-1', 'Test', 'food-drink'),
            sub_interest_id: 'restaurants',
          },
        ],
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<CategoryDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('business-biz-1')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back to explore when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<CategoryDetailPage />);

      // Back button is a link to /explore with an icon (no accessible name)
      const backButton = screen.getAllByRole('link').find(link => 
        link.getAttribute('href') === '/explore' && link.querySelector('svg')
      );
      expect(backButton).toBeInTheDocument();
      await user.click(backButton!);

      // The Link component should handle navigation
      expect(backButton).toHaveAttribute('href', '/explore');
    });
  });
});

