"use client";

import { type ComponentProps, type ReactNode, type RefObject } from "react";
import { Bell, MessageSquare, Search } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import Logo from "../../Logo/Logo";
import OptimizedLink from "../../Navigation/OptimizedLink";
import DesktopNav from "../DesktopNav";
import MobileMenuToggleIcon from "../MobileMenuToggleIcon";

interface PersonalHeaderRoleProps {
  isHomePage: boolean;
  logoHref: string;
  logoScaleClass: string;
  showSearch: boolean;
  desktopSearchExpandedWidth: number;
  renderDesktopSearchInput: (expandedWidth: number) => ReactNode;
  isMobileSearchOpen: boolean;
  renderMobileSearchInput: () => ReactNode;
  handleMobileSearchToggle: () => void;
  whiteText: boolean;
  isGuest: boolean;
  isNotificationsActive: boolean;
  unreadCount: number;
  messagesHref: string;
  isMessagesActive: boolean;
  messageUnreadCount: number;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  homeDesktopRowRef: RefObject<HTMLDivElement>;
  homeDesktopNavRef: RefObject<HTMLDivElement>;
  homeDesktopIconsRef: RefObject<HTMLDivElement>;
  desktopNavProps: ComponentProps<typeof DesktopNav>;
}

export function PersonalHeaderRole({
  isHomePage,
  logoHref,
  logoScaleClass,
  showSearch,
  desktopSearchExpandedWidth,
  renderDesktopSearchInput,
  isMobileSearchOpen,
  renderMobileSearchInput,
  handleMobileSearchToggle,
  whiteText,
  isGuest,
  isNotificationsActive,
  unreadCount,
  messagesHref,
  isMessagesActive,
  messageUnreadCount,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  homeDesktopRowRef,
  homeDesktopNavRef,
  homeDesktopIconsRef,
  desktopNavProps,
}: PersonalHeaderRoleProps) {
  return (
    <div className="w-full">
      <div
        ref={homeDesktopRowRef}
        className={`hidden lg:grid lg:items-center lg:gap-4 ${
          isHomePage
            ? "lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
            : "lg:grid-cols-[auto_1fr_auto]"
        }`}
      >
        <div className="flex items-center">
          <OptimizedLink href={logoHref} className="group flex items-center" aria-label="sayso Home">
            <Logo
              variant="default"
              showMark={false}
              wordmarkClassName="md:px-2"
              className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${logoScaleClass}`}
            />
          </OptimizedLink>
        </div>

        <div ref={isHomePage ? homeDesktopNavRef : null} className="flex justify-center">
          <DesktopNav {...desktopNavProps} mode="navOnly" />
        </div>

        <div className="flex items-center justify-end gap-3 min-w-0">
          {showSearch && isHomePage && renderDesktopSearchInput(desktopSearchExpandedWidth)}
          <div ref={isHomePage ? homeDesktopIconsRef : null} className="flex items-center justify-end">
            <DesktopNav {...desktopNavProps} mode="iconsOnly" />
          </div>
        </div>
      </div>

      <div className="relative flex lg:hidden items-center gap-2 w-full min-h-[48px]">
        <AnimatePresence mode="wait">
          {!isMobileSearchOpen && (
            <m.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="pl-2"
            >
              <OptimizedLink
                href={logoHref}
                className="group flex items-center flex-shrink-0"
                aria-label="sayso Home"
              >
                <Logo
                  variant="default"
                  showMark={false}
                  wordmarkClassName="md:px-2"
                  className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${logoScaleClass}`}
                />
              </OptimizedLink>
            </m.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isMobileSearchOpen && showSearch && isHomePage && renderMobileSearchInput()}
        </AnimatePresence>

        <div className="relative z-[2] flex items-center gap-3 ml-auto">
          {showSearch && isHomePage && !isMobileSearchOpen && (
            <button
              type="button"
              onClick={handleMobileSearchToggle}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                whiteText ? "text-white hover:text-white/80" : "text-charcoal/80 hover:text-sage"
              }`}
              aria-label="Open search"
            >
              <Search className="w-5 h-5" strokeWidth={2} />
            </button>
          )}

          {!isMobileSearchOpen && (
            <div className="relative">
              <OptimizedLink
                href={isGuest ? "/onboarding" : "/notifications"}
                className={`z-[2] w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer pointer-events-auto select-none ${
                  isNotificationsActive
                    ? "text-sage bg-card-bg/5"
                    : whiteText
                      ? "text-white hover:text-white/80"
                      : "text-charcoal/80 hover:text-sage"
                }`}
                aria-label={isGuest ? "Sign in for notifications" : "Notifications"}
              >
                <Bell className="w-5 h-5 pointer-events-none" fill={isNotificationsActive ? "currentColor" : "none"} />
              </OptimizedLink>
              {unreadCount > 0 && (
                <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] leading-none font-extrabold tracking-tight rounded-full bg-coral text-white ring-[1.5px] ring-white/85 shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          )}

          {!isMobileSearchOpen && (
            <div className="relative">
              <OptimizedLink
                href={messagesHref}
                className={`z-[2] w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer pointer-events-auto select-none ${
                  isMessagesActive
                    ? "text-sage bg-card-bg/5"
                    : whiteText
                      ? "text-white hover:text-white/80"
                      : "text-charcoal/80 hover:text-sage"
                }`}
                aria-label={isGuest ? "Sign in for messages" : "Messages"}
              >
                <MessageSquare className="w-5 h-5 pointer-events-none" fill={isMessagesActive ? "currentColor" : "none"} />
              </OptimizedLink>
              {messageUnreadCount > 0 && (
                <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] leading-none font-extrabold tracking-tight rounded-full bg-coral text-white ring-[1.5px] ring-white/85 shadow-sm">
                  {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                </span>
              )}
            </div>
          )}

          {!isMobileSearchOpen && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                whiteText ? "text-white hover:text-white/80" : "text-charcoal/80 hover:text-sage"
              }`}
              aria-label="Open menu"
              aria-expanded={isMobileMenuOpen}
            >
              <MobileMenuToggleIcon isOpen={isMobileMenuOpen} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

