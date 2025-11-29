// src/components/SearchInput/SearchInput.tsx
"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Search, Sliders } from "react-feather";

interface SearchInputProps {
  placeholder?: string;
  mobilePlaceholder?: string;
  onSearch?: (query: string) => void;           // fires on change
  onSubmitQuery?: (query: string) => void;      // fires on Enter / submit
  onFilterClick?: () => void;
  onFocusOpenFilters?: () => void;
  showFilter?: boolean;
  className?: string;
  variant?: "header" | "page";
}

const SearchInput = forwardRef<HTMLFormElement, SearchInputProps>(
  (
    {
      placeholder = "Search...",
      mobilePlaceholder = "Search...",
      onSearch,
      onSubmitQuery,
      onFilterClick,
      onFocusOpenFilters,
      showFilter = true,
      className = "",
      variant = "header",
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [ph, setPh] = useState(placeholder);

    // ref is now the form ref

    useEffect(() => {
      const setByViewport = () => {
        setPh(window.innerWidth >= 1024 ? placeholder : mobilePlaceholder);
      };
      setByViewport();
      window.addEventListener("resize", setByViewport);
      return () => window.removeEventListener("resize", setByViewport);
    }, [placeholder, mobilePlaceholder]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      onSearch?.(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmitQuery?.(searchQuery);
    };

    const containerClass =
      variant === "header" ? "w-full" : "relative group w-full sm:w-[90%] md:w-[85%] lg:w-[75%]";

    return (
      <form onSubmit={handleSubmit} className={`${containerClass} ${className}`} ref={ref}>
        <div className="relative">
          {/* right icon (filters or search) - positioned on the far right */}
          {showFilter && onFilterClick && (
            <button
              type="button"
              onClick={onFilterClick}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-charcoal/60 hover:text-charcoal transition-colors z-10"
              aria-label="Open filters"
            >
              <Sliders className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
          {/* Search icon on the right when showFilter is false */}
          {!showFilter && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-charcoal/40" strokeWidth={2} />
            </div>
          )}

          {/* input - no left icon, simple underline */}
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocusCapture={onFocusOpenFilters}
            onTouchStart={onFocusOpenFilters}
            placeholder={ph}
            className={`
              w-full bg-transparent border-0 border-b-2 border-charcoal/20
              text-base placeholder:text-base placeholder:text-charcoal/40 font-normal text-charcoal
              focus:outline-none focus:border-charcoal/60
              hover:border-charcoal/30 transition-all duration-200
              ${showFilter && onFilterClick ? "pr-12" : "pr-10"}
              py-3 px-0
            `}
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
            aria-label="Search"
          />
        </div>
      </form>
    );
  }
);

SearchInput.displayName = "SearchInput";
export default SearchInput;
