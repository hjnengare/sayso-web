// src/components/Header/Header.tsx
"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import MobileMenu from "./MobileMenu";
import HeaderSkeleton from "./HeaderSkeleton";
import { useHeaderState } from "./useHeaderState";
import { getLogoHref } from "./headerActionsConfig";
import { useLiveSearch, type LiveSearchResult } from "../../hooks/useLiveSearch";
import { usePrefetchRoutes } from "../../hooks/usePrefetchRoutes";
import { AdminHeaderRole } from "./roles/AdminHeaderRole";
import { PersonalHeaderRole } from "./roles/PersonalHeaderRole";
import { BusinessHeaderRole } from "./roles/BusinessHeaderRole";

export default function Header({
  showSearch = true,
  variant = "white",
  backgroundClassName,
  searchLayout = "floating",
  forceSearchOpen = false,
  forcePersonalMode = false,
  topPosition = "top-6",
  reducedPadding = false,
  whiteText = true,
  heroMode = false,
  heroSearchButton = false,
}: {
  showSearch?: boolean;
  variant?: "white" | "frosty";
  backgroundClassName?: string;
  searchLayout?: "floating" | "stacked";
  forceSearchOpen?: boolean;
  forcePersonalMode?: boolean;
  topPosition?: string;
  reducedPadding?: boolean;
  whiteText?: boolean;
  heroMode?: boolean;
  heroSearchButton?: boolean;
}) {
  const {
    authLoading,
    isGuest,
    isAdminUser,
    isBusinessAccountUser,
    isCheckingBusinessOwner,
    hasOwnedBusinesses,
    logout,
    unreadCount,
    messageUnreadCount,
    savedCount,
    pathname,
    navLinks,
    isStackedLayout,
    isNavReady,
    isDiscoverActive,
    isNotificationsActive,
    isMessagesActive,
    isProfileActive,
    isSettingsActive,
    isClaimBusinessActive,
    isMobileMenuOpen,
    isDiscoverDropdownOpen,
    isDiscoverDropdownClosing,
    discoverMenuPos,
    headerRef,
    discoverDropdownRef,
    discoverMenuPortalRef,
    discoverBtnRef,
    handleNavClick,
    openDiscoverDropdown,
    closeDiscoverDropdown,
    scheduleDiscoverDropdownClose,
    clearDiscoverHoverTimeout,
    setShowSearchBar,
    setIsMobileMenuOpen,
    fontStyle: sf,
  } = useHeaderState({ searchLayout, forceSearchOpen, forcePersonalMode });

  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Prefetch critical routes for instant navigation
  usePrefetchRoutes();
  const desktopSearchWrapRef = useRef<HTMLDivElement>(null);
  const mobileSearchWrapRef = useRef<HTMLDivElement>(null);
  const homeDesktopRowRef = useRef<HTMLDivElement>(null);
  const homeDesktopNavRef = useRef<HTMLDivElement>(null);
  const homeDesktopIconsRef = useRef<HTMLDivElement>(null);
  
  // Get search query from URL params
  const urlSearchQuery = searchParams.get('search') || '';
  
  const [headerSearchQuery, setHeaderSearchQuery] = useState(urlSearchQuery);
  const [headerPlaceholder, setHeaderPlaceholder] = useState(
    "Search..."
  );
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDesktopSearchExpanded, setIsDesktopSearchExpanded] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [desktopSearchExpandedWidth, setDesktopSearchExpandedWidth] = useState(280);

  const {
    query: suggestionQuery,
    setQuery: setSuggestionQuery,
    loading: suggestionsLoading,
    results: suggestionResults,
  } = useLiveSearch({ initialQuery: urlSearchQuery, debounceMs: 120 });
  const effectiveIsGuest = isGuest;
  const effectiveIsAdminUser = isAdminUser;
  const effectiveIsBusinessAccountUser = isBusinessAccountUser;
  const effectiveNavLinks = navLinks;

  // Sync local state with URL params
  useEffect(() => {
    setHeaderSearchQuery(urlSearchQuery);
    // Open mobile search if there's a search query
    if (urlSearchQuery) {
      setIsMobileSearchOpen(true);
    }
  }, [urlSearchQuery]);

  const isSearchActive = headerSearchQuery.trim().length > 0;

  useEffect(() => {
    setSuggestionQuery(headerSearchQuery);
  }, [headerSearchQuery, setSuggestionQuery]);

  const isSuggestionsOpen =
    headerSearchQuery.trim().length > 0 &&
    (isDesktopSearchExpanded || isMobileSearchOpen);

  const cappedSuggestions = useMemo(() => {
    const list = Array.isArray(suggestionResults) ? suggestionResults : [];
    return list.slice(0, 6);
  }, [suggestionResults]);

  const isHomePage = pathname === "/" || pathname === "/home";
  const isHomepageHeroOverlay = isHomePage && urlSearchQuery.trim().length === 0;
  const [isHomepageAtTop, setIsHomepageAtTop] = useState(() =>
    typeof window === "undefined" ? true : window.scrollY <= 0.5
  );

  useEffect(() => {
    if (!isHomepageHeroOverlay) {
      setIsHomepageAtTop(true);
      return;
    }

    let rafId = 0;
    const updateScrollState = () => {
      const nextAtTop = window.scrollY <= 0.5;
      setIsHomepageAtTop((prev) => (prev === nextAtTop ? prev : nextAtTop));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateScrollState();
      });
    };

    updateScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isHomepageHeroOverlay]);

  const headerClassName = `${
    isHomepageHeroOverlay ? "fixed" : "sticky"
  } top-0 left-0 right-0 w-full z-50 pt-[var(--safe-area-top)] transition-colors duration-300 ease-out`;
  const headerSurfaceClass =
    isHomepageHeroOverlay && isHomepageAtTop
      ? "bg-transparent shadow-none"
      : "bg-navbar-bg shadow-md";

  const isPersonalLayout =
    !effectiveIsBusinessAccountUser && !effectiveIsAdminUser;

  // Role-aware logo href:
  // - Business accounts → /my-businesses
  // - Personal accounts → /home
  // - Guests → /home?guest=true
  const logoHref = effectiveIsGuest
    ? "/home?guest=true" 
    : getLogoHref(effectiveIsBusinessAccountUser);
  const messagesHref = effectiveIsGuest
    ? "/onboarding"
    : effectiveIsBusinessAccountUser
      ? "/my-businesses/messages"
      : "/dm";



  useEffect(() => {
    const setByViewport = () => {
      setHeaderPlaceholder(
        window.innerWidth >= 1024
          ? "Search businesses..."
          : "Search..."
      );
    };
    setByViewport();
    window.addEventListener("resize", setByViewport);
    return () => window.removeEventListener("resize", setByViewport);
  }, []);


  // Keep home desktop nav links perfectly centered by capping search expansion
  // to the right-side space that remains after center nav + icons.
  useEffect(() => {
    if (!isHomePage || !isPersonalLayout) {
      setDesktopSearchExpandedWidth(280);
      return;
    }

    // Keep enough room for the input to actually show when expanded.
    // Using a larger min width prevents the search from collapsing to the same
    // size as the trigger button on tighter desktop widths.
    const minWidth = 180;
    const preferredWidth = 280;
    const interItemGap = 12; // gap-3 between search and icons
    const centerClearance = 16;

    const recalc = () => {
      if (window.innerWidth < 1024) {
        setDesktopSearchExpandedWidth(preferredWidth);
        return;
      }

      const rowWidth = homeDesktopRowRef.current?.clientWidth ?? 0;
      const navWidth = homeDesktopNavRef.current?.offsetWidth ?? 0;
      const iconsWidth = homeDesktopIconsRef.current?.offsetWidth ?? 0;

      if (!rowWidth || !navWidth) {
        setDesktopSearchExpandedWidth(preferredWidth);
        return;
      }

      const sideSpace = (rowWidth - navWidth) / 2;
      const availableForSearch = Math.max(
        0,
        Math.floor(sideSpace - iconsWidth - interItemGap - centerClearance)
      );

      // If there isn't enough free space to keep the nav perfectly centred,
      // still give the search a readable width and allow the grid to reflow slightly.
      const targetWidth =
        availableForSearch < minWidth
          ? Math.min(preferredWidth, Math.max(minWidth, Math.floor(sideSpace - centerClearance)))
          : Math.min(preferredWidth, availableForSearch);

      setDesktopSearchExpandedWidth(Number.isFinite(targetWidth) ? targetWidth : preferredWidth);
    };

    recalc();

    const observer = new ResizeObserver(recalc);
    if (homeDesktopRowRef.current) observer.observe(homeDesktopRowRef.current);
    if (homeDesktopNavRef.current) observer.observe(homeDesktopNavRef.current);
    if (homeDesktopIconsRef.current) observer.observe(homeDesktopIconsRef.current);
    window.addEventListener("resize", recalc);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [isHomePage, isPersonalLayout]);

  // Update URL with search query (debounced for live search)
  const updateSearchUrl = useCallback((query: string) => {
    if (!isHomePage) return;
    
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (query.trim()) {
      params.set("search", query.trim());
    } else {
      params.delete("search");
    }
    const searchString = params.toString();
    const basePath = pathname === "/home" ? "/home" : "/";
    router.replace(`${basePath}${searchString ? `?${searchString}` : ""}`, { scroll: false });
  }, [isHomePage, pathname, router]);

  // Handle live search input change with debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHeaderSearchQuery(value);
    
    // Debounce URL update for live search (300ms)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateSearchUrl(value);
    }, 300);
  };

  // Handle search form submit (immediate, no debounce)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (isHomePage) {
      // Immediate URL update
      updateSearchUrl(headerSearchQuery);
    } else {
      // Navigate to home with search param for non-home pages
      const params = new URLSearchParams();
      if (headerSearchQuery.trim()) {
        params.set("search", headerSearchQuery.trim());
      }
      router.push(`/?${params.toString()}`);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setHeaderSearchQuery("");
    if (isHomePage) {
      updateSearchUrl("");
    }
    inputRef.current?.focus();
    mobileInputRef.current?.focus();
  };

  const collapseDesktopSearch = useCallback(() => {
    setIsDesktopSearchExpanded(false);
    setActiveSuggestionIndex(-1);
  }, []);

  const expandDesktopSearch = useCallback(() => {
    setIsDesktopSearchExpanded(true);
    setActiveSuggestionIndex(-1);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Close suggestions when clicking outside (desktop + mobile overlay)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const inDesktop = desktopSearchWrapRef.current?.contains(target);
      const inMobile = mobileSearchWrapRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        collapseDesktopSearch();
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [collapseDesktopSearch]);

  // Body scroll lock when mobile suggestions are visible
  useEffect(() => {
    if (isSuggestionsOpen && isMobileSearchOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isSuggestionsOpen, isMobileSearchOpen]);

  // Close search on route change
  useEffect(() => {
    setIsMobileSearchOpen(false);
    collapseDesktopSearch();
  }, [pathname, collapseDesktopSearch]);

  const navigateToSuggestion = useCallback(
    (item: LiveSearchResult) => {
      if (!item?.id) return;
      collapseDesktopSearch();
      setIsMobileSearchOpen(false);
      setActiveSuggestionIndex(-1);
      router.push(`/business/${item.id}`);
    },
    [collapseDesktopSearch, router]
  );

  // Handle "View all" button click - preserve search state during navigation
  const handleViewAll = useCallback(() => {
    const q = headerSearchQuery.trim();
    if (!q) return;
    
    // Capture current state before any changes
    const capturedQuery = q;
    
    // Only close the modal UI - do NOT clear search query or results
    // This ensures smooth transition without flashing empty state
    collapseDesktopSearch();
    setIsMobileSearchOpen(false);
    setActiveSuggestionIndex(-1);

    // Navigate immediately with captured query params
    const params = new URLSearchParams();
    params.set("search", capturedQuery);
    router.push(`/home?${params.toString()}`);
  }, [collapseDesktopSearch, headerSearchQuery, router]);

  // Handle general search navigation (form submit, enter key)
  const navigateToSearchResults = useCallback(() => {
    const q = headerSearchQuery.trim();
    if (!q) return;
    
    // For general navigation, we can still close modal and navigate normally
    collapseDesktopSearch();
    setIsMobileSearchOpen(false);
    setActiveSuggestionIndex(-1);

    const params = new URLSearchParams();
    params.set("search", q);
    router.push(`/home?${params.toString()}`);
  }, [collapseDesktopSearch, headerSearchQuery, router]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsOpen) return;
    const max = cappedSuggestions.length;
    if (e.key === "Escape") {
      e.preventDefault();
      collapseDesktopSearch();
      setIsMobileSearchOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (max === 0) return;
      setActiveSuggestionIndex((prev) => (prev + 1) % max);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (max === 0) return;
      setActiveSuggestionIndex((prev) => (prev - 1 + max) % max);
      return;
    }
    if (e.key === "Enter" && activeSuggestionIndex >= 0) {
      e.preventDefault();
      const chosen = cappedSuggestions[activeSuggestionIndex];
      if (chosen) navigateToSuggestion(chosen);
    }
  };

  const renderSuggestionsDropdown = (mode: "desktop" | "mobile", desktopWidth: number = 280) => {
    const show = isSuggestionsOpen && (suggestionsLoading || cappedSuggestions.length > 0);
    const widthClass = mode === "desktop" ? "" : "w-full";
    const topClass = mode === "desktop" ? "top-[44px] right-0" : "top-[56px] left-0 right-0";

    return (
      <AnimatePresence>
        {show && (
          <m.div
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute ${topClass} ${widthClass} z-[100] rounded-[14px]  bg-off-white/95 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.10)] overflow-hidden`}
            style={mode === "desktop" ? { width: desktopWidth } : undefined}
            role="listbox"
            aria-label="Search suggestions"
            onMouseDown={(e) => e.preventDefault()} // keep input focus for clicks
          >
            <div className="px-4 py-3 border-b border-charcoal/10 flex items-center justify-between">
              <div className="text-xs font-semibold text-charcoal/70" style={sf}>
                Suggestions
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-coral hover:underline"
                style={sf}
                onClick={handleViewAll}
              >
                View all
              </button>
            </div>

            <div className="py-2">
              {suggestionsLoading && cappedSuggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-charcoal/60" style={sf}>
                  Searching…
                </div>
              ) : (
                cappedSuggestions.map((item, idx) => {
                  const isActive = idx === activeSuggestionIndex;
                  const label = (item as any).category_label ?? item.category ?? "";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveSuggestionIndex(idx)}
                      onClick={() => navigateToSuggestion(item)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 ${
                        isActive ? "bg-gradient-to-r from-sage/10 to-coral/5" : "hover:bg-charcoal/5"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-charcoal truncate" style={sf}>
                          {item.name}
                        </div>
                        <div className="text-xs text-charcoal/60 truncate" style={sf}>
                          {label ? `${label} • ` : ""}{item.location}
                        </div>
                      </div>
                      <div className="text-xs text-charcoal/40" style={sf}>
                        ↵
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    );
  };

  // Handle mobile search toggle
  const handleMobileSearchToggle = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen);
    if (!isMobileSearchOpen) {
      // Focus input after animation
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 100);
    }
  };

  // Close mobile search when cleared and empty
  const handleMobileSearchClear = () => {
    handleClearSearch();
    if (!headerSearchQuery) {
      setIsMobileSearchOpen(false);
    }
  };

  useEffect(() => {
    if (effectiveIsAdminUser) {
      void router.prefetch('/onboarding');
    }
  }, [effectiveIsAdminUser, router]);

  const handleAdminSignOut = useCallback(() => {
    void logout();
  }, [logout]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Desktop search input (compact, for right side)
  const renderDesktopSearchInput = (expandedWidth: number = 280) => (
    <div
      ref={desktopSearchWrapRef}
      className="relative h-10 flex justify-end shrink-0"
      style={{ width: expandedWidth }}
    >
      <m.form
        onSubmit={handleSearchSubmit}
        initial={false}
        animate={{ width: isDesktopSearchExpanded ? expandedWidth : 44 }}
        transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
        className="absolute right-0 top-0 h-10"
        style={{ transformOrigin: "right center" }}
      >
        <div className="relative h-10">
          {/* Collapsed trigger */}
          {!isDesktopSearchExpanded && (
            <button
              type="button"
              onClick={expandDesktopSearch}
              className="mi-tap w-11 h-10 flex items-center justify-center rounded-full bg-off-white/95 border border-charcoal/10 transition-[color,transform] duration-200 ease-in-out lg:hover:scale-105 lg:focus-visible:scale-105"
              aria-label="Open search"
            >
              <Search className="w-4 h-4 text-charcoal/60" strokeWidth={2} />
            </button>
          )}

          {/* Expanded input */}
          <AnimatePresence initial={false}>
            {isDesktopSearchExpanded && (
              <m.div
                key="desktop-search-expanded"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                  <Search className="w-4 h-4 text-charcoal/50" strokeWidth={2} />
                </div>

                <div className="absolute inset-y-0 right-2 flex items-center z-10">
                  <button
                    type="button"
                    onClick={() => {
                      if (headerSearchQuery) handleClearSearch();
                      collapseDesktopSearch();
                    }}
                    className="mi-tap flex items-center justify-center w-7 h-7 rounded-full text-charcoal/60 hover:text-charcoal transition-[color,transform] duration-150 ease-in-out lg:hover:scale-105 lg:focus-visible:scale-105"
                    aria-label={headerSearchQuery ? "Clear search" : "Close search"}
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={headerSearchQuery}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setIsDesktopSearchExpanded(true)}
                  onBlur={() => {
                    // Let clicks on suggestions register without flicker.
                    window.setTimeout(() => {
                      const active = document.activeElement as HTMLElement | null;
                      if (active && desktopSearchWrapRef.current?.contains(active)) return;
                      collapseDesktopSearch();
                    }, 90);
                  }}
                  placeholder={headerPlaceholder}
                  className={`h-10 rounded-full bg-off-white text-charcoal placeholder:text-charcoal/50
                    border text-sm
                    focus:outline-none focus:bg-white focus:border-sage focus:ring-1 focus:ring-sage/30
                    hover:bg-white/90 transition-all duration-200
                    pl-9 pr-10
                    ${isSearchActive ? "border-sage bg-white" : "border-charcoal/10"}
                  `}
                  style={{
                    width: expandedWidth,
                    fontFamily:
                      "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                  aria-label="Search businesses"
                  autoComplete="off"
                />

                {renderSuggestionsDropdown("desktop", expandedWidth)}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </m.form>
    </div>
  );

  // Mobile search input (expandable with sleek animation)
  const renderMobileSearchInput = () => (
    <m.div
      key="mobile-search-overlay"
      className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center px-4 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <m.form
        initial={{ width: "36px", opacity: 0, borderRadius: "50%" }}
        animate={{
          width: "92%",
          opacity: 1,
          borderRadius: "9999px",
        }}
        exit={{
          width: "36px",
          opacity: 0,
          borderRadius: "50%",
        }}
        transition={{
          width: { type: "spring", stiffness: 520, damping: 44, mass: 0.85 },
          opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
          borderRadius: { type: "spring", stiffness: 560, damping: 50, mass: 0.9 },
        }}
        onSubmit={handleSearchSubmit}
        className="relative origin-right"
        style={{ transformOrigin: "right center" }}
      >
        <m.div
          ref={mobileSearchWrapRef}
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.18, duration: 0.2, ease: "easeOut" }}
        >
          {/* Search icon on left */}
          <m.div
            className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ delay: 0.22, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <Search className="w-5 h-5 text-charcoal/50" strokeWidth={2} />
          </m.div>

          {/* Clear/Close button on right */}
          <m.div
            className="absolute inset-y-0 right-2 flex items-center z-10"
            initial={{ opacity: 0, rotate: -90, scale: 0 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0 }}
            transition={{ delay: 0.28, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={() => {
                if (headerSearchQuery) {
                  handleClearSearch();
                } else {
                  setIsMobileSearchOpen(false);
                }
              }}
              className="flex items-center justify-center w-8 h-8 rounded-full text-charcoal/60 hover:text-charcoal transition-colors duration-150"
              aria-label={headerSearchQuery ? "Clear search" : "Close search"}
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </m.div>

          <input
            ref={mobileInputRef}
            type="text"
            value={headerSearchQuery}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search businesses..."
            className={`w-full rounded-full bg-off-white text-charcoal placeholder:text-charcoal/50
              border-2 text-base
              focus:outline-none focus:bg-white focus:border-sage focus:ring-2 focus:ring-sage/20
              transition-all duration-200
              pl-12 pr-12 py-3
              ${isSearchActive ? 'border-sage bg-white' : 'border-charcoal/10'}
            `}
            style={{
              fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
            aria-label="Search businesses"
            autoComplete="off"
          />

          {renderSuggestionsDropdown("mobile")}
        </m.div>
      </m.form>
    </m.div>
  );

  const currentPaddingClass = heroMode ? "py-0" : reducedPadding ? "py-1" : "py-4";
  const horizontalPaddingClass = heroMode
    ? "px-2"
    : `px-2 ${currentPaddingClass}`;

  const desktopNavProps = {
    whiteText,
    isGuest: effectiveIsGuest,
    isBusinessAccountUser: effectiveIsBusinessAccountUser,
    isClaimBusinessActive,
    isDiscoverActive,
    primaryLinks: effectiveNavLinks.primaryLinks,
    discoverLinks: effectiveNavLinks.discoverLinks,
    businessLinks: effectiveNavLinks.businessLinks,
    isNotificationsActive,
    isMessagesActive,
    isProfileActive,
    isSettingsActive,
    savedCount,
    unreadCount,
    messageUnreadCount,
    handleNavClick,
    discoverDropdownRef,
    discoverMenuPortalRef,
    discoverBtnRef,
    discoverMenuPos,
    isDiscoverDropdownOpen,
    isDiscoverDropdownClosing,
    clearDiscoverHoverTimeout,
    openDiscoverDropdown,
    closeDiscoverDropdown,
    scheduleDiscoverDropdownClose,
    sf,
  };

  // Show skeleton while auth is resolving to prevent layout shift
  if (authLoading) {
    return <HeaderSkeleton showSearch={showSearch} />;
  }

  const wrapperSizeClass = "pt-4 min-h-[72px] lg:min-h-[80px]";
  const logoScaleClass = "";

  return (
    <>
      <header ref={headerRef} className={`${headerClassName} ${headerSurfaceClass}`} style={sf}>
        <div
          className={`relative z-[1] w-full ${horizontalPaddingClass} flex items-center h-full ${wrapperSizeClass}`}
        >
          {effectiveIsAdminUser ? (
            <AdminHeaderRole
              pathname={pathname}
              logoScaleClass={logoScaleClass}
              sf={sf}
              onSignOut={handleAdminSignOut}
            />
          ) : isPersonalLayout ? (
            <PersonalHeaderRole
              isHomePage={isHomePage}
              logoHref={logoHref}
              logoScaleClass={logoScaleClass}
              showSearch={showSearch}
              desktopSearchExpandedWidth={desktopSearchExpandedWidth}
              renderDesktopSearchInput={renderDesktopSearchInput}
              isMobileSearchOpen={isMobileSearchOpen}
              renderMobileSearchInput={renderMobileSearchInput}
              handleMobileSearchToggle={handleMobileSearchToggle}
              whiteText={whiteText}
              isGuest={effectiveIsGuest}
              isNotificationsActive={isNotificationsActive}
              unreadCount={unreadCount}
              messagesHref={messagesHref}
              isMessagesActive={isMessagesActive}
              messageUnreadCount={messageUnreadCount}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              homeDesktopRowRef={homeDesktopRowRef}
              homeDesktopNavRef={homeDesktopNavRef}
              homeDesktopIconsRef={homeDesktopIconsRef}
              desktopNavProps={desktopNavProps}
            />
          ) : (
            <BusinessHeaderRole
              logoHref={logoHref}
              logoScaleClass={logoScaleClass}
              desktopNavProps={desktopNavProps}
              isMobileSearchOpen={isMobileSearchOpen}
              messagesHref={messagesHref}
              isMessagesActive={isMessagesActive}
              whiteText={whiteText}
              isGuest={effectiveIsGuest}
              messageUnreadCount={messageUnreadCount}
              isBusinessAccountUser={effectiveIsBusinessAccountUser}
              isSettingsActive={isSettingsActive}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          )}
        </div>
      </header>

      {/* Mobile suggestions backdrop (not for admin) */}
      {!effectiveIsAdminUser && (
        <AnimatePresence>
          {isMobileSearchOpen && isSuggestionsOpen && (
            <m.div
              key="search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-[2px] lg:hidden"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setActiveSuggestionIndex(-1);
              }}
              aria-hidden
            />
          )}
        </AnimatePresence>
      )}

      {!effectiveIsAdminUser && (
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isBusinessAccountUser={effectiveIsBusinessAccountUser}
          isGuest={effectiveIsGuest}
          primaryLinks={effectiveNavLinks.primaryLinks}
          discoverLinks={effectiveNavLinks.discoverLinks}
          businessLinks={effectiveNavLinks.businessLinks}
          handleNavClick={handleNavClick}
          sf={sf}
        />
      )}
    </>
  );
}
