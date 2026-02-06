"use client";

import {
  Fragment,
  CSSProperties,
  RefObject,
  MouseEvent,
  useState,
  useEffect,
} from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Lock,
  Bell,
  User,
  Settings,
  Bookmark,
} from "lucide-react";
import OptimizedLink from "../Navigation/OptimizedLink";

import { shouldShowLockIndicator, getLinkHref } from "./headerActionsConfig";

export type NavLink = {
  key: string;
  label: string;
  href: string;
  requiresAuth: boolean;
  description?: string;
};

interface DesktopNavProps {
  whiteText: boolean;
  isGuest: boolean;
  isBusinessAccountUser: boolean;
  isClaimBusinessActive: boolean;
  isDiscoverActive: boolean;
  primaryLinks: readonly NavLink[];
  discoverLinks: readonly NavLink[];
  businessLinks: readonly NavLink[];
  isNotificationsActive: boolean;
  isProfileActive: boolean;
  isSettingsActive: boolean;
  savedCount: number;
  unreadCount: number;
  handleNavClick: (href: string, e?: MouseEvent) => void;

  discoverDropdownRef: RefObject<HTMLDivElement>;
  discoverMenuPortalRef: RefObject<HTMLDivElement>;
  discoverBtnRef: RefObject<HTMLButtonElement>;
  discoverMenuPos: { left: number; top: number } | null;
  isDiscoverDropdownOpen: boolean;
  isDiscoverDropdownClosing: boolean;
  clearDiscoverHoverTimeout: () => void;
  openDiscoverDropdown: () => void;
  closeDiscoverDropdown: () => void;
  scheduleDiscoverDropdownClose: () => void;

  onNotificationsClick: () => void;
  sf: CSSProperties;
  mode?: "full" | "navOnly" | "iconsOnly";
}

export default function DesktopNav(props: DesktopNavProps) {
  const {
    whiteText,
    isGuest,
    isBusinessAccountUser,
    isClaimBusinessActive,
    isDiscoverActive,
    primaryLinks,
    discoverLinks,
    businessLinks,
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
    onNotificationsClick,
    sf,
    mode = "full",
  } = props;

  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isSavedActive = pathname === "/saved";

  const baseLinkClass =
    "group capitalize px-2.5 lg:px-3.5 py-1.5 rounded-lg text-sm sm:text-xs md:text-sm font-semibold transition-colors duration-200 relative flex items-center gap-1.5";

  const activeTextClass = "text-sage";
  const idleTextClass = whiteText
    ? "text-white/75 hover:text-white"
    : "text-charcoal/70 md:text-charcoal/80 hover:text-charcoal/95";

  const businessPalette = whiteText
    ? "text-white/75 hover:text-white"
    : "text-charcoal/70 md:text-charcoal/80 hover:text-charcoal/95";

  const iconWrapClass = (isActive: boolean) =>
    `mi-tap group w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 relative ${
      isActive
        ? "text-sage bg-sage/5"
        : whiteText
          ? "text-white hover:text-white/80 hover:bg-white/10"
          : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
    }`;

  const iconClass = (isActive: boolean) =>
    `w-5 h-5 transition-all duration-200 group-hover:scale-110 ${
      isActive
        ? "text-sage"
        : whiteText
          ? "text-white group-hover:text-white/85"
          : "text-current group-hover:text-sage"
    }`;

  const isPathActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || (pathname?.startsWith(href) ?? false);
  };

  // Keep runtime stable if account type isn't ready yet
  if (typeof isBusinessAccountUser === "undefined") return null;


  const renderCenterNav = () => (
    <div className="flex items-center justify-center gap-2 lg:gap-3 min-w-0">
        {/* Business links (business accounts) */}
        {isBusinessAccountUser &&
          businessLinks.map(({ key, label, href, requiresAuth }) => {
            const targetHref = getLinkHref(href, requiresAuth, isGuest);
            const isActive =
              isPathActive(href) ||
              (isClaimBusinessActive && href === "/for-businesses");

            return (
              <OptimizedLink
                key={key}
                href={targetHref}
                onClick={(e) => handleNavClick(href, e)}
                className={`${baseLinkClass} ${
                  isActive ? activeTextClass : businessPalette
                }`}
                style={sf}
              >
                <span className="relative z-10 whitespace-nowrap">{label}</span>
              </OptimizedLink>
            );
          })}

        {/* Primary links + Discover (personal accounts) */}
        {!isBusinessAccountUser &&
          primaryLinks.map(({ key, label, href, requiresAuth }, index) => {
            const isActive = isPathActive(href);
            const showLockIndicator = shouldShowLockIndicator(isGuest, requiresAuth);

            return (
              <Fragment key={key}>
                <OptimizedLink
                  href={getLinkHref(href, requiresAuth, isGuest)}
                  onClick={(e) => handleNavClick(href, e)}
                  className={`${baseLinkClass} ${
                    isActive ? activeTextClass : idleTextClass
                  }`}
                  style={sf}
                >
                  <span className="relative z-10 whitespace-nowrap">{label}</span>
                  {showLockIndicator && (
                    <Lock
                      className={`w-3.5 h-3.5 ${
                        whiteText ? "text-white" : "text-charcoal/60"
                      }`}
                    />
                  )}
                </OptimizedLink>

                {/* Insert Discover after first primary link (eg after Home) */}
                {index === 0 && (
                  <div
                    ref={discoverDropdownRef}
                    className="relative"
                    onMouseEnter={openDiscoverDropdown}
                    onMouseLeave={scheduleDiscoverDropdownClose}
                  >
                    <button
                      ref={discoverBtnRef}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isDiscoverDropdownOpen) closeDiscoverDropdown();
                        else openDiscoverDropdown();
                      }}
                      className={`${baseLinkClass} ${
                        isDiscoverActive ? activeTextClass : idleTextClass
                      }`}
                      style={sf}
                      aria-expanded={isDiscoverDropdownOpen}
                      aria-haspopup="true"
                    >
                      <span className="whitespace-nowrap relative z-10">
                        Discover
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 relative z-10 ${
                          isDiscoverDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown menu (portal) */}
                    {mounted &&
                      isDiscoverDropdownOpen &&
                      discoverMenuPos &&
                      createPortal(
                        <div
                          ref={discoverMenuPortalRef}
                          className={`fixed z-[1000] bg-off-white rounded-[12px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[320px] transition-all duration-300 ease-out backdrop-blur-xl ${
                            isDiscoverDropdownClosing
                              ? "opacity-0 scale-95 translate-y-[-8px]"
                              : "opacity-100 scale-100 translate-y-0"
                          }`}
                          style={{
                            left: discoverMenuPos.left,
                            top: discoverMenuPos.top,
                            fontFamily:
                              "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            transformOrigin: "top center",
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseEnter={clearDiscoverHoverTimeout}
                          onMouseLeave={scheduleDiscoverDropdownClose}
                        >
                          <div className="px-5 pt-4 pb-3 border-b border-charcoal/10 bg-off-white flex items-center gap-2">
                            <h3
                              className="text-sm md:text-base font-semibold text-charcoal"
                              style={sf}
                            >
                              Discover
                            </h3>
                          </div>

                          <div className="py-3">
                            {discoverLinks.map(
                              ({
                                key: subKey,
                                label: subLabel,
                                description,
                                href: subHref,
                                requiresAuth: subAuth,
                              }) => {
                                const subIsActive = isPathActive(subHref);
                                const showLock = shouldShowLockIndicator(
                                  isGuest,
                                  subAuth
                                );
                                const target = getLinkHref(
                                  subHref ?? "",
                                  subAuth,
                                  isGuest
                                );

                                return (
                                  <OptimizedLink
                                    key={subKey}
                                    href={target}
                                    onClick={(e) => {
                                      handleNavClick(subHref ?? "", e);
                                      clearDiscoverHoverTimeout();
                                      closeDiscoverDropdown();
                                    }}
                                    className={`group flex items-start gap-3 px-5 py-3 hover:bg-gradient-to-r hover:from-sage/10 hover:to-coral/5 transition-all duration-200 rounded-lg mx-2 ${
                                      subIsActive
                                        ? "bg-gradient-to-r from-sage/10 to-sage/5"
                                        : ""
                                    }`}
                                    style={sf}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className={`text-sm font-semibold flex items-center gap-1.5 ${
                                          subIsActive
                                            ? "text-sage"
                                            : "text-charcoal group-hover:text-coral"
                                        }`}
                                      >
                                        <span className="truncate">{subLabel}</span>
                                        {showLock && (
                                          <Lock className="w-3 h-3 text-charcoal/60" />
                                        )}
                                      </div>
                                      <div className="text-sm sm:text-xs text-charcoal/60 mt-0.5">
                                        {showLock
                                          ? "Sign in for personalised picks"
                                          : description}
                                      </div>
                                    </div>
                                  </OptimizedLink>
                                );
                              }
                            )}
                          </div>
                        </div>,
                        document.body
                      )}
                  </div>
                )}
              </Fragment>
            );
          })}
    </div>
  );

  const renderIcons = () => (
    <div className="flex items-center justify-end gap-2 min-w-0">
      {/* Notifications */}
      {isGuest ? (
        <OptimizedLink
          href="/login"
          className={iconWrapClass(false)}
          aria-label="Sign in for notifications"
        >
          <Bell
            className={iconClass(false)}
            fill="none"
            style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-charcoal/50">
            <Lock className="w-2.5 h-2.5" />
          </span>
        </OptimizedLink>
      ) : (
        <button
          onClick={onNotificationsClick}
          className={iconWrapClass(isNotificationsActive)}
          aria-label="Notifications"
          type="button"
        >
          <Bell
            className={iconClass(isNotificationsActive)}
            fill={isNotificationsActive ? "currentColor" : "none"}
            style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[12px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Personal actions (keep Saved closer to Profile) */}
      {!isBusinessAccountUser ? (
        <div className="flex items-center gap-1">
          {/* Saved (Bookmark) - ONLY authenticated personal users */}
          {!isGuest && (
            <div className="relative">
              <OptimizedLink
                href="/saved"
                className={`group flex w-10 h-10 items-center justify-center rounded-lg transition-all duration-200 relative ${
                  isSavedActive
                    ? "text-sage bg-sage/5"
                    : whiteText
                      ? "text-white hover:text-white/85 hover:bg-white/10"
                      : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                }`}
                aria-label="Saved"
              >
                <Bookmark
                  className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${
                    isSavedActive
                      ? "text-sage"
                      : whiteText
                        ? "text-white group-hover:text-white/85"
                        : "text-current group-hover:text-sage"
                  }`}
                  fill={isSavedActive ? "currentColor" : "none"}
                  style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
                />
                {savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[12px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {savedCount > 99 ? "99+" : savedCount}
                  </span>
                )}
              </OptimizedLink>
            </div>
          )}

          {/* Profile (personal only) */}
          <div className="relative">
            <OptimizedLink
              href={isGuest ? "/login" : "/profile"}
              className={iconWrapClass(isProfileActive)}
              aria-label={isGuest ? "Sign in" : "Profile"}
            >
              <User
                className={iconClass(isProfileActive)}
                fill={isProfileActive ? "currentColor" : "none"}
                style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
              />
            </OptimizedLink>
          </div>
        </div>
      ) : (
        /* Business actions */
        <div className="relative">
          <OptimizedLink
            href={isGuest ? "/login" : "/settings"}
            className={iconWrapClass(isSettingsActive)}
            aria-label={isGuest ? "Sign in" : "Settings"}
          >
            <Settings
              className={iconClass(isSettingsActive)}
              fill={isSettingsActive ? "currentColor" : "none"}
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
            />
          </OptimizedLink>
        </div>
      )}
    </div>
  );

  if (mode === "iconsOnly") {
    return renderIcons();
  }

  if (mode === "navOnly") {
    return (
      <nav className="w-full flex items-center justify-center">
        {renderCenterNav()}
      </nav>
    );
  }

  return (
    // ??? 3-zone layout so Home / Discover / Leaderboard sit centered
    // Equal gap-2 lg:gap-4 matches Header for visual symmetry
    <nav className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 lg:gap-4">
      {/* Left spacer (matches right icons section width for symmetry) */}
      <div className="min-w-0" />
      {renderCenterNav()}
      {renderIcons()}
    </nav>
  );
}
