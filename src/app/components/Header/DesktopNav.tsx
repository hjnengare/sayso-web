import { Fragment, CSSProperties, RefObject, MouseEvent, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Lock, Bell, MessageCircle, User, Settings } from "lucide-react";
import OptimizedLink from "../Navigation/OptimizedLink";
import LockedTooltip from "./LockedTooltip";
import { shouldShowLockIndicator, getLinkHref } from "./headerActionsConfig";

export type NavLink = {
  key: string;
  label: string;
  href: string;
  requiresAuth: boolean;
  description?: string;
};

interface DesktopNavProps {
  pathname: string | null;
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
  unreadCount: number;
  unreadMessagesCount: number;
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
}

export default function DesktopNav({
  pathname,
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
  unreadCount,
  unreadMessagesCount,
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
}: DesktopNavProps) {
  const [hoveredLockedItem, setHoveredLockedItem] = useState<string | null>(null);
  return (
    <nav className="hidden md:flex items-center flex-1 justify-between gap-4 lg:gap-6">
      {/* Center: Text Links */}
      <div className="flex items-center space-x-1 lg:space-x-3 flex-1 justify-center">
      {isBusinessAccountUser && businessLinks.map(({ key, label, href }) => {
        const targetHref = key === "add-business" ? "/add-business" : href;
        const isActive = pathname === targetHref || pathname?.startsWith(targetHref);
        const businessPalette = isActive
          ? "text-sage bg-white/10 border border-white/10"
          : "text-white hover:text-sage hover:bg-white/10 border border-white/5";
        return (
          <OptimizedLink
            key={key}
            href={targetHref}
            onClick={(e) => handleNavClick(targetHref, e)}
            className={`group capitalize px-3 lg:px-4 py-1.5 rounded-lg text-sm sm:text-xs sm:text-sm md:text-sm font-semibold transition-all duration-200 relative flex items-center gap-1.5 ${businessPalette}`}
            style={sf}
          >
            <span className="relative z-10">{label}</span>
          </OptimizedLink>
        );
      })}

      {!isBusinessAccountUser && primaryLinks.map(({ key, label, href, requiresAuth }, index) => {
        const isActive = pathname === href;
        const showLockIndicator = shouldShowLockIndicator(isGuest, requiresAuth);
        return (
          <Fragment key={key}>
            <OptimizedLink
              href={getLinkHref(href, requiresAuth, isGuest)}
              onClick={(e) => handleNavClick(href, e)}
              className={`group capitalize px-2.5 lg:px-3.5 py-1.5 rounded-lg text-sm sm:text-xs sm:text-sm md:text-sm sm:text-xs lg:text-sm sm:text-xs font-semibold transition-all duration-200 relative flex items-center gap-1.5 ${isActive ? "text-sage" : whiteText ? "text-white hover:text-white/90 hover:bg-white/10" : "text-charcoal/90 md:text-charcoal/95 hover:text-sage hover:bg-sage/5"}`}
              style={sf}
            >
              <span className="relative z-10">{label}</span>
              {showLockIndicator && (
                <Lock className={`w-3.5 h-3.5 ${whiteText ? "text-white" : "text-charcoal/60"}`} />
              )}
            </OptimizedLink>

            {index === 0 && (
              <div
                className="relative"
                ref={discoverDropdownRef}
                onMouseEnter={openDiscoverDropdown}
                onMouseLeave={scheduleDiscoverDropdownClose}
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
                      ? "text-sage"
                      : whiteText
                        ? "text-white hover:text-white/85 hover:bg-white/10"
                        : "text-charcoal/90 md:text-charcoal/95 hover:text-sage hover:bg-sage/5"
                  }`}
                  style={sf}
                  aria-expanded={isDiscoverDropdownOpen}
                  aria-haspopup="true"
                >
                  <span className="whitespace-nowrap relative z-10">Discover</span>
                  <ChevronDown className={`w-4 h-4 sm:w-4 sm:h-4 transition-transform duration-300 relative z-10 ${isDiscoverDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDiscoverDropdownOpen && discoverMenuPos &&
                  createPortal(
                    <div
                      ref={discoverMenuPortalRef}
                      className={`fixed z-[1000] bg-off-white rounded-[20px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[320px] transition-all duration-300 ease-out backdrop-blur-xl ${
                        isDiscoverDropdownClosing ? "opacity-0 scale-95 translate-y-[-8px]" : "opacity-100 scale-100 translate-y-0"
                      }`}
                      style={{
                        left: discoverMenuPos.left,
                        top: discoverMenuPos.top,
                        fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        animation: isDiscoverDropdownClosing ? "none" : "fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        transformOrigin: "top center",
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={clearDiscoverHoverTimeout}
                      onMouseLeave={scheduleDiscoverDropdownClose}
                    >
                      <div className="px-5 pt-4 pb-3 border-b border-charcoal/10 bg-off-white flex items-center gap-2">
                        <h3 className="text-sm md:text-base font-semibold text-charcoal" style={sf}>Discover</h3>
                      </div>
                      <div className="py-3">
                        {discoverLinks.map(({ key: subKey, label: subLabel, description, href: subHref, requiresAuth }) => {
                          const isActive = pathname === subHref || pathname?.startsWith(subHref ?? "");
                          const showLockIndicator = shouldShowLockIndicator(isGuest, requiresAuth);
                          return (
                            <OptimizedLink
                              key={subKey}
                              href={getLinkHref(subHref ?? "", requiresAuth, isGuest)}
                              onClick={(e) => {
                                handleNavClick(subHref, e);
                                clearDiscoverHoverTimeout();
                                closeDiscoverDropdown();
                              }}
                              className={`group flex items-start gap-3 px-5 py-3 hover:bg-gradient-to-r hover:from-sage/10 hover:to-coral/5 transition-all duration-200 rounded-lg mx-2 ${isActive ? "bg-gradient-to-r from-sage/10 to-sage/5" : ""}`}
                              style={sf}
                            >
                              <div className="flex-1">
                                <div className={`text-sm font-semibold flex items-center gap-1.5 ${isActive ? "text-sage" : "text-charcoal group-hover:text-coral"}`}>
                                  {subLabel}
                                  {showLockIndicator && (
                                    <Lock className="w-3 h-3 text-charcoal/60" />
                                  )}
                                </div>
                                <div className="text-sm sm:text-xs text-charcoal/60 mt-0.5">
                                  {showLockIndicator ? "Sign in for personalized picks" : description}
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

      {isGuest && (
        <OptimizedLink
          href="/claim-business"
          className={`group capitalize px-2.5 lg:px-3.5 py-1.5 rounded-lg text-sm sm:text-xs sm:text-sm md:text-sm sm:text-xs lg:text-sm sm:text-xs font-semibold transition-all duration-200 relative ${
            isClaimBusinessActive
              ? "text-sage"
              : whiteText
                ? "text-white hover:text-white/90 hover:bg-white/10"
                : "text-charcoal/90 md:text-charcoal/95 hover:text-sage hover:bg-sage/5"
          }`}
          style={sf}
        >
          <span className="relative z-10">Claim Business</span>
        </OptimizedLink>
      )}
      </div>

      {/* Right: Icons */}
      <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className={`group w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${isNotificationsActive ? "text-sage bg-sage/5" : whiteText ? "text-white hover:text-white/80 hover:bg-white/10" : "text-charcoal/80 hover:text-sage hover:bg-sage/5"}`}
          aria-label="Notifications"
        >
          <Bell className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${isNotificationsActive ? "text-sage" : whiteText ? "text-white group-hover:text-white/80" : "text-current group-hover:text-sage"}`} fill={isNotificationsActive ? "currentColor" : "none"} style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Messages */}
        <div
          className="relative"
          onMouseEnter={() => isGuest && setHoveredLockedItem("messages")}
          onMouseLeave={() => setHoveredLockedItem(null)}
        >
          <OptimizedLink
            href={isGuest ? "/login" : "/dm"}
            className={`group flex w-10 h-10 items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${isMessagesActive ? "text-sage bg-sage/5" : whiteText ? "text-white hover:text-white/85 hover:bg-white/10" : "text-charcoal/80 hover:text-sage hover:bg-sage/5"}`}
            aria-label={isGuest ? "Sign in to view messages" : "Messages"}
          >
            <MessageCircle className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${isMessagesActive ? "text-sage" : whiteText ? "text-white group-hover:text-white/85" : "text-current group-hover:text-sage"}`} fill={isMessagesActive ? "currentColor" : "none"} style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }} />
            {isGuest ? (
              <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-white">
                <Lock className="w-2 h-2" />
              </span>
            ) : unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
              </span>
            )}
          </OptimizedLink>
          <LockedTooltip show={hoveredLockedItem === "messages"} label="view messages" />
        </div>

        {/* Settings (business only) */}
        {isBusinessAccountUser && (
          <div
            className="relative"
            onMouseEnter={() => isGuest && setHoveredLockedItem("settings")}
            onMouseLeave={() => setHoveredLockedItem(null)}
          >
            <OptimizedLink
              href={isGuest ? "/login" : "/settings"}
              className={`group flex w-10 h-10 items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${isSettingsActive ? "text-sage bg-sage/5" : whiteText ? "text-white hover:text-white/85 hover:bg-white/10" : "text-charcoal/80 hover:text-sage hover:bg-sage/5"}`}
              aria-label={isGuest ? "Sign in to open settings" : "Settings"}
            >
              <Settings className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${isSettingsActive ? "text-sage" : whiteText ? "text-white group-hover:text-white/85" : "text-current group-hover:text-sage"}`} fill={isSettingsActive ? "currentColor" : "none"} style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }} />
              {isGuest && (
                <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-white">
                  <Lock className="w-2 h-2" />
                </span>
              )}
            </OptimizedLink>
            <LockedTooltip show={hoveredLockedItem === "settings"} label="open settings" />
          </div>
        )}

        {/* Profile / Business Dashboard */}
        {isBusinessAccountUser ? null : (
          <div
            className="relative"
            onMouseEnter={() => isGuest && setHoveredLockedItem("profile")}
            onMouseLeave={() => setHoveredLockedItem(null)}
          >
            <OptimizedLink
              href={isGuest ? "/login" : "/profile"}
              className={`group flex w-10 h-10 items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${isProfileActive ? "text-sage bg-sage/5" : whiteText ? "text-white hover:text-white/85 hover:bg-white/10" : "text-charcoal/80 hover:text-sage hover:bg-sage/5"}`}
              aria-label={isGuest ? "Sign in" : "Profile"}
            >
              <User className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${isProfileActive ? "text-sage" : whiteText ? "text-white group-hover:text-white/85" : "text-current group-hover:text-sage"}`} fill={isProfileActive ? "currentColor" : "none"} style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }} />
              {isGuest && (
                <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-white">
                  <Lock className="w-2 h-2" />
                </span>
              )}
            </OptimizedLink>
            <LockedTooltip show={hoveredLockedItem === "profile"} label="view profile" />
          </div>
        )}
      </div>
    </nav>
  );
}
