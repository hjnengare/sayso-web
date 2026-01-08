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

// Mock ToastContext
const mockShowToast = jest.fn();
jest.mock('../../src/app/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock Header and Footer
jest.mock('../../src/app/components/Header/Header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>;
  };
});

// Mock Footer - it's dynamically imported
jest.mock('next/dynamic', () => {
  return (importFn: any) => {
    const importFnStr = importFn.toString();
    if (importFnStr.includes('Footer') || importFnStr.includes('footer')) {
      const MockFooter = () => <div data-testid="footer">Footer</div>;
      MockFooter.displayName = 'Footer';
      return MockFooter;
    }
    // For other dynamic imports, return a simple component
    const MockComponent = () => null;
    MockComponent.displayName = 'DynamicComponent';
    return MockComponent;
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
      const user = userEvent.setup({ delay: null });
      jest.useFakeTimers();

      render(<ClaimBusinessPage />);

      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      expect(global.fetch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

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
        expect(screen.getAllByText(/Restaurant/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Cape Town/i)).toBeInTheDocument();
      }, { timeout: 5000 });
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
      }, { timeout: 5000 });
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
      }, { timeout: 5000 });
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
        expect(screen.getAllByText(/claim pending/i).length).toBeGreaterThan(0);
      }, { timeout: 5000 });
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
        expect(screen.getAllByText(/business already claimed/i).length).toBeGreaterThan(0);
      }, { timeout: 5000 });
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
      }, { timeout: 5000 });
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
      }, { timeout: 5000 });
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
      }, { timeout: 5000 });
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
      }, { timeout: 5000 });
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
      }, { timeout: 5000 });

      await user.click(screen.getByRole('button', { name: /log in to claim/i }));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/login?redirect=/claim-business?businessId=business-1')
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
      }, { timeout: 5000 });

      await user.click(screen.getByRole('button', { name: /claim this business/i }));

      await waitFor(() => {
        expect(screen.getByText('Claim Business')).toBeInTheDocument();
        expect(screen.getAllByText('Test Restaurant').length).toBeGreaterThan(0);
      }, { timeout: 5000 });
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
      }, { timeout: 5000 });

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
      const user = userEvent.setup();
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('Claim Business')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('End-to-End User Flow', () => {
    it('should complete full business claiming flow', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[0]] }),
      });

      render(<ClaimBusinessPage />);

      // Step 1: User searches for business
      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test restaurant');

      // Step 2: Wait for search results
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Step 3: User clicks claim button
      const claimButton = screen.getByRole('button', { name: /claim this business/i });
      await user.click(claimButton);

      // Step 4: Modal opens with form
      await waitFor(() => {
        expect(screen.getByText('Claim Business')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Step 5: User selects role (manager)
      const managerButton = screen.getByRole('button', { name: /manager/i });
      await user.click(managerButton);

      // Step 6: User fills in phone number
      const phoneInput = screen.getByLabelText(/Phone/i);
      await user.type(phoneInput, '+27123456789');

      // Step 7: User adds notes
      const notesInput = screen.getByLabelText(/Additional Notes/i);
      await user.type(notesInput, 'I manage this restaurant');

      // Step 8: Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          request: {
            id: 'request-123',
            business_id: 'business-1',
            status: 'pending',
          },
        }),
      });

      // Step 9: User submits form
      const submitButton = screen.getByRole('button', { name: /submit claim/i });
      await user.click(submitButton);

      // Step 10: Verify API call was made with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/business/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_id: 'business-1',
            role: 'manager',
            phone: '+27123456789',
            email: 'test@example.com',
            note: 'I manage this restaurant',
          }),
        });
      }, { timeout: 5000 });
    });

    it('should handle user canceling the claim flow', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ businesses: [mockBusinesses[0]] }),
      });

      render(<ClaimBusinessPage />);

      // User searches
      const searchInput = screen.getByPlaceholderText(/search for your business/i);
      await user.type(searchInput, 'test');

      // Wait for results
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /claim this business/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      // User opens modal
      await user.click(screen.getByRole('button', { name: /claim this business/i }));

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Claim Business')).toBeInTheDocument();
      }, { timeout: 5000 });

      // User clicks cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Claim Business')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});

