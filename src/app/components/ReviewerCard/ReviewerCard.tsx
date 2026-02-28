"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useUserBadgesById } from "../../hooks/useUserBadges";
import { Review, Reviewer } from "../../types/community";
import { useAuth } from "../../contexts/AuthContext";
import ProfilePicture from "./ProfilePicture";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import BadgePill, { BadgePillData } from "../Badges/BadgePill";

import { m } from "framer-motion";
import {
  Star,
  User,
  Heart,
  ChevronRight,
  MapPin,
} from "lucide-react";


interface ReviewerCardProps {
  review?: Review;
  reviewer?: Reviewer;
  latestReview?: Review;
  variant?: "reviewer" | "review";
  index?: number;
}

export default function ReviewerCard({
  review,
  reviewer,
  latestReview,
  variant = "review",
}: ReviewerCardProps) {
  const { user: currentUser } = useAuth();
  const reviewerData = reviewer || review?.reviewer;
  const userIdForBadges = reviewerData?.id ?? (review as any)?.user?.id;

  const reviewerUserId = reviewerData?.id || (review as any)?.user?.id || '';
  const isOwnCard = currentUser?.id === reviewerUserId && !!currentUser?.id;
  const cardHref = isOwnCard ? '/profile' : `/reviewer/${reviewerUserId}`;
  const idForSnap = useMemo(
    () => `reviewer-${reviewerData?.id ?? userIdForBadges}`,
    [reviewerData?.id, userIdForBadges]
  );
  const [imgError, setImgError] = useState(false);

  const MAX_VISIBLE_BADGES = 2;
  const propBadges = reviewerData?.badges;

  const { badges: fetchedBadges } = useUserBadgesById(
    propBadges && propBadges.length > 0 ? null : (userIdForBadges ?? null)
  );

  const userBadges: BadgePillData[] = propBadges && propBadges.length > 0
    ? [...propBadges].filter(Boolean).sort((a, b) => {
        const order = ['milestone', 'specialist', 'explorer', 'community'];
        return order.indexOf(a.badge_group || '') - order.indexOf(b.badge_group || '');
      })
    : fetchedBadges.filter(Boolean);

  const visibleBadges = userBadges.slice(0, MAX_VISIBLE_BADGES);
  const overflowCount = Math.max(0, userBadges.length - MAX_VISIBLE_BADGES);
  const isTopReviewer = reviewerData?.badge === "top";
  const isVerified = reviewerData?.badge === "verified";

  /* Render filled/empty stars — the primary trust signal */
  const renderStars = (rating: number, iconSize = "w-3 h-3") => (
    <div className="flex gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i <= Math.round(rating)
              ? 'fill-coral text-coral'
              : 'fill-charcoal/10 text-charcoal/10'
          }`}
        />
      ))}
    </div>
  );

  // ─── REVIEWER VARIANT ──────────────────────────────────────────────────────
  if (variant === "reviewer" || reviewer) {
    return (
      <div
        id={idForSnap}
        className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0 h-full"
      >
        <Link href={cardHref} className="block group/card h-full">
          <div className={`relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group-hover/card:-translate-y-1 ${
            isTopReviewer
              ? 'bg-[#1c1712]'
              : 'bg-card-bg'
          }`}>

            {/* Top accent */}
            <div className={`h-[3px] w-full flex-shrink-0 ${
              isTopReviewer
                ? 'bg-gradient-to-r from-amber-500 via-yellow-300 to-orange-400'
                : 'bg-gradient-to-r from-coral/50 via-sage/60 to-coral/30'
            }`} />

            {/* Ambient glow layer */}
            {isTopReviewer && (
              <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-transparent to-transparent pointer-events-none" />
            )}

            {/* Hover tint */}
            <div className={`absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl ${
              isTopReviewer
                ? 'bg-gradient-to-br from-amber-400/[0.06] to-transparent'
                : 'bg-gradient-to-br from-transparent to-sage/[0.03]'
            }`} />

            <div className="relative p-4 flex flex-col gap-3.5 h-full">

              {/* ── IDENTITY ROW ── avatar + name + status */}
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {isTopReviewer && (
                    <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-coral opacity-80 blur-[4px]" />
                  )}
                  {!imgError && reviewerData?.profilePicture && reviewerData.profilePicture.trim() !== '' ? (
                    <Image
                      src={reviewerData.profilePicture}
                      alt={reviewerData?.name || "Reviewer"}
                      width={48}
                      height={48}
                      className={`relative w-12 h-12 object-cover rounded-full shadow-sm ${
                        isTopReviewer ? 'ring-2 ring-amber-400/50' : 'ring-2 ring-white'
                      }`}
                      priority={false}
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className={`relative w-12 h-12 flex items-center justify-center rounded-full shadow-sm ${
                      isTopReviewer
                        ? 'bg-gradient-to-br from-amber-900/60 to-orange-900/40 ring-2 ring-amber-400/30'
                        : 'bg-gradient-to-br from-sage/25 to-coral/15 ring-2 ring-white'
                    }`}>
                      <User className={isTopReviewer ? "text-amber-300/50" : "text-charcoal/40"} size={20} strokeWidth={1.8} />
                    </div>
                  )}

                  {/* Authority badge */}
                  {isVerified && (
                    <div className="absolute -right-0.5 -bottom-0.5 z-20">
                      <div className="bg-white rounded-full p-[2px] shadow-sm">
                        <VerifiedBadge size="sm" />
                      </div>
                    </div>
                  )}
                  {isTopReviewer && (
                    <div className="absolute -right-0.5 -bottom-0.5 z-20 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center ring-2 ring-[#1c1712] shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-white text-white" />
                    </div>
                  )}
                </div>

                {/* Name + status label */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-[15px] font-bold truncate leading-tight tracking-[-0.02em] ${
                      isTopReviewer ? 'text-amber-100' : 'text-charcoal'
                    }`}
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontWeight: 700 }}
                  >
                    {reviewerData?.name}
                  </h3>

                  {isTopReviewer ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-400/80 mt-0.5"
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                    >
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      Top Reviewer
                    </span>
                  ) : reviewerData?.location ? (
                    <p
                      className="flex items-center gap-0.5 text-[12px] text-charcoal/45 font-medium mt-0.5 truncate"
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                    >
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      {reviewerData.location}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* ── SOCIAL PROOF STATS ── 3 achievement pills */}
              <style>{`
                @keyframes stat-tick {
                  0%   { transform: translateY(14px); opacity: 0; }
                  100% { transform: translateY(0);    opacity: 1; }
                }
                .stat-tick {
                  display: inline-block;
                  animation: stat-tick 0.45s cubic-bezier(0.22,1,0.36,1) both;
                }
              `}</style>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: reviewerData?.reviewCount ?? 0, label: 'Reviews', delay: '0ms' },
                  {
                    value: reviewerData?.avgRatingGiven != null
                      ? reviewerData.avgRatingGiven.toFixed(1)
                      : '—',
                    label: 'Avg ★',
                    delay: '120ms',
                  },
                  { value: reviewerData?.helpfulVotes ?? 0, label: 'Helpful', delay: '240ms' },
                ].map(({ value, label, delay }) => (
                  <div
                    key={label}
                    className={`flex flex-col items-center px-2 py-2 rounded-xl transition-colors overflow-hidden border ${
                      isTopReviewer
                        ? 'bg-amber-950/40 border-amber-400/[0.12] hover:bg-amber-950/60'
                        : 'bg-off-white/70 border-charcoal/[0.06] hover:bg-off-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    <span
                      className={`stat-tick text-[22px] font-black leading-none tracking-tight ${
                        isTopReviewer ? 'text-amber-300' : 'text-charcoal'
                      }`}
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontWeight: 900, animationDelay: delay }}
                    >
                      {value}
                    </span>
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-[0.08em] mt-0.5 ${
                        isTopReviewer ? 'text-amber-400/45' : 'text-charcoal/40'
                      }`}
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── EARNED STATUS ── badges */}
              {visibleBadges.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {visibleBadges.map((badge) => (
                    <BadgePill key={badge.id} badge={badge} size="sm" />
                  ))}
                  {overflowCount > 0 && (
                    <m.div
                      className={`inline-flex items-center px-1.5 py-[3px] rounded-full text-[10px] font-semibold cursor-default select-none flex-shrink-0 border shadow-sm backdrop-blur-sm ${
                        isTopReviewer
                          ? 'text-amber-400/60 bg-amber-950/40 border-amber-400/[0.12]'
                          : 'text-charcoal/60 bg-off-white/80 border-charcoal/[0.13]'
                      }`}
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                      whileHover={{ scale: 1.03, y: -1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      +{overflowCount}
                    </m.div>
                  )}
                </div>
              )}

              {/* ── CURIOSITY GAP ── latest review snippet */}
              {latestReview && (
                <div className={`rounded-xl px-3 py-2.5 relative overflow-hidden border ${
                  isTopReviewer
                    ? 'bg-amber-950/25 border-amber-400/[0.08]'
                    : 'bg-off-white/50 border-charcoal/[0.06]'
                }`}>
                  <span className={`absolute -top-1 -right-1 text-[48px] leading-none font-serif select-none pointer-events-none ${
                    isTopReviewer ? 'text-amber-400/[0.08]' : 'text-charcoal/[0.05]'
                  }`}>&rdquo;</span>

                  <div className="flex items-center gap-1.5 mb-1.5">
                    {renderStars((latestReview as any)?.rating ?? 5, "w-[10px] h-[10px]")}
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${
                        isTopReviewer ? 'text-amber-400/35' : 'text-charcoal/35'
                      }`}
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                    >
                      Latest
                    </span>
                  </div>
                  <p
                    className={`text-[12px] leading-snug line-clamp-2 font-medium ${
                      isTopReviewer ? 'text-amber-100/45' : 'text-charcoal/60'
                    }`}
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontStyle: 'italic', letterSpacing: '-0.005em' }}
                  >
                    {latestReview.reviewText}
                  </p>
                </div>
              )}

              {/* ── HOVER CTA ── reveals on card hover */}
              <div className="flex items-center justify-end -mt-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                <span
                  className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                    isTopReviewer ? 'text-amber-400/55' : 'text-sage/65'
                  }`}
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                >
                  View profile
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>

            </div>
          </div>
        </Link>
      </div>
    );
  }

  // ─── REVIEW CARD VARIANT ──────────────────────────────────────────────────
  // Psychology: stars → face → name → earned status → what they said → social proof
  const reviewRating = (review as any)?.rating ?? null;

  return (
    <li className="w-[calc(50vw-12px)] sm:w-auto sm:min-w-[213px] flex-shrink-0">
      <Link href={cardHref} className="block group/card">
        <div className="bg-card-bg rounded-2xl cursor-pointer h-[187px] flex flex-col relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-out group-hover/card:-translate-y-1">

          {/* Top accent */}
          <div className="h-[3px] w-full bg-gradient-to-r from-coral/50 via-sage/50 to-coral/30 flex-shrink-0" />

          {/* Hover tint */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage/[0.03] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

          {/* Bottom fade — elegant overflow handling */}
          <div className="absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-card-bg to-transparent pointer-events-none z-10 rounded-b-2xl" />

          <div className="flex-1 flex flex-col px-2.5 pt-2 pb-2.5 gap-1.5">

            {/* ── STARS — #1 dopamine signal, shown before face ── */}
            {reviewRating != null && (
              <div className="flex items-center gap-1.5">
                {renderStars(reviewRating)}
                <span
                  className="text-[10px] text-charcoal/35 font-bold tabular-nums"
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                >
                  {Number(reviewRating).toFixed(1)}
                </span>
              </div>
            )}

            {/* ── REVIEWER: face + name + count ── */}
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <ProfilePicture
                  src={review?.reviewer.profilePicture || ""}
                  alt={review?.reviewer.name || ""}
                  size="sm"
                  badge={review?.reviewer.badge}
                />
                {review?.reviewer.badge === "verified" && (
                  <div className="absolute -right-0.5 -top-0.5 z-20">
                    <VerifiedBadge size="sm" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  className="text-[13px] font-bold text-charcoal truncate leading-tight tracking-[-0.01em]"
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontWeight: 700 }}
                >
                  {review?.reviewer.name}
                </h3>
                <span
                  className="text-[10px] text-charcoal/38 font-medium"
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                >
                  {review?.reviewer.reviewCount || 0} reviews
                </span>
              </div>
            </div>

            {/* ── BADGES — earned credibility ── */}
            {visibleBadges.length > 0 && (
              <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
                {visibleBadges.map((badge) => (
                  <BadgePill key={badge.id} badge={badge} size="sm" />
                ))}
                {overflowCount > 0 && (
                  <span
                    className="inline-flex items-center px-1.5 py-[3px] rounded-full text-[10px] font-semibold text-charcoal/55 bg-off-white/80 border border-charcoal/[0.12] flex-shrink-0"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                  >
                    +{overflowCount}
                  </span>
                )}
              </div>
            )}

            {/* ── REVIEW CONTENT — the hook ── */}
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div>
                {review?.businessName && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <MapPin className="w-2.5 h-2.5 text-charcoal/28 flex-shrink-0" />
                    <p
                      className="text-[10px] font-semibold text-charcoal/42 truncate"
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                    >
                      {review.businessName}
                    </p>
                  </div>
                )}
                <p
                  className="text-[11px] text-charcoal/68 leading-snug line-clamp-2 font-medium"
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontStyle: 'italic' }}
                >
                  {review?.reviewText ? `"${review.reviewText}"` : ""}
                </p>
              </div>

              {/* ── SOCIAL PROOF + CTA ── */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] text-charcoal/28 font-medium"
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                >
                  {review?.date || ""}
                </span>
                <div className="flex items-center gap-2">
                  {(review?.likes ?? 0) > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Heart className="w-3 h-3 fill-coral/65 text-coral/65" />
                      <span
                        className="text-[10px] font-semibold text-charcoal/38"
                        style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                      >
                        {review?.likes}
                      </span>
                    </div>
                  )}
                  {/* Hover CTA arrow */}
                  <ChevronRight className="w-3.5 h-3.5 text-charcoal/20 -translate-x-1 opacity-0 group-hover/card:translate-x-0 group-hover/card:opacity-100 transition-all duration-200" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </Link>
    </li>
  );
}
