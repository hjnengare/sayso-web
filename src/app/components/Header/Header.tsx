// src/components/Header/Header.tsx
"use client";

import { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import FilterModal, { FilterState } from "../FilterModal/FilterModal";
import SearchInput from "../SearchInput/SearchInput";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useMessages } from "../../contexts/MessagesContext";
import { useRequireBusinessOwner } from "../../hooks/useBusinessAccess";
import { useAuth } from "../../contexts/AuthContext";
import Logo from "../Logo/Logo";
import OptimizedLink from "../Navigation/OptimizedLink";
import DesktopNav, { NavLink } from "./DesktopNav";
import ActionButtons from "./ActionButtons";
import MobileMenu from "./MobileMenu";
import HeaderSkeleton from "./HeaderSkeleton";

const sf = {
  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
} as const;

const PRIMARY_LINKS: readonly NavLink[] = [
  { key: "home", label: "Home", href: "/home", requiresAuth: false },
  { key: "leaderboard", label: "Leaderboard", href: "/leaderboard", requiresAuth: false },
] as const;

const BUSINESS_LINKS: readonly NavLink[] = [
  { key: "my-businesses", label: "My Businesses", href: "/my-businesses", requiresAuth: true },
  { key: "claim-business", label: "Claim Business", href: "/claim-business", requiresAuth: true },
  { key: "add-business", label: "Add Business", href: "/add-business", requiresAuth: true },
] as const;

const DISCOVER_LINKS: readonly NavLink[] = [
  { key: "for-you", label: "For You", description: "Personalized picks", href: "/for-you", requiresAuth: true },
  { key: "trending", label: "Trending", description: "What's hot right now", href: "/trending", requiresAuth: false },
  { key: "events-specials", label: "Events & Specials", description: "Seasonal happenings & offers", href: "/events-specials", requiresAuth: false },
] as const;


export default function Header({
  showSearch = true,
  variant = "white",
  backgroundClassName,
  searchLayout = "floating",
  forceSearchOpen = false,
  topPosition = "top-6",
  reducedPadding = false,
  whiteText = false,
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
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDiscoverDropdownOpen, setIsDiscoverDropdownOpen] = useState(false);
  const [isDiscoverDropdownClosing, setIsDiscoverDropdownClosing] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isStackedLayout = searchLayout === "stacked";

  const [showSearchBar, setShowSearchBar] = useState(() => {
    if (forceSearchOpen || isStackedLayout) {
      return true;
    }
    return false;
  });
  const [discoverMenuPos, setDiscoverMenuPos] = useState<{left:number; top:number} | null>(null);
  const { savedCount } = useSavedItems();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessagesCount } = useMessages();
  const { user, isLoading: authLoading } = useAuth();
  
  // Get user's current role for role-based navigation
  const userCurrentRole = user?.profile?.current_role || 'user';
  const isBusinessAccountUser = userCurrentRole === 'business_owner';
  // Check if user has both roles available
  const hasMultipleRoles = user?.profile?.role === 'both';
  
  // DEBUG: Log navigation state
  useEffect(() => {
    if (user?.profile && !authLoading) {
      console.log('[Header] Navigation state:', {
        current_role: user.profile.current_role,
        role: user.profile.role,
        isBusinessAccountUser,
        hasMultipleRoles
      });
    }
  }, [user?.profile, authLoading, isBusinessAccountUser, hasMultipleRoles]);
  
  // Check if user is a business owner
  const { isChecking: isCheckingBusinessOwner, businesses: ownedBusinesses } = useRequireBusinessOwner({
    skipRedirect: true,
  });
  const ownedBusinessesCount = ownedBusinesses?.length ?? 0;
  const hasOwnedBusinesses = ownedBusinessesCount > 0;

  // Business navigation is state-driven: hide until ownership check completes to avoid flashing links
  const businessNavLinks = useMemo(() => {
    if (!isBusinessAccountUser) return [];
    if (isCheckingBusinessOwner) return [];

    if (hasOwnedBusinesses) {
      return BUSINESS_LINKS.filter((link) => link.key !== "claim-business");
    }

    return [
      BUSINESS_LINKS.find((link) => link.key === "claim-business")!,
      BUSINESS_LINKS.find((link) => link.key === "add-business")!,
    ].filter(Boolean);
  }, [hasOwnedBusinesses, isBusinessAccountUser, isCheckingBusinessOwner]);

  // Check if we're on the Explore page and need to enforce authentication
  const isOnExplorePage = pathname === '/explore';
  const requiresAuthForNav = isOnExplorePage && !authLoading && !user;

  // Check if user is unauthenticated (guest mode)
  const isGuest = !authLoading && !user;

  // Handler to intercept navigation clicks and redirect to login if needed
  const handleNavClick = useCallback((href: string, e?: React.MouseEvent) => {
    if (requiresAuthForNav && href !== '/explore' && href !== '/login' && href !== '/register' && href !== '/onboarding') {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      router.push('/login');
    }
  }, [requiresAuthForNav, router]);

  // Use refs to track state without causing re-renders
  const isFilterVisibleRef = useRef(isFilterVisible);
  const isDiscoverDropdownOpenRef = useRef(isDiscoverDropdownOpen);
  const showSearchBarRef = useRef(showSearchBar);

  // Update refs when state changes
  useEffect(() => {
    isFilterVisibleRef.current = isFilterVisible;
  }, [isFilterVisible]);

  useEffect(() => {
    isDiscoverDropdownOpenRef.current = isDiscoverDropdownOpen;
  }, [isDiscoverDropdownOpen]);

  useEffect(() => {
    showSearchBarRef.current = showSearchBar;
  }, [showSearchBar]);

  useEffect(() => {
    if (forceSearchOpen || isStackedLayout) {
      setShowSearchBar(true);
    }
  }, [forceSearchOpen, isStackedLayout]);


  // Anchor for the dropdown FilterModal to hang under
  const headerRef = useRef<HTMLElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const discoverDropdownRef = useRef<HTMLDivElement>(null);
  const discoverMenuPortalRef = useRef<HTMLDivElement>(null);
  const discoverBtnRef = useRef<HTMLButtonElement>(null);
  const discoverHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDiscoverHoverTimeout = useCallback(() => {
    if (discoverHoverTimeoutRef.current) {
      clearTimeout(discoverHoverTimeoutRef.current);
      discoverHoverTimeoutRef.current = null;
    }
  }, []);


  const openDiscoverDropdown = useCallback(() => {
    clearDiscoverHoverTimeout();
    setIsDiscoverDropdownClosing(false);
    setIsDiscoverDropdownOpen(true);
  }, [clearDiscoverHoverTimeout]);

  const closeDiscoverDropdown = useCallback(() => {
    setIsDiscoverDropdownClosing(true);
    setTimeout(() => {
      setIsDiscoverDropdownOpen(false);
      setIsDiscoverDropdownClosing(false);
    }, 200);
  }, []);

  const scheduleDiscoverDropdownClose = useCallback(() => {
    clearDiscoverHoverTimeout();
    discoverHoverTimeoutRef.current = setTimeout(() => {
      closeDiscoverDropdown();
    }, 100);
  }, [clearDiscoverHoverTimeout, closeDiscoverDropdown]);


  useEffect(() => {
    return () => {
      clearDiscoverHoverTimeout();
    };
  }, [clearDiscoverHoverTimeout]);

  // Header always visible (scroll effects removed)
  // Previously had scroll-based hide/show logic, now permanently visible


  // Close all modals on scroll - memoized with useCallback
  const closeModalsOnScroll = useCallback(() => {
    // Only close if they're actually open to avoid unnecessary state updates
  if (isDiscoverDropdownOpenRef.current) {
    clearDiscoverHoverTimeout();
    closeDiscoverDropdown();
  }
  if (showSearchBarRef.current && !(forceSearchOpen || isStackedLayout)) {
      setShowSearchBar(false);
    }
    if (isFilterVisibleRef.current) {
      setIsFilterOpen(false);
      setTimeout(() => setIsFilterVisible(false), 150);
    }
}, [clearDiscoverHoverTimeout, closeDiscoverDropdown, forceSearchOpen, isStackedLayout]);

  useEffect(() => {
    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener('scroll', closeModalsOnScroll, options);

    return () => {
      window.removeEventListener('scroll', closeModalsOnScroll, options);
    };
  }, [closeModalsOnScroll]);


  // Close discover dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideButtonWrap = discoverDropdownRef.current?.contains(target);
      const clickedInsidePortalMenu = discoverMenuPortalRef.current?.contains(target);

      if (!clickedInsideButtonWrap && !clickedInsidePortalMenu) {
        clearDiscoverHoverTimeout();
        closeDiscoverDropdown();
      }
    };

    if (isDiscoverDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDiscoverDropdownOpen, clearDiscoverHoverTimeout, closeDiscoverDropdown]);


  useLayoutEffect(() => {
     if (isDiscoverDropdownOpen && discoverBtnRef.current && headerRef.current) {
       const buttonRect = discoverBtnRef.current.getBoundingClientRect();
       const headerRect = headerRef.current.getBoundingClientRect();
       const dropdownWidth = 320;
       const viewportWidth = window.innerWidth;
       const padding = 16;
       const center = buttonRect.left + buttonRect.width / 2;
       let leftPos = center - dropdownWidth / 2;
       const maxLeft = viewportWidth - dropdownWidth - padding;
       leftPos = Math.max(padding, Math.min(leftPos, maxLeft));

       // Position dropdown below the navbar's bottom margin
       const gap = 8; // Gap below navbar
       setDiscoverMenuPos({ left: leftPos, top: headerRect.bottom + gap });
     } else {
       setDiscoverMenuPos(null);
     }
   }, [isDiscoverDropdownOpen]);


  const openFilters = () => {
    if (isFilterVisible) return;
    setIsFilterVisible(true);
    setTimeout(() => setIsFilterOpen(true), 10);
  };

  const closeFilters = () => {
    setIsFilterOpen(false);
    setTimeout(() => setIsFilterVisible(false), 150);
  };

  const handleFiltersChange = (f: FilterState) => {
    // Navigate to explore page with filters applied via URL params
    const params = new URLSearchParams();
    if (f.categories && f.categories.length > 0) {
      params.set('categories', f.categories.join(','));
    }
    if (f.minRating !== null) {
      params.set('min_rating', f.minRating.toString());
    }
    if (f.distance) {
      params.set('distance', f.distance);
    }

    const queryString = params.toString();
    const exploreUrl = queryString ? `/explore?${queryString}` : '/explore';
    router.push(exploreUrl);
    
    if (!forceSearchOpen && !isStackedLayout) {
      setShowSearchBar(false);
    }
    closeFilters();
  };

  // NEW: when user submits the query (Enter), we close the search bar (and filters if open)
  const handleSubmitQuery = (query: string) => {
    // Navigate to explore page with search query
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('search', query.trim());
    }
    const queryString = params.toString();
    const exploreUrl = queryString ? `/explore?${queryString}` : '/explore';
    router.push(exploreUrl);
    
    if (!forceSearchOpen && !isStackedLayout) {
      setShowSearchBar(false);
    }
    if (isFilterVisible) closeFilters();
  };

  // Different styling for home page (frosty variant) vs other pages
  const isHomeVariant = variant === "frosty";
  const computedBackgroundClass = backgroundClassName ?? "bg-navbar-gradient";
  // Header is always fixed at top-0 - Enhanced with better shadows and borders
  const headerClassName = isHomeVariant
    ? `fixed top-0 left-0 right-0 z-50 ${computedBackgroundClass} backdrop-blur-xl shadow-md border-b border-white/40 transition-all duration-300`
    : `fixed top-0 left-0 right-0 z-50 ${computedBackgroundClass} backdrop-blur-xl shadow-md border-b border-sage/10 transition-all duration-300`;
  const isSearchVisible = forceSearchOpen || isStackedLayout || showSearchBar;

  const renderSearchInput = () => (
    <SearchInput
      variant="header"
      placeholder="Discover exceptional local experiences, premium dining, and gems..."
      mobilePlaceholder="Search places, coffee, yoga…"
      onSearch={(q) => console.log("search change:", q)}
      onSubmitQuery={handleSubmitQuery}
      onFilterClick={openFilters}
      onFocusOpenFilters={openFilters}
      showFilter
    />
  );

  // Active state helpers
  const isDiscoverActive = DISCOVER_LINKS.some(
    ({ href }) => pathname === href || pathname?.startsWith(href)
  );

  // Icon active states
  const isNotificationsActive = pathname === '/notifications' || pathname?.startsWith('/notifications');
  const isSavedActive = pathname === '/saved' || pathname?.startsWith('/saved');
  const isMessagesActive = pathname === '/dm' || pathname?.startsWith('/dm');
  const isProfileActive = pathname === '/profile' || pathname?.startsWith('/profile');
  const isSettingsActive = pathname === '/settings' || pathname?.startsWith('/settings');
  const isClaimBusinessActive = pathname === '/claim-business' || pathname?.startsWith('/claim-business');

  // Padding classes
  const currentPaddingClass = heroMode ? "py-0" : reducedPadding ? "py-3.5 md:py-4" : "py-3.5 md:py-6";
  
  // Gate rendering until role and business access are resolved to avoid flashing wrong links
  const isNavReady = !authLoading && (!isBusinessAccountUser || !isCheckingBusinessOwner);

  // Show skeleton while auth or business access is resolving
  if (!isNavReady) {
    return <HeaderSkeleton />;
  }
  
  return (
    <>
      <header ref={headerRef} className={headerClassName} style={sf}>
        <div className={`relative z-[1] mx-auto w-full max-w-[1700px] ${heroMode ? "px-4 sm:px-6 md:px-8 lg:px-10" : `px-4 sm:px-6 md:px-8 lg:px-10 ${currentPaddingClass}`} flex items-center h-full`}>
          {/* Top row */}
          <div className="flex items-center justify-between gap-6 w-full h-full">
            {/* Logo */}
            <OptimizedLink href={isBusinessAccountUser ? "/my-businesses" : "/home"} className="group flex-shrink-0 relative" aria-label="sayso Home">
              <div className="absolute inset-0 bg-gradient-to-r from-sage/40 via-coral/30 to-sage/40 rounded-[20px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
              <div className="relative scale-90 sm:scale-[0.72] origin-left">
                <Logo variant="default" className="relative drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]" color={whiteText ? "sage" : "gradient"} />
              </div>
            </OptimizedLink>
            <DesktopNav
              pathname={pathname}
              whiteText={whiteText}
              isGuest={isGuest}
              isBusinessAccountUser={isBusinessAccountUser}
              isClaimBusinessActive={isClaimBusinessActive}
              isDiscoverActive={isDiscoverActive}
              primaryLinks={PRIMARY_LINKS}
              discoverLinks={DISCOVER_LINKS}
              businessLinks={businessNavLinks}
              isNotificationsActive={isNotificationsActive}
              isMessagesActive={isMessagesActive}
              isProfileActive={isProfileActive}
              isSettingsActive={isSettingsActive}
              unreadCount={unreadCount}
              unreadMessagesCount={unreadMessagesCount}
              handleNavClick={handleNavClick}
              discoverDropdownRef={discoverDropdownRef}
              discoverMenuPortalRef={discoverMenuPortalRef}
              discoverBtnRef={discoverBtnRef}
              discoverMenuPos={discoverMenuPos}
              isDiscoverDropdownOpen={isDiscoverDropdownOpen}
              isDiscoverDropdownClosing={isDiscoverDropdownClosing}
              clearDiscoverHoverTimeout={clearDiscoverHoverTimeout}
              openDiscoverDropdown={openDiscoverDropdown}
              closeDiscoverDropdown={closeDiscoverDropdown}
              scheduleDiscoverDropdownClose={scheduleDiscoverDropdownClose}
              onNotificationsClick={() => router.push('/notifications')}
              sf={sf}
            />

            <ActionButtons
              whiteText={whiteText}
              isGuest={isGuest}
              isBusinessAccountUser={isBusinessAccountUser}
              isNotificationsActive={isNotificationsActive}
              isMessagesActive={isMessagesActive}
              isSavedActive={isSavedActive}
              isProfileActive={isProfileActive}
              unreadCount={unreadCount}
              savedCount={savedCount}
              unreadMessagesCount={unreadMessagesCount}
              isMobileMenuOpen={isMobileMenuOpen}
              onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onNotificationsClick={() => router.push('/notifications')}
              heroSearchButton={heroSearchButton}
            />
          </div>
        </div>
        {showSearch && isStackedLayout && isSearchVisible && (
          <div className="pt-4 pb-5" ref={searchWrapRef}>
            {renderSearchInput()}
          </div>
        )}
      </header>

      {/* Search Input Section — appears below navbar */}
      {showSearch && !isStackedLayout && (
        <div
          className={`fixed left-0 right-0 z-40 bg-transparent transition-all duration-300 ease-out ${
            isSearchVisible
              ? "top-[72px] opacity-100 translate-y-0"
              : "top-[72px] opacity-0 -translate-y-4 pointer-events-none"
          }`}
          style={sf}
        >
          <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-2 sm:py-3 max-w-[1300px]">
            {/* Anchor for the dropdown modal */}
            <div ref={searchWrapRef}>
              {renderSearchInput()}
            </div>
          </div>
        </div>
      )}

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isBusinessAccountUser={isBusinessAccountUser}
        isGuest={isGuest}
        primaryLinks={PRIMARY_LINKS}
        discoverLinks={DISCOVER_LINKS}
        businessLinks={businessNavLinks}
        handleNavClick={handleNavClick}
        sf={sf}
      />

      <FilterModal
        isOpen={isFilterOpen}
        isVisible={isFilterVisible}
        onClose={closeFilters}
        onFiltersChange={handleFiltersChange}
        anchorRef={searchWrapRef}
      />
    </>
  );
}
