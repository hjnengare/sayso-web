// src/components/SearchInput/SearchInput.tsx
"use client";

import { useState, useEffect, forwardRef, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Sliders, Map } from "lucide-react";
import MobileMenuToggleIcon from "../Header/MobileMenuToggleIcon";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useLiveSearch, type LiveSearchResult } from "../../hooks/useLiveSearch";

interface SearchInputProps {
  placeholder?: string;
  mobilePlaceholder?: string;
  onSearch?: (query: string) => void;           // fires on change
  onSubmitQuery?: (query: string) => void;      // fires on Enter / submit
  onFilterClick?: () => void;
  onMapClick?: () => void;
  showMap?: boolean;
  isMapMode?: boolean;
  onFocusOpenFilters?: () => void;
  showFilter?: boolean;
  showSearchIcon?: boolean;
  className?: string;
  variant?: "header" | "page";
  activeFilterCount?: number;                   // Number of active filters (for badge)

  /** Suggestions dropdown */
  enableSuggestions?: boolean;
  suggestionsMode?: "business" | "custom";
  maxSuggestions?: number;
  customSuggestions?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    href?: string;
    typeLabel?: string;
  }>;
}

const SearchInput = forwardRef<HTMLFormElement, SearchInputProps>(
  (
    {
      placeholder = "Search...",
      mobilePlaceholder = "Search...",
      onSearch,
      onSubmitQuery,
      onFilterClick,
      onMapClick,
      showMap = false,
      isMapMode = false,
      onFocusOpenFilters,
      showFilter = true,
      showSearchIcon = true,
      className = "",
      variant = "header",
      activeFilterCount = 0,
      enableSuggestions = false,
      suggestionsMode = "business",
      maxSuggestions = 6,
      customSuggestions = [],
    },
    ref
  ) => {
    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();
    const [searchQuery, setSearchQuery] = useState("");
    const [ph, setPh] = useState(placeholder);
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const rootRef = useRef<HTMLFormElement | null>(null);
    const blurTimeoutRef = useRef<number | null>(null);
    const dismissedQueryRef = useRef<string | null>(null);

    const {
      setQuery: setLiveQuery,
      loading: liveLoading,
      results: liveResults,
    } = useLiveSearch({ initialQuery: "", debounceMs: 120 });

    // ref is now the form ref

    useEffect(() => {
      const setByViewport = () => {
        setPh(window.innerWidth >= 1024 ? placeholder : mobilePlaceholder);
      };
      setByViewport();
      window.addEventListener("resize", setByViewport);
      return () => window.removeEventListener("resize", setByViewport);
    }, [placeholder, mobilePlaceholder]);

    useEffect(() => {
      if (!enableSuggestions) return;
      if (suggestionsMode !== "business") return;
      setLiveQuery(searchQuery);
    }, [enableSuggestions, suggestionsMode, searchQuery, setLiveQuery]);

    // Close suggestions on outside click
    useEffect(() => {
      if (!enableSuggestions) return;
      const onDown = (e: MouseEvent) => {
        const target = e.target as Node | null;
        if (!target) return;
        if (rootRef.current?.contains(target)) return;
        setIsFocused(false);
        setActiveIndex(-1);
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [enableSuggestions]);

    useEffect(() => {
      return () => {
        if (blurTimeoutRef.current != null) {
          window.clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
      };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      onSearch?.(value);
      setActiveIndex(-1);
      // Clear dismiss when the query changes so suggestions reappear
      if (dismissedQueryRef.current !== null && value !== dismissedQueryRef.current) {
        dismissedQueryRef.current = null;
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmitQuery?.(searchQuery);
      setIsFocused(false);
      setActiveIndex(-1);
    };

    const businessSuggestions = useMemo(() => {
      if (!enableSuggestions || suggestionsMode !== "business") return [];
      const list = Array.isArray(liveResults) ? liveResults : [];
      return list.slice(0, Math.max(1, maxSuggestions));
    }, [enableSuggestions, suggestionsMode, liveResults, maxSuggestions]);

    const normalizedCustomSuggestions = useMemo(() => {
      if (!enableSuggestions || suggestionsMode !== "custom") return [];
      return (Array.isArray(customSuggestions) ? customSuggestions : []).slice(
        0,
        Math.max(1, maxSuggestions)
      );
    }, [enableSuggestions, suggestionsMode, customSuggestions, maxSuggestions]);

    const isOpen =
      enableSuggestions &&
      isFocused &&
      searchQuery.trim().length > 0 &&
      dismissedQueryRef.current !== searchQuery &&
      (suggestionsMode === "business"
        ? liveLoading || businessSuggestions.length > 0
        : normalizedCustomSuggestions.length > 0);

    const onSelectBusiness = useCallback(
      (item: LiveSearchResult) => {
        if (!item?.id) return;
        setIsFocused(false);
        setActiveIndex(-1);
        router.push(`/business/${item.id}`);
      },
      [router]
    );

    const onSelectCustom = useCallback(
      (item: { href?: string; title: string }) => {
        setIsFocused(false);
        setActiveIndex(-1);
        if (item.href) {
          router.push(item.href);
          return;
        }
        setSearchQuery(item.title);
        onSearch?.(item.title);
        onSubmitQuery?.(item.title);
      },
      [router, onSearch, onSubmitQuery]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!enableSuggestions) return;
      if (!isOpen) return;

      const max =
        suggestionsMode === "business"
          ? businessSuggestions.length
          : normalizedCustomSuggestions.length;
      if (max === 0) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setIsFocused(false);
        setActiveIndex(-1);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % max);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + max) % max);
        return;
      }

      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        if (suggestionsMode === "business") {
          const chosen = businessSuggestions[activeIndex];
          if (chosen) onSelectBusiness(chosen);
        } else {
          const chosen = normalizedCustomSuggestions[activeIndex];
          if (chosen) onSelectCustom(chosen);
        }
      }
    };

    const containerClass =
      variant === "header" ? "w-full" : "relative group w-full sm:w-[90%] md:w-[85%] lg:w-[75%]";

    return (
      <form
        onSubmit={handleSubmit}
        className={`${containerClass} ${className}`}
        ref={(node) => {
          rootRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as any).current = node;
        }}
      >
        <div className="relative">
          {/* Action buttons on the right - Map, Filters */}
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2 z-10">
            {showMap && onMapClick && (
              <button
                type="button"
                onClick={onMapClick}
                className={`flex items-center text-charcoal/60 hover:text-charcoal transition-colors ${
                  isMapMode ? 'text-coral' : ''
                }`}
                aria-label={isMapMode ? "Show list view" : "Show map view"}
              >
                <Map className="w-5 h-5" strokeWidth={2} />
              </button>
            )}
            {showFilter && onFilterClick && (
              <button
                type="button"
                onClick={onFilterClick}
                className="relative flex items-center text-charcoal/60 hover:text-charcoal transition-colors"
                aria-label="Open filters"
              >
                <Sliders className="w-5 h-5" strokeWidth={2} />
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 bg-card-bg text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
            {/* Search icon on the right when showFilter is false and showSearchIcon is true */}
            {!showFilter && !showMap && showSearchIcon && (
              <div className="flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-charcoal/60" strokeWidth={2} />
              </div>
            )}
          </div>

          {/* input - no left icon, simple underline */}
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocusCapture={onFocusOpenFilters}
            onTouchStart={onFocusOpenFilters}
            onFocus={() => {
              if (blurTimeoutRef.current != null) {
                window.clearTimeout(blurTimeoutRef.current);
                blurTimeoutRef.current = null;
              }
              setIsFocused(true);
            }}
            onBlur={() => {
              if (!enableSuggestions) {
                setIsFocused(false);
                return;
              }
              // Allow suggestion clicks without closing prematurely.
              blurTimeoutRef.current = window.setTimeout(() => {
                setIsFocused(false);
                setActiveIndex(-1);
              }, 90);
            }}
            onKeyDown={handleKeyDown}
            placeholder={ph}
            className={`
              w-full bg-transparent border-0 border-b-2 border-charcoal/20
              text-base placeholder:text-base placeholder:text-charcoal/60 font-normal text-charcoal
              focus:outline-none focus:border-charcoal/60
              hover:border-charcoal/30 transition-all duration-200
              ${showFilter && onFilterClick && showMap && onMapClick ? "pr-24" : (showFilter && onFilterClick) || (showMap && onMapClick) ? "pr-12" : showSearchIcon ? "pr-10" : "pr-0"}
              py-3 px-0
            `}
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
            aria-label="Search"
          />

          <AnimatePresence>
            {isOpen && (
              <m.div
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.99 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
                }
                className="absolute left-0 right-0 top-[calc(100%+10px)] z-[60] rounded-[14px] border border-white/50 bg-off-white/95 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.10)] overflow-hidden"
                role="listbox"
                aria-label="Search suggestions"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="px-4 py-3 border-b border-charcoal/10 flex items-center justify-between">
                  <div className="text-xs font-semibold text-charcoal/70">
                    Suggestions
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      dismissedQueryRef.current = searchQuery;
                      setActiveIndex(-1);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-charcoal/60 hover:text-charcoal transition-colors focus:outline-none focus:ring-0"
                    aria-label="Close suggestions"
                  >
                    <MobileMenuToggleIcon isOpen={true} />
                  </button>
                </div>

                <div className="py-2">
                  {suggestionsMode === "business" ? (
                    liveLoading && businessSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-charcoal/60">
                        Searching…
                      </div>
                    ) : (
                      businessSuggestions.map((item, idx) => {
                        const isActive = idx === activeIndex;
                        const label = (item as any).category_label ?? item.category ?? "";
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => onSelectBusiness(item)}
                            className={`mi-tap w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 ${
                              isActive
                                ? "bg-gradient-to-r from-sage/10 to-coral/5"
                                : "hover:bg-charcoal/5"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-charcoal truncate">
                                {item.name}
                              </div>
                              <div className="text-xs text-charcoal/60 truncate">
                                {label ? `${label} • ` : ""}{item.location}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )
                  ) : (
                    normalizedCustomSuggestions.map((item, idx) => {
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => onSelectCustom(item)}
                          className={`mi-tap w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 ${
                            isActive
                              ? "bg-gradient-to-r from-sage/10 to-coral/5"
                              : "hover:bg-charcoal/5"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-charcoal truncate">
                                {item.title}
                              </div>
                              {item.typeLabel && (
                                <span className="shrink-0 rounded-full bg-charcoal/5 px-2 py-0.5 text-[11px] font-semibold text-charcoal/70">
                                  {item.typeLabel}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <div className="text-xs text-charcoal/60 truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    );
  }
);

SearchInput.displayName = "SearchInput";
export default SearchInput;
