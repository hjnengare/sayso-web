"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, MessageSquare, Star, Heart, TrendingUp, Clock } from "react-feather";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { PageLoader } from "../components/Loader";
import StaggeredContainer from "../components/Animations/StaggeredContainer";
import AnimatedElement from "../components/Animations/AnimatedElement";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import { generateNotificationBatch, type ToastNotificationData } from "../data/notificationData";

export default function NotificationsPage() {
  usePredefinedPageTitle('notifications');
  const [notifications, setNotifications] = useState<ToastNotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Simulate loading notifications
    setTimeout(() => {
      const mockNotifications = generateNotificationBatch(10);
      setNotifications(mockNotifications);
      setIsLoading(false);
    }, 500);
  }, []);

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set(prev).add(id));
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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
    switch (type) {
      case 'review':
        return 'bg-sage/10 text-sage border-sage/20';
      case 'business':
        return 'bg-coral/10 text-coral border-coral/20';
      case 'user':
        return 'bg-charcoal/10 text-charcoal border-charcoal/20';
      case 'highlyRated':
        return 'bg-sage/20 text-sage border-sage/30';
      default:
        return 'bg-charcoal/10 text-charcoal border-charcoal/20';
    }
  };

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="notifications"
        initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
        transition={{
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.5 },
          filter: { duration: 0.55 }
        }}
        className="min-h-dvh bg-off-white font-urbanist"
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        {/* Main Header */}
        <Header
          showSearch={false}
          variant="white"
          backgroundClassName="bg-navbar-bg"
          topPosition="top-0"
          reducedPadding={true}
          whiteText={true}
        />

        <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
          <div className="py-1 pt-20">
            {/* Main Content Section */}
            <section
              className="relative pt-4 sm:pt-6"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              }}
            >
              <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
                  <StaggeredContainer>
                    {/* Page Header */}
                    <AnimatedElement index={0} direction="bottom">
                      <div className="mb-6 sm:mb-8">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sage/20 to-sage/10 rounded-full flex items-center justify-center border border-sage/20">
                              <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-sage" strokeWidth={2.5} />
                            </div>
                            <div>
                              <h1 
                                className="text-h2 sm:text-h1 font-semibold text-charcoal"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                              >
                                Notifications
                              </h1>
                              {unreadCount > 0 && (
                                <p 
                                  className="text-body-sm text-charcoal/60 mt-1"
                                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                >
                                  {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                                </p>
                              )}
                            </div>
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="px-4 py-2 bg-sage/10 hover:bg-sage/20 text-sage rounded-full text-body-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>
                    </AnimatedElement>

                    {/* Notifications List */}
                    {isLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <PageLoader size="md" variant="wavy" color="sage" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <AnimatedElement index={1} direction="scale">
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-12 sm:p-16 text-center">
                          <div className="w-20 h-20 mx-auto mb-6 bg-sage/10 rounded-full flex items-center justify-center">
                            <Bell className="w-10 h-10 text-sage/60" strokeWidth={1.5} />
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
                      </AnimatedElement>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {notifications.map((notification, index) => {
                          const isRead = readNotifications.has(notification.id);
                          const Icon = getNotificationIcon(notification.type);
                          const colorClass = getNotificationColor(notification.type);

                          return (
                            <AnimatedElement key={notification.id} index={index + 1} direction="left">
                              <motion.div
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
                                          <Clock className="w-3.5 h-3.5" strokeWidth={2} />
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
                                            className="p-2 hover:bg-sage/10 rounded-full transition-colors"
                                            aria-label="Mark as read"
                                          >
                                            <Check className="w-4 h-4 text-sage" strokeWidth={2.5} />
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
                            </AnimatedElement>
                          );
                        })}
                      </div>
                    )}
                  </StaggeredContainer>
                </div>
              </div>
            </section>
          </div>
        </div>

        <Footer />
      </motion.div>
    </AnimatePresence>
  );
}

