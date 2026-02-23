/**
 * useHeaderState - Centralized state management for header/navbar
 * Consolidates all modal states, dropdown states, active states, and handlers
 */

import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FilterState } from "../FilterModal/FilterModal";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useRequireBusinessOwner } from "../../hooks/useBusinessAccess";
import { useAuth } from "../../contexts/AuthContext";
import {
  DISCOVER_LINKS,
  HEADER_FONT_STYLE,
  getBusinessNavLinks,
  getAllNavLinksForRole,
} from "./headerActionsConfig";

interface UseHeaderStateProps {
  searchLayout?: "floating" | "stacked";
  forceSearchOpen?: boolean;
}

export interface HeaderActiveStates {
  isDiscoverActive: boolean;
  isNotificationsActive: boolean;
  isSavedActive: boolean;
  isProfileActive: boolean;
  isSettingsActive: boolean;
  isClaimBusinessActive: boolean;
}

export interface HeaderModalStates {
  isFilterVisible: boolean;
  isFilterOpen: boolean;
  isMobileMenuOpen: boolean;
  isDiscoverDropdownOpen: boolean;
  isDiscoverDropdownClosing: boolean;
  showSearchBar: boolean;
  discoverMenuPos: { left: number; top: number } | null;
}

export interface HeaderHandlers {
  openFilters: () => void;
  closeFilters: () => void;
  handleFiltersChange: (f: FilterState) => void;
  handleSubmitQuery: (query: string) => void;
  handleNavClick: (href: string, e?: React.MouseEvent) => void;
  openDiscoverDropdown: () => void;
  closeDiscoverDropdown: () => void;
  scheduleDiscoverDropdownClose: () => void;
  clearDiscoverHoverTimeout: () => void;
  setShowSearchBar: (show: boolean) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
}

/**
 * Consolidated hook for all header state management
 * Replaces scattered useState, useCallback, and ref management throughout Header.tsx
 */
export const useHeaderState = ({
  searchLayout = "floating",
  forceSearchOpen = false,
}: UseHeaderStateProps = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isStackedLayout = searchLayout === "stacked";

  // ============================================================================
  // MODAL & DROPDOWN STATES
  // ============================================================================

  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDiscoverDropdownOpen, setIsDiscoverDropdownOpen] = useState(false);
  const [isDiscoverDropdownClosing, setIsDiscoverDropdownClosing] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(() => {
    if (forceSearchOpen || isStackedLayout) {
      return true;
    }
    return false;
  });
  const [discoverMenuPos, setDiscoverMenuPos] = useState<{
    left: number;
    top: number;
  } | null>(null);

  // ============================================================================
  // CONTEXT DATA
  // ============================================================================

  const { savedCount } = useSavedItems();
  const { unreadCount: personalUnreadCount } = useNotifications();
  const { user, isLoading: authLoading, logout } = useAuth();

  // ============================================================================
  // USER ROLE & AUTH STATE
  // ============================================================================

  const userCurrentRole =
    user?.profile?.account_role || user?.profile?.role || "user";
  const isAdminUser = userCurrentRole === "admin";
  const isBusinessAccountUser = !isAdminUser && userCurrentRole === "business_owner";
  const shouldUseBusinessNotifications = false;
  const hasMultipleRoles = user?.profile?.role === "both";
  const isGuest = !authLoading && !user;
  // ============================================================================
  // BUSINESS ACCESS CHECK
  // ============================================================================

  const { isChecking: isCheckingBusinessOwner, businesses: ownedBusinesses } =
    useRequireBusinessOwner({
      skipRedirect: true,
    });
  const ownedBusinessesCount = ownedBusinesses?.length ?? 0;
  const hasOwnedBusinesses = ownedBusinessesCount > 0;

  // SWR-backed business unread count — realtime + deduped, no manual fetch needed

  // ============================================================================
  // NAVIGATION LINKS (COMPUTED)
  // ============================================================================

  const navLinks = getAllNavLinksForRole(
    isBusinessAccountUser,
    isCheckingBusinessOwner,
    hasOwnedBusinesses
  );
  const unreadCount = Math.max(0, personalUnreadCount || 0);

  // ============================================================================
  // REFS
  // ============================================================================

  const isFilterVisibleRef = useRef(isFilterVisible);
  const isDiscoverDropdownOpenRef = useRef(isDiscoverDropdownOpen);
  const showSearchBarRef = useRef(showSearchBar);
  const headerRef = useRef<HTMLElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const discoverDropdownRef = useRef<HTMLDivElement>(null);
  const discoverMenuPortalRef = useRef<HTMLDivElement>(null);
  const discoverBtnRef = useRef<HTMLButtonElement>(null);
  const discoverHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // ============================================================================
  // REF SYNC EFFECTS
  // ============================================================================

  useEffect(() => {
    isFilterVisibleRef.current = isFilterVisible;
  }, [isFilterVisible]);

  useEffect(() => {
    isDiscoverDropdownOpenRef.current = isDiscoverDropdownOpen;
  }, [isDiscoverDropdownOpen]);

  useEffect(() => {
    showSearchBarRef.current = showSearchBar;
  }, [showSearchBar]);

  // Publish header height as CSS variable so portal/admin layouts can fill the remaining viewport
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`);
    });
    observer.observe(el);
    // Set immediately on mount
    document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (forceSearchOpen || isStackedLayout) {
      setShowSearchBar(true);
    }
  }, [forceSearchOpen, isStackedLayout]);

  // ============================================================================
  // ACTIVE STATES (COMPUTED)
  // ============================================================================

  const activeStates: HeaderActiveStates = {
    isDiscoverActive: DISCOVER_LINKS.some(
      ({ href }) => pathname === href || pathname?.startsWith(href)
    ),
    isNotificationsActive:
      pathname === "/notifications" || pathname?.startsWith("/notifications"),
    isSavedActive: pathname === "/saved" || pathname?.startsWith("/saved"),
    isProfileActive: pathname === "/profile" || pathname?.startsWith("/profile"),
    isSettingsActive:
      pathname === "/settings" || pathname?.startsWith("/settings"),
    isClaimBusinessActive:
      pathname === "/claim-business" ||
      pathname?.startsWith("/claim-business"),
  };

  // ============================================================================
  // MODAL STATE OBJECT
  // ============================================================================

  const modalStates: HeaderModalStates = {
    isFilterVisible,
    isFilterOpen,
    isMobileMenuOpen,
    isDiscoverDropdownOpen,
    isDiscoverDropdownClosing,
    showSearchBar,
    discoverMenuPos,
  };

  // ============================================================================
  // HANDLERS - Memoized callbacks
  // ============================================================================

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

  const openFilters = useCallback(() => {
    if (isFilterVisible) return;
    setIsFilterVisible(true);
    setTimeout(() => setIsFilterOpen(true), 10);
  }, [isFilterVisible]);

  const closeFilters = useCallback(() => {
    setIsFilterOpen(false);
    setTimeout(() => setIsFilterVisible(false), 150);
  }, []);

  const handleFiltersChange = useCallback(
    (f: FilterState) => {
      const params = new URLSearchParams();
      if (f.categories && f.categories.length > 0) {
        params.set("categories", f.categories.join(","));
      }
      if (f.minRating !== null) {
        params.set("min_rating", f.minRating.toString());
      }
      if (f.distance) {
        params.set("distance", f.distance);
      }

      const queryString = params.toString();
      const exploreUrl = queryString ? `/explore?${queryString}` : "/explore";
      router.push(exploreUrl);

      if (!forceSearchOpen && !isStackedLayout) {
        setShowSearchBar(false);
      }
      closeFilters();
    },
    [forceSearchOpen, isStackedLayout, closeFilters, router]
  );

  const handleSubmitQuery = useCallback(
    (query: string) => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("search", query.trim());
      }
      const queryString = params.toString();
      const exploreUrl = queryString ? `/explore?${queryString}` : "/explore";
      router.push(exploreUrl);

      if (!forceSearchOpen && !isStackedLayout) {
        setShowSearchBar(false);
      }
      if (isFilterVisible) closeFilters();
    },
    [forceSearchOpen, isStackedLayout, isFilterVisible, closeFilters, router]
  );

  // Gate navigation: redirect to login if on explore page and not authenticated
  const isOnExplorePage = pathname === "/explore";
  const requiresAuthForNav = isOnExplorePage && !authLoading && !user;

  const handleNavClick = useCallback(
    (href: string, e?: React.MouseEvent) => {
      if (
        requiresAuthForNav &&
        href !== "/explore" &&
        href !== "/login" &&
        href !== "/register" &&
        href !== "/onboarding"
      ) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        router.push("/onboarding");
      }
    },
    [requiresAuthForNav, router]
  );

  // ============================================================================
  // SCROLL & CLICK OUTSIDE HANDLERS
  // ============================================================================

  const closeModalsOnScroll = useCallback(() => {
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
  }, [
    clearDiscoverHoverTimeout,
    closeDiscoverDropdown,
    forceSearchOpen,
    isStackedLayout,
  ]);

  useEffect(() => {
    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener("scroll", closeModalsOnScroll, options);

    return () => {
      window.removeEventListener("scroll", closeModalsOnScroll, options);
    };
  }, [closeModalsOnScroll]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideButtonWrap = discoverDropdownRef.current?.contains(
        target
      );
      const clickedInsidePortalMenu = discoverMenuPortalRef.current?.contains(
        target
      );

      if (!clickedInsideButtonWrap && !clickedInsidePortalMenu) {
        clearDiscoverHoverTimeout();
        closeDiscoverDropdown();
      }
    };

    if (isDiscoverDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [
    isDiscoverDropdownOpen,
    clearDiscoverHoverTimeout,
    closeDiscoverDropdown,
  ]);

  // Position dropdown menu
  useLayoutEffect(() => {
    if (
      isDiscoverDropdownOpen &&
      discoverBtnRef.current &&
      headerRef.current
    ) {
      const buttonRect = discoverBtnRef.current.getBoundingClientRect();
      const headerRect = headerRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      const viewportWidth = window.innerWidth;
      const padding = 16;
      const center = buttonRect.left + buttonRect.width / 2;
      let leftPos = center - dropdownWidth / 2;
      const maxLeft = viewportWidth - dropdownWidth - padding;
      leftPos = Math.max(padding, Math.min(leftPos, maxLeft));

      const gap = 8;
      setDiscoverMenuPos({
        left: leftPos,
        top: headerRect.bottom + gap,
      });
    } else {
      setDiscoverMenuPos(null);
    }
  }, [isDiscoverDropdownOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearDiscoverHoverTimeout();
    };
  }, [clearDiscoverHoverTimeout]);

  // ============================================================================
  // HANDLERS OBJECT
  // ============================================================================

  const handlers: HeaderHandlers = {
    openFilters,
    closeFilters,
    handleFiltersChange,
    handleSubmitQuery,
    handleNavClick,
    openDiscoverDropdown,
    closeDiscoverDropdown,
    scheduleDiscoverDropdownClose,
    clearDiscoverHoverTimeout,
    setShowSearchBar,
    setIsMobileMenuOpen,
  };

  // ============================================================================
  // RETURN CONSOLIDATED STATE
  // ============================================================================

  return {
    // User & Auth
    user,
    authLoading,
    isGuest,
    isAdminUser,
    isBusinessAccountUser,
    hasMultipleRoles,
    isCheckingBusinessOwner,
    hasOwnedBusinesses,
    logout,

    // Counts
    savedCount,
    unreadCount,

    // Navigation
    pathname,
    navLinks,
    isStackedLayout,
    isNavReady: !authLoading && (!isBusinessAccountUser || !isCheckingBusinessOwner),

    // Active States
    ...activeStates,

    // Modal States
    ...modalStates,

    // Refs
    headerRef,
    searchWrapRef,
    discoverDropdownRef,
    discoverMenuPortalRef,
    discoverBtnRef,

    // Handlers
    ...handlers,

    // Constants
    fontStyle: HEADER_FONT_STYLE,
  };
};

