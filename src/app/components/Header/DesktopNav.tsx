"use client";

import {
  Fragment,
  CSSProperties,
  RefObject,
  MouseEvent as ReactMouseEvent,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { m, useAnimation } from "framer-motion";
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
  handleNavClick: (href: string, e?: ReactMouseEvent) => void;

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
    sf,
    mode = "full",
  } = props;

  const pathname = usePathname();
  const addMenuItems: readonly NavLink[] = [
    { key: "add-business", label: "Add New Business", href: "/add-business", requiresAuth: true },
    { key: "add-special", label: "Add Special", href: "/add-special", requiresAuth: true },
    { key: "add-event", label: "Add Event", href: "/add-event", requiresAuth: true },
  ] as const;

  const [mounted, setMounted] = useState(false);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [isAddDropdownClosing, setIsAddDropdownClosing] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const addCloseTimeoutRef = useRef<number | null>(null);
  const addCloseAnimationTimeoutRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  // ── animation state ────────────────────────────────────────────────────────
  const [hoveredNavKey, setHoveredNavKey] = useState<string | null>(null);
  const bellControls = useAnimation();
  const prevUnreadRef = useRef(unreadCount);

  const clearAddHoverTimeout = useCallback(() => {
    if (addCloseTimeoutRef.current) {
      clearTimeout(addCloseTimeoutRef.current);
      addCloseTimeoutRef.current = null;
    }
  }, []);

  const clearAddCloseAnimationTimeout = useCallback(() => {
    if (addCloseAnimationTimeoutRef.current) {
      clearTimeout(addCloseAnimationTimeoutRef.current);
      addCloseAnimationTimeoutRef.current = null;
    }
  }, []);

  const openAddDropdown = useCallback(() => {
    clearAddHoverTimeout();
    clearAddCloseAnimationTimeout();
    setIsAddDropdownClosing(false);
    setIsAddDropdownOpen(true);
  }, [clearAddHoverTimeout, clearAddCloseAnimationTimeout]);

  const closeAddDropdown = useCallback(() => {
    clearAddHoverTimeout();
    clearAddCloseAnimationTimeout();
    setIsAddDropdownClosing(true);
    addCloseAnimationTimeoutRef.current = window.setTimeout(() => {
      setIsAddDropdownOpen(false);
      setIsAddDropdownClosing(false);
      addCloseAnimationTimeoutRef.current = null;
    }, 150);
  }, [clearAddHoverTimeout, clearAddCloseAnimationTimeout]);

  const scheduleAddDropdownClose = useCallback(() => {
    clearAddHoverTimeout();
    addCloseTimeoutRef.current = window.setTimeout(() => {
      closeAddDropdown();
    }, 120);
  }, [clearAddHoverTimeout, closeAddDropdown]);

  useEffect(() => {
    return () => {
      clearAddHoverTimeout();
      clearAddCloseAnimationTimeout();
    };
  }, [clearAddHoverTimeout, clearAddCloseAnimationTimeout]);

  useEffect(() => {
    clearAddHoverTimeout();
    clearAddCloseAnimationTimeout();
    setIsAddDropdownOpen(false);
    setIsAddDropdownClosing(false);
  }, [pathname, clearAddHoverTimeout, clearAddCloseAnimationTimeout]);

  useEffect(() => {
    if (!isAddDropdownOpen) return;

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (!addDropdownRef.current?.contains(target)) {
        closeAddDropdown();
      }
    };

    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isAddDropdownOpen, closeAddDropdown]);

  // Bell shake: triggers once when unread count goes 0 → N
  useEffect(() => {
    if (unreadCount > 0 && prevUnreadRef.current === 0) {
      void bellControls.start({
        rotate: [0, 14, -10, 6, -3, 0],
        transition: { duration: 0.55, ease: "easeOut" },
      });
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, bellControls]);

  const isSavedActive = pathname === "/saved";

  const baseLinkClass =
    "group capitalize px-2.5 lg:px-3.5 py-1.5 rounded-full text-sm sm:text-xs md:text-sm font-semibold relative flex items-center gap-1.5 transition-[color,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const navLabelHoverClass =
    "relative z-10 inline-block whitespace-nowrap transition-[transform,text-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:group-hover:-translate-y-[2px] lg:group-hover:[text-shadow:0_4px_10px_rgba(15,23,42,0.14)]";
  const activeTextClass = "text-sage";
  const idleTextClass = whiteText
    ? "text-white/75 hover:text-white"
    : "text-charcoal/70 md:text-charcoal/80 hover:text-charcoal/95";

  const businessPalette = whiteText
    ? "text-white/75 hover:text-white"
    : "text-charcoal/70 md:text-charcoal/80 hover:text-charcoal/95";

  const iconWrapClass = (isActive: boolean) =>
    `mi-tap group w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.88] relative ${
      isActive
        ? "text-sage bg-card-bg/5"
        : whiteText
          ? "text-white hover:text-white/80 hover:bg-white/10"
          : "text-charcoal/80 hover:text-sage hover:bg-card-bg/5"
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
  const isAddGroupActive = addMenuItems.some((item) => isPathActive(item.href));

  // Sliding pill: show on hovered item, fall back to active item when idle
  const showPill = (key: string, isActive: boolean) =>
    hoveredNavKey === key || (hoveredNavKey === null && isActive);
  const pillClass = `absolute inset-0 rounded-full ${whiteText ? "bg-white/[0.13]" : "bg-charcoal/[0.07]"}`;
  const pillTransition = { type: "spring" as const, stiffness: 480, damping: 36, mass: 0.5 };

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

            if (key === "add-business") {
              return (
                <div
                  key="add-dropdown"
                  ref={addDropdownRef}
                  className="relative"
                  onMouseEnter={() => { openAddDropdown(); setHoveredNavKey("add"); }}
                  onMouseLeave={() => { scheduleAddDropdownClose(); setHoveredNavKey(null); }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isAddDropdownOpen) closeAddDropdown();
                      else openAddDropdown();
                    }}
                    className={`${baseLinkClass} ${
                      isAddGroupActive ? activeTextClass : businessPalette
                    }`}
                    style={sf}
                    aria-haspopup="true"
                    aria-expanded={isAddDropdownOpen}
                  >
                    {showPill("add", isAddGroupActive) && (
                      <m.span layoutId="nav-pill" className={pillClass} transition={pillTransition} />
                    )}
                    <span className={navLabelHoverClass}>Add</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 relative z-10 ${
                        isAddDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {mounted && (isAddDropdownOpen || isAddDropdownClosing) && (
                    <div
                      className={`absolute left-0 top-full mt-2 z-[900] bg-off-white rounded-[12px] border-none shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[250px] backdrop-blur-xl transition-all duration-150 ease-out ${
                        isAddDropdownClosing
                          ? "opacity-0 scale-95 -translate-y-1 pointer-events-none"
                          : "opacity-100 scale-100 translate-y-0"
                      }`}
                      style={{
                        fontFamily:
                          "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        transformOrigin: "top left",
                      }}
                      onMouseEnter={openAddDropdown}
                      onMouseLeave={scheduleAddDropdownClose}
                    >
                      <div className="px-4 pt-3 pb-2 border-b border-charcoal/10 bg-off-white">
                        <h3 className="text-sm font-semibold text-charcoal" style={sf}>
                          Add
                        </h3>
                      </div>
                      <div className="py-2">
                        {addMenuItems.map((item) => {
                          const itemActive = isPathActive(item.href);
                          return (
                            <OptimizedLink
                              key={item.key}
                              href={getLinkHref(item.href, item.requiresAuth, isGuest)}
                              onClick={(e) => {
                                handleNavClick(item.href, e);
                                clearAddHoverTimeout();
                                closeAddDropdown();
                              }}
                              className={`block px-4 py-2.5 text-sm font-semibold transition-all duration-200 mx-2 rounded-lg ${
                                itemActive
                                  ? "text-sage bg-gradient-to-r from-sage/10 to-sage/5"
                                  : "text-charcoal hover:bg-gradient-to-r hover:from-sage/10 hover:to-coral/5 hover:text-coral"
                              }`}
                              style={sf}
                            >
                              {item.label}
                            </OptimizedLink>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <OptimizedLink
                key={key}
                href={targetHref}
                onClick={(e) => handleNavClick(href, e)}
                onMouseEnter={() => setHoveredNavKey(key)}
                onMouseLeave={() => setHoveredNavKey(null)}
                className={`${baseLinkClass} ${
                  isActive ? activeTextClass : businessPalette
                }`}
                style={sf}
              >
                {showPill(key, isActive) && (
                  <m.span layoutId="nav-pill" className={pillClass} transition={pillTransition} />
                )}
                <span className={navLabelHoverClass}>{label}</span>
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
                  onMouseEnter={() => setHoveredNavKey(key)}
                  onMouseLeave={() => setHoveredNavKey(null)}
                  className={`${baseLinkClass} ${
                    isActive ? activeTextClass : idleTextClass
                  }`}
                  style={sf}
                >
                  {showPill(key, isActive) && (
                    <m.span layoutId="nav-pill" className={pillClass} transition={pillTransition} />
                  )}
                  <span className={navLabelHoverClass}>{label}</span>
                  {showLockIndicator && (
                    <Lock
                      className="w-3.5 h-3.5 text-coral"
                    />
                  )}
                </OptimizedLink>

                {/* Insert Discover after first primary link (eg after Home) */}
                {index === 0 && (
                  <div
                    ref={discoverDropdownRef}
                    className="relative"
                    onMouseEnter={() => { openDiscoverDropdown(); setHoveredNavKey("discover"); }}
                    onMouseLeave={() => { scheduleDiscoverDropdownClose(); setHoveredNavKey(null); }}
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
                      {showPill("discover", isDiscoverActive) && (
                        <m.span layoutId="nav-pill" className={pillClass} transition={pillTransition} />
                      )}
                      <span className={navLabelHoverClass}>
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
                          className={`fixed z-[1000] bg-off-white rounded-[12px] border-none shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[320px] transition-all duration-300 ease-out backdrop-blur-xl ${
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
                                          <Lock className="w-3 h-3 text-coral" />
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
      {/* Notifications (personal accounts only) */}
      {!isBusinessAccountUser && (isGuest ? (
        <OptimizedLink
          href="/onboarding"
          className={`${iconWrapClass(false)} cursor-pointer pointer-events-auto select-none relative z-[2]`}
          aria-label="Sign in for notifications"
        >
          <m.span className="inline-flex" animate={bellControls}>
            <Bell
              className={`${iconClass(false)} pointer-events-none`}
              fill="none"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
            />
          </m.span>
          <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-coral">
            <Lock className="w-2.5 h-2.5" />
          </span>
        </OptimizedLink>
      ) : (
        <OptimizedLink
          href="/notifications"
          onClick={(e) => handleNavClick("/notifications", e)}
          className={`${iconWrapClass(isNotificationsActive)} cursor-pointer pointer-events-auto select-none relative z-[2]`}
          aria-label="Notifications"
        >
          <m.span className="inline-flex" animate={bellControls}>
            <Bell
              className={`${iconClass(isNotificationsActive)} pointer-events-none`}
              fill={isNotificationsActive ? "currentColor" : "none"}
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
            />
          </m.span>
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] leading-none font-extrabold tracking-tight rounded-full bg-white text-coral border border-coral/30 shadow-[0_6px_14px_rgba(0,0,0,0.2)]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </OptimizedLink>
      ))}

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
                    ? "text-sage bg-card-bg/5"
                    : whiteText
                      ? "text-white hover:text-white/85 hover:bg-white/10"
                      : "text-charcoal/80 hover:text-sage hover:bg-card-bg/5"
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
              href={isGuest ? "/onboarding" : "/profile"}
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
            href={isGuest ? "/onboarding" : "/settings"}
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
