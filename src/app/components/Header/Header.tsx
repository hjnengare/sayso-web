// src/components/Header/Header.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell, Settings, Bookmark, Search } from "lucide-react";
import Logo from "../Logo/Logo";
import OptimizedLink from "../Navigation/OptimizedLink";
import DesktopNav from "./DesktopNav";
import MobileMenu from "./MobileMenu";
import { useHeaderState } from "./useHeaderState";
import { PRIMARY_LINKS, DISCOVER_LINKS } from "./headerActionsConfig";

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
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const [headerPlaceholder, setHeaderPlaceholder] = useState(
    "Discover local experiences, premium dining, and gems..."
  );


  const headerClassName = "sticky top-0 left-0 right-0 w-full max-w-7xl mx-auto z-50 bg-navbar-bg shadow-md transition-all duration-300";
    

  const isPersonalLayout = !isBusinessAccountUser;
  const isHomePage = pathname === "/" || pathname === "/home";



  useEffect(() => {
    const setByViewport = () => {
      setHeaderPlaceholder(
        window.innerWidth >= 1024
          ? "Discover exceptional local experiences, premium dining, and gems..."
          : "Search places, coffee, yoga..."
      );
    };
    setByViewport();
    window.addEventListener("resize", setByViewport);
    return () => window.removeEventListener("resize", setByViewport);
  }, []);

  const submitHomeSearch = (query: string) => {
    if (!isHomePage) return;
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (query.trim()) {
      params.set("search", query.trim());
    } else {
      params.delete("search");
    }
    const searchString = params.toString();
    const basePath = pathname === "/home" ? "/home" : "/";
    router.push(`${basePath}${searchString ? `?${searchString}` : ""}`);
  };

  const renderHomeSearchInput = () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitHomeSearch(headerSearchQuery);
      }}
      className="w-full"
    >
      <div className="relative">
        <div className="absolute inset-y-0 right-2 flex items-center gap-1 z-10">
          <div className="flex items-center justify-center w-9 h-9 rounded-full text-charcoal/50">
            <Search className="w-5 h-5" strokeWidth={2} />
          </div>
        </div>

        <input
          type="text"
          value={headerSearchQuery}
          onChange={(e) => setHeaderSearchQuery(e.target.value)}
          placeholder={headerPlaceholder}
          className="w-full rounded-none bg-off-white text-charcoal placeholder:text-charcoal/50
            border border-white/40 shadow-sm
            focus:outline-none focus:bg-white focus:border-white
            hover:bg-white/90 transition-all duration-200
            pr-12 pl-5 py-3
          "
          style={{
            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
          aria-label="Search"
        />
      </div>
    </form>
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
          className={`relative py-4 z-[1] mx-auto w-full max-w-7xl ${horizontalPaddingClass} flex items-center h-full min-h-[96px]`}
        >
          {isPersonalLayout ? (
            <div className="w-full">
              {/* ✅ Top Row Grid */}
              <div
                className={[
                  "flex items-center justify-between gap-3",
                  "lg:grid lg:items-center",
                  isHomePage ? "lg:grid-cols-[1fr_auto_1fr]" : "lg:grid-cols-[auto_1fr_auto]",
                ].join(" ")}
              >
                {/* Left column */}
                <div className="hidden lg:flex items-center">
                  {isHomePage ? (
                    <div className="max-w-[360px] w-full">{showSearch && renderHomeSearchInput()}</div>
                  ) : (
                    <OptimizedLink href="/" className="group flex items-center" aria-label="sayso Home">
                      <Logo
                        variant="default"
                        showMark={false}
                        className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                      />
                    </OptimizedLink>
                  )}
                </div>

                {/* Center column */}
                <div className="hidden lg:flex justify-center">
                  {isHomePage ? (
                    <OptimizedLink href="/" className="group flex items-center" aria-label="sayso Home">
                      <Logo
                        variant="default"
                        showMark={false}
                        className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                      />
                    </OptimizedLink>
                  ) : (
                    <DesktopNav {...desktopNavProps} mode="navOnly" />
                  )}
                </div>

                {/* Right column */}
                <div className="hidden lg:flex items-center justify-end">
                  <DesktopNav {...desktopNavProps} mode="iconsOnly" />
                </div>

                {/* Mobile */}
                <div className="flex lg:hidden items-center gap-2 w-full">
                  {isHomePage && (
                    <OptimizedLink href="/" className="group flex items-center" aria-label="sayso Home">
                      <Logo
                        variant="default"
                        showMark={false}
                        className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                      />
                    </OptimizedLink>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
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
              </div>
              {/* ✅ END Top Row Grid (this was missing) */}

              {/* Desktop Nav Row (home only) */}
              {isHomePage && (
                <div className="hidden lg:flex justify-center mt-3">
                  <DesktopNav {...desktopNavProps} mode="navOnly" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 lg:gap-6 w-full h-full">
              <OptimizedLink href="/" className="group flex flex-shrink-0 relative items-center" aria-label="sayso Home">
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
