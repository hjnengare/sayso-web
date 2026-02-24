"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import PortalSidebar from "./PortalSidebar";
import MobileMenuToggleIcon from "../Header/MobileMenuToggleIcon";

interface PortalLayoutProps {
  children: ReactNode;
}

function PortalSidebarShell({ onClose }: { onClose?: () => void }) {
  return (
    <aside className="flex h-full flex-col bg-navbar-bg text-off-white">
      <div className="flex items-center justify-between    px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white/15 animate-pulse" />
          <div className="h-5 w-24 rounded bg-white/15 animate-pulse" />
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="flex-1 space-y-2 px-3 py-4">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-10 rounded-xl bg-white/10 animate-pulse" />
        ))}
      </div>
      <div className="border-t border-white/10 px-5 py-4">
        <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
      </div>
    </aside>
  );
}

function PortalMainContentSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl space-y-4">
        <div className="h-8 w-48 rounded-lg bg-charcoal/10 animate-pulse" />
        <div className="h-28 rounded-[12px] bg-charcoal/8 animate-pulse" />
        <div className="h-28 rounded-[12px] bg-charcoal/8 animate-pulse" />
        <div className="h-28 rounded-[12px] bg-charcoal/8 animate-pulse" />
      </div>
    </div>
  );
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.profile?.account_role || user?.profile?.role || null;
  const hasResolvedRole = Boolean(role);
  const isBusinessOwner = role === "business_owner";
  const isAdmin = role === "admin";
  const hasPortalAccess = Boolean(user && user.email_verified && (isBusinessOwner || isAdmin));

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.email_verified) {
      router.replace("/verify-email");
      return;
    }
    if (!hasResolvedRole) return;
    if (!isBusinessOwner && !isAdmin) {
      router.replace("/home");
    }
  }, [hasResolvedRole, isAdmin, isBusinessOwner, isLoading, router, user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh bg-page-bg">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-56 xl:w-60 flex-shrink-0 shadow-lg h-full">
        {hasPortalAccess ? <PortalSidebar pathname={pathname} /> : <PortalSidebarShell />}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col w-64 h-full shadow-xl">
            {hasPortalAccess ? (
              <PortalSidebar pathname={pathname} onClose={() => setMobileOpen(false)} />
            ) : (
              <PortalSidebarShell onClose={() => setMobileOpen(false)} />
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-navbar-bg    shadow-sm flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 text-white hover:text-white/80 hover:bg-white/10"
          >
            <MobileMenuToggleIcon isOpen={mobileOpen} />
          </button>
          <span className="font-urbanist font-bold text-white text-base tracking-tight">My Portal</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-page-bg">
          {hasPortalAccess ? children : <PortalMainContentSkeleton />}
        </main>
      </div>
    </div>
  );
}
