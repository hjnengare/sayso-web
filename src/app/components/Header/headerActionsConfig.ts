/**
 * Centralized configuration for all header/navbar actions and links
 * Single source of truth for navigation, buttons, and action definitions
 */

import { NavLink } from './DesktopNav';

// ============================================================================
// NAVIGATION LINKS - Define all navigation options here
// ============================================================================

export const PRIMARY_LINKS: readonly NavLink[] = [
  { key: "home", label: "Home", href: "/home", requiresAuth: false },
  { key: "leaderboard", label: "Leaderboard", href: "/leaderboard", requiresAuth: false },
] as const;

export const BUSINESS_LINKS: readonly NavLink[] = [
  { key: "my-businesses", label: "My Businesses", href: "/my-businesses", requiresAuth: true },
  { key: "claim-business", label: "Claim a Business", href: "/claim-business", requiresAuth: true },
  { key: "add-business", label: "Add a new Business", href: "/add-business", requiresAuth: true },
] as const;

export const DISCOVER_LINKS: readonly NavLink[] = [
  { key: "for-you", label: "For You", description: "Personalized picks", href: "/for-you", requiresAuth: true },
  { key: "trending", label: "Trending", description: "What's hot right now", href: "/trending", requiresAuth: false },
  { key: "events-specials", label: "Events & Specials", description: "Seasonal happenings & offers", href: "/events-specials", requiresAuth: false },
] as const;

// ============================================================================
// ACTION BUTTON DEFINITIONS
// ============================================================================

export interface ActionButtonDefinition {
  key: string;
  href: string;
  label: string;
  requiresAuth: boolean;
  requiresNotBusinessOwner?: boolean;
  icon: 'bell' | 'bookmark' | 'message' | 'user' | 'search' | 'settings';
  showOnMobile: boolean;
  showOnDesktop: boolean;
  hasNotifications?: boolean;
  hasCount?: boolean;
}

export const ACTION_BUTTONS: readonly ActionButtonDefinition[] = [
  {
    key: 'notifications',
    href: '/notifications',
    label: 'Notifications',
    requiresAuth: true,
    icon: 'bell',
    showOnMobile: true,
    showOnDesktop: true,
    hasNotifications: true,
    hasCount: true,
  },
  {
    key: 'saved',
    href: '/saved',
    label: 'Saved',
    requiresAuth: true,
    requiresNotBusinessOwner: true,
    icon: 'bookmark',
    showOnMobile: true,
    showOnDesktop: true,
    hasCount: true,
  },
  {
    key: 'messages',
    href: '/dm',
    label: 'Messages',
    requiresAuth: true,
    icon: 'message',
    showOnMobile: true,
    showOnDesktop: true,
    hasNotifications: true,
    hasCount: true,
  },
  {
    key: 'profile',
    href: '/profile',
    label: 'Profile',
    requiresAuth: true,
    requiresNotBusinessOwner: true,
    icon: 'user',
    showOnMobile: true,
    showOnDesktop: true,
  },
  {
    key: 'settings',
    href: '/settings',
    label: 'Settings',
    requiresAuth: true,
    icon: 'settings',
    showOnMobile: false,
    showOnDesktop: true,
  },
  {
    key: 'search',
    href: '/trending',
    label: 'Search',
    requiresAuth: false,
    requiresNotBusinessOwner: true,
    icon: 'search',
    showOnMobile: true,
    showOnDesktop: false,
  },
] as const;

// ============================================================================
// MOBILE MENU ACTIONS
// ============================================================================

export interface MobileMenuActionItem {
  href: string;
  label: string;
  requiresAuth: boolean;
  delay?: number;
}

export const getMobileMenuActions = (isBusinessAccountUser: boolean): MobileMenuActionItem[] => {
  const commonActions: MobileMenuActionItem[] = [
    ...(isBusinessAccountUser ? [{ href: "/settings", label: "Settings", requiresAuth: true, delay: 2 }] : []),
  ];
  
  const personalActions: MobileMenuActionItem[] = isBusinessAccountUser ? [] : [
    { href: "/saved", label: "Saved", requiresAuth: true, delay: 2 },
    { href: "/profile", label: "Profile", requiresAuth: true, delay: 3 },
  ];
  
  return [...commonActions, ...personalActions];
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the default logo link based on user role
 */
export const getLogoHref = (isBusinessAccountUser: boolean): string => {
  return isBusinessAccountUser ? "/my-businesses" : "/home";
};

/**
 * Determine if a link should show a lock indicator
 */
export const shouldShowLockIndicator = (isGuest: boolean, requiresAuth: boolean): boolean => {
  return isGuest && requiresAuth;
};

/**
 * Filter business links based on ownership status
 */
export const getBusinessNavLinks = (
  isBusinessAccountUser: boolean,
  isCheckingBusinessOwner: boolean,
  hasOwnedBusinesses: boolean
): NavLink[] => {
  if (!isBusinessAccountUser) return [];

  // Always show "My Businesses" for business accounts
  const myBusinessesLink = BUSINESS_LINKS.find(link => link.key === "my-businesses")!;

  if (isCheckingBusinessOwner) {
    return [myBusinessesLink];
  }

  if (hasOwnedBusinesses) {
    // Has businesses: show My Businesses + Add a new Business (hide Claim)
    return BUSINESS_LINKS.filter((link) => link.key !== "claim-business");
  }

  // No businesses yet: show My Businesses + Claim a Business + Add a new Business
  return BUSINESS_LINKS.filter((link, idx, arr) => {
    // Only include each link once
    return arr.findIndex(l => l.key === link.key) === idx;
  });
};

/**
 * Get action buttons filtered for mobile or desktop
 */
export const getActionButtonsForDevice = (
  deviceType: 'mobile' | 'desktop'
): ActionButtonDefinition[] => {
  return ACTION_BUTTONS.filter((btn) =>
    deviceType === 'mobile' ? btn.showOnMobile : btn.showOnDesktop
  );
};

/**
 * Filter action buttons by user role and auth status
 */
export const filterActionButtonsByRole = (
  buttons: ActionButtonDefinition[],
  isGuest: boolean,
  isBusinessAccountUser: boolean
): ActionButtonDefinition[] => {
  return buttons.filter((btn) => {
    // Skip if requires auth and user is guest
    if (btn.requiresAuth && isGuest) return false;

    // Remove search icon for business accounts on mobile
    if (isBusinessAccountUser && btn.key === 'search' && btn.showOnMobile) return false;

    // Skip if requires non-business owner and user is business owner
    if (btn.requiresNotBusinessOwner && isBusinessAccountUser) return false;

    return true;
  });
};

/**
 * Get the target href for a link (considering guest redirects)
 */
export const getLinkHref = (
  href: string,
  requiresAuth: boolean,
  isGuest: boolean
): string => {
  if (isGuest && requiresAuth) {
    return "/login";
  }
  return href;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const HEADER_FONT_STYLE = {
  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
} as const;

/**
 * Get all navigation links for a specific user role
 */
export const getAllNavLinksForRole = (
  isBusinessAccountUser: boolean,
  isCheckingBusinessOwner: boolean,
  hasOwnedBusinesses: boolean
) => {
  // Always provide at least one set of links for all roles
  let primaryLinks = PRIMARY_LINKS;
  let businessLinks = getBusinessNavLinks(
    isBusinessAccountUser,
    isCheckingBusinessOwner,
    hasOwnedBusinesses
  );
  let discoverLinks = DISCOVER_LINKS;

  // If business account, show both business and discover/primary links
  if (isBusinessAccountUser) {
    // If businessLinks is empty (e.g. loading), still show discover/primary
    if (businessLinks.length === 0) {
      businessLinks = [];
    }
    // Optionally, you can choose to hide primaryLinks for business, but always show discover
    // Or merge them as needed for your UX
  }

  return {
    primaryLinks,
    businessLinks,
    discoverLinks,
  };
};
