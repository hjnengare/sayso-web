/**
 * Unit tests for OnboardingGuard
 * 
 * Prerequisite Rule: no interests = no subcategories = no deal-breakers = no complete
 * 
 * This guard enforces the prerequisite chain:
 * - /subcategories requires interests
 * - /deal-breakers requires interests AND subcategories
 * - /complete requires interests AND subcategories AND deal-breakers
 * 
 * Tests that guards enforce prerequisites: interests → subcategories → deal-breakers
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import OnboardingGuard from '@/app/components/OnboardingGuard';
import { useAuth } from '@/app/contexts/AuthContext';
import { createUser } from '@test-utils/factories/userFactory';

// Mock dependencies
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();
const mockUsePathname = jest.fn(() => '/');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/app/contexts/AuthContext');
jest.mock('@/app/components/Loader', () => ({
  PageLoader: ({ size, variant, color }: any) => (
    <div data-testid="page-loader">Loading...</div>
  ),
}));

describe('OnboardingGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockUsePathname.mockReturnValue('/');
  });

  describe('Prerequisites Enforcement', () => {
    it('should redirect from /subcategories to /interests if user has no interests', () => {
      const user = createUser({
        interests: [], // No interests
      });
      
      // Add profile
      user.profile = {
        onboarding_step: 'interests',
        onboarding_complete: false,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/subcategories');

      render(
        <OnboardingGuard>
          <div>Subcategories Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).toHaveBeenCalledWith('/interests');
    });

    it('should allow /subcategories if user has interests', () => {
      const user = createUser({
        interests: ['food-drink', 'beauty-wellness'],
      });
      
      // Add profile
      user.profile = {
        onboarding_step: 'subcategories',
        onboarding_complete: false,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/subcategories');

      render(
        <OnboardingGuard>
          <div>Subcategories Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should redirect from /deal-breakers to /subcategories if user has no subcategories', () => {
      const user = createUser({
        interests: ['food-drink'],
      });
      
      // Add profile with empty sub_interests (guard checks user.profile?.sub_interests)
      user.profile = {
        onboarding_step: 'subcategories',
        onboarding_complete: false,
        sub_interests: [], // No subcategories
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/deal-breakers');

      render(
        <OnboardingGuard>
          <div>Deal-Breakers Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).toHaveBeenCalledWith('/subcategories');
    });

    it('should allow /deal-breakers if user has subcategories', () => {
      const user = createUser({
        interests: ['food-drink'],
      });
      
      // Add profile with sub_interests (guard checks user.profile?.sub_interests)
      user.profile = {
        onboarding_step: 'deal-breakers',
        onboarding_complete: false,
        sub_interests: ['sushi', 'italian'], // Has subcategories
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/deal-breakers');

      render(
        <OnboardingGuard>
          <div>Deal-Breakers Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Completed User Redirects', () => {
    it('should redirect completed users away from onboarding routes (except /complete)', () => {
      const user = createUser();
      
      // Domain rule: completed users must be email verified
      user.email_verified = true;
      
      // Add profile with onboarding_complete (guard checks user.profile?.onboarding_complete)
      user.profile = {
        onboarding_step: 'complete',
        onboarding_complete: true,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/interests');

      render(
        <OnboardingGuard>
          <div>Interests Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).toHaveBeenCalledWith('/home');
    });

    it('should allow completed users to access /complete page', () => {
      const user = createUser();
      
      // Domain rule: completed users must be email verified
      user.email_verified = true;
      
      // Add profile with onboarding_complete
      user.profile = {
        onboarding_step: 'complete',
        onboarding_complete: true,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/complete');

      render(
        <OnboardingGuard>
          <div>Complete Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should redirect completed users from /subcategories to /home', () => {
      const user = createUser({
        interests: ['food-drink'], // Must have interests, otherwise interests check happens first
      });
      
      // Domain rule: completed users must be email verified
      user.email_verified = true;
      
      // Add profile with onboarding_complete (guard checks user.profile?.onboarding_complete)
      user.profile = {
        onboarding_step: 'complete',
        onboarding_complete: true,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/subcategories');

      render(
        <OnboardingGuard>
          <div>Subcategories Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).toHaveBeenCalledWith('/home');
    });
  });

  describe('Unauthenticated User Redirects', () => {
    it('should redirect unauthenticated users from protected onboarding steps to /onboarding', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/interests');

      render(
        <OnboardingGuard>
          <div>Interests Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });

    it('should allow unauthenticated users to access /onboarding', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/onboarding');

      render(
        <OnboardingGuard>
          <div>Onboarding Landing</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should allow unauthenticated users to access /register', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/register');

      render(
        <OnboardingGuard>
          <div>Register Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should allow unauthenticated users to access /login', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/login');

      render(
        <OnboardingGuard>
          <div>Login Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Email Verification', () => {
    it('should redirect unverified users from /interests to /verify-email', () => {
      const user = createUser();
      
      // Set email_verified to false (guard checks user.email_verified)
      user.email_verified = false;
      
      // Add profile
      user.profile = {
        onboarding_step: 'interests',
        onboarding_complete: false,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/interests');

      render(
        <OnboardingGuard>
          <div>Interests Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).toHaveBeenCalledWith('/verify-email');
    });

    it('should allow verified users to access /interests', () => {
      const user = createUser();
      
      // Set email_verified directly (guard checks user.email_verified)
      user.email_verified = true;
      
      // Add profile (guard checks user.profile?.onboarding_complete)
      user.profile = {
        onboarding_step: 'interests',
        onboarding_complete: false,
      };

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/interests');

      render(
        <OnboardingGuard>
          <div>Interests Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading while auth is loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true,
      });
      mockUsePathname.mockReturnValue('/interests');

      const { getByTestId } = render(
        <OnboardingGuard>
          <div>Interests Page</div>
        </OnboardingGuard>
      );

      expect(getByTestId('page-loader')).toBeInTheDocument();
    });

    it('should not redirect while loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true,
      });
      mockUsePathname.mockReturnValue('/interests');

      render(
        <OnboardingGuard>
          <div>Interests Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Non-Onboarding Routes', () => {
    it('should not interfere with non-onboarding routes', () => {
      const user = createUser();

      (useAuth as jest.Mock).mockReturnValue({
        user,
        isLoading: false,
      });
      mockUsePathname.mockReturnValue('/home');

      render(
        <OnboardingGuard>
          <div>Home Page</div>
        </OnboardingGuard>
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});

