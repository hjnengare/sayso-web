"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { X, Edit, ChevronRight, Bookmark, Home, User, Search, Settings, HelpCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSavedItems } from "../../contexts/SavedItemsContext";

interface MenuModalProps {
  isOpen: boolean;
  isVisible: boolean;
  onClose: () => void;
}

export default function MenuModal({ isOpen, isVisible, onClose }: MenuModalProps) {
  const { user } = useAuth();
  const { savedCount } = useSavedItems();
  const router = useRouter();
  const pathname = usePathname();
  const modalRef = useRef<HTMLDivElement>(null);

  // Check active routes
  const isSavedActive = pathname === '/saved' || pathname?.startsWith('/saved');
  const isHomeActive = pathname === '/home' || pathname === '/';
  const isProfileActive = pathname === '/profile' || pathname?.startsWith('/profile');

  // Handle outside click and keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Set CSS custom property for scrollbar width
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);

    // Apply modal scroll lock class
    document.body.classList.add('modal-scroll-lock');

    // Prevent background scroll and compensate for scrollbar
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    // Also apply to fixed positioned elements like headers
    const fixedElements = document.querySelectorAll('header, .fixed');
    fixedElements.forEach((element) => {
      (element as HTMLElement).style.paddingRight = `${scrollbarWidth}px`;
    });

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      // Only close if clicking outside the modal content, not when backdrop is handled by onClick
      if (modalRef.current?.contains(target)) return;
      if ((target as Element)?.classList?.contains('backdrop-blur-sm')) return; // Handled by backdrop onClick
      onClose();
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Listen for both mouse and touch events
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscapeKey);

      // Remove modal scroll lock class
      document.body.classList.remove('modal-scroll-lock');

      // Restore background scroll and remove padding compensation
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";

      // Remove CSS custom property
      document.documentElement.style.removeProperty('--scrollbar-width');

      // Remove padding from all fixed elements
      const fixedElements = document.querySelectorAll('header, .fixed');
      fixedElements.forEach((element) => {
        (element as HTMLElement).style.paddingRight = "";
      });
    };
  }, [isVisible, onClose]);

  // Navigate and close menu
  const handleNavigation = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop - only visible when menu is open */}
      {isOpen && (
        <div
          className="modal-backdrop bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Modal Content - slides from left */}
      <div
        ref={modalRef}
        role="dialog"
        aria-label="Navigation menu"
        className={`
          modal-slide-left w-80 max-w-[80vw] no-layout-shift
          bg-off-white /98 backdrop-blur-md shadow-lg
          mobile-scroll-container safe-area-container overflow-y-auto
          ${isOpen ? "open" : ""}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sage/10">
          <div>
            <h2 className="font-urbanist text-xl font-700 text-transparent bg-clip-text bg-gradient-to-r from-sage via-sage/90 to-charcoal">
              sayso Menu
            </h2>
            <p className="font-urbanist text-sm text-charcoal/60 mt-1">
              Navigate your local world
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 border border-charcoal/10 bg-charcoal/5 hover:bg-sage/10 flex items-center justify-center rounded-full transition-all duration-200 touch-target-large"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-charcoal/70" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="p-6 space-y-2">
          {/* Discover */}
          <div className="mb-4">
            <span className="font-urbanist text-sm font-600 text-charcoal/60 uppercase tracking-wide underline">
              Discover
            </span>
          </div>

          {/* Write Review */}
          <button
            onClick={() => handleNavigation("/business/review")}
            className="w-full flex items-center space-x-4 p-4 rounded-[12px] hover:bg-sage/5 transition-all duration-200 group mobile-interaction touch-target-large"
          >
            <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center group-hover:bg-coral/20 transition-colors duration-200">
              <Edit className="w-5 h-5 text-coral" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-urbanist text-base font-600 text-charcoal group-hover:text-sage transition-colors duration-200">
                Write Review
              </span>
              <p className="text-sm text-charcoal/60 mt-1">
                Share your local experiences
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-sage transition-colors duration-200" />
          </button>

          {/* Saved Places */}
          <Link
            href="/saved"
            onClick={onClose}
            className={`w-full flex items-center space-x-4 p-4 rounded-[12px] transition-all duration-200 group mobile-interaction touch-target-large relative ${
              isSavedActive ? 'bg-sage/5' : 'hover:bg-sage/5'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 relative ${
              isSavedActive ? 'bg-sage/20' : 'bg-sage/10 group-hover:bg-sage/20'
            }`}>
              <Bookmark className={`w-5 h-5 ${isSavedActive ? 'text-sage' : 'text-charcoal/60'}`} fill={isSavedActive ? 'currentColor' : 'none'} />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-sage text-white text-[11px] font-semibold rounded-full shadow-md">
                  {savedCount > 99 ? '99+' : savedCount}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <span className={`font-urbanist text-base font-600 transition-colors duration-200 ${
                isSavedActive ? 'text-sage' : 'text-charcoal group-hover:text-sage'
              }`}>
                Saved Places
              </span>
              <p className="text-sm text-charcoal/60 mt-1">
                Your favorite local gems
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-sage transition-colors duration-200" />
          </Link>

          {/* Home */}
          <Link
            href="/home"
            onClick={onClose}
            className={`w-full flex items-center space-x-4 p-4 rounded-[12px] transition-all duration-200 group mobile-interaction touch-target-large ${
              isHomeActive ? 'bg-sage/5' : 'hover:bg-sage/5'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ${
              isHomeActive ? 'bg-sage/20' : 'bg-sage/10 group-hover:bg-sage/20'
            }`}>
              <Home className={`w-5 h-5 ${isHomeActive ? 'text-sage' : 'text-charcoal/60'}`} fill={isHomeActive ? 'currentColor' : 'none'} />
            </div>
            <div className="flex-1 text-left">
              <span className={`font-urbanist text-base font-600 transition-colors duration-200 ${
                isHomeActive ? 'text-sage' : 'text-charcoal group-hover:text-sage'
              }`}>
                Home
              </span>
              <p className="text-sm text-charcoal/60 mt-1">
                Discover local businesses
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-sage transition-colors duration-200" />
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            onClick={onClose}
            className={`w-full flex items-center space-x-4 p-4 rounded-[12px] transition-all duration-200 group mobile-interaction touch-target-large ${
              isProfileActive ? 'bg-sage/5' : 'hover:bg-sage/5'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ${
              isProfileActive ? 'bg-sage/20' : 'bg-sage/10 group-hover:bg-sage/20'
            }`}>
              <User className={`w-5 h-5 ${isProfileActive ? 'text-sage' : 'text-charcoal/60'}`} fill={isProfileActive ? 'currentColor' : 'none'} />
            </div>
            <div className="flex-1 text-left">
              <span className={`font-urbanist text-base font-600 transition-colors duration-200 ${
                isProfileActive ? 'text-sage' : 'text-charcoal group-hover:text-sage'
              }`}>
                Profile
              </span>
              <p className="text-sm text-charcoal/60 mt-1">
                Your reviews and settings
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-sage transition-colors duration-200" />
          </Link>


          {/* Search */}
          <button
            onClick={() => {
              onClose();
              // Focus the search input if it exists
              const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
              if (searchInput) {
                searchInput.focus();
              }
            }}
            className="w-full flex items-center space-x-4 p-4 rounded-[12px] hover:bg-sage/5 transition-all duration-200 group mobile-interaction touch-target-large"
          >
            <div className="w-10 h-10 bg-sage/10 rounded-full flex items-center justify-center group-hover:bg-sage/20 transition-colors duration-200">
              <Search className="w-5 h-5 text-sage" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-urbanist text-base font-600 text-charcoal group-hover:text-sage transition-colors duration-200">
                Search
              </span>
              <p className="text-sm text-charcoal/60 mt-1">
                Find specific businesses
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-sage transition-colors duration-200" />
          </button>
        </div>

        {/* User Section */}
        {user && (
          <div className="mt-8 p-6 border-t border-sage/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-sage" />
              </div>
              <div>
                <span className="font-urbanist text-base font-600 text-charcoal">
                  {user.name || user.email?.split('@')[0] || 'User'}
                </span>
                <p className="text-sm text-charcoal/60">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => handleNavigation("/settings")}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-sage/5 transition-all duration-200 group mobile-interaction"
              >
                <Settings className="w-4 h-4 text-charcoal/60 group-hover:text-sage transition-colors duration-200" />
                <span className="font-urbanist text-sm font-500 text-charcoal group-hover:text-sage transition-colors duration-200">
                  Settings
                </span>
              </button>

              <button
                onClick={() => handleNavigation("/help")}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-sage/5 transition-all duration-200 group mobile-interaction"
              >
                <HelpCircle className="w-4 h-4 text-charcoal/60 group-hover:text-sage transition-colors duration-200" />
                <span className="font-urbanist text-sm font-500 text-charcoal group-hover:text-sage transition-colors duration-200">
                  Help & Support
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto p-6 border-t border-sage/10">
          <p className="text-sm sm:text-xs text-charcoal/40 text-center">
            sayso - Discover trusted local gems
          </p>
        </div>
      </div>
    </>
  );
}
