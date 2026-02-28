"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { getChoreoItemMotion } from "../lib/motion/choreography";
import {
  Bell, Check, X, MessageSquare, MessageCircle, Star, Heart,
  TrendingUp, ChevronRight, Award, ThumbsUp, CheckCircle,
  ImageIcon, Trophy, User,
} from "lucide-react";
import Footer from "../components/Footer/Footer";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useNotifications } from "../contexts/NotificationsContext";
import { useAuth } from "../contexts/AuthContext";
import { LiveIndicator } from "../components/Realtime/RealtimeIndicators";
import FilterPillGroup from "../components/Filters/FilterPillGroup";

/* ── Icon + colour per notification type ────────────────────────────────── */
function getNotificationMeta(type: string) {
  switch (type) {
    case 'review':
      return { Icon: MessageSquare, wrapBg: 'bg-coral/10', iconColor: 'text-coral' };
    case 'highlyRated':
      return { Icon: Star, wrapBg: 'bg-coral/10', iconColor: 'text-coral' };
    case 'review_helpful':
      return { Icon: ThumbsUp, wrapBg: 'bg-coral/10', iconColor: 'text-coral' };
    case 'user':
      return { Icon: Heart, wrapBg: 'bg-coral/10', iconColor: 'text-coral' };
    case 'message':
    case 'comment_reply':
      return { Icon: MessageCircle, wrapBg: 'bg-sage/10', iconColor: 'text-sage' };
    case 'badge_earned':
    case 'gamification':
      return { Icon: Award, wrapBg: 'bg-amber-500/10', iconColor: 'text-amber-600' };
    case 'milestone_achievement':
      return { Icon: Trophy, wrapBg: 'bg-amber-500/10', iconColor: 'text-amber-600' };
    case 'business':
      return { Icon: TrendingUp, wrapBg: 'bg-sage/10', iconColor: 'text-sage' };
    case 'business_approved':
    case 'claim_approved':
    case 'claim_status_changed':
      return { Icon: CheckCircle, wrapBg: 'bg-sage/10', iconColor: 'text-sage' };
    case 'photo_approved':
      return { Icon: ImageIcon, wrapBg: 'bg-sage/10', iconColor: 'text-sage' };
    default:
      return { Icon: Bell, wrapBg: 'bg-charcoal/8', iconColor: 'text-charcoal/55' };
  }
}

/* ── Time grouping from timeAgo string ───────────────────────────────────── */
function getTimeGroup(timeAgo: string): string {
  const t = timeAgo.toLowerCase();
  if (
    t.includes("just") ||
    t.includes("second") ||
    t.includes("minute") ||
    t.includes("hour")
  ) return "Today";
  if (t === "1 day" || t.startsWith("1 day")) return "Yesterday";
  if (t.includes("day")) return "This Week";
  return "Earlier";
}

type FilterType = 'All' | 'Unread' | 'Read';

interface NotificationListProps {
  notifications: any[];
  readNotifications: Set<string>;
  filterType: FilterType;
  setFilterType: (f: FilterType) => void;
  isPersonal?: boolean;
  markAsRead?: (id: string) => void;
  markAllAsRead?: () => void;
  deleteNotification?: (id: string) => void;
  isRealtimeConnected?: boolean;
}

/* ── Single notification row (Reddit-style) ──────────────────────────────── */
function NotificationRow({
  notification,
  isRead,
  isPersonal,
  markAsRead,
  deleteNotification,
}: {
  notification: any;
  isRead: boolean;
  isPersonal: boolean;
  markAsRead?: (id: string) => void;
  deleteNotification?: (id: string) => void;
}) {
  const router = useRouter();
  const { Icon, wrapBg, iconColor } = getNotificationMeta(notification.type);
  const hasLink = Boolean(notification.link?.trim());
  const hasImage = Boolean(notification.image?.trim());

  const handleRowClick = () => {
    if (!isRead) markAsRead?.(notification.id);
    if (hasLink) router.push(notification.link!);
  };

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className={`flex items-start gap-3 px-4 py-3.5 group relative transition-colors duration-150 ${
        isRead ? 'hover:bg-charcoal/[0.025]' : 'bg-coral/[0.03] hover:bg-coral/[0.055]'
      } ${hasLink ? 'cursor-pointer' : ''}`}
      onClick={hasLink || !isRead ? handleRowClick : undefined}
    >
      {/* Unread dot — far left, vertically centred to first text line */}
      <div className="flex-shrink-0 flex items-start pt-[17px] w-3">
        <span
          className={`block w-2 h-2 rounded-full transition-all duration-200 ${
            isRead ? 'opacity-0' : 'bg-coral'
          }`}
        />
      </div>

      {/* Avatar / type icon */}
      <div className="flex-shrink-0 relative">
        {hasImage ? (
          <>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-charcoal/8 ring-1 ring-charcoal/8">
              <Image
                src={notification.image}
                alt={notification.image_alt || ""}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            {/* Type badge overlay — bottom-right */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ring-[1.5px] ring-card-bg ${wrapBg}`}>
              <Icon className={`w-2.5 h-2.5 ${iconColor}`} strokeWidth={2.5} />
            </span>
          </>
        ) : (
          <span className={`flex w-10 h-10 items-center justify-center rounded-full ${wrapBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2} />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[13.5px] leading-snug ${
            isRead ? 'text-charcoal/55 font-normal' : 'text-charcoal font-semibold'
          }`}
          style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p
            className={`text-[12.5px] leading-snug mt-0.5 ${
              isRead ? 'text-charcoal/38' : 'text-charcoal/58'
            }`}
            style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
          >
            {notification.message}
          </p>
        )}
        <p
          className={`text-[11px] mt-1.5 font-medium tabular-nums ${
            isRead ? 'text-charcoal/30' : 'text-charcoal/45'
          }`}
          style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
        >
          {notification.timeAgo} ago
        </p>
      </div>

      {/* Hover-reveal actions */}
      {isPersonal && (
        <div
          className="flex-shrink-0 flex items-center gap-0.5 self-start mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {!isRead && (
            <button
              type="button"
              onClick={() => markAsRead?.(notification.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-charcoal/35 hover:bg-sage/10 hover:text-sage transition-colors duration-150"
              aria-label="Mark as read"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteNotification?.(notification.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-charcoal/35 hover:bg-coral/10 hover:text-coral transition-colors duration-150"
            aria-label="Delete notification"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </m.div>
  );
}

/* ── Notification list ───────────────────────────────────────────────────── */
function NotificationList({
  notifications,
  readNotifications,
  filterType,
  setFilterType,
  isPersonal = false,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  isRealtimeConnected = false,
}: NotificationListProps) {
  const unreadCount = notifications.filter((n) => !readNotifications.has(n.id)).length;

  const filtered = useMemo(() => {
    if (filterType === 'All') return notifications;
    if (filterType === 'Unread') return notifications.filter((n) => !readNotifications.has(n.id));
    return notifications.filter((n) => readNotifications.has(n.id));
  }, [notifications, readNotifications, filterType]);

  /* Group by time */
  const grouped = useMemo(() => {
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    const map: Record<string, any[]> = {};
    for (const n of filtered) {
      const g = getTimeGroup(n.timeAgo ?? '');
      if (!map[g]) map[g] = [];
      map[g].push(n);
    }
    return order.filter((g) => map[g]?.length).map((g) => ({ label: g, items: map[g] }));
  }, [filtered]);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 mb-4 bg-charcoal/8 rounded-full flex items-center justify-center">
          <Bell className="w-8 h-8 text-charcoal/35" strokeWidth={1.5} />
        </div>
        <p
          className="text-[15px] font-semibold text-charcoal/50"
          style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
        >
          No notifications yet
        </p>
        <p
          className="text-[13px] text-charcoal/38 mt-1"
          style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
        >
          You'll see updates from your activity here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Toolbar: count + live + mark-all ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-center gap-2.5">
          <p
            className="text-[13px] text-charcoal/55 font-medium"
            style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
          >
            {filtered.length} {filtered.length === 1 ? 'notification' : 'notifications'}
            {filterType !== 'All' && (
              <span className="text-charcoal/38"> · {filterType.toLowerCase()}</span>
            )}
          </p>
          {isRealtimeConnected && <LiveIndicator isLive={isRealtimeConnected} />}
        </div>
        {isPersonal && unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-[13px] font-semibold text-sage hover:text-sage/75 transition-colors duration-150 whitespace-nowrap"
            style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* ── Filter pills ── */}
      <div className="mb-5">
        <FilterPillGroup
          options={[
            { value: "All" as const, label: "All", count: notifications.length },
            { value: "Unread" as const, label: "Unread", count: unreadCount },
            { value: "Read" as const, label: "Read", count: notifications.length - unreadCount },
          ]}
          value={filterType}
          onChange={(v) => setFilterType((v ?? "All") as FilterType)}
          ariaLabel="Notification filter"
          size="md"
          showCounts
        />
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <p
          className="text-center text-[13px] text-charcoal/45 py-12"
          style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
        >
          No {filterType.toLowerCase()} notifications
        </p>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <div key={filterType} className="bg-card-bg rounded-2xl overflow-hidden shadow-sm">
            {grouped.map((group, gi) => (
              <div key={group.label}>
                {/* Group header */}
                <div className="px-4 py-2 bg-off-white/55 border-b border-charcoal/[0.06]">
                  <p
                    className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-charcoal/38"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                  >
                    {group.label}
                  </p>
                </div>

                {/* Rows */}
                <div className="divide-y divide-charcoal/[0.06]">
                  {group.items.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      isRead={readNotifications.has(notification.id)}
                      isPersonal={isPersonal}
                      markAsRead={markAsRead}
                      deleteNotification={deleteNotification}
                    />
                  ))}
                </div>

                {/* Divider between groups */}
                {gi < grouped.length - 1 && (
                  <div className="h-px bg-charcoal/[0.08]" />
                )}
              </div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function NotificationsPageSkeleton() {
  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col flex-1 animate-pulse">
      <div className="mx-auto w-full max-w-[2000px] px-2 flex flex-col flex-1">
        <div className="mb-6 sm:mb-8 px-2">
          <div className="h-9 w-56 rounded-lg bg-charcoal/10" />
          <div className="mt-3 h-4 w-64 rounded bg-charcoal/10" />
        </div>

        <div className="px-2 flex flex-col flex-1">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="h-4 w-40 rounded bg-charcoal/10" />
            <div className="h-5 w-28 rounded bg-charcoal/10" />
          </div>

          <div className="mb-5 flex items-center gap-2">
            <div className="h-8 w-16 rounded-full bg-charcoal/10" />
            <div className="h-8 w-20 rounded-full bg-charcoal/10" />
            <div className="h-8 w-16 rounded-full bg-charcoal/10" />
          </div>

          <div className="bg-card-bg rounded-2xl overflow-hidden shadow-sm">
            {/* Group header */}
            <div className="px-4 py-2 bg-off-white/55 border-b border-charcoal/[0.06]">
              <div className="h-3 w-12 rounded bg-charcoal/10" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-charcoal/[0.06] last:border-0">
                <div className="w-3 flex-shrink-0 pt-3">
                  <div className="w-2 h-2 rounded-full bg-charcoal/10" />
                </div>
                <div className="w-10 h-10 rounded-full bg-charcoal/10 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3.5 w-4/5 rounded bg-charcoal/10" />
                  <div className="h-3 w-3/5 rounded bg-charcoal/10" />
                  <div className="h-2.5 w-20 rounded bg-charcoal/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function NotificationsPage() {
  usePredefinedPageTitle('notifications');
  const prefersReducedMotion = useReducedMotion() ?? false;
  const choreoEnabled = !prefersReducedMotion;
  const { user } = useAuth();
  const userCurrentRole = user?.profile?.account_role || user?.profile?.role || "user";
  const isBusinessAccountUser = userCurrentRole === "business_owner";
  const headingTitle = isBusinessAccountUser ? "Business Notifications" : "Your Notifications";
  const headingSubtitle = isBusinessAccountUser
    ? "Activity from your business account"
    : "Activity from your personal account";

  const {
    notifications: personalNotifications,
    isLoading: isPersonalLoading,
    readNotifications: personalReadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [personalFilter, setPersonalFilter] = useState<FilterType>('All');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) { setIsRealtimeConnected(false); return; }
    setIsRealtimeConnected(true);
    return () => setIsRealtimeConnected(false);
  }, [user?.id]);

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-off-white relative font-urbanist"
      style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

      <main className="min-h-[100dvh] flex-1 flex flex-col relative z-10">
        <div className="flex-1 flex flex-col pb-12 sm:pb-16 md:pb-20">

          {/* Breadcrumb */}
          <m.div
            className="mx-auto w-full max-w-[2000px] px-2 relative mb-4"
            {...getChoreoItemMotion({ order: 0, intent: "inline", enabled: choreoEnabled })}
          >
            <nav className="pb-1" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm sm:text-base">
                <li>
                  <Link
                    href="/home"
                    className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                  >
                    Home
                  </Link>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-charcoal/60" />
                </li>
                <li>
                  <span className="text-charcoal font-semibold">Notifications</span>
                </li>
              </ol>
            </nav>
          </m.div>

          {isPersonalLoading ? (
            <NotificationsPageSkeleton />
          ) : (
            <m.div
              className="relative z-10 flex flex-col flex-1"
              {...getChoreoItemMotion({ order: 1, intent: "section", enabled: choreoEnabled })}
            >
              <div className="mx-auto w-full max-w-[2000px] px-2 flex flex-col flex-1">

                {/* Title */}
                <m.div
                  className="mb-6 sm:mb-8 px-2"
                  {...getChoreoItemMotion({ order: 2, intent: "heading", enabled: choreoEnabled })}
                >
                  <h1
                    className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal"
                    style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 800 }}
                  >
                    {headingTitle}
                  </h1>
                  <p
                    className="text-body-sm text-charcoal/60 mt-2"
                    style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {headingSubtitle}
                  </p>
                </m.div>

                {/* List */}
                <m.div
                  className="px-2 flex flex-col flex-1"
                  {...getChoreoItemMotion({ order: 3, intent: "section", enabled: choreoEnabled })}
                >
                  <NotificationList
                    notifications={personalNotifications}
                    readNotifications={personalReadNotifications}
                    filterType={personalFilter}
                    setFilterType={setPersonalFilter}
                    isPersonal={!isBusinessAccountUser}
                    markAsRead={markAsRead}
                    markAllAsRead={markAllAsRead}
                    deleteNotification={deleteNotification}
                    isRealtimeConnected={isRealtimeConnected}
                  />
                </m.div>

              </div>
            </m.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
