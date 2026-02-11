import { CSSProperties, MouseEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Facebook,
  Instagram,
  Lock,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import OptimizedLink from "../Navigation/OptimizedLink";
import { NavLink } from "./DesktopNav";
import MobileMenuToggleIcon from "./MobileMenuToggleIcon";
import { getMobileMenuActions, shouldShowLockIndicator } from "./headerActionsConfig";

interface SocialLink {
  key: "instagram" | "facebook" | "youtube";
  href: string;
  label: string;
  Icon: LucideIcon;
}

const hasUsableExternalHref = (value: string | undefined): value is string => {
  if (!value || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const resolveSocialHref = (value: string | undefined, fallback: string): string => {
  return hasUsableExternalHref(value) ? value : fallback;
};

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isBusinessAccountUser: boolean;
  isGuest: boolean;
  primaryLinks: readonly NavLink[];
  discoverLinks: readonly NavLink[];
  businessLinks: readonly NavLink[];
  handleNavClick: (href: string, e?: MouseEvent) => void;
  sf: CSSProperties;
}

export default function MobileMenu({
  isOpen,
  onClose,
  isBusinessAccountUser,
  isGuest,
  primaryLinks,
  discoverLinks,
  businessLinks,
  handleNavClick,
  sf,
}: MobileMenuProps) {
  const pathname = usePathname();
  const addMenuItems: readonly NavLink[] = [
    { key: "add-business", label: "Add New Business", href: "/add-business", requiresAuth: true },
    { key: "add-special", label: "Add Special", href: "/add-special", requiresAuth: true },
    { key: "add-event", label: "Add Event", href: "/add-event", requiresAuth: true },
  ] as const;
  const businessTopLinks = businessLinks.filter((link) => link.key !== "add-business");
  const isRouteActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isAddRouteActive = addMenuItems.some((item) => isRouteActive(item.href));
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(isAddRouteActive);

  useEffect(() => {
    if (!isOpen) {
      setIsAddSectionOpen(false);
      return;
    }
    if (isAddRouteActive) {
      setIsAddSectionOpen(true);
    }
  }, [isOpen, isAddRouteActive]);

  // Use centralized mobile menu actions config
  const actionItems = getMobileMenuActions(isBusinessAccountUser);
  const profileAction = actionItems.find((item) => item.href === "/profile");

  const orderedPrimaryLinks: readonly NavLink[] = [
    primaryLinks.find((link) => link.href === "/home"),
    discoverLinks.find((link) => link.href === "/for-you"),
    discoverLinks.find((link) => link.href === "/trending"),
    discoverLinks.find((link) => link.href === "/events-specials"),
  ].filter(Boolean) as NavLink[];

  const orderedSecondaryLinks: readonly NavLink[] = [
    primaryLinks.find((link) => link.href === "/leaderboard"),
    { key: "saved", label: "Saved", href: "/saved", requiresAuth: true },
  ].filter(Boolean) as NavLink[];
  
  const mobileRevealClass = `transform transition-all duration-500 ease-out ${
    isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
  }`;
  const mobileModalRevealClass = `transition-all duration-500 ease-out ${
    isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
  }`;
  const mobileTapFeedbackClass =
    "active:scale-[0.98] active:opacity-95 transition-[transform,opacity,color,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const protectedLabelStyle: CSSProperties = {
    textDecorationLine: "line-through",
    textDecorationColor: "rgba(255,255,255,0.5)",
    textDecorationThickness: "1px",
  };
  const socialLinks: SocialLink[] = [
    {
      key: "instagram",
      href: resolveSocialHref(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM, "https://www.instagram.com"),
      label: "Visit us on Instagram",
      Icon: Instagram,
    },
    {
      key: "facebook",
      href: resolveSocialHref(process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK, "https://www.facebook.com"),
      label: "Visit us on Facebook",
      Icon: Facebook,
    },
    {
      key: "youtube",
      href: resolveSocialHref(process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE, "https://www.youtube.com"),
      label: "Visit us on YouTube",
      Icon: Youtube,
    },
  ];

  // Always render nav links, but show skeleton/placeholder if loading
  if (typeof isBusinessAccountUser === 'undefined') {
    return (
      <div className={`fixed top-0 right-0 h-full w-full bg-navbar-bg z-[99999] shadow-[0_-4px_24px_rgba(0,0,0,0.15),0_-2px_8px_rgba(0,0,0,0.1)] transform md:hidden backdrop-blur-xl border-l border-white/20 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } transition-transform duration-300`}>
        <div className={`flex flex-col h-full overflow-hidden ${mobileModalRevealClass}`}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-charcoal/10 flex-shrink-0 transition-all duration-500 ease-out">
            <span className="sayso-wordmark text-white text-xl font-normal leading-none select-none">
              <span className="text-[1.05em] sayso-wordmark">S</span>
              <span className="text-[0.9em] sayso-wordmark">ayso</span>
            </span>
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-off-white hover:text-off-white/80 transition-colors focus:outline-none focus:ring-0"
              aria-label="Close menu"
            >
              <MobileMenuToggleIcon isOpen={isOpen} />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Strict separation: Only one menu type is rendered at a time
  let menuContent = null;

  if (isBusinessAccountUser) {
    // Business account: Only business tools
    menuContent = (
      <div className="space-y-1">
        {businessTopLinks.map(({ key, label, href }, index) => {
          const isActive = isRouteActive(href);
          return (
            <OptimizedLink
              key={key}
              href={href}
              onClick={(e) => {
                handleNavClick(href, e);
                onClose();
              }}
              className={`px-3 py-2 rounded-[12px] text-base font-normal relative min-h-[44px] flex items-center justify-start ${mobileTapFeedbackClass} ${mobileRevealClass} ${isActive ? "text-sage bg-white/5" : "text-white hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5"}`}
              style={{
                ...sf,
                transitionDelay: `${index * 60}ms`,
              }}
            >
              <span className="text-left">{label}</span>
            </OptimizedLink>
          );
        })}

        <div
          className={`rounded-[12px] border border-white/10 bg-white/[0.04] transition-all duration-300 ${mobileRevealClass}`}
          style={{
            ...sf,
            transitionDelay: `${businessTopLinks.length * 60}ms`,
          }}
        >
          <button
            type="button"
            onClick={() => setIsAddSectionOpen((prev) => !prev)}
            className={`w-full px-3 py-2 min-h-[44px] rounded-[12px] text-base font-normal flex items-center justify-between ${mobileTapFeedbackClass} ${
              isAddRouteActive ? "text-sage" : "text-white hover:text-white hover:bg-white/5"
            }`}
            aria-expanded={isAddSectionOpen}
            aria-controls="mobile-add-nav"
          >
            <span>Add</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${isAddSectionOpen ? "rotate-180" : ""}`}
            />
          </button>

          <div
            id="mobile-add-nav"
            className={`grid transition-all duration-300 ease-out ${isAddSectionOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"}`}
          >
            <div className="overflow-hidden">
              <div className="pl-3 pr-2 pb-2 space-y-1">
                {addMenuItems.map((item) => {
                  const itemActive = isRouteActive(item.href);
                  const targetHref = shouldShowLockIndicator(isGuest, item.requiresAuth)
                    ? "/login"
                    : item.href;
                  return (
                    <OptimizedLink
                      key={item.key}
                      href={targetHref}
                      onClick={(e) => {
                        handleNavClick(item.href, e);
                        onClose();
                      }}
                      className={`block rounded-lg px-3 py-2 text-sm font-semibold ${mobileTapFeedbackClass} ${
                        itemActive
                          ? "text-sage bg-gradient-to-r from-sage/15 to-sage/5"
                          : "text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5"
                      }`}
                      style={sf}
                    >
                      {item.label}
                    </OptimizedLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Business-only actions (e.g., settings) */}
        <div className="h-px bg-charcoal/10 my-2 mx-3" />
        {actionItems.map((item, idx) => {
          const showLockIndicator = shouldShowLockIndicator(isGuest, item.requiresAuth);
          return (
            <OptimizedLink
              key={item.href}
              href={showLockIndicator ? "/login" : item.href}
              onClick={() => onClose()}
              className={`px-3 py-2 rounded-full text-base font-normal text-white hover:text-white flex items-center justify-start min-h-[44px] ${mobileTapFeedbackClass} ${mobileRevealClass}`}
              style={{
                ...sf,
                transitionDelay: `${(businessTopLinks.length + 1 + (item.delay ?? idx)) * 60}ms`,
              }}
            >
              <span className="text-left flex items-center gap-1.5">
                {item.label}
                {showLockIndicator && <Lock className="w-3 h-3 text-coral" />}
              </span>
            </OptimizedLink>
          );
        })}
      </div>
    );
  } else if (!isGuest) {
    // Logged-in personal user: Only consumer features
    menuContent = (
      <>
        <div className="space-y-1">
          {orderedPrimaryLinks.map(({ key, label, href, requiresAuth }, index) => {
            const showLockIndicator = shouldShowLockIndicator(isGuest, requiresAuth);
            return (
              <OptimizedLink
                key={key}
                href={showLockIndicator ? "/login" : href}
                onClick={(e) => {
                  handleNavClick(href, e);
                  onClose();
                }}
                className={`px-3 py-2 rounded-[12px] text-base font-normal text-white hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 relative min-h-[44px] flex items-center justify-center ${mobileTapFeedbackClass} ${mobileRevealClass}`}
                style={{
                  ...sf,
                  transitionDelay: `${index * 60}ms`,
                }}
                aria-label={showLockIndicator ? `${label.toUpperCase()} (sign in required)` : label.toUpperCase()}
              >
                <span
                  className={`text-center uppercase flex items-center gap-1.5 ${showLockIndicator ? "opacity-85" : ""}`}
                  style={showLockIndicator ? protectedLabelStyle : undefined}
                >
                  {label}
                  {showLockIndicator && <Lock className="w-3 h-3 text-white/80" strokeWidth={1.9} aria-hidden="true" />}
                </span>
              </OptimizedLink>
            );
          })}
        </div>
        <div className="h-px bg-charcoal/10 my-2 mx-3" />
        <div className="space-y-1">
          {orderedSecondaryLinks.map(({ key, label, href, requiresAuth }, index) => {
            const showLockIndicator = shouldShowLockIndicator(isGuest, requiresAuth);
            return (
              <OptimizedLink
                key={key}
                href={showLockIndicator ? "/login" : href}
                onClick={(e) => {
                  handleNavClick(href, e);
                  onClose();
                }}
                className={`px-3 py-2 rounded-[12px] text-base font-normal text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 min-h-[44px] flex items-center justify-center ${mobileTapFeedbackClass} ${mobileRevealClass}`}
                style={{
                  ...sf,
                  transitionDelay: `${(orderedPrimaryLinks.length + index) * 60}ms`,
                }}
                aria-label={showLockIndicator ? `${label.toUpperCase()} (sign in required)` : label.toUpperCase()}
              >
                <span
                  className={`text-center uppercase flex items-center gap-1.5 ${showLockIndicator ? "opacity-85" : ""}`}
                  style={showLockIndicator ? protectedLabelStyle : undefined}
                >
                  {label}
                  {showLockIndicator && <Lock className="w-3 h-3 text-white/80" strokeWidth={1.9} aria-hidden="true" />}
                </span>
              </OptimizedLink>
            );
          })}
        </div>
        {profileAction && (
          <>
            <div className="h-px bg-charcoal/10 my-2 mx-3" />
            <div className="space-y-1">
              <OptimizedLink
                key={profileAction.href}
                href={profileAction.href}
                onClick={() => onClose()}
                className={`px-3 py-2 rounded-lg text-base font-normal text-white hover:text-white flex items-center justify-center min-h-[44px] ${mobileTapFeedbackClass} ${mobileRevealClass}`}
                style={{
                  ...sf,
                  transitionDelay: `${(orderedPrimaryLinks.length + orderedSecondaryLinks.length + 1) * 60}ms`,
                }}
              >
                <span className="text-center uppercase flex items-center gap-1.5">
                  {profileAction.label}
                </span>
              </OptimizedLink>
            </div>
          </>
        )}
      </>
    );
  } else {
    // Unauthenticated visitor: Show features with lock indicators where needed
    menuContent = (
      <>
        <div className="space-y-1">
          {orderedPrimaryLinks.map(({ key, label, href, requiresAuth }, index) => {
            const showLockIndicator = shouldShowLockIndicator(isGuest, requiresAuth);
            return (
              <OptimizedLink
                key={key}
                href={showLockIndicator ? "/login" : href}
                onClick={(e) => {
                  handleNavClick(href, e);
                  onClose();
                }}
                className={`px-3 py-2 rounded-[12px] text-base font-normal text-white hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 relative min-h-[44px] flex items-center justify-center ${mobileTapFeedbackClass} ${mobileRevealClass}`}
                style={{
                  ...sf,
                  transitionDelay: `${index * 60}ms`,
                }}
              >
                <span className="text-center uppercase flex items-center gap-1.5">
                  {label}
                  {showLockIndicator && <Lock className="w-3 h-3 text-coral" />}
                </span>
              </OptimizedLink>
            );
          })}
        </div>
        <div className="h-px bg-charcoal/10 my-2 mx-3" />
        <div className="space-y-1">
          {orderedSecondaryLinks.map(({ key, label, href, requiresAuth }, index) => {
            const showLockIndicator = shouldShowLockIndicator(isGuest, requiresAuth);
            return (
              <OptimizedLink
                key={key}
                href={showLockIndicator ? "/login" : href}
                onClick={(e) => {
                  handleNavClick(href, e);
                  onClose();
                }}
                className={`px-3 py-2 rounded-[12px] text-base font-normal text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 min-h-[44px] flex items-center justify-center ${mobileTapFeedbackClass} ${mobileRevealClass}`}
                style={{
                  ...sf,
                  transitionDelay: `${(orderedPrimaryLinks.length + index) * 60}ms`,
                }}
              >
                <span className="text-center uppercase flex items-center gap-1.5">
                  {label}
                  {showLockIndicator && <Lock className="w-3 h-3 text-coral" />}
                </span>
              </OptimizedLink>
            );
          })}
        </div>
        <div className="h-px bg-charcoal/10 my-2 mx-3" />
        <OptimizedLink
          key="sign-in"
          href="/login"
          onClick={() => onClose()}
          className={`px-3 py-2 rounded-[12px] text-base font-normal text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 min-h-[44px] flex items-center justify-center ${mobileTapFeedbackClass} ${mobileRevealClass}`}
          style={{
            ...sf,
            transitionDelay: `${(orderedPrimaryLinks.length + orderedSecondaryLinks.length + 1) * 60}ms`,
          }}
        >
          <span className="text-center uppercase flex items-center gap-1.5">Sign in</span>
        </OptimizedLink>
      </>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-xl z-[10000] md:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-full bg-navbar-bg z-[99999] shadow-[0_-4px_24px_rgba(0,0,0,0.15),0_-2px_8px_rgba(0,0,0,0.1)] transform md:hidden backdrop-blur-xl border-l border-white/20 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300`}
      >
        <div className={`flex flex-col h-full overflow-hidden ${mobileModalRevealClass}`}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-charcoal/10 flex-shrink-0 transition-all duration-500 ease-out">
            <span className="sayso-wordmark text-white text-xl font-normal leading-none select-none">
              <span className="text-[1.05em] sayso-wordmark">S</span>
              <span className="text-[0.9em] sayso-wordmark">ayso</span>
            </span>
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-off-white hover:text-off-white/80 transition-colors focus:outline-none focus:ring-0"
              aria-label="Close menu"
            >
              <MobileMenuToggleIcon isOpen={isOpen} />
            </button>
          </div>
          <nav className="px-3 py-2 overflow-y-auto flex-1 min-h-0">
            <div className="flex min-h-full flex-col justify-center">
              {menuContent}
            </div>
          </nav>
          {isOpen && socialLinks.length > 0 && (
            <div className="px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] border-t border-charcoal/10 flex items-center justify-center gap-5">
              {socialLinks.map(({ key, href, label, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
