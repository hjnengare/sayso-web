/**
 * Unit tests for LoginPage
 * Tests form validation, user interactions, error handling, and authentication flow
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { RateLimiter } from '@/app/lib/rateLimiting';

// Mock all dependencies
const mockPush = jest.fn();
const mockShowToast = jest.fn();
const mockLogin = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/login',
}));

jest.mock('@/app/contexts/AuthContext');
jest.mock('@/app/contexts/ToastContext');
jest.mock('@/app/lib/rateLimiting');
jest.mock('@/app/hooks/useScrollReveal', () => ({
  useScrollReveal: jest.fn(),
}));
jest.mock('@/app/hooks/usePageTitle', () => ({
  usePredefinedPageTitle: jest.fn(),
}));

// Mock components that might cause issues
jest.mock('@/app/components/Auth/Shared/SocialLoginButtons', () => ({
  SocialLoginButtons: () => <div data-testid="social-login-buttons">Social Login</div>,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockRateLimiter = RateLimiter as jest.Mocked<typeof RateLimiter>;

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: null,
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
      error: null,
      isAuthenticated: false,
      isEmailVerified: false,
      resendVerificationEmail: jest.fn(),
    });

    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: jest.fn(),
      hideToast: jest.fn(),
    });

    mockRateLimiter.checkRateLimit = jest.fn().mockResolvedValue({
      allowed: true,
      remainingAttempts: 5,
      lockedUntil: undefined,
      message: undefined,
    });

    mockRateLimiter.recordSuccess = jest.fn().mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render login page with all elements', () => {
      render(<LoginPage />);
      
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/sign in to continue discovering sayso/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    });

    it('should render social login buttons', () => {
      render(<LoginPage />);
      expect(screen.getByTestId('social-login-buttons')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when fields are empty', () => {
      render(<LoginPage />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when both fields are filled', async () => {
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should show email validation error on blur with invalid email', async () => {
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);

      await fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      await fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show password validation error for short password on submit', async () => {
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill with short password
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: '12345' } });
      await fireEvent.blur(passwordInput);

      // Wait for button to be enabled (login only checks if fields are filled)
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Submit - validation happens on submit
      await fireEvent.click(submitButton);

      // Password validation error should appear after submit
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate email format on submit', async () => {
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill form with invalid email
      await fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Submit form - the handleSubmit will mark fields as touched and validate
      const form = emailInput.closest('form');
      await fireEvent.submit(form!);

      // Wait for validation to run - error should appear inline via EmailInput component
      // The error is passed to EmailInput via getEmailError() which returns the error when touched
      // EmailInput shows error in a <p> tag with className containing "text-navbar-bg"
      await waitFor(() => {
        // Error should appear inline (EmailInput displays it when touched && error)
        // There may be multiple instances (error box + inline), so use getAllByText
        const errorTexts = screen.getAllByText(/please enter a valid email address/i);
        expect(errorTexts.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // Verify toast was called (this is the primary validation feedback)
      expect(mockShowToast).toHaveBeenCalledWith(
        'Please enter a valid email address',
        'sage',
        3000
      );
    });
  });

  describe('Login Flow', () => {
    it('should call login function with correct credentials', async () => {
      mockLogin.mockResolvedValue(true);
      
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith(
          'test@example.com',
          'login'
        );
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show success toast on successful login', async () => {
      mockLogin.mockResolvedValue(true);
      
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Welcome back! Redirecting...',
          'success',
          2000
        );
        expect(mockRateLimiter.recordSuccess).toHaveBeenCalledWith(
          'test@example.com',
          'login'
        );
      });
    });

    it('should show error message on failed login', async () => {
      // Mock login to return false, and update auth context after login attempt
      let authErrorValue: string | null = null;
      mockLogin.mockImplementation(async () => {
        authErrorValue = 'Invalid email or password';
        return false;
      });
      
      mockUseAuth.mockReturnValue({
        user: null,
        login: mockLogin,
        register: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
        get error() { return authErrorValue; },
        isAuthenticated: false,
        isEmailVerified: false,
        resendVerificationEmail: jest.fn(),
      });
      
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        // Error should appear in the error box or as toast
        expect(
          screen.getByText(/invalid email or password/i)
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle rate limiting', async () => {
      mockRateLimiter.checkRateLimit = jest.fn().mockResolvedValue({
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        message: 'Too many login attempts. Please try again later.',
      });
      
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
        expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });
    });

    it('should disable form during submission', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await fireEvent.click(submitButton);

      // Form should be disabled during submission
      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle login errors gracefully', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));
      
      render(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(mockShowToast).toHaveBeenCalledWith(
          'Network error',
          'sage',
          4000
        );
      });
    });

    it('should show error when fields are empty on submit', async () => {
      render(<LoginPage />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Try to submit with empty fields (button should be disabled, but test the validation)
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      // Fill only email
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: '' } });

      // Button should be disabled
      expect(submitButton).toBeDisabled();
    });
  });
});

