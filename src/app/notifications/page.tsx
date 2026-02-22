"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useBusinessNotificationsFeed } from "../hooks/useBusinessNotificationsFeed";
import { m, AnimatePresence } from "framer-motion";
import { Bell, Check, X, MessageSquare, MessageCircle, Star, Heart, TrendingUp, Clock, ChevronRight, ChevronLeft, ChevronUp, Award, ThumbsUp, CheckCircle, ImageIcon, Trophy } from "lucide-react";
import Footer from "../components/Footer/Footer";
import { PageLoader } from "../components/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useNotifications, type ToastNotificationData } from "../contexts/NotificationsContext";
import { useAuth } from "../contexts/AuthContext";
import { usePreviousPageBreadcrumb } from "../hooks/usePreviousPageBreadcrumb";
import { LiveIndicator } from "../components/Realtime/RealtimeIndicators";

export default function NotificationsPage() {
  usePredefinedPageTitle('notifications');
  const router = useRouter();
  const { user } = useAuth();
  const userCurrentRole = user?.profile?.account_role || user?.profile?.role || "user";
  const isBusinessAccountUser = userCurrentRole === "business_owner";
  
  // Breadcrumb logic - Personal accounts always show "Home", Business accounts use previous page
  const { previousHref: businessPreviousHref, previousLabel: businessPreviousLabel } = usePreviousPageBreadcrumb({
    fallbackHref: "/my-businesses",
    fallbackLabel: "My Businesses",
  });
  
  const breadcrumbHref = isBusinessAccountUser ? businessPreviousHref : "/home";
  const breadcrumbLabel = isBusinessAccountUser ? businessPreviousLabel : "Home";
  const {
    notifications: personalNotifications,
    isLoading: isPersonalLoading,
    readNotifications: personalReadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  // SWR-backed business notifications (caching, dedup, visibility refetch, realtime)
  const {
    notifications: businessNotifications,
    readIds: businessReadNotificationsSet,
    loading: isBusinessLoading,
  } = useBusinessNotificationsFeed();
  const businessReadNotifications = businessReadNotificationsSet;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Unread' | 'Read'>('All');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Track realtime state for LiveIndicator (hook handles the actual subscription)
  useEffect(() => {
    if (!isBusinessAccountUser || !user?.id) {
      setIsRealtimeConnected(false);
      return;
    }
    setIsRealtimeConnected(true);
    return () => {
      setIsRealtimeConnected(false);
    };
  }, [isBusinessAccountUser, user?.id]);

  const notifications = isBusinessAccountUser ? businessNotifications : personalNotifications;
  const isLoading = isBusinessAccountUser ? isBusinessLoading : isPersonalLoading;
  const readNotifications = isBusinessAccountUser ? businessReadNotifications : personalReadNotifications;

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };

    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener("scroll", handleScroll, options);
    return () => window.removeEventListener("scroll", handleScroll, options);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review':
        return MessageSquare;
      case 'business':
        return TrendingUp;
      case 'user':
        return Heart;
      case 'highlyRated':
        return Star;
      case 'message':
        return MessageCircle;
      case 'badge_earned':
      case 'gamification':
        return Award;
      case 'review_helpful':
        return ThumbsUp;
      case 'business_approved':
      case 'claim_approved':
        return CheckCircle;
      case 'comment_reply':
        return MessageCircle;
      case 'photo_approved':
        return ImageIcon;
      case 'milestone_achievement':
        return Trophy;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (isRead: boolean) => {
    // Minimal, premium styling - no loud colors, just subtle differences
    if (isRead) {
      return 'bg-charcoal/5 text-navbar-bg/60 border-transparent';
    }
    return 'bg-navbar-bg/10 text-navbar-bg border-transparent';
  };

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    if (filterType === 'All') return notifications;
    if (filterType === 'Unread') {
      return notifications.filter(n => !readNotifications.has(n.id));
    }
    return notifications.filter(n => readNotifications.has(n.id));
  }, [notifications, readNotifications, filterType]);

  return (
    <div
      className="min-h-dvh bg-off-white relative font-urbanist"
      style={{
        fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

      <div className="relative z-10">
        <div className=" pb-12 sm:pb-16 md:pb-20">
          <div className="mx-auto w-full max-w-[2000px] px-2 relative mb-4">
            {/* Breadcrumb Navigation */}
            <nav
              className="pb-1"
              aria-label="Breadcrumb"
            >
              <ol className="flex items-center gap-2 text-sm sm:text-base">
                <li>
                  <Link
                    href={breadcrumbHref}
                    className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    {breadcrumbLabel}
                  </Link>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-charcoal/60" />
                </li>
                <li>
                  <span className="text-charcoal font-semibold" style={{
                    fontFamily:
                      "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}>
                    Notifications
                  </span>
                </li>
              </ol>
            </nav>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <PageLoader size="md" variant="wavy" color="sage" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="relative z-10 min-h-[calc(100vh-200px)] flex items-center justify-center">
              <m.div
                className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full"
                style={{
                  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <m.div
                  className="text-center w-full"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.15,
                        delayChildren: 0.1,
                      },
                    },
                  }}
                >
                  <m.div
                    className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <Bell className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                  </m.div>

                  <m.h3
                    className="text-h2 font-semibold text-charcoal mb-2"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    No notifications yet
                  </m.h3>

                  <m.p
                    className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      fontWeight: 500,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
                  >
                    When you receive notifications, they'll appear here
                  </m.p>
                </m.div>
              </m.div>
            </div>
          ) : (
            <m.div
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mx-auto w-full max-w-[2000px] px-2">
                {/* Title */}
                <m.div
                  className="mb-6 sm:mb-8 px-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-3">
                        <h1
                          className="text-h2 sm:text-h1 font-bold text-charcoal"
                          style={{
                            fontFamily:
                              "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          }}
                        >
                          Notifications
                        </h1>
                        {isRealtimeConnected && <LiveIndicator isLive={isRealtimeConnected} />}
                      </div>
                      <p
                        className="text-body-sm text-charcoal/60 mt-2"
                        style={{
                          fontFamily:
                            "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        }}
                      >
                        {filteredNotifications.length} {filteredNotifications.length === 1 ? "notification" : "notifications"}
                        {filterType !== 'All' && ` (${filterType.toLowerCase()})`}
                      </p>
                    </div>
                    {!isBusinessAccountUser && unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-urbanist font-500 text-body-sm sm:text-body transition-all duration-200 hover:bg-charcoal/5 text-charcoal/70 hover:text-charcoal whitespace-nowrap"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </m.div>

                {/* Filter Pills */}
                <m.div
                  className="mb-6 px-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div 
                    className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2"
                    style={{ 
                      WebkitOverflowScrolling: 'touch',
                      scrollBehavior: 'smooth',
                    }}
                  >
                    {(['All', 'Unread', 'Read'] as const).map((filter) => {
                      const isSelected = filterType === filter;
                      const count = filter === 'All' 
                        ? notifications.length 
                        : filter === 'Unread'
                        ? unreadCount
                        : notifications.length - unreadCount;
                      
                      return (
                        <button
                          key={filter}
                          onClick={() => setFilterType(filter)}
                          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-urbanist font-500 text-body-sm sm:text-body transition-all duration-200 flex-shrink-0 whitespace-nowrap ${
                            isSelected
                              ? "bg-navbar-bg text-white"
                              : "bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal"
                          }`}
                          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                          {filter}
                          {count > 0 && (
                            <span className={`ml-2 text-xs sm:text-sm ${
                              isSelected ? 'opacity-80' : 'opacity-60'
                            }`}>
                              ({count})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </m.div>

                {filteredNotifications.length === 0 ? (
                  <div className="pb-12 sm:pb-16 md:pb-20 text-center py-12">
                    <p 
                      className="font-urbanist text-body-sm text-charcoal/60"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      No {filterType.toLowerCase()} notifications yet
                    </p>
                  </div>
                ) : (
                  <div className="pb-12 sm:pb-16 md:pb-20">
                    <AnimatePresence mode="wait" initial={false}>
                      <div className="space-y-0" key={filterType}>
                        {filteredNotifications.map((notification, index) => {
                          const isRead = readNotifications.has(notification.id);
                          const Icon = getNotificationIcon(notification.type);
                          const colorClass = getNotificationColor(isRead);
                          const hasLink = Boolean(notification.link?.trim());
                          const contentNode = (
                            <>
                              {/* Icon - Clean, minimal design */}
                              <div className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${colorClass} transition-all duration-200`}>
                                <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" strokeWidth={2} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p 
                                      className={`text-body mb-1 leading-snug ${
                                        isRead 
                                          ? 'text-charcoal/50 font-normal' 
                                          : 'text-charcoal font-medium'
                                      }`}
                                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                    >
                                      {notification.message} {notification.title}
                                    </p>
                                    <div className={`flex items-center gap-1.5 text-caption ${
                                      isRead ? 'text-charcoal/40' : 'text-charcoal/60'
                                    }`}>
                                      <Clock className="w-3 h-3" strokeWidth={2} />
                                      <span style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                        {notification.timeAgo} ago
                                      </span>
                                    </div>
                                  </div>

                                  {/* Actions - subtle and refined */}
                                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {!isBusinessAccountUser && !isRead && (
                                      <button
                                        type="button"
                                        onClick={() => markAsRead(notification.id)}
                                        className="p-1.5 hover:bg-charcoal/5 rounded-lg transition-all duration-200 group"
                                        aria-label="Mark as read"
                                      >
                                        <Check className="w-4 h-4 text-charcoal/40 group-hover:text-navbar-bg transition-colors" strokeWidth={2} />
                                      </button>
                                    )}
                                    {!isBusinessAccountUser && (
                                      <button
                                        type="button"
                                        onClick={() => deleteNotification(notification.id)}
                                        className="p-1.5 hover:bg-charcoal/5 rounded-lg transition-all duration-200 group"
                                        aria-label="Delete notification"
                                      >
                                        <X className="w-4 h-4 text-charcoal/30 group-hover:text-charcoal/60 transition-colors" strokeWidth={2} />
                                      </button>
                                    )}
                                  </div>
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
                              className={`
                                bg-white rounded-xl p-3.5 sm:p-4 mb-2.5 last:mb-0
                                transition-all duration-200
                                ${isRead ? 'opacity-60' : 'border border-charcoal/10'}
                                ${hasLink ? 'cursor-pointer hover:border-navbar-bg/30 hover:shadow-sm' : ''}
                              `}
                              {...(hasLink && {
                                onClick: () => router.push(notification.link!),
                                onKeyDown: (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    router.push(notification.link!);
                                  }
                                },
                                role: 'button' as const,
                                tabIndex: 0,
                              })}
                            >
                              <div className="flex items-start gap-3 sm:gap-3.5">
                                {contentNode}
                              </div>
                            </m.div>
                          );
                        })}
                      </div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </m.div>
          )}
        </div>

        <Footer />
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 sm:w-12 sm:h-12 bg-white hover:bg-charcoal/5 rounded-xl flex items-center justify-center shadow-lg border border-charcoal/10 hover:border-navbar-bg/30 transition-all duration-200"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 text-navbar-bg" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

