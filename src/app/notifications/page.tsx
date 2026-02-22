"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useBusinessNotificationsFeed } from "../hooks/useBusinessNotificationsFeed";
import { m, AnimatePresence } from "framer-motion";
import { Bell, Check, X, MessageSquare, MessageCircle, Star, Heart, TrendingUp, Clock, ChevronRight, Award, ThumbsUp, CheckCircle, ImageIcon, Trophy, UserRound, Building2 } from "lucide-react";
import Footer from "../components/Footer/Footer";
import { PageLoader } from "../components/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useNotifications } from "../contexts/NotificationsContext";
import { useAuth } from "../contexts/AuthContext";
import { LiveIndicator } from "../components/Realtime/RealtimeIndicators";
import PortalLayout from "../components/BusinessPortal/PortalLayout";

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

function getNotificationColor(isRead: boolean) {
  if (isRead) return 'bg-charcoal/5 text-navbar-bg/60 border-transparent';
  return 'bg-navbar-bg/10 text-navbar-bg border-transparent';
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
  const router = useRouter();

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  const filtered = useMemo(() => {
    if (filterType === 'All') return notifications;
    if (filterType === 'Unread') return notifications.filter(n => !readNotifications.has(n.id));
    return notifications.filter(n => readNotifications.has(n.id));
  }, [notifications, readNotifications, filterType]);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
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
          return (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`px-4 py-2 rounded-lg font-urbanist text-body-sm transition-all duration-200 flex-shrink-0 whitespace-nowrap ${
                isSelected
                  ? 'bg-navbar-bg text-white'
                  : 'bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal'
              }`}
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
              const colorClass = getNotificationColor(isRead);
              const hasLink = Boolean(notification.link?.trim());

              const card = (
                <>
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colorClass} transition-all duration-200`}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-body mb-1 leading-snug font-urbanist ${isRead ? 'text-charcoal/50 font-normal' : 'text-charcoal font-medium'}`}>
                          {notification.message} {notification.title}
                        </p>
                        <div className={`flex items-center gap-1.5 text-caption ${isRead ? 'text-charcoal/40' : 'text-charcoal/60'}`}>
                          <Clock className="w-3 h-3" strokeWidth={2} />
                          <span className="font-urbanist">{notification.timeAgo} ago</span>
                        </div>
                      </div>
                      {isPersonal && (
                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => markAsRead?.(notification.id)}
                              className="p-1.5 hover:bg-charcoal/5 rounded-lg transition-all duration-200 group"
                              aria-label="Mark as read"
                            >
                              <Check className="w-4 h-4 text-charcoal/40 group-hover:text-navbar-bg transition-colors" strokeWidth={2} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteNotification?.(notification.id)}
                            className="p-1.5 hover:bg-charcoal/5 rounded-lg transition-all duration-200 group"
                            aria-label="Delete notification"
                          >
                            <X className="w-4 h-4 text-charcoal/30 group-hover:text-charcoal/60 transition-colors" strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );

              return (
                <m.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-xl p-3.5 sm:p-4 mb-2.5 last:mb-0 transition-all duration-200 ${
                    isRead ? 'opacity-60' : 'border border-charcoal/10'
                  } ${hasLink ? 'cursor-pointer hover:border-navbar-bg/30 hover:shadow-sm' : ''}`}
                  {...(hasLink && {
                    onClick: () => router.push(notification.link!),
                    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(notification.link!); } },
                    role: 'button' as const,
                    tabIndex: 0,
                  })}
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

export default function NotificationsPage() {
  usePredefinedPageTitle('notifications');
  const { user } = useAuth();
  const userCurrentRole = user?.profile?.account_role || user?.profile?.role || "user";
  const isBusinessAccountUser = userCurrentRole === "business_owner";

  const {
    notifications: personalNotifications,
    isLoading: isPersonalLoading,
    readNotifications: personalReadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const {
    notifications: businessNotifications,
    readIds: businessReadNotifications,
    loading: isBusinessLoading,
  } = useBusinessNotificationsFeed();

  const [personalFilter, setPersonalFilter] = useState<FilterType>('All');
  const [businessFilter, setBusinessFilter] = useState<FilterType>('All');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    if (!isBusinessAccountUser || !user?.id) { setIsRealtimeConnected(false); return; }
    setIsRealtimeConnected(true);
    return () => setIsRealtimeConnected(false);
  }, [isBusinessAccountUser, user?.id]);

  const isLoading = isBusinessAccountUser ? isBusinessLoading : isPersonalLoading;

  // ─── Business portal view ────────────────────────────────────────────────────
  if (isBusinessAccountUser) {
    return (
      <PortalLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl font-urbanist">
          {/* Section header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-navbar-bg/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-navbar-bg" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-charcoal font-urbanist leading-tight">Business Notifications</h1>
              <p className="text-xs text-charcoal/50 font-urbanist">Activity from your business account</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <PageLoader size="md" variant="wavy" color="sage" />
            </div>
          ) : (
            <NotificationList
              notifications={businessNotifications}
              readNotifications={businessReadNotifications}
              filterType={businessFilter}
              setFilterType={setBusinessFilter}
              isPersonal={false}
              isRealtimeConnected={isRealtimeConnected}
            />
          )}
        </div>
      </PortalLayout>
    );
  }

  // ─── Personal account view ───────────────────────────────────────────────────
  return (
    <div className="bg-off-white font-urbanist" style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
      <div className="fixed inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />

      <div className="relative z-10 pb-12 sm:pb-16 md:pb-20">
        {/* Breadcrumb */}
        <div className="mx-auto w-full max-w-[2000px] px-2 mb-4">
          <nav className="pb-1" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium font-urbanist">
                  Home
                </Link>
              </li>
              <li className="flex items-center"><ChevronRight className="w-4 h-4 text-charcoal/60" /></li>
              <li><span className="text-charcoal font-semibold font-urbanist">Notifications</span></li>
            </ol>
          </nav>
        </div>

        <div className="mx-auto w-full max-w-[2000px] px-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <PageLoader size="md" variant="wavy" color="sage" />
            </div>
          ) : (
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Section header */}
              <div className="flex items-center gap-2.5 mb-6 px-2">
                <div className="w-8 h-8 rounded-lg bg-charcoal/8 flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-charcoal/60" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-h2 sm:text-h1 font-bold text-charcoal font-urbanist leading-tight">Personal Notifications</h1>
                  <p className="text-xs text-charcoal/50 font-urbanist">Activity from your personal account</p>
                </div>
              </div>

              <div className="px-2">
                <NotificationList
                  notifications={personalNotifications}
                  readNotifications={personalReadNotifications}
                  filterType={personalFilter}
                  setFilterType={setPersonalFilter}
                  isPersonal={true}
                  markAsRead={markAsRead}
                  markAllAsRead={markAllAsRead}
                  deleteNotification={deleteNotification}
                />
              </div>
            </m.div>
          )}
        </div>

        
      </div>
      <Footer />
    </div>
  );
}
