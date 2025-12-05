// src/components/Header/Header.tsx
"use client";

import { useRef, useState, useEffect, useLayoutEffect, useCallback, Fragment } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { User, X, Briefcase, ChevronDown, Compass, Bookmark, Bell, Edit, MessageCircle } from "react-feather";
import FilterModal, { FilterState } from "../FilterModal/FilterModal";
import SearchInput from "../SearchInput/SearchInput";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useMessages } from "../../contexts/MessagesContext";
import Logo from "../Logo/Logo";
import OptimizedLink from "../Navigation/OptimizedLink";

const sf = {
  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
} as const;

const PRIMARY_LINKS = [
  { key: "home", label: "Home", href: "/home" },
] as const;

const DISCOVER_LINKS = [
  { key: "explore", label: "Explore", description: "Browse all businesses", href: "/explore" },
  { key: "for-you", label: "For You", description: "Personalized picks", href: "/for-you" },
  { key: "trending", label: "Trending", description: "What’s hot right now", href: "/trending" },
  { key: "leaderboard", label: "Leaderboard", description: "Top community voices", href: "/leaderboard" },
  { key: "events-specials", label: "Events & Specials", description: "Seasonal happenings & offers", href: "/events-specials" },
] as const;

const BUSINESS_LINKS = [
  { key: "business-login", label: "Business Login", description: "Access your business account", href: "/business/login" },
  { key: "claim-business", label: "Claim Business", description: "Add your business to sayso", href: "/claim-business" },
  { key: "manage-business", label: "Manage Business", description: "Update and track performance", href: "/manage-business" },
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
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);
  const [isBusinessDropdownClosing, setIsBusinessDropdownClosing] = useState(false);
  const [menuPos, setMenuPos] = useState<{left:number; top:number} | null>(null);
  const [discoverMenuPos, setDiscoverMenuPos] = useState<{left:number; top:number} | null>(null);
  const { savedCount } = useSavedItems();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessagesCount } = useMessages();

  // Use refs to track state without causing re-renders
  const isFilterVisibleRef = useRef(isFilterVisible);
  const isBusinessDropdownOpenRef = useRef(isBusinessDropdownOpen);
  const isDiscoverDropdownOpenRef = useRef(isDiscoverDropdownOpen);
  const showSearchBarRef = useRef(showSearchBar);

  // Update refs when state changes
  useEffect(() => {
    isFilterVisibleRef.current = isFilterVisible;
  }, [isFilterVisible]);

  useEffect(() => {
    isBusinessDropdownOpenRef.current = isBusinessDropdownOpen;
  }, [isBusinessDropdownOpen]);

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
  const businessDropdownRef = useRef<HTMLDivElement>(null);
  const businessMenuPortalRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const discoverDropdownRef = useRef<HTMLDivElement>(null);
  const discoverMenuPortalRef = useRef<HTMLDivElement>(null);
  const discoverBtnRef = useRef<HTMLButtonElement>(null);
  const discoverHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const businessHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDiscoverHoverTimeout = useCallback(() => {
    if (discoverHoverTimeoutRef.current) {
      clearTimeout(discoverHoverTimeoutRef.current);
      discoverHoverTimeoutRef.current = null;
    }
  }, []);

  const clearBusinessHoverTimeout = useCallback(() => {
    if (businessHoverTimeoutRef.current) {
      clearTimeout(businessHoverTimeoutRef.current);
      businessHoverTimeoutRef.current = null;
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

  const openBusinessDropdown = useCallback(() => {
    clearBusinessHoverTimeout();
    setIsBusinessDropdownClosing(false);
    setIsBusinessDropdownOpen(true);
  }, [clearBusinessHoverTimeout]);

  const closeBusinessDropdown = useCallback(() => {
    setIsBusinessDropdownClosing(true);
    setTimeout(() => {
      setIsBusinessDropdownOpen(false);
      setIsBusinessDropdownClosing(false);
    }, 300);
  }, []);

  const scheduleBusinessDropdownClose = useCallback(() => {
    clearBusinessHoverTimeout();
    businessHoverTimeoutRef.current = setTimeout(() => {
      closeBusinessDropdown();
    }, 120);
  }, [clearBusinessHoverTimeout, closeBusinessDropdown]);

  useEffect(() => {
    return () => {
      clearDiscoverHoverTimeout();
      clearBusinessHoverTimeout();
    };
  }, [clearDiscoverHoverTimeout, clearBusinessHoverTimeout]);

  // Header always visible (scroll effects removed)
  // Previously had scroll-based hide/show logic, now permanently visible


  // Close all modals on scroll - memoized with useCallback
  const closeModalsOnScroll = useCallback(() => {
    // Only close if they're actually open to avoid unnecessary state updates
    if (isBusinessDropdownOpenRef.current) {
      clearBusinessHoverTimeout();
      closeBusinessDropdown();
    }
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
}, [clearBusinessHoverTimeout, closeBusinessDropdown, clearDiscoverHoverTimeout, closeDiscoverDropdown, forceSearchOpen, isStackedLayout]);

  useEffect(() => {
    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener('scroll', closeModalsOnScroll, options);

    return () => {
      window.removeEventListener('scroll', closeModalsOnScroll, options);
    };
  }, [closeModalsOnScroll]);

  // Close business dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideButtonWrap = businessDropdownRef.current?.contains(target);
      const clickedInsidePortalMenu = businessMenuPortalRef.current?.contains(target);

      if (!clickedInsideButtonWrap && !clickedInsidePortalMenu) {
        clearBusinessHoverTimeout();
        closeBusinessDropdown();
      }
    };

    if (isBusinessDropdownOpen) {
      // use 'click' instead of 'mousedown' so Link can process first
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isBusinessDropdownOpen, clearBusinessHoverTimeout, closeBusinessDropdown]);

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

  // Measure button position when dropdown opens
  useLayoutEffect(() => {
    if (isBusinessDropdownOpen && btnRef.current && headerRef.current) {
      const buttonRect = btnRef.current.getBoundingClientRect();
      const headerRect = headerRef.current.getBoundingClientRect();
      const dropdownWidth = 560; // min-w-[560px]
      const viewportWidth = window.innerWidth;
      const padding = 16; // padding from edge
      const center = buttonRect.left + buttonRect.width / 2;
      let leftPos = center - dropdownWidth / 2;
      const maxLeft = viewportWidth - dropdownWidth - padding;
      leftPos = Math.max(padding, Math.min(leftPos, maxLeft));

      // Position dropdown below the navbar's bottom margin
      const gap = 8; // Gap below navbar
      setMenuPos({ left: leftPos, top: headerRect.bottom + gap });
    } else {
      setMenuPos(null);
    }
  }, [isBusinessDropdownOpen]);

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

  const handleApplyFilters = (f: FilterState) => {
    // Navigate to explore page with filters applied via URL params
    const params = new URLSearchParams();
    if (f.categories.length > 0) {
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
  const computedBackgroundClass = backgroundClassName ?? "bg-navbar-bg";
  // Header is always fixed at top-0 - Enhanced with better shadows and borders
  const headerClassName = isHomeVariant
    ? `fixed top-0 left-0 right-0 z-50 ${computedBackgroundClass} backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border-b border-white/40 transition-all duration-300`
    : `fixed top-0 left-0 right-0 z-50 ${computedBackgroundClass} backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border-b border-sage/10 transition-all duration-300`;
  const isSearchVisible = forceSearchOpen || isStackedLayout || showSearchBar;

  const renderSearchInput = () => (
    <SearchInput
      variant="header"
      placeholder="Discover exceptional local experiences, premium dining, and hidden gems..."
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
  const businessCount = BUSINESS_LINKS.length;

  // Active state helpers
  const isDiscoverActive = DISCOVER_LINKS.some(
    ({ href }) => pathname === href || pathname?.startsWith(href)
  );

  const isBusinessActive = BUSINESS_LINKS.some(
    ({ href }) => pathname === href || pathname?.startsWith(href)
  );

  // Icon active states
  const isNotificationsActive = pathname === '/notifications' || pathname?.startsWith('/notifications');
  const isSavedActive = pathname === '/saved' || pathname?.startsWith('/saved');
  const isMessagesActive = pathname === '/dm' || pathname?.startsWith('/dm');
  const isProfileActive = pathname === '/profile' || pathname?.startsWith('/profile');

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
              <div className="absolute inset-0 bg-gradient-to-r from-sage/40 via-coral/30 to-sage/40 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
              <div className="relative scale-90 sm:scale-[0.72] origin-left">
                <Logo variant="default" className="relative drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]" color={whiteText ? "sage" : "gradient"} />
              </div>
            </OptimizedLink>

            {/* Desktop nav - centered */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-3 flex-1 justify-center">
              {PRIMARY_LINKS.map(({ key, label, href }, index) => {
                const isActive = pathname === href;
                return (
                <Fragment key={key}>
                <OptimizedLink
                    href={href}
                    className={`group capitalize px-2.5 lg:px-3.5 py-1.5 rounded-lg text-sm sm:text-xs sm:text-sm md:text-sm sm:text-xs lg:text-sm sm:text-xs font-semibold transition-all duration-200 relative ${isActive ? 'text-sage' : whiteText ? 'text-white hover:text-white/90 hover:bg-white/10' : 'text-charcoal/90 md:text-charcoal/95 hover:text-sage hover:bg-sage/5'}`}
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                    <span className="relative z-10">{label}</span>
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
                            className={`fixed z-[1000] bg-off-white rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[320px] transition-all duration-300 ease-out backdrop-blur-xl ${
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
                              {DISCOVER_LINKS.map(({ key: subKey, label: subLabel, description, href: subHref }) => {
                                const isActive = pathname === subHref || pathname?.startsWith(subHref);
                                return (
                                <OptimizedLink
                                  key={subKey}
                                  href={subHref}
                                  onClick={() => {
                                    clearDiscoverHoverTimeout();
                                    closeDiscoverDropdown();
                                  }}
                                  className={`group flex items-start gap-3 px-5 py-3 hover:bg-gradient-to-r hover:from-sage/10 hover:to-coral/5 transition-all duration-200 rounded-lg mx-2 ${isActive ? 'bg-gradient-to-r from-sage/10 to-sage/5' : ''}`}
                                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                >
                                  <div className="flex-1">
                                    <div className={`text-sm font-semibold ${isActive ? 'text-sage' : 'text-charcoal group-hover:text-coral'}`}>{subLabel}</div>
                                    <div className="text-sm sm:text-xs text-charcoal/60 mt-0.5">{description}</div>
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

              {/* For Businesses Dropdown (desktop) */}
              <div
                className="relative"
                ref={businessDropdownRef}
                onMouseEnter={() => {
                  openBusinessDropdown();
                }}
                onMouseLeave={() => {
                  scheduleBusinessDropdownClose();
                }}
              >
                <button
                  ref={btnRef}
                  onClick={() => {
                    if (isBusinessDropdownOpen) {
                      clearBusinessHoverTimeout();
                      closeBusinessDropdown();
                    } else {
                      openBusinessDropdown();
                    }
                  }}
                  className={`group capitalize px-3 lg:px-4 py-1.5 rounded-lg text-sm sm:text-xs sm:text-sm md:text-sm sm:text-xs lg:text-sm sm:text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 relative ${
                    isBusinessActive
                      ? 'text-sage'
                      : whiteText
                        ? 'text-white hover:text-white/85 hover:bg-white/10'
                        : 'text-charcoal/90 md:text-charcoal/95 hover:text-sage hover:bg-sage/5'
                  }`}
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  <span className="whitespace-nowrap relative z-10">For Businesses</span>
                  <ChevronDown className={`w-4 h-4 sm:w-4 sm:h-4 transition-transform duration-300 relative z-10 ${isBusinessDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isBusinessDropdownOpen && menuPos &&
                  createPortal(
                    <div
                      ref={businessMenuPortalRef}
                      className={`fixed z-[1000] bg-off-white rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[560px] whitespace-normal break-keep transition-all duration-300 ease-out backdrop-blur-xl ${
                        isBusinessDropdownClosing ? 'opacity-0 scale-95 translate-y-[-8px]' : 'opacity-100 scale-100 translate-y-0'
                      }`}
                      style={{
                        left: menuPos.left,
                        top: menuPos.top,
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        animation: isBusinessDropdownClosing ? 'none' : 'fadeInScale 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        transformOrigin: 'top center',
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={() => {
                        clearBusinessHoverTimeout();
                      }}
                      onMouseLeave={() => {
                        scheduleBusinessDropdownClose();
                      }}
                    >
                      <div className="relative flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b border-charcoal/10 bg-off-white">
                        <div className="relative z-10 flex items-center gap-2">
                          <h3 className="text-sm md:text-base font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>For Businesses</h3>
                        </div>
                        <button
                          onClick={() => {
                            clearBusinessHoverTimeout();
                            closeBusinessDropdown();
                          }}
                          className="relative z-10 w-11 h-11 sm:w-9 sm:h-9 rounded-full border border-charcoal/10 bg-off-white/70 hover:bg-sage/10 hover:text-sage text-charcoal/80 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-sage/30 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                          aria-label="Close menu"
                        >
                          <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                      </div>

                      <div className="px-5 sm:px-6 py-4 space-y-1.5" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        {BUSINESS_LINKS.map(({ key, label, description, href }) => {
                          const isActive = pathname === href || pathname?.startsWith(href);
                          return (
                          <OptimizedLink
                            key={key}
                            href={href}
                            className={`group flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-sage/10 hover:to-coral/5 transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-sage/10 to-sage/5' : ''}`}
                          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                          onClick={() => {
                            clearBusinessHoverTimeout();
                            closeBusinessDropdown();
                          }}
                        >
                          <div className="flex-1">
                              <div className={`text-sm font-semibold ${isActive ? 'text-sage' : 'text-charcoal group-hover:text-coral'} transition-colors`}>
                                {label}
                          </div>
                              <div className="text-sm sm:text-xs text-charcoal/60 mt-0.5">
                                {description}
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
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              {/* Notifications Icon - Always visible for user-friendliness */}
              <button
                onClick={() => {
                  // Navigate to notifications page or open notifications dropdown
                  router.push('/notifications');
                }}
                className={`group w-11 h-11 sm:w-12 sm:h-12 md:w-12 md:h-12 flex items-center justify-center rounded-lg transition-all duration-200 relative ${isNotificationsActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/80 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label="Notifications"
              >
                <Bell className={`w-6 h-6 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110 ${isNotificationsActive ? 'text-sage' : 'text-current'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Saved Bookmark Icon - Mobile Only */}
              <OptimizedLink
                href="/saved"
                className={`md:hidden group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation relative ${isSavedActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/80 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label="View saved businesses"
              >
                <Bookmark className={`w-6 h-6 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110 ${isSavedActive ? 'text-sage' : 'text-current'}`} fill={isSavedActive ? 'currentColor' : 'none'} />
                {savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {savedCount > 99 ? '99+' : savedCount}
                  </span>
                )}
              </OptimizedLink>

              {/* Messages/DM Icon - Mobile Only */}
              <OptimizedLink
                href="/dm"
                className={`md:hidden group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation relative ${isMessagesActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/80 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label="Messages"
              >
                <MessageCircle className={`w-6 h-6 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110 ${isMessagesActive ? 'text-sage' : 'text-current'}`} />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </OptimizedLink>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-12 h-12 flex items-center justify-center text-charcoal/80 hover:text-sage transition-colors"
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

              {/* Saved */}
              <OptimizedLink
                href="/saved"
                className={`group hidden md:flex w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-lg transition-all duration-200 relative ${isSavedActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/85 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label="Saved"
              >
                <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110 ${isSavedActive ? 'text-sage' : 'text-current'}`} fill={isSavedActive ? 'currentColor' : 'none'} />
                {savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {savedCount > 99 ? '99+' : savedCount}
                  </span>
                )}
              </OptimizedLink>

              {/* Messages/DM */}
              <OptimizedLink
                href="/dm"
                className={`group hidden md:flex w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-lg transition-all duration-200 relative ${isMessagesActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/85 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label="Messages"
              >
                <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110 ${isMessagesActive ? 'text-sage' : 'text-current'}`} />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </OptimizedLink>

              {/* Profile */}
              <OptimizedLink
                href="/profile"
                className={`group hidden md:flex w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-lg transition-all duration-200 ${isProfileActive ? 'text-sage bg-sage/5' : whiteText ? 'text-white hover:text-white/85 hover:bg-white/10' : 'text-charcoal/80 hover:text-sage hover:bg-sage/5'}`}
                aria-label="Profile"
              >
                <User className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110 ${isProfileActive ? 'text-sage' : 'text-current'}`} />
              </OptimizedLink>
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
            {PRIMARY_LINKS.map(({ key, label, href }, index) => (
              <OptimizedLink
                key={key}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-xl text-base font-semibold text-white hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-200 relative min-h-[44px] flex items-center justify-start ${mobileRevealClass}`}
                style={{
                  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  transitionDelay: `${index * 60}ms`,
                }}
              >
                <span className="text-left">
                  {label}
                </span>
              </OptimizedLink>
            ))}

            <div className="h-px bg-charcoal/10 my-2 mx-3" />

            <div className="px-3 py-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white/80 tracking-wide">Discover</span>
              </div>
              <div className="space-y-1">
                {DISCOVER_LINKS.map(({ key, label, href }, index) => (
                  <OptimizedLink
                    key={key}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-xl text-base font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-200 min-h-[44px] flex items-center justify-start ${mobileRevealClass}`}
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      transitionDelay: `${(primaryCount + index) * 60}ms`,
                    }}
                  >
                    <span className="text-left">{label}</span>
                  </OptimizedLink>
                ))}
              </div>
            </div>
            
            <div className="h-px bg-charcoal/10 my-2 mx-3" />
            
            {/* Manage Business Link */}
            <OptimizedLink
              href="/manage-business"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl text-base font-semibold text-white hover:text-white hover:bg-off-white/10 transition-colors relative min-h-[44px] flex items-center justify-start ${mobileRevealClass}`}
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                transitionDelay: `${(primaryCount + discoverCount) * 60}ms`,
              }}
            >
              <span className="text-left">Manage Business</span>
            </OptimizedLink>
            
            <div className="h-px bg-charcoal/10 my-2 mx-3" />
            <OptimizedLink
              href="/dm"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-base font-semibold text-white hover:text-white flex items-center justify-start transition-colors duration-200 min-h-[44px] ${mobileRevealClass}`}
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 500,
                transitionDelay: `${(primaryCount + discoverCount + 1) * 60}ms`,
              }}
            >
              <span className="text-left">Messages</span>
            </OptimizedLink>
            <OptimizedLink
              href="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-base font-semibold text-white hover:text-white flex items-center justify-start transition-colors duration-200 min-h-[44px] ${mobileRevealClass}`}
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 500,
                transitionDelay: `${(primaryCount + discoverCount + 2) * 60}ms`,
              }}
            >
              <span className="text-left">Profile</span>
            </OptimizedLink>
          </nav>
        </div>
      </div>


      {/* Anchored Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        isVisible={isFilterVisible}
        onClose={closeFilters}
        onApplyFilters={handleApplyFilters}
        anchorRef={searchWrapRef}
      />
    </>
  );
}
