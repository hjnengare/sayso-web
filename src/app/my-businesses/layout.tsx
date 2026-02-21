"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  Store,
  PlusCircle,
  FileCheck,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/my-businesses", label: "My Businesses", icon: LayoutDashboard, exact: true },
  { href: "/add-business", label: "Add Business", icon: PlusCircle, exact: true },
  { href: "/claim-business", label: "Claim a Business", icon: FileCheck, exact: false },
];

function Sidebar({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <aside className="flex flex-col h-full bg-navbar-bg/90 text-off-white">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <Link href="/my-businesses" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-urbanist font-bold text-base text-white tracking-tight">My Portal</span>
        </Link>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${active
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
                }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-white/50 group-hover:text-white/80"}`} />
              <span className="flex-1 font-urbanist">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <Link
          href="/home"
          onClick={onClose}
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors font-urbanist"
        >
          <span>← Back to Sayso</span>
        </Link>
      </div>
    </aside>
  );
}

export default function MyBusinessesLayout({ children }: { children: ReactNode }) {
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

  // Close mobile nav on route change
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
    <div className="h-dvh bg-page-bg flex overflow-hidden">
      {/* Desktop sidebar — fixed height, never scrolls */}
      <div className="hidden lg:flex lg:flex-col lg:w-56 xl:w-60 flex-shrink-0 shadow-lg h-full">
        <Sidebar pathname={pathname} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col w-64 h-full shadow-xl">
            <Sidebar pathname={pathname} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content — scrolls independently */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-navbar-bg/90 border-b border-white/10 shadow-sm flex-shrink-0">
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
