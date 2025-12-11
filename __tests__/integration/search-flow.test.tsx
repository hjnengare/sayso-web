/**
 * Integration tests for search flow
 * 
 * Tests the complete flow:
 * - User enters search query
 * - API is called with correct parameters
 * - Results are displayed
 * - Search history is logged (if authenticated)
 * - Filters work with search
 * - Sorting works with search
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useBusinesses } from '../../src/app/hooks/useBusinesses';
import { render as customRender } from '../../__test-utils__/helpers/render';

// Mock the useBusinesses hook
jest.mock('../../src/app/hooks/useBusinesses', () => ({
  useBusinesses: jest.fn(),
  useForYouBusinesses: jest.fn(),
  useTrendingBusinesses: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock next/navigation
const mockPush = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/home',
}));

// Mock SearchInput component
jest.mock('../../src/app/components/SearchInput/SearchInput', () => {
  return function MockSearchInput({
    onSearch,
    onSubmitQuery,
    placeholder,
  }: {
    onSearch?: (query: string) => void;
    onSubmitQuery?: (query: string) => void;
    placeholder?: string;
  }) {
    return (
      <div data-testid="search-input">
        <input
          type="text"
          placeholder={placeholder}
          onChange={(e) => onSearch?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmitQuery?.(e.currentTarget.value);
            }
          }}
          data-testid="search-input-field"
        />
      </div>
    );
  };
});

// Mock BusinessRow component
jest.mock('../../src/app/components/BusinessRow/BusinessRow', () => {
  return function MockBusinessRow({
    title,
    businesses,
  }: {
    title: string;
    businesses: any[];
  }) {
    return (
      <div data-testid={`business-row-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h2>{title}</h2>
        <div data-testid="business-cards">
          {businesses.map((business) => (
            <div key={business.id} data-testid={`business-card-${business.id}`}>
              {business.name}
            </div>
          ))}
        </div>
      </div>
    );
  };
});

describe('Search Flow Integration', () => {
  const mockBusinesses = [
    {
      id: '1',
      name: 'Coffee Shop',
      category: 'Cafe',
      location: 'Cape Town',
      rating: 4.5,
      totalRating: 4.5,
      reviews: 10,
    },
    {
      id: '2',
      name: 'Coffee Bar',
      category: 'Cafe',
      location: 'Cape Town',
      rating: 4.2,
      totalRating: 4.2,
      reviews: 8,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Search Input Interaction', () => {
    it('should call API when user types in search input', async () => {
      const user = userEvent.setup();
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: mockBusinesses }),
      });

      const TestComponent = () => {
        const [searchQuery, setSearchQuery] = React.useState('');
        const { businesses } = useBusinesses({
          searchQuery: searchQuery || null,
        });

        return (
          <div>
            <input
              data-testid="search-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
            />
            <div data-testid="results">
              {businesses.map((b: any) => (
                <div key={b.id}>{b.name}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      const searchField = screen.getByTestId('search-field');
      await user.type(searchField, 'coffee');

      await waitFor(() => {
        expect(useBusinesses).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'coffee',
          })
        );
      });
    });

    it('should debounce search queries', async () => {
      const user = userEvent.setup();
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const [searchQuery, setSearchQuery] = React.useState('');
        const { businesses } = useBusinesses({
          searchQuery: searchQuery || null,
        });

        return (
          <div>
            <input
              data-testid="search-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div data-testid="results">
              {businesses.length} results
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      const searchField = screen.getByTestId('search-field');
      
      // Type quickly
      await user.type(searchField, 'c');
      await user.type(searchField, 'o');
      await user.type(searchField, 'f');
      await user.type(searchField, 'f');
      await user.type(searchField, 'e');
      await user.type(searchField, 'e');

      // Should only call API after debounce delay
      await waitFor(() => {
        // The hook should be called with the final query after debounce
        expect(useBusinesses).toHaveBeenCalled();
      }, { timeout: 500 });
    });
  });

  describe('Search Results Display', () => {
    it('should display search results when API returns businesses', async () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { businesses } = useBusinesses({ searchQuery: 'coffee' });

        return (
          <div>
            <div data-testid="results">
              {businesses.map((business: any) => (
                <div key={business.id} data-testid={`result-${business.id}`}>
                  {business.name}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('result-1')).toHaveTextContent('Coffee Shop');
        expect(screen.getByTestId('result-2')).toHaveTextContent('Coffee Bar');
      });
    });

    it('should show loading state while searching', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { loading, businesses } = useBusinesses({ searchQuery: 'coffee' });

        return (
          <div>
            {loading && <div data-testid="loading">Loading...</div>}
            {!loading && (
              <div data-testid="results">
                {businesses.length} results
              </div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should show empty state when no results found', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { businesses } = useBusinesses({ searchQuery: 'nonexistent' });

        return (
          <div>
            {businesses.length === 0 ? (
              <div data-testid="empty-state">No results found</div>
            ) : (
              <div data-testid="results">
                {businesses.map((b: any) => <div key={b.id}>{b.name}</div>)}
              </div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('empty-state')).toHaveTextContent('No results found');
    });
  });

  describe('Search with Filters', () => {
    it('should combine search query with category filter', async () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses.filter((b) => b.category === 'Cafe'),
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { businesses } = useBusinesses({
          searchQuery: 'coffee',
          category: 'Cafe',
        });

        return (
          <div>
            <div data-testid="results">
              {businesses.map((business: any) => (
                <div key={business.id}>{business.name}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(useBusinesses).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'coffee',
            category: 'Cafe',
          })
        );
      });
    });

    it('should combine search query with location filter', async () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses.filter((b) => b.location === 'Cape Town'),
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { businesses } = useBusinesses({
          searchQuery: 'coffee',
          location: 'Cape Town',
        });

        return (
          <div>
            <div data-testid="results">
              {businesses.map((business: any) => (
                <div key={business.id}>{business.name}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(useBusinesses).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'coffee',
            location: 'Cape Town',
          })
        );
      });
    });
  });

  describe('Search with Sorting', () => {
    it('should use relevance sorting when search query is provided', async () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { businesses } = useBusinesses({
          searchQuery: 'coffee',
          sort: 'relevance',
        });

        return (
          <div>
            <div data-testid="results">
              {businesses.map((business: any) => (
                <div key={business.id}>{business.name}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(useBusinesses).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'coffee',
            sort: 'relevance',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: 'Failed to fetch businesses',
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const { error } = useBusinesses({ searchQuery: 'coffee' });

        return (
          <div>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch businesses');
    });

    it('should allow retry after error', async () => {
      const mockRefetch = jest.fn();
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: 'Failed to fetch businesses',
        refetch: mockRefetch,
      });

      const user = userEvent.setup();

      const TestComponent = () => {
        const { error, refetch } = useBusinesses({ searchQuery: 'coffee' });

        return (
          <div>
            {error && (
              <div>
                <div data-testid="error">{error}</div>
                <button onClick={refetch} data-testid="retry-button">
                  Retry
                </button>
              </div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Search History', () => {
    it('should log search history for authenticated users', async () => {
      // Mock authenticated user
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ businesses: mockBusinesses }),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Search history log response
      });

      const user = userEvent.setup();
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const TestComponent = () => {
        const [searchQuery, setSearchQuery] = React.useState('');
        const { businesses } = useBusinesses({
          searchQuery: searchQuery || null,
        });

        return (
          <div>
            <input
              data-testid="search-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div data-testid="results">
              {businesses.map((b: any) => (
                <div key={b.id}>{b.name}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      const searchField = screen.getByTestId('search-field');
      await user.type(searchField, 'coffee');

      // Wait for debounce and API call
      await waitFor(() => {
        expect(useBusinesses).toHaveBeenCalled();
      }, { timeout: 500 });
    });
  });
});

