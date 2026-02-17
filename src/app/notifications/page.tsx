"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, MessageSquare, MessageCircle, Star, Heart, TrendingUp, Clock, ChevronRight, ChevronUp, Award, ThumbsUp, CheckCircle, ImageIcon, Trophy } from "lucide-react";
import Footer from "../components/Footer/Footer";
import { PageLoader } from "../components/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useNotifications } from "../contexts/NotificationsContext";

export default function NotificationsPage() {
  usePredefinedPageTitle('notifications');
  const router = useRouter();
  const { notifications, isLoading, readNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Unread' | 'Read'>('All');

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

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) {
      return 'bg-charcoal/5 text-charcoal/70 border-charcoal/10';
    }
    switch (type) {
      case 'review':
        return 'bg-card-bg/10 text-sage border-sage/30';
      case 'business':
        return 'bg-coral/10 text-coral border-coral/30';
      case 'user':
        return 'bg-purple-400/10 text-purple-400 border-purple-400/30';
      case 'highlyRated':
        return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30';
      case 'message':
        return 'bg-coral/10 text-coral border-coral/30';
      case 'badge_earned':
      case 'gamification':
        return 'bg-amber-400/10 text-amber-400 border-amber-400/30';
      case 'review_helpful':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/30';
      case 'business_approved':
      case 'claim_approved':
        return 'bg-emerald-400/10 text-emerald-500 border-emerald-400/30';
      case 'comment_reply':
        return 'bg-coral/10 text-coral border-coral/30';
      case 'photo_approved':
        return 'bg-sky-400/10 text-sky-500 border-sky-400/30';
      case 'milestone_achievement':
        return 'bg-amber-400/10 text-amber-500 border-amber-400/30';
      default:
        return 'bg-card-bg/10 text-sage border-sage/30';
    }
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

      <div className="relative">
        <div className=" pb-12 sm:pb-16 md:pb-20">
          <div className="mx-auto w-full max-w-[2000px] px-3 relative mb-4">
            {/* Breadcrumb Navigation */}
            <nav
              className="pt-2 px-2"
              aria-label="Breadcrumb"
            >
              <ol className="flex items-center gap-2 text-sm sm:text-base">
                <li>
                  <Link
                    href="/home"
                    className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    Home
                  </Link>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-charcoal/60" />
                </li>
                <li>
                  <span
                    className="text-charcoal font-semibold"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
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
              <motion.div
                className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full"
                style={{
                  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
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
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <Bell className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                  </motion.div>

                  <motion.h3
                    className="text-h2 font-semibold text-charcoal mb-2"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    No notifications yet
                  </motion.h3>

                  <motion.p
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
                  </motion.p>
                </motion.div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mx-auto w-full max-w-[2000px] px-2">
                {/* Title */}
                <motion.div
                  className="mb-6 sm:mb-8 px-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h1
                        className="text-h2 sm:text-h1 font-bold text-charcoal"
                        style={{
                          fontFamily:
                            "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        }}
                      >
                        Notifications
                      </h1>
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
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-urbanist font-600 text-body-sm sm:text-body transition-all duration-200 active:scale-95 bg-card-bg/10 text-sage hover:bg-card-bg/20 hover:text-sage border border-sage/30 whitespace-nowrap"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </motion.div>

                {/* Filter Pills */}
                <motion.div
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
                          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-urbanist font-600 text-body-sm sm:text-body transition-all duration-200 active:scale-95 flex-shrink-0 whitespace-nowrap ${
                            isSelected
                              ? "bg-coral text-white shadow-lg"
                              : "bg-card-bg/10 text-charcoal/70 hover:bg-card-bg/20 hover:text-sage border border-sage/30"
                          }`}
                          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                          {filter}
                          {count > 0 && (
                            <span className="ml-2 text-xs sm:text-sm opacity-80">
                              ({count})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

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
                      <div className="space-y-3 sm:space-y-4" key={filterType}>
                        {filteredNotifications.map((notification, index) => {
                          const isRead = readNotifications.has(notification.id);
                          const Icon = getNotificationIcon(notification.type);
                          const colorClass = getNotificationColor(notification.type, isRead);
                          const hasLink = Boolean(notification.link?.trim());
                          const contentNode = (
                            <>
                              {/* Icon */}
                              <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 ${colorClass} transition-all duration-300`}>
                                <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p 
                                      className={`text-body font-semibold text-charcoal mb-1.5 ${isRead ? '' : 'font-bold'}`}
                                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                    >
                                      {notification.message} {notification.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-body-sm text-charcoal/60">
                                      <Clock className="w-3.5 h-3.5 text-charcoal/60" strokeWidth={2} />
                                      <span style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                        {notification.timeAgo} ago
                                      </span>
                                    </div>
                                  </div>

                                  {/* Actions - stopPropagation so card link doesn't fire when clicking buttons */}
                                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {!isRead && (
                                      <button
                                        type="button"
                                        onClick={() => markAsRead(notification.id)}
                                        className="p-2 hover:bg-card-bg/10 rounded-full transition-all duration-200 hover:scale-110 group"
                                        aria-label="Mark as read"
                                      >
                                        <Check className="w-4 h-4 text-sage group-hover:text-sage transition-colors" strokeWidth={2.5} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => deleteNotification(notification.id)}
                                      className="p-2 hover:bg-coral/10 rounded-full transition-all duration-200 hover:scale-110 group"
                                      aria-label="Delete notification"
                                    >
                                      <X className="w-4 h-4 text-charcoal/60 group-hover:text-coral transition-colors" strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </>
                          );

                          return (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05 }}
                              className={`
                                bg-white rounded-2xl border border-charcoal/10 shadow-sm p-4 sm:p-6
                                transition-all duration-300 hover:shadow-lg hover:border-sage/30 hover:-translate-y-1
                                ${isRead ? 'opacity-70' : 'ring-1 ring-sage/20'}
                                ${hasLink ? 'cursor-pointer' : ''}
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
                              <div className="flex items-start gap-4">
                                {contentNode}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <Footer />
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg hover:bg-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:scale-110 transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

