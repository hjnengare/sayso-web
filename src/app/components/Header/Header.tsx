// src/components/Header/Header.tsx
"use client";

import { useRef, useState, useEffect, useLayoutEffect, useCallback, Fragment } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { User, X, ChevronDown, Compass, Bookmark, Bell, Edit, MessageCircle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FilterModal, { FilterState } from "../FilterModal/FilterModal";
import SearchInput from "../SearchInput/SearchInput";

// Tooltip component for locked items
const LockedTooltip = ({ show, label }: { show: boolean; label: string }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 2, scale: 0.98 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-sage backdrop-blur-sm text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-lg border border-sage/20 z-50"
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        Sign in to {label}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-sage rotate-45 border-l border-t border-sage/20" />
      </motion.div>
    )}
  </AnimatePresence>
);
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useMessages } from "../../contexts/MessagesContext";
import { useRequireBusinessOwner } from "../../hooks/useBusinessAccess";
import { useAuth } from "../../contexts/AuthContext";
import Logo from "../Logo/Logo";
import OptimizedLink from "../Navigation/OptimizedLink";

const sf = {
  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
} as const;

const PRIMARY_LINKS = [
  { key: "home", label: "Home", href: "/home", requiresAuth: true },
] as const;

const DISCOVER_LINKS = [
  { key: "for-you", label: "For You", description: "Personalized picks", href: "/for-you", requiresAuth: true },
  { key: "trending", label: "Trending", description: "What's hot right now", href: "/trending", requiresAuth: false },
  { key: "leaderboard", label: "Leaderboard", description: "Top community voices", href: "/leaderboard", requiresAuth: false },
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
}: {
  showSearch?: boolean;
  variant?: "white" | "frosty";
  backgroundClassName?: string;
  searchLayout?: "floating" | "stacked";
  forceSearchOpen?: boolean;
  topPosition?: string;
  reducedPadding?: boolean;
  whiteText?: boolean;
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
  
  // Check if user is a business owner
  const { hasAccess: isBusinessOwner, isChecking: isCheckingBusinessOwner } = useRequireBusinessOwner({
    skipRedirect: true,
  });

  // Check if we're on the Explore page and need to enforce authentication
  const isOnExplorePage = pathname === '/explore';
  const requiresAuthForNav = isOnExplorePage && !authLoading && !user;

  // Check if user is unauthenticated (guest mode)
  const isGuest = !authLoading && !user;

  // Hover states for locked item tooltips
  const [hoveredLockedItem, setHoveredLockedItem] = useState<string | null>(null);

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

  const primaryCount = PRIMARY_LINKS.length;
  const discoverCount = DISCOVER_LINKS.length;
  // Active state helpers
  const isDiscoverActive = DISCOVER_LINKS.some(
    ({ href }) => pathname === href || pathname?.startsWith(href)
  );

  // Icon active states
  const isNotificationsActive = pathname === '/notifications' || pathname?.startsWith('/notifications');
  const isSavedActive = pathname === '/saved' || pathname?.startsWith('/saved');
  const isMessagesActive = pathname === '/dm' || pathname?.startsWith('/dm');
  const isProfileActive = pathname === '/profile' || pathname?.startsWith('/profile');
  const isClaimBusinessActive = pathname === '/for-businesses' || pathname?.startsWith('/for-businesses');

  // Padding classes
  const currentPaddingClass = reducedPadding ? "py-3.5 md:py-4" : "py-3.5 md:py-6";
  const mobileRevealClass = `transform transition-all duration-500 ease-out ${
    isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
  }`;
  const mobileModalRevealClass = `transition-all duration-500 ease-out ${
    isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
  }`;

  return (
    <>
      <header ref={headerRef} className={headerClassName} style={sf}>
        <div className={`relative z-[1] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 w-full max-w-[1700px] ${currentPaddingClass}`}>
          {/* Top row */}
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <OptimizedLink href="/home" className="group flex-shrink-0 relative" aria-label="sayso Home">
              <div className="absolute inset-0 bg-gradient-to-r from-sage/40 via-coral/30 to-sage/40 rounded-[20px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
              <div className="relative scale-90 sm:scale-[0.72] origin-left">
                <Logo variant="default" className="relative drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]" color={whiteText ? "sage" : "gradient"} />
              </div>
            </OptimizedLink>

            {/* Desktop nav - centered */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-3 flex-1 justify-center">
              {!isBusinessAccountUser && PRIMARY_LINKS.map(({ key, label, href, requiresAuth }, index) => {
                const isActive = pathname === href;
                const showLockIndicator = isGuest && requiresAuth;
                return (
                <Fragment key={key}>
                <OptimizedLink
                    href={showLockIndicator ? '/login' : href}
                    onClick={(e) => handleNavClick(href, e)}
                    className={`group capitalize px-2.5 lg:px-3.5 py-1.5 rounded-lg text-sm sm:text-xs sm:text-sm md:text-sm sm:text-xs lg:text-sm sm:text-xs font-semibold transition-all duration-200 relative flex items-center gap-1.5 ${isActive ? 'text-sage' : whiteText ? 'text-white hover:text-white/90 hover:bg-white/10' : 'text-charcoal/90 md:text-charcoal/95 hover:text-sage hover:bg-sage/5'}`}
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                    <span className="relative z-10">{label}</span>
                    {showLockIndicator && (
                      <Lock className={`w-3.5 h-3.5 ${whiteText ? 'text-white' : 'text-charcoal/60'}`} />
                    )}
                  </OptimizedLink>

                  {index === 0 && (
                    <div
                      className="relative"
                      ref={discoverDropdownRef}
                      onMouseEnter={() => {
                        openDiscoverDropdown();
                      }}
                      onMouseLeave={() => {
                        scheduleDiscoverDropdownClose();
                      }}
                    >
                      <button
                        ref={discoverBtnRef}
                        onClick={() => {
                          if (isDiscoverDropdownOpen) {
                            clearDiscoverHoverTimeout();
                            closeDiscoverDropdown();
                          } else {
                            openDiscoverDropdown();
                          }
                        }}
                        className={`group capitalize px-3 lg:px-4 py-1.5 rounded-lg text-sm sm:text-xs sm:text-sm md:text-sm sm:text-xs lg:text-sm sm:text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 relative ${
                          isDiscoverActive
                            ? 'text-sage'
                            : whiteText
                              ? 'text-white hover:text-white/85 hover:bg-white/10'
                              : 'text-charcoal/90 md:text-charcoal/95 hover:text-sage hover:bg-sage/5'
                        }`}
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        aria-expanded={isDiscoverDropdownOpen}
                        aria-haspopup="true"
                      >
                        <span className="whitespace-nowrap relative z-10">Discover</span>
                        <ChevronDown className={`w-4 h-4 sm:w-4 sm:h-4 transition-transform duration-300 relative z-10 ${isDiscoverDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isDiscoverDropdownOpen && discoverMenuPos &&
                        createPortal(
                          <div
                            ref={discoverMenuPortalRef}
                            className={`fixed z-[1000] bg-off-white rounded-[20px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[320px] transition-all duration-300 ease-out backdrop-blur-xl ${
                              isDiscoverDropdownClosing ? 'opacity-0 scale-95 translate-y-[-8px]' : 'opacity-100 scale-100 translate-y-0'
                            }`}
                            style={{
                              left: discoverMenuPos.left,
                              top: discoverMenuPos.top,
                              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                              animation: isDiscoverDropdownClosing ? 'none' : 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                              transformOrigin: 'top center',
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={() => {
                              clearDiscoverHoverTimeout();
                            }}
                            onMouseLeave={() => {
                              scheduleDiscoverDropdownClose();
                            }}
                          >
                            <div className="px-5 pt-4 pb-3 border-b border-charcoal/10 bg-off-white flex items-center gap-2">
                              <h3 className="text-sm md:text-base font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Discover</h3>
                            </div>
                            <div className="py-3">
                              {DISCOVER_LINKS.map(({ key: subKey, label: subLabel, description, href: subHref, requiresAuth }) => {
                                const isActive = pathname === subHref || pathname?.startsWith(subHref);
                                const showLockIndicator = isGuest && requiresAuth;
                                return (
                                <OptimizedLink
                                  key={subKey}
                                  href={showLockIndicator ? '/login' : subHref}
                                  onClick={(e) => {
                                    handleNavClick(subHref, e);
                                    clearDiscoverHoverTimeout();
                                    closeDiscoverDropdown();
                                  }}
                                  className={`group flex items-start gap-3 px-5 py-3 hover:bg-gradient-to-r hover:from-sage/10 hover:to-coral/5 transition-all duration-200 rounded-lg mx-2 ${isActive ? 'bg-gradient-to-r from-sage/10 to-sage/5' : ''}`}
                                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                >
                                  <div className="flex-1">
                                    <div className={`text-sm font-semibold flex items-center gap-1.5 ${isActive ? 'text-sage' : 'text-charcoal group-hover:text-coral'}`}>
                                      {subLabel}
                                      {showLockIndicator && (
                                        <Lock className="w-3 h-3 text-charcoal/60" />
                                      )}
                                    </div>
                                    <div className="text-sm sm:text-xs text-charcoal/60 mt-0.5">
                                      {showLockIndicator ? 'Sign in for personalized picks' : description}
                                    </div>
                                  </div>
                                </OptimizedLink>
                                );
                              })}
                            </div>
                          </div>,
                          document.body
                        )}
                    </div>
                  )}
                </Fragment>
                );
              })}

              {/* For Businesses Link (desktop) - Only show for guests or business accounts */}
              {(isGuest || isBusinessAccountUser) && (
                <OptimizedLink
                  href="/for-businesses"
                  className={`group capitalize px-2.5 lg:px-3.5 py-1.5 rounded-lg text-sm sm:text-xs sm:text-sm md:text-sm sm:text-xs lg:text-sm sm:text-xs font-semibold transition-all duration-200 relative ${
                    isClaimBusinessActive
                      ? 'text-sage'
                      : whiteText
                        ? 'text-white hover:text-white/90 hover:bg-white/10'
                        : 'text-charcoal/90 md:text-charcoal/95 hover:text-sage hover:bg-sage/5'
                  }`}
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  <span className="relative z-10">For Businesses</span>
                </OptimizedLink>
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              {/* Notifications Icon - Always visible for user-friendliness */}
              <button
                onClick={() => {
                  // Navigate to notifications page or open notifications dropdown
                  router.push('/notifications');
                }}
                className={`group w-11 h-11 sm:w-12 sm:h-12 md:w-12 md:h-12 flex items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${isNotificationsActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/80 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label="Notifications"
              >
                <Bell className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${isNotificationsActive ? 'text-sage' : whiteText ? 'text-white group-hover:text-white/80' : 'text-current group-hover:text-sage'}`} fill={isNotificationsActive ? 'currentColor' : 'none'} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Saved Bookmark Icon - Mobile Only */}
              <OptimizedLink
                href={isGuest ? '/login' : '/saved'}
                className={`md:hidden group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation relative shadow-md ${isSavedActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/80 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label={isGuest ? 'Sign in to view saved' : 'View saved businesses'}
              >
                <Bookmark className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${isSavedActive ? 'text-sage' : whiteText ? 'text-white group-hover:text-white/80' : 'text-current group-hover:text-sage'}`} fill={isSavedActive ? 'currentColor' : 'none'} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} />
                {isGuest ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-charcoal/60 border border-white/20">
                    <Lock className="w-2 h-2 text-white" />
                  </span>
                ) : savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {savedCount > 99 ? '99+' : savedCount}
                  </span>
                )}
              </OptimizedLink>

              {/* Messages/DM Icon - Mobile Only */}
              <OptimizedLink
                href={isGuest ? '/login' : '/dm'}
                className={`md:hidden group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation relative shadow-md ${isMessagesActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/80 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label={isGuest ? 'Sign in to view messages' : 'Messages'}
              >
                <MessageCircle className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${isMessagesActive ? 'text-sage' : whiteText ? 'text-white group-hover:text-white/80' : 'text-current group-hover:text-sage'}`} fill={isMessagesActive ? 'currentColor' : 'none'} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} />
                {isGuest ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-charcoal/60 border border-white/20">
                    <Lock className="w-2 h-2 text-white" />
                  </span>
                ) : unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </OptimizedLink>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200 shadow-md ${
                  whiteText 
                    ? 'text-white' 
                    : 'text-charcoal/80'
                }`}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${whiteText ? 'text-white' : 'text-current'}`}
                    strokeWidth={2.8}
                  />
                ) : (
                  <div className="flex flex-col items-start justify-center gap-[5px]">
                    <span className={`block w-8 h-[3px] rounded-full ${whiteText ? 'bg-white' : 'bg-current'}`} />
                    <span className={`block w-6 h-[3px] rounded-full ${whiteText ? 'bg-white' : 'bg-current'}`} />
                    <span className={`block w-4 h-[3px] rounded-full ${whiteText ? 'bg-white' : 'bg-current'}`} />
                  </div>
                )}
              </button>

              {/* Saved - Hidden for business accounts */}
              {!isBusinessAccountUser && (
              <div
                className="relative hidden md:block"
                onMouseEnter={() => isGuest && setHoveredLockedItem('saved')}
                onMouseLeave={() => setHoveredLockedItem(null)}
              >
                <OptimizedLink
                  href={isGuest ? '/login' : '/saved'}
                  className={`group flex w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${isSavedActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/85 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                  aria-label={isGuest ? 'Sign in to view saved' : 'Saved'}
                >
                  <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${isSavedActive ? 'text-sage' : whiteText ? 'text-white group-hover:text-white/85' : 'text-current group-hover:text-sage'}`} fill={isSavedActive ? 'currentColor' : 'none'} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} />
                  {isGuest ? (
                    <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-charcoal/60 border border-white/20">
                      <Lock className="w-2 h-2 text-white" />
                    </span>
                  ) : savedCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                      {savedCount > 99 ? '99+' : savedCount}
                    </span>
                  )}
                </OptimizedLink>
                <LockedTooltip show={hoveredLockedItem === 'saved'} label="view saved" />
              </div>
              )}

              {/* Messages - Hidden for business accounts */}
              {!isBusinessAccountUser && (
              <div
                className="relative hidden md:block"
                onMouseEnter={() => isGuest && setHoveredLockedItem('messages')}
                onMouseLeave={() => setHoveredLockedItem(null)}
              >
                <OptimizedLink
                  href={isGuest ? '/login' : '/dm'}
                  className={`group flex w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${isMessagesActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/85 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                  aria-label={isGuest ? 'Sign in to view messages' : 'Messages'}
                >
                  <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${isMessagesActive ? 'text-sage' : whiteText ? 'text-white group-hover:text-white/85' : 'text-current group-hover:text-sage'}`} fill={isMessagesActive ? 'currentColor' : 'none'} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} />
                  {isGuest ? (
                    <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-charcoal/60 border border-white/20">
                      <Lock className="w-2 h-2 text-white" />
                    </span>
                  ) : unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </OptimizedLink>
                <LockedTooltip show={hoveredLockedItem === 'messages'} label="view messages" />
              </div>              )}
              {/* Profile */}
              <div
                className="relative hidden md:block"
                onMouseEnter={() => isGuest && setHoveredLockedItem('profile')}
                onMouseLeave={() => setHoveredLockedItem(null)}
              >
                <OptimizedLink
                  href={isGuest ? '/login' : '/profile'}
                  className={`group flex w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${isProfileActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/85 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                  aria-label={isGuest ? 'Sign in' : 'Profile'}
                >
                  <User className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${isProfileActive ? 'text-sage' : whiteText ? 'text-white group-hover:text-white/85' : 'text-current group-hover:text-sage'}`} fill={isProfileActive ? 'currentColor' : 'none'} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} />
                  {isGuest && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-charcoal/60 border border-white/20">
                      <Lock className="w-2 h-2 text-white" />
                    </span>
                  )}
                </OptimizedLink>
                <LockedTooltip show={hoveredLockedItem === 'profile'} label="view profile" />
              </div>
            </div>
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

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-xl z-[10000] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div
        className={`fixed top-0 right-0 h-full w-full bg-navbar-bg z-[99999] shadow-[0_-4px_24px_rgba(0,0,0,0.15),0_-2px_8px_rgba(0,0,0,0.1)] transform md:hidden backdrop-blur-xl border-l border-white/20 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300`}
      >
        <div className={`flex flex-col h-full overflow-hidden ${mobileModalRevealClass}`}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-charcoal/10 flex-shrink-0 transition-all duration-500 ease-out">
            <Logo variant="mobile" color="sage" />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-off-white hover:text-off-white/80 transition-colors focus:outline-none focus:ring-0"
              aria-label="Close menu"
            >
              <X className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.8} />
            </button>
          </div>

          <nav className="flex flex-col py-2 px-3 overflow-y-auto flex-1 min-h-0">
            {!isBusinessAccountUser && (
            <div className="space-y-1">
              {PRIMARY_LINKS.map(({ key, label, href, requiresAuth }, index) => {
                const showLockIndicator = isGuest && requiresAuth;
                return (
                <OptimizedLink
                  key={key}
                  href={showLockIndicator ? '/login' : href}
                  onClick={(e) => {
                    handleNavClick(href, e);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-[20px] text-base font-normal text-white hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-200 relative min-h-[44px] flex items-center justify-start ${mobileRevealClass}`}
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    transitionDelay: `${index * 60}ms`,
                  }}
                >
                  <span className="text-left flex items-center gap-1.5">
                    {label}
                    {showLockIndicator && (
                      <Lock className="w-3 h-3 text-white/40" />
                    )}
                  </span>
                </OptimizedLink>
              );
              })}
            </div>
            )}

            {!isBusinessAccountUser && <div className="h-px bg-charcoal/10 my-2 mx-3" />}

            {!isBusinessAccountUser && (
            <div className="space-y-1">
              {DISCOVER_LINKS.map(({ key, label, href, requiresAuth }, index) => {
                const showLockIndicator = isGuest && requiresAuth;
                return (
                  <OptimizedLink
                    key={key}
                    href={showLockIndicator ? '/login' : href}
                    onClick={(e) => {
                      handleNavClick(href, e);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded-[20px] text-base font-normal text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-200 min-h-[44px] flex items-center justify-start ${mobileRevealClass}`}
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      transitionDelay: `${(primaryCount + index) * 60}ms`,
                    }}
                  >
                    <span className="text-left flex items-center gap-1.5">
                      {label}
                      {showLockIndicator && (
                        <Lock className="w-3 h-3 text-white/40" />
                      )}
                    </span>
                  </OptimizedLink>
                );
              })}
            </div>
            )}

            <div className="h-px bg-charcoal/10 my-2 mx-3" />

            <div className="space-y-1">
              {[
                // Business account routes
                ...(isBusinessAccountUser ? [
                  { href: '/for-businesses', label: 'For Businesses', requiresAuth: true, delay: 1, businessOnly: true },
                  { href: '/my-businesses', label: 'My Businesses', requiresAuth: true, delay: 2, businessOnly: true },
                ] : []),
                // Personal user routes
                ...(isBusinessAccountUser ? [] : [
                  { href: '/dm', label: 'Messages', requiresAuth: true, delay: 2, personalOnly: true },
                  { href: '/saved', label: 'Saved', requiresAuth: true, delay: 3, personalOnly: true },
                ]),
                // Common routes
                { href: '/profile', label: 'Profile', requiresAuth: true, delay: isBusinessAccountUser ? 3 : 4 },
              ].map((item) => {
                const showLockIndicator = isGuest && item.requiresAuth;
                return (
                  <OptimizedLink
                    key={item.href}
                    href={showLockIndicator ? '/login' : item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-base font-normal text-white hover:text-white flex items-center justify-start transition-colors duration-200 min-h-[44px] ${mobileRevealClass}`}
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      transitionDelay: `${(primaryCount + discoverCount + item.delay) * 60}ms`,
                    }}
                  >
                    <span className="text-left flex items-center gap-1.5">
                      {item.label}
                      {showLockIndicator && (
                        <Lock className="w-3 h-3 text-white/40" />
                      )}
                    </span>
                  </OptimizedLink>
                );
              })}
            </div>
          </nav>
        </div>
      </div>


      {/* Anchored Filter Modal */}
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
