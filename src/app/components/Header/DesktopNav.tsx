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
  Bell,
  MessageSquare,
  User,
  Settings,
  Bookmark,
} from "lucide-react";
import OptimizedLink from "../Navigation/OptimizedLink";

import { getLinkHref } from "./headerActionsConfig";

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
  isMessagesActive: boolean;
  isProfileActive: boolean;
  isSettingsActive: boolean;
  savedCount: number;
  unreadCount: number;
  messageUnreadCount: number;
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
  const messagesHref = isGuest
    ? "/onboarding"
    : isBusinessAccountUser
      ? "/my-businesses/messages"
      : "/dm";

  const baseLinkClass =
    "group capitalize px-2.5 lg:px-3.5 py-1.5 rounded-full text-sm sm:text-xs md:text-sm font-semibold relative flex items-center gap-1.5 transition-[color,opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hover:scale-105 lg:focus-visible:scale-105";
  const navLabelHoverClass =
    "relative z-10 inline-block whitespace-nowrap transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const activeTextClass = "text-sage";
  const idleTextClass = whiteText
    ? "text-white/75 hover:text-white"
    : "text-charcoal/70 md:text-charcoal/80 hover:text-charcoal/95";

  const businessPalette = whiteText
    ? "text-white/75 hover:text-white"
    : "text-charcoal/70 md:text-charcoal/80 hover:text-charcoal/95";

  const iconWrapClass = (isActive: boolean) =>
    `mi-tap group w-10 h-10 flex items-center justify-center rounded-lg transition-[color,transform] duration-150 ease-in-out active:scale-[0.88] lg:hover:scale-105 lg:focus-visible:scale-105 relative ${
      isActive
        ? "text-sage bg-card-bg/5"
        : whiteText
          ? "text-white hover:text-white/80"
          : "text-charcoal/80 hover:text-sage"
    }`;

  const iconClass = (isActive: boolean) =>
    `w-5 h-5 transition-colors duration-200 ${
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
  const pillClass = "absolute inset-0 rounded-full bg-transparent";
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
                                  : "text-charcoal hover:text-coral lg:hover:scale-[1.02]"
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
                                const isLocked = isGuest && subAuth;
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
                                    className={`group flex items-start gap-3 px-5 py-3 transition-[color,transform] duration-200 rounded-lg mx-2 lg:hover:scale-[1.02] ${
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
                                      </div>
                                      <div className="text-sm sm:text-xs text-charcoal/60 mt-0.5">
                                        {isLocked
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
      {!isBusinessAccountUser ? (
        <>
          {/* Notifications (personal order: notifications -> saved -> messages -> profile) */}
          {isGuest ? (
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
                <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] leading-none font-extrabold tracking-tight rounded-full bg-coral text-white ring-[1.5px] ring-white/85 shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </OptimizedLink>
          )}

          <div className="flex items-center gap-2">
            {/* Saved (bookmark) */}
            {!isGuest && (
              <div className="relative">
                <OptimizedLink
                  href="/saved"
                  className={`group flex w-10 h-10 items-center justify-center rounded-lg transition-[color,transform] duration-200 ease-in-out relative lg:hover:scale-105 lg:focus-visible:scale-105 ${
                    isSavedActive
                      ? "text-sage bg-card-bg/5"
                      : whiteText
                        ? "text-white hover:text-white/85"
                        : "text-charcoal/80 hover:text-sage"
                  }`}
                  aria-label="Saved"
                >
                  <Bookmark
                    className={`w-5 h-5 transition-colors duration-200 ${
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
                    <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] leading-none font-extrabold tracking-tight rounded-full bg-coral text-white ring-[1.5px] ring-white/85 shadow-sm">
                      {savedCount > 99 ? "99+" : savedCount}
                    </span>
                  )}
                </OptimizedLink>
              </div>
            )}

            {/* Messages */}
            <OptimizedLink
              href={messagesHref}
              onClick={(e) => {
                if (!isGuest) {
                  handleNavClick(messagesHref, e);
                }
              }}
              className={`${iconWrapClass(isMessagesActive)} cursor-pointer pointer-events-auto select-none relative z-[2]`}
              aria-label={isGuest ? "Sign in for messages" : "Messages"}
            >
              <MessageSquare
                className={`${iconClass(isMessagesActive)} pointer-events-none`}
                fill={isMessagesActive ? "currentColor" : "none"}
                style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
              />
              {messageUnreadCount > 0 && (
                <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] leading-none font-extrabold tracking-tight rounded-full bg-coral text-white ring-[1.5px] ring-white/85 shadow-sm">
                  {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                </span>
              )}
            </OptimizedLink>

            {/* Profile */}
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
        </>
      ) : (
        <>
          {/* Business actions */}
          <OptimizedLink
            href={messagesHref}
            onClick={(e) => {
              if (!isGuest) {
                handleNavClick(messagesHref, e);
              }
            }}
            className={`${iconWrapClass(isMessagesActive)} cursor-pointer pointer-events-auto select-none relative z-[2]`}
            aria-label={isGuest ? "Sign in for messages" : "Messages"}
          >
            <MessageSquare
              className={`${iconClass(isMessagesActive)} pointer-events-none`}
              fill={isMessagesActive ? "currentColor" : "none"}
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
            />
            {messageUnreadCount > 0 && (
              <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] leading-none font-extrabold tracking-tight rounded-full bg-coral text-white ring-[1.5px] ring-white/85 shadow-sm">
                {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
              </span>
            )}
          </OptimizedLink>

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
        </>
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
