/**
 * Unit tests for BusinessRowSkeleton component
 * 
 * Tests:
 * - Rendering with default card count
 * - Rendering with custom card count
 * - Title display
 * - Accessibility attributes
 * - Loading state indicators
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BusinessRowSkeleton from '../../src/app/components/BusinessRow/BusinessRowSkeleton';

describe('BusinessRowSkeleton', () => {
  describe('Rendering', () => {
    it('should render with default card count', () => {
      render(<BusinessRowSkeleton title="Loading Businesses" />);

      const section = screen.getByRole('region', { name: /loading businesses loading/i });
      expect(section).toBeInTheDocument();

      // Should render 4 skeleton cards by default
      const skeletonCards = screen.getAllByRole('generic').filter(
        (el) => el.className.includes('animate-pulse')
      );
      expect(skeletonCards.length).toBeGreaterThanOrEqual(4);
    });

    it('should render with custom card count', () => {
      render(<BusinessRowSkeleton title="Loading" cards={6} />);

      const skeletonCards = screen.getAllByRole('generic').filter(
        (el) => el.className.includes('animate-pulse')
      );
      expect(skeletonCards.length).toBeGreaterThanOrEqual(6);
    });

    it('should render title skeleton', () => {
      const { container } = render(<BusinessRowSkeleton title="Test Title" />);

      // Title skeleton should be present
      const titleSkeleton = container.querySelector('.h-7.w-32');
      expect(titleSkeleton).toBeInTheDocument();
    });

    it('should render CTA skeleton', () => {
      const { container } = render(<BusinessRowSkeleton title="Test Title" />);

      // CTA skeleton should be present
      const ctaSkeleton = container.querySelector('.h-8.w-24');
      expect(ctaSkeleton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label', () => {
      render(<BusinessRowSkeleton title="For You Now" />);

      const section = screen.getByRole('region', { name: /for you now loading/i });
      expect(section).toBeInTheDocument();
    });

    it('should have aria-busy attribute', () => {
      const { container } = render(<BusinessRowSkeleton title="Loading" />);

      const section = container.querySelector('section[aria-busy="true"]');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct font family', () => {
      const { container } = render(<BusinessRowSkeleton title="Test" />);

      const section = container.querySelector('section');
      expect(section).toHaveStyle({
        fontFamily: expect.stringContaining('Urbanist'),
      });
    });

    it('should apply pulse animation to skeleton cards', () => {
      const { container } = render(<BusinessRowSkeleton title="Test" />);

      const skeletonCards = container.querySelectorAll('.animate-pulse');
      expect(skeletonCards.length).toBeGreaterThan(0);
    });
  });

  describe('Card Count Variations', () => {
    it('should render 1 card when specified', () => {
      render(<BusinessRowSkeleton title="Test" cards={1} />);

      const skeletonCards = screen.getAllByRole('generic').filter(
        (el) => el.className.includes('animate-pulse')
      );
      expect(skeletonCards.length).toBeGreaterThanOrEqual(1);
    });

    it('should render 10 cards when specified', () => {
      render(<BusinessRowSkeleton title="Test" cards={10} />);

      const skeletonCards = screen.getAllByRole('generic').filter(
        (el) => el.className.includes('animate-pulse')
      );
      expect(skeletonCards.length).toBeGreaterThanOrEqual(10);
    });
  });
});

