"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

export function useBusinessNotifications() {
  const { showToast } = useToast();
  const businessChannelRef = useRef<any>(null);
  const statsChannelRef = useRef<any>(null);
  const reviewsChannelRef = useRef<any>(null);
  const lastNotificationTimeRef = useRef<number>(0);
  const notifiedHighRatedBusinesses = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Don't subscribe if not in browser
    if (typeof window === 'undefined') return;

    // Throttle notifications to prevent spam (min 5 seconds between notifications)
    const THROTTLE_MS = 5000;
    // Threshold for highly rated businesses (4.5+ rating)
    const HIGH_RATING_THRESHOLD = 4.5;

    const handleNewBusiness = (payload: any) => {
      const now = Date.now();

      // Throttle notifications
      if (now - lastNotificationTimeRef.current < THROTTLE_MS) {
        return;
      }

      lastNotificationTimeRef.current = now;

      // Show toast notification
      const businessName = payload.new?.name || 'A new business';
      showToast(
        `${businessName} just joined sayso! 🎉`,
        'sage',
        6000
      );
    };

    const handleBusinessStatsUpdate = async (payload: any) => {
      const now = Date.now();

      // Throttle notifications
      if (now - lastNotificationTimeRef.current < THROTTLE_MS) {
        return;
      }

      const stats = payload.new;
      const businessId = stats?.business_id;
      const averageRating = stats?.average_rating;

      // Check if this business qualifies as highly rated and hasn't been notified yet
      if (
        businessId &&
        averageRating >= HIGH_RATING_THRESHOLD &&
        !notifiedHighRatedBusinesses.current.has(businessId)
      ) {
        // Fetch the business details
        const { data: business, error } = await supabase
          .from('businesses')
          .select('name, category')
          .eq('id', businessId)
          .single();

        if (error || !business) {
          console.error('Error fetching business details:', error);
          return;
        }

        // Mark as notified
        notifiedHighRatedBusinesses.current.add(businessId);
        lastNotificationTimeRef.current = now;

        // Show toast notification for highly rated business
        showToast(
          `⭐ ${business.name} is highly rated (${averageRating.toFixed(1)} stars)!`,
          'success',
          7000
        );
      }
    };

    const handleNewReview = async (payload: any) => {
      const now = Date.now();

      // Throttle notifications
      if (now - lastNotificationTimeRef.current < THROTTLE_MS) {
        return;
      }

      const review = payload.new;
      const businessId = review?.business_id;
      const rating = review?.rating;

      if (!businessId) return;

      // Fetch the business details
      const { data: business, error } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .single();

      if (error || !business) {
        console.error('Error fetching business for review notification:', error);
        return;
      }

      lastNotificationTimeRef.current = now;

      // Show toast notification for new review
      const stars = '⭐'.repeat(rating);
      showToast(
        `New review for ${business.name}! ${stars}`,
        'info',
        5000
      );
    };

    // Subscribe to new inserts in the businesses table
    const businessChannel = supabase
      .channel('business-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'businesses'
        },
        handleNewBusiness
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to business notifications');
        }
      });

    // Subscribe to updates in the business_stats table for highly rated businesses
    const statsChannel = supabase
      .channel('business-stats-notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'business_stats'
        },
        handleBusinessStatsUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to business stats notifications');
        }
      });

    // Subscribe to new reviews
    const reviewsChannel = supabase
      .channel('reviews-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews'
        },
        handleNewReview
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to reviews notifications');
        }
      });

    businessChannelRef.current = businessChannel;
    statsChannelRef.current = statsChannel;
    reviewsChannelRef.current = reviewsChannel;

    // Cleanup subscriptions on unmount
    return () => {
      if (businessChannelRef.current) {
        supabase.removeChannel(businessChannelRef.current);
        console.log('🔌 Unsubscribed from business notifications');
      }
      if (statsChannelRef.current) {
        supabase.removeChannel(statsChannelRef.current);
        console.log('🔌 Unsubscribed from business stats notifications');
      }
      if (reviewsChannelRef.current) {
        supabase.removeChannel(reviewsChannelRef.current);
        console.log('🔌 Unsubscribed from reviews notifications');
      }
    };
  }, []); // ✅ Empty deps - subscribe once on mount, global subscriptions don't need user context
}
