/**
 * Unit tests for ClaimModal component
 * 
 * Tests:
 * - Modal renders with business information
 * - Form validation (email required)
 * - Role selection (owner/manager)
 * - Form submission with valid data
 * - Form submission with API error
 * - Modal closes on cancel
 * - Modal prevents background scroll
 * - Success callback on successful claim
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimModal } from '../../src/app/components/BusinessClaim/ClaimModal';

// Mock contexts
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockShowToast = jest.fn();

jest.mock('../../src/app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

jest.mock('../../src/app/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockBusiness = {
  id: 'business-123',
  name: 'Test Restaurant',
  category: 'Restaurant',
  location: 'Cape Town',
};

const defaultProps = {
  business: mockBusiness,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

describe('ClaimModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        request: {
          id: 'request-123',
          business_id: 'business-123',
          status: 'pending',
        },
      }),
    });
  });

  describe('Rendering', () => {
    it('should render modal with business information', () => {
      render(<ClaimModal {...defaultProps} />);

      expect(screen.getByText('Claim Business')).toBeInTheDocument();
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      expect(screen.getByText(/Restaurant • Cape Town/)).toBeInTheDocument();
    });

    it('should render form fields', () => {
      render(<ClaimModal {...defaultProps} />);

      expect(screen.getByLabelText(/Your Role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Additional Notes/i)).toBeInTheDocument();
    });

    it('should pre-fill email from user context', () => {
      render(<ClaimModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should default to owner role', () => {
      render(<ClaimModal {...defaultProps} />);

      const ownerButton = screen.getByRole('button', { name: /owner/i });
      expect(ownerButton).toHaveClass('border-white', 'bg-white/20');
    });

    it('should render close button', () => {
      render(<ClaimModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Role Selection', () => {
    it('should allow switching between owner and manager', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const ownerButton = screen.getByRole('button', { name: /owner/i });
      const managerButton = screen.getByRole('button', { name: /manager/i });

      expect(ownerButton).toHaveClass('border-white', 'bg-white/20');
      expect(managerButton).not.toHaveClass('border-white', 'bg-white/20');

      await user.click(managerButton);

      expect(managerButton).toHaveClass('border-white', 'bg-white/20');
      expect(ownerButton).not.toHaveClass('border-white', 'bg-white/20');
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when email is empty', () => {
      render(<ClaimModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const submitButton = screen.getByRole('button', { name: /submit claim/i });

      userEvent.clear(emailInput);
      
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when email is filled', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const submitButton = screen.getByRole('button', { name: /submit claim/i });

      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@example.com');

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('should submit claim with owner role', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/Phone/i);
      const notesInput = screen.getByLabelText(/Additional Notes/i);
      const submitButton = screen.getByRole('button', { name: /submit claim/i });

      await user.type(phoneInput, '+27123456789');
      await user.type(notesInput, 'I am the owner');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/business/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_id: 'business-123',
            role: 'owner',
            phone: '+27123456789',
            email: 'test@example.com',
            note: 'I am the owner',
          }),
        });
      });
    });

    it('should submit claim with manager role', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const managerButton = screen.getByRole('button', { name: /manager/i });
      const submitButton = screen.getByRole('button', { name: /submit claim/i });

      await user.click(managerButton);
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/business/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_id: 'business-123',
            role: 'manager',
            phone: undefined,
            email: 'test@example.com',
            note: undefined,
          }),
        });
      });
    });

    it('should call onSuccess on successful submission', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /submit claim/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        "Claim request submitted successfully! We'll review it shortly.",
        'success',
        5000
      );
    });

    it('should show error toast on API error', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Business already claimed',
        }),
      });

      render(<ClaimModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /submit claim/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Business already claimed',
          'sage',
          4000
        );
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('should show error toast on network error', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<ClaimModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /submit claim/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'An error occurred. Please try again.',
          'sage',
          4000
        );
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      render(<ClaimModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /submit claim/i });
      await user.click(submitButton);

      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      resolveFetch!({
        ok: true,
        json: async () => ({ success: true }),
      });

      await waitFor(() => {
        expect(screen.queryByText(/submitting/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Close', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should disable close button during submission', async () => {
      const user = userEvent.setup();
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      render(<ClaimModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /submit claim/i });
      await user.click(submitButton);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeDisabled();

      resolveFetch!({
        ok: true,
        json: async () => ({ success: true }),
      });
    });
  });

  describe('Background Scroll Lock', () => {
    it('should lock body scroll when modal opens', () => {
      const originalStyle = document.body.style.position;
      render(<ClaimModal {...defaultProps} />);

      expect(document.body.style.position).toBe('fixed');
      expect(document.body.style.overflow).toBe('hidden');

      // Cleanup
      document.body.style.position = originalStyle;
    });

    it('should restore body scroll when modal closes', () => {
      const originalPosition = document.body.style.position;
      const originalOverflow = document.body.style.overflow;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;

      const { unmount } = render(<ClaimModal {...defaultProps} />);
      unmount();

      expect(document.body.style.position).toBe(originalPosition);
      expect(document.body.style.overflow).toBe(originalOverflow);
      expect(document.body.style.top).toBe(originalTop);
      expect(document.body.style.width).toBe(originalWidth);
    });
  });

  describe('Optional Fields', () => {
    it('should submit without phone and notes', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /submit claim/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/business/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_id: 'business-123',
            role: 'owner',
            phone: undefined,
            email: 'test@example.com',
            note: undefined,
          }),
        });
      });
    });

    it('should allow editing optional fields', async () => {
      const user = userEvent.setup();
      render(<ClaimModal {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/Phone/i);
      const notesInput = screen.getByLabelText(/Additional Notes/i);

      await user.type(phoneInput, '+27123456789');
      await user.type(notesInput, 'Test notes');

      expect(phoneInput).toHaveValue('+27123456789');
      expect(notesInput).toHaveValue('Test notes');
    });
  });
});

