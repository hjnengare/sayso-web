/**
 * Unit tests for HomeBackgroundOrbs component
 * 
 * Tests:
 * - Rendering orbs
 * - CSS styles injection
 * - Accessibility (aria-hidden)
 * - Orb count
 * - Animation keyframes
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import HomeBackgroundOrbs from '../../src/app/components/Home/HomeBackgroundOrbs';

describe('HomeBackgroundOrbs', () => {
  describe('Rendering', () => {
    it('should render all 6 orbs', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      const orbs = container.querySelectorAll('.floating-orb');
      expect(orbs).toHaveLength(6);
    });

    it('should render orbs with correct classes', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      expect(container.querySelector('.floating-orb-1')).toBeInTheDocument();
      expect(container.querySelector('.floating-orb-2')).toBeInTheDocument();
      expect(container.querySelector('.floating-orb-3')).toBeInTheDocument();
      expect(container.querySelector('.floating-orb-4')).toBeInTheDocument();
      expect(container.querySelector('.floating-orb-5')).toBeInTheDocument();
      expect(container.querySelector('.floating-orb-6')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden on all orbs', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      const orbs = container.querySelectorAll('.floating-orb');
      orbs.forEach((orb) => {
        expect(orb).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('CSS Styles', () => {
    it('should inject CSS styles', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      const styleTag = container.querySelector('style');
      expect(styleTag).toBeInTheDocument();
      expect(styleTag?.textContent).toContain('floating-orb');
    });

    it('should include animation keyframes', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      const styleTag = container.querySelector('style');
      const styles = styleTag?.textContent || '';

      expect(styles).toContain('@keyframes float1');
      expect(styles).toContain('@keyframes float2');
      expect(styles).toContain('@keyframes float3');
      expect(styles).toContain('@keyframes float4');
      expect(styles).toContain('@keyframes float5');
    });

    it('should include base orb styles', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      const styleTag = container.querySelector('style');
      const styles = styleTag?.textContent || '';

      expect(styles).toContain('.floating-orb');
      expect(styles).toContain('border-radius: 50%');
      expect(styles).toContain('filter: blur');
      expect(styles).toContain('pointer-events: none');
    });

    it('should include responsive styles for mobile', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      const styleTag = container.querySelector('style');
      const styles = styleTag?.textContent || '';

      expect(styles).toContain('@media (max-width: 768px)');
    });

    it('should include reduced motion styles', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      const styleTag = container.querySelector('style');
      const styles = styleTag?.textContent || '';

      expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
      expect(styles).toContain('animation: none');
    });
  });

  describe('Orb Positioning', () => {
    it('should render orbs with different positions', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      // Each orb should have unique class
      const orb1 = container.querySelector('.floating-orb-1');
      const orb2 = container.querySelector('.floating-orb-2');
      const orb3 = container.querySelector('.floating-orb-3');

      expect(orb1).toBeInTheDocument();
      expect(orb2).toBeInTheDocument();
      expect(orb3).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render as fragment with style and orbs', () => {
      const { container } = render(<HomeBackgroundOrbs />);

      // Should have style tag
      expect(container.querySelector('style')).toBeInTheDocument();

      // Should have all orbs
      const orbs = container.querySelectorAll('.floating-orb');
      expect(orbs.length).toBe(6);
    });
  });
});

