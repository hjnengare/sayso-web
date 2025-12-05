"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, MessageSquare, Star, Heart, TrendingUp, Clock, ChevronRight, ChevronUp } from "react-feather";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { PageLoader } from "../components/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { useNotifications } from "../contexts/NotificationsContext";

export default function NotificationsPage() {
  usePredefinedPageTitle('notifications');
  const { notifications, isLoading, readNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [showScrollTop, setShowScrollTop] = useState(false);

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
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    // All icons use charcoal color like the heart icon
    return 'bg-charcoal/10 text-charcoal border-charcoal/20';
  };

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  return (
    <div
      className="min-h-dvh bg-off-white relative font-urbanist"
      style={{
        fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <Header
        showSearch={true}
        variant="frosty"
        backgroundClassName="bg-navbar-bg"
        searchLayout="floating"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />

      <div className="relative">
        <div className="pt-20 sm:pt-24">
          <div className="mx-auto w-full max-w-[2000px] px-3 relative mb-4">
            {/* Breadcrumb Navigation */}
            <nav
              className="mb-4 sm:mb-6 px-2"
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
                  <ChevronRight className="w-4 h-4 text-charcoal/40" />
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
              <div className="p-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                  <Bell className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                </div>
                <h3 
                  className="text-h2 font-semibold text-charcoal mb-2"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  No notifications yet
                </h3>
                <p 
                  className="text-body-sm text-charcoal/60 max-w-md mx-auto"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}
                >
                  When you receive notifications, they'll appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <div className="mx-auto w-full max-w-[2000px] px-2">
                {/* Title */}
                <div className="mb-6 sm:mb-8 px-2">
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
                    {notifications.length} {notifications.length === 1 ? "notification" : "notifications"}
                  </p>
                </div>

                <div className="pb-12 sm:pb-16 md:pb-20">
                  <div className="space-y-3 sm:space-y-4">
                        {notifications.map((notification) => {
                          const isRead = readNotifications.has(notification.id);
                          const Icon = getNotificationIcon(notification.type);
                          const colorClass = getNotificationColor(notification.type);

                          return (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className={`
                                bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 sm:p-6
                                transition-all duration-300 hover:shadow-xl hover:border-white/80
                                ${isRead ? 'opacity-60' : ''}
                              `}
                            >
                              <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border ${colorClass}`}>
                                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <p 
                                        className={`text-body font-semibold text-charcoal mb-1 ${isRead ? 'line-through' : ''}`}
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

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {!isRead && (
                                        <button
                                          onClick={() => markAsRead(notification.id)}
                                          className="p-2 hover:bg-charcoal/10 rounded-full transition-colors"
                                          aria-label="Mark as read"
                                        >
                                          <Check className="w-4 h-4 text-charcoal" strokeWidth={2.5} />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => deleteNotification(notification.id)}
                                        className="p-2 hover:bg-charcoal/10 rounded-full transition-colors"
                                        aria-label="Delete notification"
                                      >
                                        <X className="w-4 h-4 text-charcoal/60" strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                  </div>
                </div>
              </div>
            </div>
          )}

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
    </div>
  );
}

