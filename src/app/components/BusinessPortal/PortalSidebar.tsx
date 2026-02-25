"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  PlusCircle,
  FileCheck,
  MessageSquare,
  ChevronRight,
  X,
  Calendar,
  Tag,
  Settings,
} from "lucide-react";
import Wordmark from "../Logo/Wordmark";
import { useMessageUnreadCount } from "@/app/hooks/messaging";

export const PORTAL_NAV_ITEMS = [
  { href: "/my-businesses", label: "My Businesses", icon: LayoutDashboard, exact: true },
  { href: "/my-businesses/messages", label: "Inbox", icon: MessageSquare, exact: true },
  { href: "/add-business", label: "Add Business", icon: PlusCircle, exact: true },
  { href: "/add-event", label: "Add Event", icon: Calendar, exact: true },
  { href: "/add-special", label: "Add Special", icon: Tag, exact: true },
  { href: "/claim-business", label: "Claim a Business", icon: FileCheck, exact: false },
  { href: "/settings", label: "Settings", icon: Settings, exact: true },
] as const;

interface PortalSidebarProps {
  pathname: string;
  onClose?: () => void;
}

export default function PortalSidebar({ pathname, onClose }: PortalSidebarProps) {
  const { unreadCount } = useMessageUnreadCount({ role: "business", enabled: true });

  return (
    <aside className="flex flex-col h-full bg-navbar-bg text-off-white">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5   ">
        <Link href="/my-businesses" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <Wordmark size="text-base" className="tracking-tight" />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {PORTAL_NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const showInboxBadge = href === "/my-businesses/messages" && unreadCount > 0;
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
              {showInboxBadge && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral px-1.5 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
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
