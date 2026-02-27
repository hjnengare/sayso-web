"use client";

import { type ComponentProps } from "react";
import { MessageSquare, Settings } from "lucide-react";
import Logo from "../../Logo/Logo";
import OptimizedLink from "../../Navigation/OptimizedLink";
import DesktopNav from "../DesktopNav";
import MobileMenuToggleIcon from "../MobileMenuToggleIcon";

interface BusinessHeaderRoleProps {
  logoHref: string;
  logoScaleClass: string;
  desktopNavProps: ComponentProps<typeof DesktopNav>;
  isMobileSearchOpen: boolean;
  messagesHref: string;
  isMessagesActive: boolean;
  whiteText: boolean;
  isGuest: boolean;
  messageUnreadCount: number;
  isBusinessAccountUser: boolean;
  isSettingsActive: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export function BusinessHeaderRole({
  logoHref,
  logoScaleClass,
  desktopNavProps,
  isMobileSearchOpen,
  messagesHref,
  isMessagesActive,
  whiteText,
  isGuest,
  messageUnreadCount,
  isBusinessAccountUser,
  isSettingsActive,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: BusinessHeaderRoleProps) {
  return (
    <div className="flex items-center justify-between gap-3 lg:gap-6 w-full h-full">
      <OptimizedLink
        href={logoHref}
        className="group flex flex-shrink-0 relative items-center pl-4 lg:pl-0"
        aria-label="sayso Home"
      >
        <div className="relative">
          <Logo
            variant="default"
            showMark={false}
            className={`relative transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${logoScaleClass}`}
          />
        </div>
      </OptimizedLink>

      <div className="hidden lg:flex flex-1 justify-center">
        <DesktopNav {...desktopNavProps} mode="navOnly" />
      </div>

      <div className="hidden lg:flex items-center justify-end">
        <DesktopNav {...desktopNavProps} mode="iconsOnly" />
      </div>

      <div className="relative z-[2] flex lg:hidden items-center gap-2 ml-auto">
        {!isMobileSearchOpen && (
          <OptimizedLink
            href={messagesHref}
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
              isMessagesActive
                ? "text-sage bg-card-bg/5"
                : whiteText
                  ? "text-white hover:text-white/80"
                  : "text-charcoal/80 hover:text-sage"
            }`}
            aria-label={isGuest ? "Sign in for messages" : "Messages"}
          >
            <MessageSquare className="w-5 h-5" fill={isMessagesActive ? "currentColor" : "none"} />
            {messageUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full bg-coral ring-[1.5px] ring-white/85 shadow-sm">
                {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
              </span>
            )}
          </OptimizedLink>
        )}

        {isBusinessAccountUser && (
          <OptimizedLink
            href="/settings"
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
              isSettingsActive
                ? "text-sage bg-card-bg/5"
                : whiteText
                  ? "text-white hover:text-white/80"
                  : "text-charcoal/80 hover:text-sage"
            }`}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" fill={isSettingsActive ? "currentColor" : "none"} />
          </OptimizedLink>
        )}

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
      </div>
    </div>
  );
}

