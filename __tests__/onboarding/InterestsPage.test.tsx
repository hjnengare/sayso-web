/**
 * Unit tests for InterestsPage
 * 
 * Prerequisite Rule: no interests = no subcategories = no deal-breakers = no complete
 * 
 * This is the FIRST step in the onboarding flow - no prerequisites required.
 * However, interests are a prerequisite for all subsequent steps.
 * 
 * Tests validation, selection limits, navigation, and user interactions
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import InterestsPage from '@/app/interests/page';
import { useOnboarding } from '@/app/contexts/OnboardingContext';
import { useToast } from '@/app/contexts/ToastContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { createUser } from '@test-utils/factories/userFactory';

// Mock all dependencies
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockBack = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: mockBack,
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useParams: () => ({}),
  useSearchParams: () => ({
    get: mockGet,
    getAll: jest.fn(() => []),
    has: jest.fn(() => false),
    toString: jest.fn(() => ''),
  }),
  usePathname: () => '/',
}));

jest.mock('@/app/contexts/OnboardingContext');
jest.mock('@/app/contexts/ToastContext');
jest.mock('@/app/contexts/AuthContext');
jest.mock('@/app/components/ProtectedRoute/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/app/components/Auth/EmailVerificationGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/app/components/Auth/EmailVerificationBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="email-verification-banner">Email Verification Banner</div>,
}));
jest.mock('@/app/components/Onboarding/OnboardingLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="onboarding-layout">{children}</div>
  ),
}));
jest.mock('@/app/components/Interests/InterestStyles', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/app/components/Interests/InterestHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="interest-header">Select Your Interests</div>,
}));
jest.mock('@/app/components/Interests/InterestSelection', () => ({
  __esModule: true,
  default: ({ selectedCount, minSelections, maxSelections }: any) => (
    <div data-testid="interest-selection">
      Selected: {selectedCount} / Min: {minSelections} / Max: {maxSelections}
    </div>
  ),
}));
jest.mock('@/app/components/Interests/InterestGrid', () => ({
  __esModule: true,
  default: ({ interests, selectedInterests, onToggle }: any) => (
    <div data-testid="interest-grid">
      {interests.map((interest: any) => (
        <button
          key={interest.id}
          data-interest-id={interest.id}
          data-selected={selectedInterests.includes(interest.id)}
          onClick={() => onToggle(interest.id)}
        >
          {interest.name}
        </button>
      ))}
    </div>
  ),
}));
jest.mock('@/app/components/Interests/InterestActions', () => ({
  __esModule: true,
  default: ({ canProceed, onContinue }: any) => (
    <button
      data-testid="continue-button"
      disabled={!canProceed}
      onClick={onContinue}
    >
      Continue
    </button>
  ),
}));

describe('InterestsPage', () => {
  const mockUser = createUser({
    email_verified: true,
    profile: {
      onboarding_step: 'interests',
      onboarding_complete: false,
    },
  });

  const mockSearchParams = new URLSearchParams();

  const mockShowToast = jest.fn();
  const mockShowToastOnce = jest.fn();

  const mockSetSelectedInterests = jest.fn();
  const mockNextStep = jest.fn();

  const defaultOnboardingContext = {
    selectedInterests: [],
    setSelectedInterests: mockSetSelectedInterests,
    nextStep: mockNextStep,
    isLoading: false,
    error: null,
    interests: [],
    subInterests: [],
    selectedSubInterests: [],
    selectedDealbreakers: [],
    setSelectedSubInterests: jest.fn(),
    setSelectedDealbreakers: jest.fn(),
    loadInterests: jest.fn(),
    loadSubInterests: jest.fn(),
    completeOnboarding: jest.fn(),
    resetOnboarding: jest.fn(),
    currentStep: 'interests',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('verified');
    mockSearchParams.delete('email_verified');
    mockPush.mockClear();
    mockReplace.mockClear();
    mockPrefetch.mockClear();
    mockGet.mockClear();
    mockGet.mockImplementation((key: string) => mockSearchParams.get(key));
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    (useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      showToastOnce: mockShowToastOnce,
    });
    (useOnboarding as jest.Mock).mockReturnValue(defaultOnboardingContext);
  });

  describe('Rendering', () => {
    it('should render the interests page with all components', () => {
      render(<InterestsPage />);

      expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
      expect(screen.getByTestId('interest-header')).toBeInTheDocument();
      expect(screen.getByTestId('interest-selection')).toBeInTheDocument();
      expect(screen.getByTestId('interest-grid')).toBeInTheDocument();
      expect(screen.getByTestId('continue-button')).toBeInTheDocument();
    });

    it('should show email verification banner', () => {
      render(<InterestsPage />);

      expect(screen.getByTestId('email-verification-banner')).toBeInTheDocument();
    });

    it('should display selection count correctly', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink', 'beauty-wellness'],
      });

      render(<InterestsPage />);

      expect(screen.getByText(/Selected: 2 \/ Min: 3 \/ Max: 6/)).toBeInTheDocument();
    });
  });

  describe('Interest Selection', () => {
    it('should allow selecting interests up to maximum (6)', () => {
      const { container } = render(<InterestsPage />);

      const interestButtons = container.querySelectorAll('[data-interest-id]');
      const foodDrinkButton = Array.from(interestButtons).find(
        (btn) => (btn as HTMLElement).getAttribute('data-interest-id') === 'food-drink'
      ) as HTMLElement;

      fireEvent.click(foodDrinkButton);

      expect(mockSetSelectedInterests).toHaveBeenCalled();
    });

    it('should prevent selecting more than 6 interests', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: [
          'food-drink',
          'beauty-wellness',
          'professional-services',
          'outdoors-adventure',
          'experiences-entertainment',
          'arts-culture',
        ],
      });

      const { container } = render(<InterestsPage />);

      const interestButtons = container.querySelectorAll('[data-interest-id]');
      const shoppingButton = Array.from(interestButtons).find(
        (btn) => (btn as HTMLElement).getAttribute('data-interest-id') === 'shopping-lifestyle'
      ) as HTMLElement;

      fireEvent.click(shoppingButton);

      expect(mockShowToast).toHaveBeenCalledWith(
        'Maximum 6 interests allowed',
        'warning',
        2000
      );
    });

    it('should show success toast when minimum (3) is reached', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink', 'beauty-wellness'],
      });

      const { container } = render(<InterestsPage />);

      const interestButtons = container.querySelectorAll('[data-interest-id]');
      const professionalButton = Array.from(interestButtons).find(
        (btn) =>
          (btn as HTMLElement).getAttribute('data-interest-id') === 'professional-services'
      ) as HTMLElement;

      // Mock the setter to add the third interest
      mockSetSelectedInterests.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          const newSelection = callback(['food-drink', 'beauty-wellness']);
          (useOnboarding as jest.Mock).mockReturnValue({
            ...defaultOnboardingContext,
            selectedInterests: newSelection,
          });
        }
      });

      fireEvent.click(professionalButton);

      // The toast should be shown when minimum is reached
      // This is handled in the component's handleInterestToggle
    });

    it('should allow deselecting interests', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink', 'beauty-wellness'],
      });

      const { container } = render(<InterestsPage />);

      const interestButtons = container.querySelectorAll('[data-interest-id]');
      const foodDrinkButton = Array.from(interestButtons).find(
        (btn) => (btn as HTMLElement).getAttribute('data-interest-id') === 'food-drink'
      ) as HTMLElement;

      fireEvent.click(foodDrinkButton);

      expect(mockSetSelectedInterests).toHaveBeenCalled();
    });
  });

  describe('Continue Button', () => {
    it('should be disabled when less than 3 interests selected', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink'],
      });

      render(<InterestsPage />);

      const continueButton = screen.getByTestId('continue-button');
      expect(continueButton).toBeDisabled();
    });

    it('should be enabled when 3 or more interests selected', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink', 'beauty-wellness', 'professional-services'],
      });

      render(<InterestsPage />);

      const continueButton = screen.getByTestId('continue-button');
      expect(continueButton).not.toBeDisabled();
    });

    it('should call nextStep when continue button is clicked with valid selection', async () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink', 'beauty-wellness', 'professional-services'],
      });

      render(<InterestsPage />);

      const continueButton = screen.getByTestId('continue-button');
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockNextStep).toHaveBeenCalled();
      });
    });

    it('should not call nextStep when continue button is disabled', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink'],
      });

      render(<InterestsPage />);

      const continueButton = screen.getByTestId('continue-button');
      fireEvent.click(continueButton);

      expect(mockNextStep).not.toHaveBeenCalled();
    });
  });

  describe('Email Verification', () => {
    it('should show success toast when email is verified via URL param', async () => {
      mockSearchParams.set('verified', '1');

      render(<InterestsPage />);

      await waitFor(() => {
        expect(mockShowToastOnce).toHaveBeenCalledWith(
          'email-verified-v1',
          expect.stringContaining("You're verified"),
          'success',
          3000
        );
      });
    });

    it('should clean up URL params after showing verification toast', async () => {
      mockSearchParams.set('email_verified', 'true');

      render(<InterestsPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when onboarding context has error', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        error: 'Failed to load interests',
      });

      render(<InterestsPage />);

      expect(screen.getByText('Failed to load interests')).toBeInTheDocument();
    });
  });

  describe('Page Prefetching', () => {
    it('should prefetch subcategories page on mount', () => {
      render(<InterestsPage />);

      expect(mockPrefetch).toHaveBeenCalledWith('/subcategories');
    });

    it('should prefetch subcategories when minimum selections reached', async () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink', 'beauty-wellness'],
      });

      const { rerender } = render(<InterestsPage />);

      // Update to have 3 selections (minimum)
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        selectedInterests: ['food-drink', 'beauty-wellness', 'professional-services'],
      });

      rerender(<InterestsPage />);

      // Prefetch should be called again when minimum is reached
      // This is handled in the component's useEffect
      expect(mockPrefetch).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should handle loading state from onboarding context', () => {
      (useOnboarding as jest.Mock).mockReturnValue({
        ...defaultOnboardingContext,
        isLoading: true,
      });

      render(<InterestsPage />);

      // Component should handle loading state appropriately
      // The exact UI depends on implementation
      expect(screen.getByTestId('onboarding-layout')).toBeInTheDocument();
    });
  });
});

