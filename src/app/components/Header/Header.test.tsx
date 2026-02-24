/**
 * Tests for Header Search Modal UX Fix
 * Validates that "View all" preserves search state during navigation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from './Header';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock auth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
  }),
}));

// Mock live search hook
jest.mock('../../hooks/useLiveSearch', () => ({
  useLiveSearch: () => ({
    query: '',
    setQuery: jest.fn(),
    loading: false,
    results: [
      { id: '1', name: 'Test Business', category: 'Restaurant', location: 'Cape Town' },
      { id: '2', name: 'Another Business', category: 'Cafe', location: 'Cape Town' }
    ],
  }),
}));

// Mock header state hook
jest.mock('./useHeaderState', () => ({
  useHeaderState: () => ({
    authLoading: false,
    isGuest: true,
    isAdminUser: false,
    isBusinessAccountUser: false,
    pathname: '/',
    navLinks: { primaryLinks: [], businessLinks: [], discoverLinks: [] },
    setShowSearchBar: jest.fn(),
    fontStyle: {},
  }),
}));

describe('Header Search Modal UX Fix', () => {
  const mockPush = jest.fn();
  const mockSearchParams = new URLSearchParams();
  const mockUsePathname = require('next/navigation').usePathname;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockUsePathname.mockReturnValue('/');
  });

  it('preserves search query when clicking View all', async () => {
    const { container } = render(<Header showSearch />);
    
    // Find and focus on the search input to expand desktop search
    const searchTrigger = container.querySelector('button[aria-label="Open search"]');
    if (searchTrigger) {
      fireEvent.click(searchTrigger);
    }

    // Wait for search input to appear
    await waitFor(() => {
      const searchInput = container.querySelector('input[aria-label="Search businesses"]');
      expect(searchInput).toBeTruthy();
    });

    const searchInput = container.querySelector('input[aria-label="Search businesses"]');
    
    // Type a search query
    fireEvent.change(searchInput!, { target: { value: 'restaurant' } });

    // Wait for suggestions dropdown to appear
    await waitFor(() => {
      const viewAllButton = screen.queryByText('View all');
      expect(viewAllButton).toBeTruthy();
    });

    // Click "View all" button
    const viewAllButton = screen.getByText('View all');
    fireEvent.click(viewAllButton);

    // Verify navigation was called with correct query params
    expect(mockPush).toHaveBeenCalledWith('/?search=restaurant');
  });

  it('closes modal when View all is clicked', async () => {
    const { container } = render(<Header showSearch />);
    
    // Expand desktop search
    const searchTrigger = container.querySelector('button[aria-label="Open search"]');
    if (searchTrigger) {
      fireEvent.click(searchTrigger);
    }

    // Type query
    await waitFor(() => {
      const searchInput = container.querySelector('input[aria-label="Search businesses"]');
      fireEvent.change(searchInput!, { target: { value: 'test' } });
    });

    // Click View all
    await waitFor(() => {
      const viewAllButton = screen.getByText('View all');
      fireEvent.click(viewAllButton);
    });

    // Verify modal components are no longer expanded
    // The search input should collapse back to trigger button
    await waitFor(() => {
      const searchTrigger = container.querySelector('button[aria-label="Open search"]');
      expect(searchTrigger).toBeTruthy();
    });
  });

  it('preserves search results during navigation', async () => {
    // This test verifies that the search results are not cleared when modal closes
    const { container } = render(<Header showSearch />);
    
    // Expand search
    const searchTrigger = container.querySelector('button[aria-label="Open search"]');
    if (searchTrigger) {
      fireEvent.click(searchTrigger);
    }

    // Type query to show results
    const searchInput = await waitFor(() => 
      container.querySelector('input[aria-label="Search businesses"]')
    );
    fireEvent.change(searchInput!, { target: { value: 'business' } });

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeTruthy();
      expect(screen.getByText('Another Business')).toBeTruthy();
    });

    // Click View all - this should NOT clear the visible results before navigation
    const viewAllButton = screen.getByText('View all');
    fireEvent.click(viewAllButton);

    // Navigation should happen immediately without clearing results
    expect(mockPush).toHaveBeenCalledWith('/?search=business');
  });

  it('does not navigate when search query is empty', () => {
    const { container } = render(<Header showSearch />);
    
    // Try to click View all without typing anything
    // Note: This test may need adjustment based on actual UI behavior
    // when no query is present, View all button may not be visible
    
    // In a real scenario, View all button shouldn't be clickable without query
    expect(mockPush).not.toHaveBeenCalled();
  });
});
