import { CSSProperties, MouseEvent } from "react";
import { Lock, X } from "lucide-react";
import OptimizedLink from "../Navigation/OptimizedLink";
import Logo from "../Logo/Logo";
import { NavLink } from "./DesktopNav";

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
  const primaryCount = primaryLinks.length;
  const discoverCount = discoverLinks.length;
  // Keep a single DM entry point on mobile (top bar), so we omit Messages from the drawer.
  const commonActions = [
    ...(isBusinessAccountUser ? [{ href: "/settings", label: "Settings", requiresAuth: true, delay: 2 }] : []),
  ];
  const personalActions = isBusinessAccountUser ? [] : [
    { href: "/saved", label: "Saved", requiresAuth: true, delay: 2 },
    { href: "/profile", label: "Profile", requiresAuth: true, delay: 3 },
  ];
  const actionItems = [...commonActions, ...personalActions];
  const mobileRevealClass = `transform transition-all duration-500 ease-out ${
    isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
  }`;
  const mobileModalRevealClass = `transition-all duration-500 ease-out ${
    isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
  }`;

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
            <Logo variant="mobile" color="sage" />
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-off-white hover:text-off-white/80 transition-colors focus:outline-none focus:ring-0"
              aria-label="Close menu"
            >
              <X className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.8} />
            </button>
          </div>

          <nav className="flex flex-col py-2 px-3 overflow-y-auto flex-1 min-h-0">
            {isBusinessAccountUser && (
              <div className="space-y-1">
                {businessLinks.map(({ key, label, href }, index) => {
                  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
                  const targetHref = key === "add-business" ? "/add-business" : href;
                  const isActive = pathname ? pathname === targetHref || pathname.startsWith(targetHref) : false;
                  return (
                  <OptimizedLink
                    key={key}
                    href={targetHref}
                    onClick={(e) => {
                      handleNavClick(targetHref, e);
                      onClose();
                    }}
                    className={`px-3 py-2 rounded-[20px] text-base font-normal transition-all duration-200 relative min-h-[44px] flex items-center justify-start ${mobileRevealClass} ${isActive ? "text-sage bg-white/5" : "text-white hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5"}`}
                    style={{
                      ...sf,
                      transitionDelay: `${index * 60}ms`,
                    }}
                  >
                    <span className="text-left">{label}</span>
                  </OptimizedLink>
                );
                })}
              </div>
            )}

            {!isBusinessAccountUser && (
              <div className="space-y-1">
                {primaryLinks.map(({ key, label, href, requiresAuth }, index) => {
                  const showLockIndicator = isGuest && requiresAuth;
                  return (
                    <OptimizedLink
                      key={key}
                      href={showLockIndicator ? "/login" : href}
                      onClick={(e) => {
                        handleNavClick(href, e);
                        onClose();
                      }}
                      className={`px-3 py-2 rounded-[20px] text-base font-normal text-white hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-200 relative min-h-[44px] flex items-center justify-start ${mobileRevealClass}`}
                      style={{
                        ...sf,
                        transitionDelay: `${index * 60}ms`,
                      }}
                    >
                      <span className="text-left flex items-center gap-1.5">
                        {label}
                        {showLockIndicator && <Lock className="w-3 h-3 text-white/40" />}
                      </span>
                    </OptimizedLink>
                  );
                })}
              </div>
            )}

            {!isBusinessAccountUser && <div className="h-px bg-charcoal/10 my-2 mx-3" />}

            {!isBusinessAccountUser && (
              <div className="space-y-1">
                {discoverLinks.map(({ key, label, href, requiresAuth }, index) => {
                  const showLockIndicator = isGuest && requiresAuth;
                  return (
                    <OptimizedLink
                      key={key}
                      href={showLockIndicator ? "/login" : href}
                      onClick={(e) => {
                        handleNavClick(href, e);
                        onClose();
                      }}
                      className={`px-3 py-2 rounded-[20px] text-base font-normal text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-200 min-h-[44px] flex items-center justify-start ${mobileRevealClass}`}
                      style={{
                        ...sf,
                        transitionDelay: `${(primaryCount + index) * 60}ms`,
                      }}
                    >
                      <span className="text-left flex items-center gap-1.5">
                        {label}
                        {showLockIndicator && <Lock className="w-3 h-3 text-white/40" />}
                      </span>
                    </OptimizedLink>
                  );
                })}
              </div>
            )}

            <div className="h-px bg-charcoal/10 my-2 mx-3" />

            <div className="space-y-1">
              {actionItems.map((item, idx) => {
                const showLockIndicator = isGuest && item.requiresAuth;
                return (
                  <OptimizedLink
                    key={item.href}
                    href={showLockIndicator ? "/login" : item.href}
                    onClick={() => onClose()}
                    className={`px-3 py-2 rounded-lg text-base font-normal text-white hover:text-white flex items-center justify-start transition-colors duration-200 min-h-[44px] ${mobileRevealClass}`}
                    style={{
                      ...sf,
                      transitionDelay: `${(primaryCount + discoverCount + (item.delay ?? idx)) * 60}ms`,
                    }}
                  >
                    <span className="text-left flex items-center gap-1.5">
                      {item.label}
                      {showLockIndicator && <Lock className="w-3 h-3 text-white/40" />}
                    </span>
                  </OptimizedLink>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
