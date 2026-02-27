"use client";

import { type ComponentType, type CSSProperties } from "react";
import { Database, FileCheck, LogOut, Shield } from "lucide-react";
import Logo from "../../Logo/Logo";
import OptimizedLink from "../../Navigation/OptimizedLink";

type AdminNavItem = {
  href: string;
  label: string;
  exact: boolean;
  icon: ComponentType<{ className?: string }>;
};

const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: Shield, exact: true },
  { href: "/admin/claims", label: "Claims", icon: FileCheck, exact: false },
  { href: "/admin/seed", label: "Seed Data", icon: Database, exact: false },
] as const;

interface AdminHeaderRoleProps {
  pathname: string;
  logoScaleClass: string;
  sf: CSSProperties;
  onSignOut: () => void;
}

export function AdminHeaderRole({
  pathname,
  logoScaleClass,
  sf,
  onSignOut,
}: AdminHeaderRoleProps) {
  const isAdminNavActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href);

  return (
    <div className="w-full">
      <div className="hidden sm:flex items-center justify-between w-full">
        <OptimizedLink
          href="/admin"
          className="group flex items-center gap-1"
          aria-label="Admin Dashboard"
        >
          <Logo
            variant="default"
            showMark={false}
            wordmarkClassName="md:px-2"
            className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${logoScaleClass}`}
          />
          <span className="text-sage text-sm font-semibold" style={sf}>
            admin
          </span>
        </OptimizedLink>

        <div className="flex items-center gap-1">
          {ADMIN_NAV.map((item) => {
            const active = isAdminNavActive(item.href, item.exact);
            return (
              <OptimizedLink
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-[color,transform] duration-200 ease-in-out ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white sm:hover:scale-105 sm:focus-visible:scale-105"
                }`}
                style={sf}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </OptimizedLink>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/60 hover:text-coral transition-[color,transform] duration-200 ease-in-out sm:hover:scale-105 sm:focus-visible:scale-105"
          style={sf}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      <div className="flex sm:hidden flex-col w-full gap-1">
        <div className="flex items-center justify-between">
          <OptimizedLink
            href="/admin"
            className="group flex items-center gap-1"
            aria-label="Admin Dashboard"
          >
            <Logo
              variant="mobile"
              showMark={false}
              wordmarkClassName="md:px-2"
              className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${logoScaleClass}`}
            />
            <span className="text-sage text-sm font-semibold" style={sf}>
              admin
            </span>
          </OptimizedLink>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/60 hover:text-coral transition-colors"
            style={sf}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar -mb-2">
          {ADMIN_NAV.map((item) => {
            const active = isAdminNavActive(item.href, item.exact);
            return (
              <OptimizedLink
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
                }`}
                style={sf}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </OptimizedLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}

