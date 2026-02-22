"use client";

import Link from 'next/link';
import { ChevronLeft, Trophy, Map, Star, Target, Users } from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from '../components/Loader';
import BadgeGrid from '../components/Badges/BadgeGrid';
import { Badge } from '../components/Badges/BadgeCard';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import { swrConfig } from '../lib/swrConfig';

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

async function fetchBadgeData(url: string) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch badges');
  return response.json();
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const swrKey = user ? `/api/badges/user?user_id=${user.id}` : null;
  const { data, isLoading, error } = useSWR(swrKey, fetchBadgeData, swrConfig);

  const grouped: GroupedBadges | null = data?.grouped ?? null;
  const stats: BadgeStats | null = data?.stats ?? null;

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
          <p className="text-red-500">Error loading badges: {(error as Error).message}</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiresAuth={true}>
      <div className="min-h-screen bg-page-bg pb-20 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
        
        {/* Breadcrumb Navigation */}
        <div className="mx-auto w-full max-w-6xl px-4 relative z-10">
          <nav className="pb-1" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link
                  href="/profile"
                  className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium flex items-center gap-1.5"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Profile
                </Link>
              </li>
            </ol>
          </nav>
        </div>

        {/* Header */}
        <div className="relative z-10 bg-navbar-bg px-4 py-8 mb-6">
          <div className="max-w-6xl mx-auto relative z-10">
            <h1 className="font-urbanist font-900 text-4xl text-white mb-2 flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/15" aria-hidden="true">
                <Trophy className="w-6 h-6 text-white" />
              </span>
              Your Achievements
            </h1>
            <p className="font-urbanist text-lg text-white/70 mb-6">
              Collect badges by exploring and reviewing businesses
            </p>

            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-6">
                <div className="bg-white/10 px-6 py-4 border border-white/20 rounded-xl">
                  <p className="text-sm text-white/60 mb-1">Badges Earned</p>
                  <p className="font-urbanist font-800 text-3xl text-white">
                    {stats.earned} <span className="text-xl text-white/60">/ {stats.total}</span>
                  </p>
                </div>

                <div className="bg-white/10 px-6 py-4 border border-white/20 rounded-xl">
                  <p className="text-sm text-white/60 mb-1">Completion</p>
                  <p className="font-urbanist font-800 text-3xl text-white">
                    {stats.percentage}%
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 bg-white/10 px-6 py-4 border border-white/20 rounded-xl">
                  <p className="text-sm text-white/60 mb-2">Progress</p>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Badge Grids */}
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          {grouped && (
            <>
              <BadgeGrid
                title={
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-off-white" aria-hidden="true">
                      <Map className="w-4 h-4 text-navbar-bg" />
                    </span>
                    Category Explorer
                  </span>
                }
                badges={grouped.explorer}
                emptyMessage="Explore different categories to unlock these badges"
              />

              <BadgeGrid
                title={
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-off-white" aria-hidden="true">
                      <Star className="w-4 h-4 text-navbar-bg" />
                    </span>
                    Category Specialist
                  </span>
                }
                badges={grouped.specialist}
                emptyMessage="Become an expert in specific categories to unlock these badges"
              />

              <BadgeGrid
                title={
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-off-white" aria-hidden="true">
                      <Target className="w-4 h-4 text-navbar-bg" />
                    </span>
                    Milestones
                  </span>
                }
                badges={grouped.milestone}
                emptyMessage="Hit review milestones to unlock these badges"
              />

              <BadgeGrid
                title={
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-off-white" aria-hidden="true">
                      <Users className="w-4 h-4 text-navbar-bg" />
                    </span>
                    Community
                  </span>
                }
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
