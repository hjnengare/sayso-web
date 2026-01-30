// src/components/Header/Header.tsx
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, Bell, Settings, Bookmark, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../Logo/Logo";
import OptimizedLink from "../Navigation/OptimizedLink";
import DesktopNav from "./DesktopNav";
import MobileMenu from "./MobileMenu";
import { useHeaderState } from "./useHeaderState";
import { PRIMARY_LINKS, DISCOVER_LINKS, getLogoHref } from "./headerActionsConfig";

export default function Header({
  showSearch = true,
  variant = "white",
  backgroundClassName,
  searchLayout = "floating",
  forceSearchOpen = false,
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
  topPosition?: string;
  reducedPadding?: boolean;
  whiteText?: boolean;
  heroMode?: boolean;
  heroSearchButton?: boolean;
}) {
  const {
    isGuest,
    isBusinessAccountUser,
    isCheckingBusinessOwner,
    hasOwnedBusinesses,
    unreadCount,
    savedCount,
    pathname,
    navLinks,
    isStackedLayout,
    isNavReady,
    isDiscoverActive,
    isNotificationsActive,
    isSavedActive,
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
  } = useHeaderState({ searchLayout, forceSearchOpen });

  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get search query from URL params
  const urlSearchQuery = searchParams.get('search') || '';
  
  const [headerSearchQuery, setHeaderSearchQuery] = useState(urlSearchQuery);
  const [headerPlaceholder, setHeaderPlaceholder] = useState(
    "Search..."
  );
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Sync local state with URL params
  useEffect(() => {
    setHeaderSearchQuery(urlSearchQuery);
    // Open mobile search if there's a search query
    if (urlSearchQuery) {
      setIsMobileSearchOpen(true);
    }
  }, [urlSearchQuery]);

  const isSearchActive = headerSearchQuery.trim().length > 0;

  const headerClassName = "sticky top-0 left-0 right-0 w-full max-w-7xl mx-auto z-50 bg-navbar-bg shadow-md transition-all duration-300";
    

  const isPersonalLayout = !isBusinessAccountUser;
  const isHomePage = pathname === "/" || pathname === "/home";

  // Role-aware logo href:
  // - Business accounts → /my-businesses
  // - Personal accounts → /home
  // - Guests → /home?guest=true
  const logoHref = isGuest 
    ? "/home?guest=true" 
    : getLogoHref(isBusinessAccountUser);



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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Desktop search input (compact, for right side)
  const renderDesktopSearchInput = () => (
    <form
      onSubmit={handleSearchSubmit}
      className="w-full max-w-[240px]"
    >
      <div className="relative">
        {/* Search icon on left */}
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
          <Search className="w-4 h-4 text-charcoal/50" strokeWidth={2} />
        </div>

        {/* Clear button on right */}
        {isSearchActive && headerSearchQuery && (
          <div className="absolute inset-y-0 right-2 flex items-center z-10">
            <button
              type="button"
              onClick={handleClearSearch}
              className="flex items-center justify-center w-6 h-6 rounded-full text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-all duration-200"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={headerSearchQuery}
          onChange={handleSearchInputChange}
          placeholder={headerPlaceholder}
          className={`w-full rounded-full bg-off-white text-charcoal placeholder:text-charcoal/50
            border shadow-sm text-sm
            focus:outline-none focus:bg-white focus:border-sage focus:ring-1 focus:ring-sage/30
            hover:bg-white/90 transition-all duration-200
            pl-9 pr-8 py-2
            ${isSearchActive ? 'border-sage bg-white' : 'border-charcoal/10'}
          `}
          style={{
            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
          aria-label="Search businesses"
          autoComplete="off"
        />
      </div>
    </form>
  );

  // Mobile search input (expandable)
  const renderMobileSearchInput = () => (
    <motion.form
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "100%", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onSubmit={handleSearchSubmit}
      className="flex-1 overflow-hidden"
    >
      <div className="relative">
        {/* Search icon on left */}
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
          <Search className="w-4 h-4 text-charcoal/50" strokeWidth={2} />
        </div>

        {/* Clear/Close button on right */}
        <div className="absolute inset-y-0 right-2 flex items-center z-10">
          <button
            type="button"
            onClick={() => {
              if (headerSearchQuery) {
                handleClearSearch();
              } else {
                setIsMobileSearchOpen(false);
              }
            }}
            className="flex items-center justify-center w-7 h-7 rounded-full text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-all duration-200"
            aria-label={headerSearchQuery ? "Clear search" : "Close search"}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <input
          ref={mobileInputRef}
          type="text"
          value={headerSearchQuery}
          onChange={handleSearchInputChange}
          placeholder="Search..."
          className={`w-full rounded-full bg-off-white text-charcoal placeholder:text-charcoal/50
            border shadow-sm text-sm
            focus:outline-none focus:bg-white focus:border-sage focus:ring-1 focus:ring-sage/30
            transition-all duration-200
            pl-9 pr-10 py-2
            ${isSearchActive ? 'border-sage bg-white' : 'border-charcoal/10'}
          `}
          style={{
            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
          aria-label="Search businesses"
          autoComplete="off"
        />
      </div>
    </motion.form>
  );

  const currentPaddingClass = heroMode ? "py-0" : reducedPadding ? "py-1" : "py-4";
  const horizontalPaddingClass = heroMode
    ? "px-4 sm:px-6 md:px-8 lg:px-10"
    : `px-4 sm:px-6 md:px-8 lg:px-10 ${currentPaddingClass}`;

  const desktopNavProps = {
    whiteText,
    isGuest,
    isBusinessAccountUser,
    isClaimBusinessActive,
    isDiscoverActive,
    primaryLinks: navLinks.primaryLinks,
    discoverLinks: DISCOVER_LINKS,
    businessLinks: navLinks.businessLinks,
    isNotificationsActive,
    isProfileActive,
    isSettingsActive,
    savedCount,
    unreadCount,
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
    onNotificationsClick: () => setShowSearchBar(true),
    sf,
  };

  return (
    <>
      <header ref={headerRef} className={headerClassName} style={sf}>
        <div
          className={`relative py-4 z-[1] mx-auto w-full max-w-7xl ${horizontalPaddingClass} flex items-center h-full min-h-[72px] lg:min-h-[80px]`}
        >
          {isPersonalLayout ? (
            <div className="w-full">
              {/* Desktop Layout: Logo left, Nav center, Search+Icons right */}
              <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-4">
                {/* Left: Logo */}
                <div className="flex items-center">
                  <OptimizedLink href={logoHref} className="group flex items-center" aria-label="sayso Home">
                    <Logo
                      variant="default"
                      showMark={false}
                      className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                    />
                  </OptimizedLink>
                </div>

                {/* Center: Navigation */}
                <div className="flex justify-center">
                  <DesktopNav {...desktopNavProps} mode="navOnly" />
                </div>

                {/* Right: Search + Icons */}
                <div className="flex items-center justify-end gap-3">
                  {showSearch && isHomePage && renderDesktopSearchInput()}
                  <DesktopNav {...desktopNavProps} mode="iconsOnly" />
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="flex lg:hidden items-center gap-2 w-full">
                {/* Logo - always visible when search is closed */}
                <AnimatePresence mode="wait">
                  {!isMobileSearchOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="pl-2"
                    >
                      <OptimizedLink href={logoHref} className="group flex items-center flex-shrink-0" aria-label="sayso Home">
                        <Logo
                          variant="default"
                          showMark={false}
                          className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                        />
                      </OptimizedLink>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mobile Search (expandable) */}
                <AnimatePresence>
                  {isMobileSearchOpen && showSearch && isHomePage && renderMobileSearchInput()}
                </AnimatePresence>

                {/* Right side icons */}
                <div className="flex items-center gap-1 ml-auto">
                  {/* Search icon trigger (mobile only, when search is closed) */}
                  {showSearch && isHomePage && !isMobileSearchOpen && (
                    <button
                      type="button"
                      onClick={handleMobileSearchToggle}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                        whiteText
                          ? "text-white hover:text-white/80 hover:bg-white/10"
                          : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                      }`}
                      aria-label="Open search"
                    >
                      <Search className="w-5 h-5" strokeWidth={2} />
                    </button>
                  )}

                  {/* Notifications */}
                  {!isGuest && !isMobileSearchOpen && (
                    <OptimizedLink
                      href="/notifications"
                      className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                        isNotificationsActive
                          ? "text-sage bg-sage/5"
                          : whiteText
                            ? "text-white hover:text-white/80 hover:bg-white/10"
                            : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                      }`}
                      aria-label="Notifications"
                    >
                      <Bell className="w-5 h-5" fill={isNotificationsActive ? "currentColor" : "none"} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </OptimizedLink>
                  )}

                  {/* Saved */}
                  {!isBusinessAccountUser && !isGuest && !isMobileSearchOpen && (
                    <OptimizedLink
                      href="/saved"
                      className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                        isSavedActive
                          ? "text-sage bg-sage/5"
                          : whiteText
                            ? "text-white hover:text-white/80 hover:bg-white/10"
                            : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                      }`}
                      aria-label="Saved"
                    >
                      <Bookmark className="w-5 h-5" fill={isSavedActive ? "currentColor" : "none"} />
                      {savedCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                          {savedCount > 99 ? "99+" : savedCount}
                        </span>
                      )}
                    </OptimizedLink>
                  )}

                  {/* Menu button */}
                  {!isMobileSearchOpen && (
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(true)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 shadow-sm ${
                        whiteText
                          ? "text-white hover:text-white/80 hover:bg-white/10"
                          : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                      }`}
                      aria-label="Open menu"
                      aria-expanded={isMobileMenuOpen}
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Business Account Layout - unchanged */
            <div className="flex items-center justify-between gap-3 lg:gap-6 w-full h-full">
              <OptimizedLink href={logoHref} className="group flex flex-shrink-0 relative items-center pl-4 lg:pl-0" aria-label="sayso Home">
                <div className="relative">
                  <Logo
                    variant="default"
                    showMark={false}
                    className="relative drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                  />
                </div>
              </OptimizedLink>

              <div className="hidden lg:flex flex-1 justify-center">
                <DesktopNav {...desktopNavProps} mode="navOnly" />
              </div>

              <div className="hidden lg:flex items-center justify-end">
                <DesktopNav {...desktopNavProps} mode="iconsOnly" />
              </div>

              <div className="flex lg:hidden items-center gap-2 ml-auto">
                {!isGuest && (
                  <OptimizedLink
                    href="/notifications"
                    className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                      isNotificationsActive
                        ? "text-sage bg-sage/5"
                        : whiteText
                          ? "text-white hover:text-white/80 hover:bg-white/10"
                          : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                    }`}
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" fill={isNotificationsActive ? "currentColor" : "none"} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </OptimizedLink>
                )}

                {!isBusinessAccountUser && !isGuest && (
                  <OptimizedLink
                    href="/saved"
                    className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                      isSavedActive
                        ? "text-sage bg-sage/5"
                        : whiteText
                          ? "text-white hover:text-white/80 hover:bg-white/10"
                          : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                    }`}
                    aria-label="Saved"
                  >
                    <Bookmark className="w-5 h-5" fill={isSavedActive ? "currentColor" : "none"} />
                    {savedCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                        {savedCount > 99 ? "99+" : savedCount}
                      </span>
                    )}
                  </OptimizedLink>
                )}

                {isBusinessAccountUser && (
                  <OptimizedLink
                    href="/settings"
                    className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                      isSettingsActive
                        ? "text-sage bg-sage/5"
                        : whiteText
                          ? "text-white hover:text-white/80 hover:bg-white/10"
                          : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                    }`}
                    aria-label="Settings"
                  >
                    <Settings className="w-5 h-5" fill={isSettingsActive ? "currentColor" : "none"} />
                  </OptimizedLink>
                )}

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 shadow-sm ${
                    whiteText
                      ? "text-white hover:text-white/80 hover:bg-white/10"
                      : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                  }`}
                  aria-label="Open menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isBusinessAccountUser={isBusinessAccountUser}
        isGuest={isGuest}
        primaryLinks={navLinks.primaryLinks}
        discoverLinks={DISCOVER_LINKS}
        businessLinks={navLinks.businessLinks}
        handleNavClick={handleNavClick}
        sf={sf}
      />
    </>
  );
}
