"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from '../components/Loader';
import BadgeGrid from '../components/Badges/BadgeGrid';
import { Badge } from '../components/Badges/BadgeCard';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';

interface BadgeStats {
  total: number;
  earned: number;
  percentage: number;
}

interface GroupedBadges {
  explorer: Badge[];
  specialist: Badge[];
  milestone: Badge[];
  community: Badge[];
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [grouped, setGrouped] = useState<GroupedBadges | null>(null);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/badges/user?user_id=${user.id}`, { cache: 'no-store', credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to fetch badges');
      }

      const data = await response.json();
      setBadges(data.badges || []);
      setGrouped(data.grouped || null);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error('[Achievements] Error fetching badges:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchBadges();
  }, [user, fetchBadges]);

  // Refetch when user returns to this tab so badges update after review/photo actions
  useEffect(() => {
    if (!user) return;
    const onFocus = () => fetchBadges();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, fetchBadges]);

  if (isLoading) {
    return (
      <ProtectedRoute requiresAuth={true}>
        <div className="min-h-screen bg-page-bg flex items-center justify-center">
          <Loader size="lg" variant="wavy" color="sage" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiresAuth={true}>
        <div className="min-h-screen bg-page-bg flex items-center justify-center">
          <p className="text-red-500">Error loading badges: {error}</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiresAuth={true}>
      <div className="min-h-screen bg-page-bg pb-20">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto w-full max-w-6xl px-4">
          <nav className="py-1" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link
                  href="/home"
                  className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
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
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  Achievements
                </span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-sage/10 via-coral/10 to-sage/10 px-4 py-8 mb-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="font-urbanist font-900 text-4xl text-charcoal mb-2">
              🏆 Your Achievements
            </h1>
            <p className="font-urbanist text-lg text-charcoal/70 mb-6">
              Collect badges by exploring and reviewing businesses
            </p>

            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 border border-sage/20">
                  <p className="text-sm text-charcoal/60 mb-1">Badges Earned</p>
                  <p className="font-urbanist font-800 text-3xl text-sage">
                    {stats.earned} <span className="text-xl text-charcoal/60">/ {stats.total}</span>
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 border border-sage/20">
                  <p className="text-sm text-charcoal/60 mb-1">Completion</p>
                  <p className="font-urbanist font-800 text-3xl text-coral">
                    {stats.percentage}%
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 border border-sage/20">
                  <p className="text-sm text-charcoal/60 mb-2">Progress</p>
                  <div className="w-full bg-charcoal/10 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sage to-coral transition-all duration-500"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Badge Grids */}
        <div className="max-w-6xl mx-auto px-4">
          {grouped && (
            <>
              <BadgeGrid
                title="🗺️ Category Explorer"
                badges={grouped.explorer}
                emptyMessage="Explore different categories to unlock these badges"
              />

              <BadgeGrid
                title="⭐ Category Specialist"
                badges={grouped.specialist}
                emptyMessage="Become an expert in specific categories to unlock these badges"
              />

              <BadgeGrid
                title="🎯 Milestones"
                badges={grouped.milestone}
                emptyMessage="Hit review milestones to unlock these badges"
              />

              <BadgeGrid
                title="🤝 Community"
                badges={grouped.community}
                emptyMessage="Engage with the community to unlock these badges"
              />
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
