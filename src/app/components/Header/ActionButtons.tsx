import { useState } from "react";
import { Bell, Bookmark, MessageCircle, User, Lock, X, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import OptimizedLink from "../Navigation/OptimizedLink";
import LockedTooltip from "./LockedTooltip";

interface ActionButtonsProps {
  whiteText: boolean;
  isGuest: boolean;
  isBusinessAccountUser: boolean;
  isNotificationsActive: boolean;
  isMessagesActive: boolean;
  isSavedActive: boolean;
  isProfileActive: boolean;
  unreadCount: number;
  savedCount: number;
  unreadMessagesCount: number;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onNotificationsClick: () => void;
  heroSearchButton?: boolean;
}

export default function ActionButtons({
  whiteText,
  isGuest,
  isBusinessAccountUser,
  isNotificationsActive,
  isMessagesActive,
  isSavedActive,
  isProfileActive,
  unreadCount,
  savedCount,
  unreadMessagesCount,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onNotificationsClick,
  heroSearchButton = false,
}: ActionButtonsProps) {
  const [hoveredLockedItem, setHoveredLockedItem] = useState<string | null>(null);
  const router = useRouter();
  // Saved shortcut is intentionally hidden in the header; profile now provides the entry point.
  const showSavedAction = false;

  return (
    <div className="flex items-center gap-2.5 lg:gap-3.5 flex-shrink-0">
      {/* 1) Notifications */}
      {!isGuest && (
        <button
          onClick={onNotificationsClick}
          className={`md:hidden group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${
            isNotificationsActive
              ? "text-sage bg-sage/5"
              : whiteText
                ? "text-white hover:text-white/80 hover:bg-white/10"
                : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
          }`}
          aria-label="Notifications"
        >
          <Bell
            className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${
              isNotificationsActive
                ? "text-sage"
                : whiteText
                  ? "text-white group-hover:text-white/80"
                  : "text-current group-hover:text-sage"
            }`}
            fill={isNotificationsActive ? "currentColor" : "none"}
            style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* 2) Saved or Hero Search */}
      {!isBusinessAccountUser && (
        heroSearchButton ? (
          // Search button for hero navbar
          <button
            onClick={() => router.push('/trending')}
            className={`group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${
              whiteText
                ? "text-white hover:text-white/80 hover:bg-white/10"
                : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
            }`}
            aria-label="Search"
          >
            <Search
              className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${
                whiteText
                  ? "text-white group-hover:text-white/80"
                  : "text-current group-hover:text-sage"
              }`}
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
            />
          </button>
        ) : showSavedAction ? (
          <>
            {/* Mobile saved hidden for guests to remove lock UI */}
            {!isGuest && (
              <div className="relative md:hidden">
                <OptimizedLink
                  href="/saved"
                  className={`group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation relative shadow-md ${
                    isSavedActive
                      ? "text-sage bg-sage/5"
                      : whiteText
                        ? "text-white hover:text-white/80 hover:bg-white/10"
                        : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                  }`}
                  aria-label="Saved"
                >
                  <Bookmark
                    className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${
                      isSavedActive
                        ? "text-sage"
                        : whiteText
                          ? "text-white group-hover:text-white/80"
                          : "text-current group-hover:text-sage"
                    }`}
                    fill={isSavedActive ? "currentColor" : "none"}
                    style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
                  />
                  {savedCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                      {savedCount > 99 ? "99+" : savedCount}
                    </span>
                  )}
                </OptimizedLink>
                <LockedTooltip show={false} label="view saved" />
              </div>
            )}

            {/* Desktop saved (kept as-is) */}
            <div
              className="relative hidden md:block"
              onMouseEnter={() => isGuest && setHoveredLockedItem("saved")}
              onMouseLeave={() => setHoveredLockedItem(null)}
            >
              <OptimizedLink
                href={isGuest ? "/login" : "/saved"}
                className={`group flex w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${
                  isSavedActive
                    ? "text-sage bg-sage/5"
                    : whiteText
                      ? "text-white hover:text-white/85 hover:bg-white/10"
                      : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
                }`}
                aria-label={isGuest ? "Sign in to view saved" : "Saved"}
              >
                <Bookmark
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${
                    isSavedActive
                      ? "text-sage"
                      : whiteText
                        ? "text-white group-hover:text-white/85"
                        : "text-current group-hover:text-sage"
                  }`}
                  fill={isSavedActive ? "currentColor" : "none"}
                  style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
                />
                {isGuest ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-white">
                    <Lock className="w-2 h-2" />
                  </span>
                ) : savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
                    {savedCount > 99 ? "99+" : savedCount}
                  </span>
                )}
              </OptimizedLink>
              <LockedTooltip show={hoveredLockedItem === "saved"} label="view saved" />
            </div>
          </>
        ) : null
      )}

      {/* 3) DMs */}
      {!isGuest && (
        <OptimizedLink
          href="/dm"
          className={`md:hidden group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation relative shadow-md ${
            isMessagesActive
              ? "text-sage bg-sage/5"
              : whiteText
                ? "text-white hover:text-white/80 hover:bg-white/10"
                : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
          }`}
          aria-label="Messages"
        >
        <MessageCircle
          className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${
            isMessagesActive
              ? "text-sage"
              : whiteText
                ? "text-white group-hover:text-white/80"
                : "text-current group-hover:text-sage"
          }`}
          fill={isMessagesActive ? "currentColor" : "none"}
          style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
        />
        {unreadMessagesCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-white text-[11px] font-bold rounded-full shadow-lg bg-gradient-to-br from-coral to-coral/90 border border-white/20">
            {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
          </span>
        )}
      </OptimizedLink>
      )}

      {/* 4) Profile (mobile only) — hide for guests to remove lock UI */}
      {!isGuest && !isBusinessAccountUser && (
        <OptimizedLink
          href="/profile"
          className={`md:hidden group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation relative shadow-md ${
            isProfileActive
              ? "text-sage bg-sage/5"
              : whiteText
                ? "text-white hover:text-white/80 hover:bg-white/10"
                : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
          }`}
          aria-label="Profile"
        >
          <User
            className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${
              isProfileActive
                ? "text-sage"
                : whiteText
                  ? "text-white group-hover:text-white/80"
                  : "text-current group-hover:text-sage"
            }`}
            style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
          />
        </OptimizedLink>
      )}

      {/* 5) Mobile Search Icon — redirect to Trending */}
      <button
        onClick={() => router.push('/trending')}
        className={`md:hidden group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg transition-all duration-200 relative shadow-md ${
          whiteText
            ? "text-white hover:text-white/80 hover:bg-white/10"
            : "text-charcoal/80 hover:text-sage hover:bg-sage/5"
        }`}
        aria-label="Search"
      >
        <Search
          className={`w-6 h-6 sm:w-5 sm:h-5 transition-all duration-200 group-hover:scale-110 ${
            whiteText
              ? "text-white group-hover:text-white/80"
              : "text-current group-hover:text-sage"
          }`}
          style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
        />
      </button>

      {/* Mobile Menu Toggle (kept last) */}
      <button
        onClick={onToggleMobileMenu}
        className={`md:hidden w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200 shadow-md ${
          whiteText ? "text-white" : "text-charcoal/80"
        }`}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className={`w-5 h-5 sm:w-6 sm:h-6 ${whiteText ? "text-white" : "text-current"}`} strokeWidth={2.8} />
        ) : (
          <div className="flex flex-col items-start justify-center gap-[5px]">
            <span className={`block w-8 h-[3px] rounded-full ${whiteText ? "bg-white" : "bg-current"}`} />
            <span className={`block w-6 h-[3px] rounded-full ${whiteText ? "bg-white" : "bg-current"}`} />
            <span className={`block w-4 h-[3px] rounded-full ${whiteText ? "bg-white" : "bg-current"}`} />
          </div>
        )}
      </button>

      {/* Desktop profile is handled elsewhere to avoid duplicates */}
    </div>
  );
}
