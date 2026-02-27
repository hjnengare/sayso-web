"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { getChoreoItemMotion } from "../lib/motion/choreography";
import { Bell, Check, X, MessageSquare, MessageCircle, Star, Heart, TrendingUp, Clock, ChevronRight, Award, ThumbsUp, CheckCircle, ImageIcon, Trophy, UserRound } from "lucide-react";
import Footer from "../components/Footer/Footer";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useNotifications } from "../contexts/NotificationsContext";
import { useAuth } from "../contexts/AuthContext";
import { LiveIndicator } from "../components/Realtime/RealtimeIndicators";

function getNotificationIcon(type: string) {
  switch (type) {
    case 'review': return MessageSquare;
    case 'business': return TrendingUp;
    case 'user': return Heart;
    case 'highlyRated': return Star;
    case 'message': return MessageCircle;
    case 'badge_earned':
    case 'gamification': return Award;
    case 'review_helpful': return ThumbsUp;
    case 'business_approved':
    case 'claim_approved': return CheckCircle;
    case 'comment_reply': return MessageCircle;
    case 'photo_approved': return ImageIcon;
    case 'milestone_achievement': return Trophy;
    default: return Bell;
  }
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
  renderCard?: (
    content: React.ReactNode,
    notification: any,
    isRead: boolean,
    hasLink: boolean,
    onClickProps: Record<string, any>
  ) => React.ReactNode;
}

function BusinessNotificationList({
  notifications,
  readNotifications,
  filterType,
  setFilterType,
  isPersonal = false,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  isRealtimeConnected = false,
  renderCard,
}: NotificationListProps) {
  const router = useRouter();

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  const filtered = useMemo(() => {
    if (filterType === 'All') return notifications;
    if (filterType === 'Unread') return notifications.filter(n => !readNotifications.has(n.id));
    return notifications.filter(n => readNotifications.has(n.id));
  }, [notifications, readNotifications, filterType]);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center py-8 text-center">
        <div className="w-16 h-16 mb-4 bg-charcoal/8 rounded-full flex items-center justify-center">
          <Bell className="w-8 h-8 text-charcoal/40" strokeWidth={1.5} />
        </div>
        <p className="text-body-sm text-charcoal/50 font-urbanist">No notifications yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Title row */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-center gap-2.5">
          <p className="text-body-sm text-charcoal/60 font-urbanist">
            {filtered.length} {filtered.length === 1 ? 'notification' : 'notifications'}
            {filterType !== 'All' && ` (${filterType.toLowerCase()})`}
          </p>
          {isRealtimeConnected && <LiveIndicator isLive={isRealtimeConnected} />}
        </div>
        {isPersonal && unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 rounded-lg font-urbanist text-body-sm transition-all duration-200 hover:bg-charcoal/5 text-charcoal/60 hover:text-charcoal whitespace-nowrap"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-5" style={{ WebkitOverflowScrolling: 'touch' }}>
        {(['All', 'Unread', 'Read'] as const).map((filter) => {
          const isSelected = filterType === filter;
          const count =
            filter === 'All' ? notifications.length
            : filter === 'Unread' ? unreadCount
            : notifications.length - unreadCount;
          const baseClasses = isPersonal
            ? 'px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-urbanist font-500 text-xs sm:text-sm transition-all duration-200 active:scale-95 flex-shrink-0 whitespace-nowrap border'
            : 'px-4 py-2 rounded-lg font-urbanist text-body-sm transition-all duration-200 flex-shrink-0 whitespace-nowrap';
          const selectedClasses = isPersonal
            ? 'bg-card-bg text-white border-card-bg'
            : 'bg-navbar-bg text-white';
          const unselectedClasses = isPersonal
            ? 'bg-white/50 text-charcoal/70 hover:bg-card-bg/10 hover:text-charcoal border-charcoal/10'
            : 'bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal border-transparent';
          return (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
            >
              {filter}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="text-center text-body-sm text-charcoal/50 font-urbanist py-10">
          No {filterType.toLowerCase()} notifications
        </p>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <div className="space-y-0" key={filterType}>
            {filtered.map((notification, index) => {
              const isRead = readNotifications.has(notification.id);
              const Icon = getNotificationIcon(notification.type);
const hasLink = Boolean(notification.link?.trim());

              const card = (
                <>
                  <span className="grid flex-shrink-0 h-8 w-8 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                    <Icon className="w-4 h-4 text-charcoal/85" strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-body mb-1 leading-snug font-urbanist ${isRead ? 'text-charcoal/50 font-normal' : 'text-charcoal font-medium'}`}>
                          {notification.message} {notification.title}
                        </p>
                        <div className={`flex items-center gap-1.5 text-caption ${isRead ? 'text-charcoal/40' : 'text-charcoal/60'}`}>
                          <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                            <Clock className="w-2.5 h-2.5 text-charcoal/85" strokeWidth={2} />
                          </span>
                          <span className="font-urbanist">{notification.timeAgo} ago</span>
                        </div>
                      </div>
                      {isPersonal && (
                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => markAsRead?.(notification.id)}
                              className="grid h-6 w-6 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors"
                              aria-label="Mark as read"
                            >
                              <Check className="w-3 h-3 text-charcoal/85" strokeWidth={2} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteNotification?.(notification.id)}
                            className="grid h-6 w-6 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors"
                            aria-label="Delete notification"
                          >
                            <X className="w-3 h-3 text-charcoal/85" strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );

              const onClickProps = hasLink ? {
                onClick: () => router.push(notification.link!),
                onKeyDown: (e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(notification.link!); } },
                role: 'button' as const,
                tabIndex: 0,
              } : {};

              if (renderCard) {
                return renderCard(card, notification, isRead, hasLink, onClickProps);
              }

              return (
                <m.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-transparent text-charcoal rounded-xl p-3.5 sm:p-4 mb-2.5 last:mb-0 transition-all duration-200 ${
                    isRead ? 'opacity-60' : 'border border-charcoal/10'
                  } ${hasLink ? 'cursor-pointer hover:border-navbar-bg/30 hover:shadow-sm' : ''}`}
                  {...onClickProps}
                >
                  <div className="flex items-start gap-3">{card}</div>
                </m.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

// Personal-only list with saved-page card styling
function PersonalNotificationList(props: NotificationListProps) {
  const { notifications } = props;
  if (notifications.length === 0) {
    return (
      <div
        className="mx-auto w-full max-w-[2000px] px-2 font-urbanist flex flex-1 items-center justify-center"
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        <div className="text-center w-full">
          <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
            <Bell className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
          </div>
          <h3 className="text-h2 font-semibold text-charcoal mb-2">No notifications yet</h3>
          <p className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto font-medium">
            You'll see updates from your activity here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BusinessNotificationList
      {...props}
      renderCard={(content, notification, isRead, hasLink, onClickProps) => (
        <m.div
          key={notification.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`bg-card-bg text-charcoal rounded-[12px] p-4 sm:p-5 mb-3 last:mb-0 transition-all duration-200   shadow-md ${
            isRead ? 'opacity-70' : ''
          } ${hasLink ? 'cursor-pointer hover:shadow-lg hover:border-navbar-bg/30' : ''}`}
          {...onClickProps}
        >
          <div className="flex items-start gap-3">{content}</div>
        </m.div>
      )}
    />
  );
}

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
            <div className="h-8 w-28 rounded-full bg-charcoal/10" />
          </div>

          <div className="mb-5 flex items-center gap-2">
            <div className="h-8 w-16 rounded-full bg-charcoal/10" />
            <div className="h-8 w-20 rounded-full bg-charcoal/10" />
            <div className="h-8 w-16 rounded-full bg-charcoal/10" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-[12px] border border-charcoal/10 bg-card-bg p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-charcoal/10" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-11/12 rounded bg-charcoal/10" />
                    <div className="mt-2 h-4 w-8/12 rounded bg-charcoal/10" />
                    <div className="mt-3 h-3 w-28 rounded bg-charcoal/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  usePredefinedPageTitle('notifications');
  const prefersReducedMotion = useReducedMotion() ?? false;
  const choreoEnabled = !prefersReducedMotion;
  const router = useRouter();
  const { user } = useAuth();
  const userCurrentRole =
    user?.profile?.account_role || user?.profile?.role || "user";
  const isBusinessAccountUser = userCurrentRole === "business_owner";

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

  useEffect(() => {
    if (!isBusinessAccountUser) return;
    router.replace("/my-businesses");
  }, [isBusinessAccountUser, router]);

  const isLoading = isPersonalLoading;

  if (isBusinessAccountUser) {
    return <NotificationsPageSkeleton />;
  }

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
          <m.div
            className="mx-auto w-full max-w-[2000px] px-2 relative mb-4"
            {...getChoreoItemMotion({ order: 0, intent: "inline", enabled: choreoEnabled })}
          >
            {/* Breadcrumb */}
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
                  <span className="text-charcoal font-semibold">
                    Notifications
                  </span>
                </li>
              </ol>
            </nav>
          </m.div>

          {isLoading ? (
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
                    Your Notifications
                  </h1>
                  <p
                    className="text-body-sm text-charcoal/60 mt-2"
                    style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    Activity from your personal account
                  </p>
                </m.div>

                <m.div
                  className="px-2 flex flex-col flex-1"
                  {...getChoreoItemMotion({ order: 3, intent: "section", enabled: choreoEnabled })}
                >
                  <PersonalNotificationList
                    notifications={personalNotifications}
                    readNotifications={personalReadNotifications}
                    filterType={personalFilter}
                    setFilterType={setPersonalFilter}
                    isPersonal={true}
                    markAsRead={markAsRead}
                    markAllAsRead={markAllAsRead}
                    deleteNotification={deleteNotification}
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
