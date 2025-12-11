/**
 * Unit tests for SearchInput component
 * Tests input handling, callbacks, responsive behavior, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchInput from '@/app/components/SearchInput/SearchInput';

// Mock react-feather icons
jest.mock('react-feather', () => ({
  Search: ({ className, ...props }: any) => <div data-testid="search-icon" className={className} {...props} />,
  Sliders: ({ className, ...props }: any) => <div data-testid="sliders-icon" className={className} {...props} />,
}));

describe('SearchInput', () => {
  beforeEach(() => {
    // Reset window.innerWidth to default
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<SearchInput />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search...');
      expect(input).toHaveValue('');
    });

    it('should render with custom placeholder', () => {
      render(<SearchInput placeholder="Search businesses..." />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      expect(input).toHaveAttribute('placeholder', 'Search businesses...');
    });

    it('should render filter button when showFilter is true and onFilterClick is provided', () => {
      const mockFilterClick = jest.fn();
      render(<SearchInput showFilter={true} onFilterClick={mockFilterClick} />);
      
      const filterButton = screen.getByRole('button', { name: /open filters/i });
      expect(filterButton).toBeInTheDocument();
      expect(screen.getByTestId('sliders-icon')).toBeInTheDocument();
    });

    it('should not render filter button when showFilter is false', () => {
      render(<SearchInput showFilter={false} />);
      
      expect(screen.queryByRole('button', { name: /open filters/i })).not.toBeInTheDocument();
    });

    it('should render search icon when showFilter is false and showSearchIcon is true', () => {
      render(<SearchInput showFilter={false} showSearchIcon={true} />);
      
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should not render search icon when showSearchIcon is false', () => {
      render(<SearchInput showFilter={false} showSearchIcon={false} />);
      
      expect(screen.queryByTestId('search-icon')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<SearchInput className="custom-class" />);
      
      const form = container.querySelector('form');
      expect(form).toHaveClass('custom-class');
    });

    it('should apply header variant styling by default', () => {
      const { container } = render(<SearchInput variant="header" />);
      
      const form = container.querySelector('form');
      expect(form).toHaveClass('w-full');
    });

    it('should apply page variant styling', () => {
      const { container } = render(<SearchInput variant="page" />);
      
      const form = container.querySelector('form');
      expect(form).toHaveClass('relative', 'group', 'w-full');
    });
  });

  describe('Input Handling', () => {
    it('should update input value on change', () => {
      render(<SearchInput />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      fireEvent.change(input, { target: { value: 'restaurant' } });
      
      expect(input).toHaveValue('restaurant');
    });

    it('should call onSearch callback on input change', () => {
      const mockOnSearch = jest.fn();
      render(<SearchInput onSearch={mockOnSearch} />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      fireEvent.change(input, { target: { value: 'cafe' } });
      
      expect(mockOnSearch).toHaveBeenCalledWith('cafe');
    });

    it('should call onSearch with empty string when input is cleared', () => {
      const mockOnSearch = jest.fn();
      render(<SearchInput onSearch={mockOnSearch} />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.change(input, { target: { value: '' } });
      
      expect(mockOnSearch).toHaveBeenCalledWith('');
      expect(mockOnSearch).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple input changes', () => {
      const mockOnSearch = jest.fn();
      render(<SearchInput onSearch={mockOnSearch} />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });
      
      expect(mockOnSearch).toHaveBeenCalledTimes(3);
      expect(mockOnSearch).toHaveBeenNthCalledWith(1, 'a');
      expect(mockOnSearch).toHaveBeenNthCalledWith(2, 'ab');
      expect(mockOnSearch).toHaveBeenNthCalledWith(3, 'abc');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmitQuery on form submit', () => {
      const mockOnSubmitQuery = jest.fn();
      render(<SearchInput onSubmitQuery={mockOnSubmitQuery} />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      const form = input.closest('form');
      
      fireEvent.change(input, { target: { value: 'pizza' } });
      fireEvent.submit(form!);
      
      expect(mockOnSubmitQuery).toHaveBeenCalledWith('pizza');
    });

    it('should prevent default form submission behavior', () => {
      const mockOnSubmitQuery = jest.fn();
      const { container } = render(<SearchInput onSubmitQuery={mockOnSubmitQuery} />);
      
      const form = container.querySelector('form')!;
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(submitEvent, 'preventDefault');
      
      fireEvent(form, submitEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should submit empty string if input is empty', () => {
      const mockOnSubmitQuery = jest.fn();
      render(<SearchInput onSubmitQuery={mockOnSubmitQuery} />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      const form = input.closest('form');
      
      fireEvent.submit(form!);
      
      expect(mockOnSubmitQuery).toHaveBeenCalledWith('');
    });

    it('should not call onSubmitQuery if not provided', () => {
      const { container } = render(<SearchInput />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      const form = input.closest('form');
      
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.submit(form!);
      
      // Should not throw error
      expect(input).toHaveValue('test');
    });
  });

  describe('Filter Button', () => {
    it('should call onFilterClick when filter button is clicked', () => {
      const mockFilterClick = jest.fn();
      render(<SearchInput showFilter={true} onFilterClick={mockFilterClick} />);
      
      const filterButton = screen.getByRole('button', { name: /open filters/i });
      fireEvent.click(filterButton);
      
      expect(mockFilterClick).toHaveBeenCalledTimes(1);
    });

    it('should not render filter button when onFilterClick is not provided', () => {
      render(<SearchInput showFilter={true} />);
      
      expect(screen.queryByRole('button', { name: /open filters/i })).not.toBeInTheDocument();
    });

    it('should not render filter button when showFilter is false even if onFilterClick is provided', () => {
      const mockFilterClick = jest.fn();
      render(<SearchInput showFilter={false} onFilterClick={mockFilterClick} />);
      
      expect(screen.queryByRole('button', { name: /open filters/i })).not.toBeInTheDocument();
    });
  });

  describe('Focus and Touch Events', () => {
    it('should call onFocusOpenFilters on input focus', () => {
      const mockOnFocusOpenFilters = jest.fn();
      render(<SearchInput onFocusOpenFilters={mockOnFocusOpenFilters} />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      fireEvent.focus(input);
      
      expect(mockOnFocusOpenFilters).toHaveBeenCalledTimes(1);
    });

    it('should call onFocusOpenFilters on touch start', () => {
      const mockOnFocusOpenFilters = jest.fn();
      render(<SearchInput onFocusOpenFilters={mockOnFocusOpenFilters} />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      fireEvent.touchStart(input);
      
      expect(mockOnFocusOpenFilters).toHaveBeenCalledTimes(1);
    });

    it('should not call onFocusOpenFilters if not provided', () => {
      render(<SearchInput />);
      
      const input = screen.getByRole('textbox', { name: /search/i });
      
      expect(() => {
        fireEvent.focus(input);
        fireEvent.touchStart(input);
      }).not.toThrow();
    });
  });

  describe('Responsive Placeholder', () => {
    it('should use desktop placeholder when viewport width >= 1024px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(
        <SearchInput
          placeholder="Desktop placeholder"
          mobilePlaceholder="Mobile placeholder"
        />
      );

      const input = screen.getByRole('textbox', { name: /search/i });
      expect(input).toHaveAttribute('placeholder', 'Desktop placeholder');
    });

    it('should use mobile placeholder when viewport width < 1024px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      render(
        <SearchInput
          placeholder="Desktop placeholder"
          mobilePlaceholder="Mobile placeholder"
        />
      );

      const input = screen.getByRole('textbox', { name: /search/i });
      expect(input).toHaveAttribute('placeholder', 'Mobile placeholder');
    });

    it('should update placeholder on window resize', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(
        <SearchInput
          placeholder="Desktop placeholder"
          mobilePlaceholder="Mobile placeholder"
        />
      );

      let input = screen.getByRole('textbox', { name: /search/i });
      expect(input).toHaveAttribute('placeholder', 'Desktop placeholder');

      // Simulate resize to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        input = screen.getByRole('textbox', { name: /search/i });
        expect(input).toHaveAttribute('placeholder', 'Mobile placeholder');
      });
    });

    it('should clean up resize event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = render(<SearchInput />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to form element', () => {
      const ref = React.createRef<HTMLFormElement>();
      render(<SearchInput ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLFormElement);
      expect(ref.current?.tagName).toBe('FORM');
    });

    it('should allow accessing form element via ref', () => {
      const ref = React.createRef<HTMLFormElement>();
      render(<SearchInput ref={ref} />);

      const form = ref.current;
      expect(form).toBeInTheDocument();
      expect(form?.querySelector('input')).toBeInTheDocument();
    });
  });

  describe('Input Styling', () => {
    it('should apply correct padding when filter button is shown', () => {
      const { container } = render(
        <SearchInput showFilter={true} onFilterClick={jest.fn()} />
      );

      const input = container.querySelector('input');
      expect(input).toHaveClass('pr-12');
    });

    it('should apply correct padding when search icon is shown', () => {
      const { container } = render(
        <SearchInput showFilter={false} showSearchIcon={true} />
      );

      const input = container.querySelector('input');
      expect(input).toHaveClass('pr-10');
    });

    it('should apply no right padding when no icons are shown', () => {
      const { container } = render(
        <SearchInput showFilter={false} showSearchIcon={false} />
      );

      const input = container.querySelector('input');
      expect(input).toHaveClass('pr-0');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on input', () => {
      render(<SearchInput />);

      const input = screen.getByRole('textbox', { name: /search/i });
      expect(input).toHaveAttribute('aria-label', 'Search');
    });

    it('should have aria-label on filter button', () => {
      render(<SearchInput showFilter={true} onFilterClick={jest.fn()} />);

      const filterButton = screen.getByRole('button', { name: /open filters/i });
      expect(filterButton).toHaveAttribute('aria-label', 'Open filters');
    });
  });

  describe('Integration', () => {
    it('should handle complete search flow: type, submit, filter', () => {
      const mockOnSearch = jest.fn();
      const mockOnSubmitQuery = jest.fn();
      const mockOnFilterClick = jest.fn();

      render(
        <SearchInput
          onSearch={mockOnSearch}
          onSubmitQuery={mockOnSubmitQuery}
          showFilter={true}
          onFilterClick={mockOnFilterClick}
        />
      );

      const input = screen.getByRole('textbox', { name: /search/i });
      const form = input.closest('form');
      const filterButton = screen.getByRole('button', { name: /open filters/i });

      // Type in search
      fireEvent.change(input, { target: { value: 'coffee shop' } });
      expect(mockOnSearch).toHaveBeenCalledWith('coffee shop');

      // Submit form
      fireEvent.submit(form!);
      expect(mockOnSubmitQuery).toHaveBeenCalledWith('coffee shop');

      // Click filter
      fireEvent.click(filterButton);
      expect(mockOnFilterClick).toHaveBeenCalledTimes(1);
    });

    it('should maintain state across multiple interactions', () => {
      render(<SearchInput />);

      const input = screen.getByRole('textbox', { name: /search/i });

      fireEvent.change(input, { target: { value: 'test' } });
      expect(input).toHaveValue('test');

      fireEvent.change(input, { target: { value: 'test query' } });
      expect(input).toHaveValue('test query');

      fireEvent.change(input, { target: { value: '' } });
      expect(input).toHaveValue('');
    });
  });
});

