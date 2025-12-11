/**
 * Unit tests for RegisterPage
 * Tests form validation, user interactions, error handling, and registration flow
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RegisterPage from '@/app/register/page';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { RateLimiter } from '@/app/lib/rateLimiting';
import { usePasswordStrength } from '@/app/components/Auth/Register/usePasswordStrength';

// Mock all dependencies
const mockPush = jest.fn();
const mockShowToast = jest.fn();
const mockRegister = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/register',
}));

jest.mock('@/app/contexts/AuthContext');
jest.mock('@/app/contexts/ToastContext');
jest.mock('@/app/lib/rateLimiting');
jest.mock('@/app/components/Auth/Register/usePasswordStrength');
jest.mock('@/app/hooks/useScrollReveal', () => ({
  useScrollReveal: jest.fn(),
}));
jest.mock('@/app/hooks/usePageTitle', () => ({
  usePredefinedPageTitle: jest.fn(),
}));
jest.mock('@/app/utils/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

// Mock components
jest.mock('@/app/components/Auth/Shared/SocialLoginButtons', () => ({
  SocialLoginButtons: () => <div data-testid="social-login-buttons">Social Login</div>,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockRateLimiter = RateLimiter as jest.Mocked<typeof RateLimiter>;
const mockUsePasswordStrength = usePasswordStrength as jest.MockedFunction<typeof usePasswordStrength>;

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    mockUseAuth.mockReturnValue({
      user: null,
      login: jest.fn(),
      register: mockRegister,
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

    mockUsePasswordStrength.mockReturnValue({
      score: 4,
      feedback: 'Strong password',
      checks: {
        length: true,
        uppercase: true,
        lowercase: true,
        number: true,
      },
      color: 'green',
    });
  });

  describe('Rendering', () => {
    it('should render register page with all elements', async () => {
      render(<RegisterPage />);
      
      // Wait for component to mount (hydration-safe)
      await waitFor(() => {
        expect(screen.getByText(/create your account/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/sign up today/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/choose a username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
    });

    it('should render social login buttons', async () => {
      render(<RegisterPage />);
      await waitFor(() => {
        expect(screen.getByTestId('social-login-buttons')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when fields are empty', async () => {
      render(<RegisterPage />);
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('should disable submit button when password strength is weak', async () => {
      mockUsePasswordStrength.mockReturnValue({
        score: 2,
        feedback: 'Weak password',
        checks: {
          length: true,
          uppercase: false,
          lowercase: true,
          number: false,
        },
        color: 'orange',
      });

      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'weakpass' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('should enable submit button when all validations pass', async () => {
      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 5000 });
    });

    it('should validate username length', async () => {
      render(<RegisterPage />);
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);

      // Test too short
      await fireEvent.change(usernameInput, { target: { value: 'ab' } });
      await fireEvent.blur(usernameInput);

      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });

      // Test too long
      await fireEvent.change(usernameInput, { target: { value: 'a'.repeat(21) } });
      await fireEvent.blur(usernameInput);

      await waitFor(() => {
        expect(screen.getByText(/username must be less than 20 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<RegisterPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);

      await fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      await fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should validate email length limit', async () => {
      render(<RegisterPage />);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const longEmail = 'a'.repeat(250) + '@example.com';

      await fireEvent.change(emailInput, { target: { value: longEmail } });
      await fireEvent.blur(emailInput);

      // Fill other required fields to enable submit
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
      await fireEvent.click(consentCheckbox);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      // Button should be disabled or show error on submit
      if (!submitButton.hasAttribute('disabled')) {
        await fireEvent.click(submitButton);
        await waitFor(() => {
          expect(screen.getByText(/email address is too long/i)).toBeInTheDocument();
        });
      }
    });

    it('should require terms consent', async () => {
      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });

      // Don't check consent
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Check consent
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 5000 });
    });
  });

  describe('Registration Flow', () => {
    it('should call register function with correct data', async () => {
      mockRegister.mockResolvedValue(true);
      
      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 5000 });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith(
          'test@example.com',
          'register'
        );
        expect(mockRegister).toHaveBeenCalledWith(
          'test@example.com',
          'TestPassword123!',
          'testuser'
        );
      });
    });

    it('should show success message on successful registration', async () => {
      mockRegister.mockResolvedValue(true);
      
      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 5000 });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('Account created'),
          'success',
          5000
        );
        expect(mockRateLimiter.recordSuccess).toHaveBeenCalledWith(
          'test@example.com',
          'register'
        );
      });
    });

    it('should show error message on failed registration', async () => {
      mockRegister.mockResolvedValue(false);
      mockUseAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        register: mockRegister,
        logout: jest.fn(),
        isLoading: false,
        error: 'Registration failed. Please try again.',
        isAuthenticated: false,
        isEmailVerified: false,
        resendVerificationEmail: jest.fn(),
      });
      
      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 5000 });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('Registration failed'),
          'sage',
          4000
        );
      });
    });

    it('should handle duplicate email registration', async () => {
      mockRegister.mockResolvedValue(false);
      mockUseAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        register: mockRegister,
        logout: jest.fn(),
        isLoading: false,
        error: 'This email is already registered. Try logging in instead.',
        isAuthenticated: false,
        isEmailVerified: false,
        resendVerificationEmail: jest.fn(),
      });
      
      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'existing@test.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 5000 });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Handling', () => {
    it('should show offline message when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 5000 });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Strength', () => {
    it('should show password strength indicator', async () => {
      render(<RegisterPage />);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);

      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        // Password strength indicator should be visible
        expect(mockUsePasswordStrength).toHaveBeenCalled();
      });
    });

    it('should require password strength score >= 3', async () => {
      mockUsePasswordStrength.mockReturnValue({
        score: 2,
        feedback: 'Weak password',
        checks: {
          length: true,
          uppercase: false,
          lowercase: true,
          number: false,
        },
        color: 'orange',
      });

      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'weakpass' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during registration', async () => {
      mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      render(<RegisterPage />);
      
      const usernameInput = screen.getByPlaceholderText(/choose a username/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
      const consentCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
      await fireEvent.click(consentCheckbox);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 5000 });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      });
    });
  });
});

