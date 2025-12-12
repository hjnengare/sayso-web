/**
 * Unit tests for ClaimBusinessPage component
 * 
 * Tests:
 * - Page renders with search input
 * - Business search functionality
 * - Search debouncing
 * - Business result display
 * - Claim button states based on claim status
 * - Modal opens on claim click
 * - Redirect to login for unauthenticated users
 * - Redirect to dashboard for owned businesses
 * - Status badges display correctly
 * - Empty state display
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClaimBusinessPage from '../../src/app/claim-business/page';

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock contexts
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockUseAuth = jest.fn(() => ({
  user: mockUser,
  isLoading: false,
}));

jest.mock('../../src/app/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Header and Footer
jest.mock('../../src/app/components/Header/Header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('../../src/app/components/Footer/Footer', () => {
  return function MockFooter() {
    return <div data-testid="footer">Footer</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockBusinesses = [
  {
    id: 'business-1',
    name: 'Test Restaurant',
    category: 'Restaurant',
    location: 'Cape Town',
    address: '123 Main St',
    verified: false,
    claim_status: 'unclaimed' as const,
    pending_by_user: false,
    claimed_by_user: false,
  },
  {
    id: 'business-2',
    name: 'Claimed Business',
    category: 'Cafe',
    location: 'Johannesburg',
    verified: true,
    claim_status: 'claimed' as const,
    pending_by_user: false,
    claimed_by_user: false,
  },
  {
    id: 'business-3',
    name: 'My Business',
    category: 'Shop',
    location: 'Durban',
    verified: true,
    claim_status: 'claimed' as const,
    pending_by_user: false,
    claimed_by_user: true,
  },
  {
    id: 'business-4',
    name: 'Pending Business',
    category: 'Bar',
    location: 'Pretoria',
    verified: false,
    claim_status: 'pending' as const,
    pending_by_user: true,
    claimed_by_user: false,
  },
];

describe('ClaimBusinessPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('businessId');
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ businesses: [] }),
    });
  });

  describe('Rendering', () => {
    it('should render page with header and footer', () => {
      render(<ClaimBusinessPage />);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should render page title and description', () => {
      render(<ClaimBusinessPage />);

      expect(screen.getByText(/own or manage a business/i)).toBeInTheDocument();
      expect(screen.getByText(/claim your business profile/i)).toBeInTheDocument();
    });
  });

  describe('Business Search', () => {
    it('should not search with query less than 2 characters', async () => {
      const user = userEvent.setup();
      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'a');

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    it('should search businesses when query is 2+ characters', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: mockBusinesses.slice(0, 1) }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/businesses/search?query=test')
        );
      });
    });

    it('should debounce search requests', async () => {
      const user = userEvent.setup();
      jest.useFakeTimers();

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      expect(global.fetch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });

    it('should display search results', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: mockBusinesses.slice(0, 1) }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
        expect(screen.getByText(/Restaurant/i)).toBeInTheDocument();
        expect(screen.getByText(/Cape Town/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during search', async () => {
      const user = userEvent.setup();
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      // Wait for debounce - check for loading state
      await waitFor(() => {
        // The Loader component has role="status" and aria-label="Loading"
        expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
      }, { timeout: 350 });

      resolveFetch!({
        ok: true,
        json: async () => ({ businesses: [] }),
      });
    });

    it('should show empty state when no results', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/business not found/i)).toBeInTheDocument();
        expect(screen.getByText(/can't find your business/i)).toBeInTheDocument();
      });
    });
  });

  describe('Claim Status Badges', () => {
    it('should show unclaimed badge for unclaimed businesses', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[0]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText(/unclaimed/i)).toBeInTheDocument();
      });
    });

    it('should show pending badge for pending businesses', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[3]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'pending');

      await waitFor(() => {
        expect(screen.getByText(/claim pending/i)).toBeInTheDocument();
      });
    });

    it('should show claimed badge for claimed businesses', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[1]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'claimed');

      await waitFor(() => {
        expect(screen.getByText(/business already claimed/i)).toBeInTheDocument();
      });
    });

    it('should not show badge for user-owned businesses', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[2]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'my');

      await waitFor(() => {
        expect(screen.queryByText(/unclaimed/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/claimed/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    it('should show "Claim this business" for unclaimed businesses', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[0]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /claim this business/i })).toBeInTheDocument();
      });
    });

    it('should show "Go to dashboard" for user-owned businesses', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[2]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'my');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
      });
    });

    it('should show "Claim pending review" for pending businesses', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[3]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'pending');

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /claim pending review/i });
        expect(button).toBeDisabled();
      });
    });

    it('should show "Contact support" for claimed businesses', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[1]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'claimed');

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /contact support/i })).toBeInTheDocument();
      });
    });

    it('should redirect to login for unauthenticated users', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[0]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /log in to claim/i });
        expect(button).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /log in to claim/i }));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/business/login?redirect=/claim-business?businessId=business-1')
      );
    });
  });

  describe('Claim Modal', () => {
    it('should open modal when claim button is clicked', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[0]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /claim this business/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /claim this business/i }));

      await waitFor(() => {
        expect(screen.getByText('Claim Business')).toBeInTheDocument();
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      });
    });

    it('should redirect to dashboard when clicking on owned business', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[2]] }),
      });

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'my');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /go to dashboard/i }));

      expect(mockPush).toHaveBeenCalledWith('/owners/businesses/business-3');
    });
  });

  describe('Query Parameter Handling', () => {
    it('should open modal for businessId in query params after login', async () => {
      mockSearchParams.set('businessId', 'business-1');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[0]] }),
      });

      render(<ClaimBusinessPage />);

      // Simulate search to populate businesses
      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await userEvent.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('Claim Business')).toBeInTheDocument();
      });
    });
  });
});

