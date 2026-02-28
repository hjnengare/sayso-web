"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useEffect, useState } from 'react';
import { m, useInView, useMotionValue, useSpring } from 'framer-motion';
import { Trophy, Map, Star, Target, Users, Lock, ArrowRight, Zap, ChevronLeft } from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from '../components/Loader';
import BadgeModal from '../components/Badges/BadgeModal';
import { Badge } from '../components/Badges/BadgeCard';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import { swrConfig } from '../lib/swrConfig';
import { BADGE_MAPPINGS } from '../lib/badgeMappings';

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

// Animated circular progress ring
function ProgressRing({ percentage, size = 180 }: { percentage: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const motionPct = useMotionValue(0);
  const springPct = useSpring(motionPct, { stiffness: 50, damping: 20 });
  const [displayPct, setDisplayPct] = useState(0);
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    motionPct.set(percentage);
    const unsub = springPct.on('change', (v) => {
      setDisplayPct(Math.round(v));
      setDashOffset(circumference - (v / 100) * circumference);
    });
    return unsub;
  }, [percentage, motionPct, springPct, circumference]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={10}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGrad)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-urbanist font-800 text-4xl text-white leading-none">{displayPct}%</span>
        <span className="font-urbanist text-xs text-white/60 mt-1">complete</span>
      </div>
    </div>
  );
}

// Floating particle background
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 4 + Math.random() * 8,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 4,
    opacity: 0.08 + Math.random() * 0.12,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <m.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, -10, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Scrolling badge showcase (marquee)
function BadgeMarquee({ badges }: { badges: { pngPath: string; name: string }[] }) {
  const doubled = [...badges, ...badges];
  return (
    <div className="relative overflow-hidden w-full">
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-navbar-bg to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-navbar-bg to-transparent" />
      <m.div
        className="flex gap-4 w-max"
        animate={{ x: [0, -badges.length * 76] }}
        transition={{ duration: badges.length * 3, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((b, i) => (
          <div
            key={i}
            className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm"
          >
            <Image src={b.pngPath} alt={b.name} width={40} height={40} className="object-contain" unoptimized />
          </div>
        ))}
      </m.div>
    </div>
  );
}

const GROUP_META = {
  explorer: {
    label: 'Category Explorer',
    Icon: Map,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-400/30',
    accent: '#60A5FA',
    glow: 'rgba(96,165,250,0.3)',
    tagBg: 'bg-blue-500/15',
    tagText: 'text-blue-300',
  },
  specialist: {
    label: 'Category Specialist',
    Icon: Star,
    gradient: 'from-purple-500/20 to-fuchsia-500/20',
    border: 'border-purple-400/30',
    accent: '#C084FC',
    glow: 'rgba(192,132,252,0.3)',
    tagBg: 'bg-purple-500/15',
    tagText: 'text-purple-300',
  },
  milestone: {
    label: 'Milestones',
    Icon: Target,
    gradient: 'from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-400/30',
    accent: '#FBBF24',
    glow: 'rgba(251,191,36,0.3)',
    tagBg: 'bg-amber-500/15',
    tagText: 'text-amber-300',
  },
  community: {
    label: 'Community',
    Icon: Users,
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-400/30',
    accent: '#34D399',
    glow: 'rgba(52,211,153,0.3)',
    tagBg: 'bg-emerald-500/15',
    tagText: 'text-emerald-300',
  },
} as const;

function BadgeTile({ badge, onClick }: { badge: Badge; onClick: () => void }) {
  const isLocked = !badge.earned;
  const mapping = BADGE_MAPPINGS[badge.id];
  const pngPath = mapping?.pngPath || badge.icon_path || '/badges/012-expertise.png';

  return (
    <m.button
      onClick={onClick}
      className={`relative flex flex-col items-center p-4 rounded-2xl border text-left w-full
        ${isLocked
          ? 'border-white/10 bg-white/5'
          : 'border-white/20 bg-white/10 shadow-lg'
        }
        hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
      whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Shine sweep on earned */}
      {!isLocked && (
        <m.div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-2xl pointer-events-none"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
        />
      )}

      <div className="relative w-14 h-14 mb-3 flex-shrink-0">
        <Image
          src={pngPath}
          alt={badge.name}
          fill
          className={`object-contain ${isLocked ? 'grayscale opacity-35' : ''}`}
          unoptimized
        />
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
              <Lock className="w-3 h-3 text-white/70" />
            </div>
          </div>
        )}
        {!isLocked && (
          <m.div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
          >
            <Star className="w-2.5 h-2.5 text-amber-900 fill-amber-900" />
          </m.div>
        )}
      </div>

      <p className={`font-urbanist font-700 text-xs text-center leading-tight
        ${isLocked ? 'text-white/40' : 'text-white'}`}>
        {badge.name}
      </p>
    </m.button>
  );
}

function BadgeSection({
  group,
  badges,
  onSelectBadge,
}: {
  group: keyof typeof GROUP_META;
  badges: Badge[];
  onSelectBadge: (b: Badge) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const meta = GROUP_META[group];
  const { Icon } = meta;

  const earned = badges.filter((b) => b.earned).length;
  const total = badges.length;
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

  if (!badges || badges.length === 0) return null;

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`rounded-3xl border bg-gradient-to-br ${meta.gradient} ${meta.border} backdrop-blur-sm p-6 mb-6`}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${meta.glow}`, border: `1px solid ${meta.accent}40` }}
          >
            <Icon className="w-5 h-5" style={{ color: meta.accent }} />
          </div>
          <div>
            <h2 className="font-urbanist font-800 text-lg text-white leading-none">{meta.label}</h2>
            <p className="font-urbanist text-xs text-white/50 mt-0.5">
              {earned} of {total} unlocked
            </p>
          </div>
        </div>

        {/* Mini progress pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${meta.tagBg} ${meta.tagText}`}>
          <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <m.div
              className="h-full rounded-full"
              style={{ background: meta.accent }}
              initial={{ width: 0 }}
              animate={inView ? { width: `${pct}%` } : {}}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="font-urbanist font-700 text-xs">{pct}%</span>
        </div>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {badges.map((badge, i) => (
          <m.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.3, delay: i * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <BadgeTile badge={badge} onClick={() => onSelectBadge(badge)} />
          </m.div>
        ))}
      </div>
    </m.div>
  );
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const swrKey = user ? `/api/badges/user?user_id=${user.id}` : null;
  const { data, isLoading, error } = useSWR(swrKey, fetchBadgeData, swrConfig);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const grouped: GroupedBadges | null = data?.grouped ?? null;
  const stats: BadgeStats | null = data?.stats ?? null;

  // All badge mappings for the marquee (shown before data loads or as decoration)
  const allMappings = Object.values(BADGE_MAPPINGS);

  if (isLoading) {
    return (
      <ProtectedRoute requiresAuth={true}>
        <div className="min-h-[100dvh] bg-navbar-bg flex items-center justify-center">
          <Loader size="lg" variant="wavy" color="sage" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiresAuth={true}>
        <div className="min-h-[100dvh] bg-navbar-bg flex items-center justify-center">
          <p className="text-red-400 font-urbanist">Error loading badges: {(error as Error).message}</p>
        </div>
      </ProtectedRoute>
    );
  }

  const nextToUnlock = grouped
    ? (Object.values(grouped) as Badge[][])
        .flat()
        .filter((b) => !b.earned)
        .slice(0, 3)
    : [];

  return (
    <ProtectedRoute requiresAuth={true}>
      <div className="min-h-[100dvh] bg-navbar-bg pb-24 relative overflow-hidden">
        <FloatingParticles />

        {/* Ambient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-amber-400/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-purple-500/6 rounded-full blur-3xl pointer-events-none" />

        {/* Back nav */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 font-urbanist text-sm text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Profile
          </Link>
        </div>

        {/* ── HERO ── */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-12">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col lg:flex-row items-center lg:items-start gap-10"
          >
            {/* Text side */}
            <div className="flex-1 text-center lg:text-left">
              <m.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/15 border border-amber-400/30 mb-6"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-urbanist font-600 text-sm text-amber-400">Hall of Achievements</span>
              </m.div>

              <h1 className="font-urbanist font-800 text-5xl sm:text-6xl text-white leading-tight mb-4">
                Collect.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  Conquer.
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Dominate.
                </span>
              </h1>

              <p className="font-urbanist text-lg text-white/60 max-w-md mb-8">
                Every review you write, every business you discover — earns you a badge.
                Build your legacy on Sayso.
              </p>

              {stats && (
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-4 backdrop-blur-sm">
                    <p className="font-urbanist text-xs text-white/50 mb-1">Badges Earned</p>
                    <p className="font-urbanist font-800 text-3xl text-white">
                      {stats.earned}
                      <span className="text-lg text-white/40 ml-1">/ {stats.total}</span>
                    </p>
                  </div>
                  <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-4 backdrop-blur-sm">
                    <p className="font-urbanist text-xs text-white/50 mb-1">Still to Unlock</p>
                    <p className="font-urbanist font-800 text-3xl text-amber-400">
                      {stats.total - stats.earned}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ring side */}
            {stats && (
              <m.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="relative">
                  {/* Glow halo */}
                  <div
                    className="absolute inset-0 rounded-full blur-2xl"
                    style={{ background: 'rgba(251,191,36,0.2)', transform: 'scale(1.3)' }}
                  />
                  <div className="relative p-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                    <ProgressRing percentage={stats.percentage} size={200} />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="font-urbanist font-700 text-sm text-amber-300">
                    {stats.percentage < 25
                      ? 'Just getting started!'
                      : stats.percentage < 50
                      ? 'Making moves!'
                      : stats.percentage < 75
                      ? 'On a roll!'
                      : stats.percentage < 100
                      ? 'Almost there!'
                      : 'Badge Legend!'}
                  </span>
                </div>
              </m.div>
            )}
          </m.div>
        </div>

        {/* ── MARQUEE ── */}
        <div className="relative z-10 mb-10 py-4">
          <BadgeMarquee badges={allMappings.map((m) => ({ pngPath: m.pngPath, name: m.name }))} />
        </div>

        {/* ── NEXT TO UNLOCK ── */}
        {nextToUnlock.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative z-10 max-w-6xl mx-auto px-4 mb-8"
          >
            <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-urbanist font-800 text-base text-white">Up Next</h2>
                  <p className="font-urbanist text-xs text-white/50">Your next badges to chase</p>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                {nextToUnlock.map((badge) => {
                  const mapping = BADGE_MAPPINGS[badge.id];
                  const pngPath = mapping?.pngPath || badge.icon_path || '/badges/012-expertise.png';
                  return (
                    <m.button
                      key={badge.id}
                      onClick={() => setSelectedBadge(badge)}
                      className="flex items-center gap-3 bg-white/8 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-3 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="w-10 h-10 relative flex-shrink-0">
                        <Image src={pngPath} alt={badge.name} fill className="object-contain grayscale opacity-50" unoptimized />
                      </div>
                      <div className="text-left">
                        <p className="font-urbanist font-700 text-sm text-white/80">{badge.name}</p>
                        <p className="font-urbanist text-xs text-white/40 line-clamp-1">{badge.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30 ml-2 flex-shrink-0" />
                    </m.button>
                  );
                })}
              </div>
            </div>
          </m.div>
        )}

        {/* ── BADGE SECTIONS ── */}
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          {grouped && (
            <>
              {(['explorer', 'specialist', 'milestone', 'community'] as const).map((group) => (
                <BadgeSection
                  key={group}
                  group={group}
                  badges={grouped[group]}
                  onSelectBadge={setSelectedBadge}
                />
              ))}
            </>
          )}
        </div>

        {/* ── BOTTOM CTA ── */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 max-w-6xl mx-auto px-4 mt-6"
        >
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/4 backdrop-blur-sm p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="font-urbanist font-800 text-2xl text-white mb-2">
              Ready to level up?
            </h3>
            <p className="font-urbanist text-white/50 text-sm mb-6 max-w-sm mx-auto">
              Write reviews, explore new categories and watch your badge collection grow.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 bg-white text-navbar-bg font-urbanist font-700 text-sm px-6 py-3 rounded-xl hover:bg-off-white transition-colors"
              >
                Explore Businesses
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/badges"
                className="inline-flex items-center gap-2 border border-white/20 text-white font-urbanist font-600 text-sm px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Badge Library
              </Link>
            </div>
          </div>
        </m.div>

        {/* Badge modal */}
        <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      </div>
    </ProtectedRoute>
  );
}
