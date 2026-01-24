// src/components/Header/Header.tsx
"use client";

import { useState } from "react";
import { Menu, Bell, User, Settings, Bookmark, MessageCircle } from "lucide-react";
import FilterModal from "../FilterModal/FilterModal";
import SearchInput from "../SearchInput/SearchInput";
import Logo from "../Logo/Logo";
import OptimizedLink from "../Navigation/OptimizedLink";
import DesktopNav from "./DesktopNav";
import MobileMenu from "./MobileMenu";
import HeaderSkeleton from "./HeaderSkeleton";
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
  // Use centralized header state hook
  const {
    isGuest,
    isBusinessAccountUser,
    isCheckingBusinessOwner,
    hasOwnedBusinesses,
    unreadCount,
    unreadMessagesCount,
    savedCount,
    pathname,
    navLinks,
    isStackedLayout,
    isNavReady,
    isDiscoverActive,
    isNotificationsActive,
    isSavedActive,
    isMessagesActive,
    isProfileActive,
    isSettingsActive,
    isClaimBusinessActive,
    isFilterVisible,
    isFilterOpen,
    isMobileMenuOpen,
    isDiscoverDropdownOpen,
    isDiscoverDropdownClosing,
    showSearchBar,
    discoverMenuPos,
    headerRef,
    searchWrapRef,
    discoverDropdownRef,
    discoverMenuPortalRef,
    discoverBtnRef,
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
    fontStyle: sf,
  } = useHeaderState({ searchLayout, forceSearchOpen });

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

  // Padding classes
  const currentPaddingClass = heroMode ? "py-0" : reducedPadding ? "py-3.5 md:py-4" : "py-3.5 md:py-6";
  
  // Always render the real header, even if navigation state is not ready
  
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

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex flex-1">
              <DesktopNav
                whiteText={whiteText}
                isGuest={isGuest}
                isBusinessAccountUser={isBusinessAccountUser}
                isClaimBusinessActive={isClaimBusinessActive}
                isDiscoverActive={isDiscoverActive}
                primaryLinks={navLinks.primaryLinks}
                discoverLinks={DISCOVER_LINKS}
                businessLinks={navLinks.businessLinks}
                isNotificationsActive={isNotificationsActive}
                isMessagesActive={isMessagesActive}
                isProfileActive={isProfileActive}
                isSettingsActive={isSettingsActive}
                savedCount={savedCount}
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
                onNotificationsClick={() => setShowSearchBar(true)}
                sf={sf}
              />
            </div>

            {/* Mobile Navigation - Visible only on mobile */}
            <div className="flex md:hidden items-center gap-2 ml-auto">
              {/* Notifications */}
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

              {/* Saved (personal users only) */}
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

              {/* DM (personal users only) */}
              {!isBusinessAccountUser && !isGuest && (
                <OptimizedLink
                  href="/messages"
                  className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                    isMessagesActive
                      ? "text-sage bg-sage/5"
                      : whiteText
                        ? "text-white hover:text-white/80 hover:bg-white/10"
                        : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                  }`}
                  aria-label="Messages"
                >
                  <MessageCircle className="w-5 h-5" fill={isMessagesActive ? "currentColor" : "none"} />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                      {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                    </span>
                  )}
                </OptimizedLink>
              )}

              {/* Profile/Settings icon */}
              {(!isBusinessAccountUser && !isGuest) ? null : (
                <OptimizedLink
                  href={isGuest ? "/login" : isBusinessAccountUser ? "/settings" : "/profile"}
                  className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                    isProfileActive || isSettingsActive
                      ? "text-sage bg-sage/5"
                      : whiteText
                        ? "text-white hover:text-white/80 hover:bg-white/10"
                        : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                  }`}
                  aria-label={isBusinessAccountUser ? "Settings" : "Profile"}
                >
                  {isBusinessAccountUser ? (
                    <Settings className="w-5 h-5" fill={(isSettingsActive) ? "currentColor" : "none"} />
                  ) : (
                    <User className="w-5 h-5" fill={(isProfileActive) ? "currentColor" : "none"} />
                  )}
                </OptimizedLink>
              )}

              {/* Mobile Menu Hamburger Button */}
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
        primaryLinks={navLinks.primaryLinks}
        discoverLinks={DISCOVER_LINKS}
        businessLinks={navLinks.businessLinks}
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
