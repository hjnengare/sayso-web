"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import PortalSidebar from "./PortalSidebar";

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.profile?.account_role || user?.profile?.role || null;
  const isBusinessOwner = role === "business_owner";
  const isAdmin = role === "admin";

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (!user.email_verified) { router.replace("/verify-email"); return; }
    if (!isBusinessOwner && !isAdmin) router.replace("/home");
  }, [isLoading, isBusinessOwner, isAdmin, router, user]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isLoading || !user || !user.email_verified || (!isBusinessOwner && !isAdmin)) {
    return (
      <div className="min-h-dvh bg-page-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-charcoal/60 font-urbanist">
          <div className="w-5 h-5 border-2 border-charcoal/15 border-t-charcoal/60 rounded-full animate-spin" />
          <span className="text-sm font-medium">Checking access…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-page-bg" style={{ height: 'calc(100dvh - var(--header-height, 0px))' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-56 xl:w-60 flex-shrink-0 shadow-lg h-full">
        <PortalSidebar pathname={pathname} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col w-64 h-full shadow-xl">
            <PortalSidebar pathname={pathname} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-navbar-bg border-b border-white/10 shadow-sm flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-urbanist font-bold text-white text-base tracking-tight">My Portal</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-page-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
