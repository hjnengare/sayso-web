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

import {
  Star,
  User,
  MessageSquare,
  Heart,
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

  // Route to /profile if the logged-in user is viewing their own card
  const reviewerUserId = reviewerData?.id || (review as any)?.user?.id || '';
  const isOwnCard = currentUser?.id === reviewerUserId && !!currentUser?.id;
  const cardHref = isOwnCard ? '/profile' : `/reviewer/${reviewerUserId}`;
  const idForSnap = useMemo(
    () => `reviewer-${reviewerData?.id ?? userIdForBadges}`,
    [reviewerData?.id, userIdForBadges]
  );
  const [imgError, setImgError] = useState(false);

  const MAX_VISIBLE_BADGES = 3;
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

  // ─── REVIEWER VARIANT ──────────────────────────────────────────────────────
  if (variant === "reviewer" || reviewer) {
    return (
      <div
        id={idForSnap}
        className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0"
      >
        <Link href={cardHref} className="block group/card h-full">
          <div className="relative bg-card-bg rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group-hover/card:-translate-y-0.5">

            {/* Top accent — coral for top reviewers, sage for everyone else */}
            <div className={`h-[3px] w-full flex-shrink-0 ${
              isTopReviewer
                ? 'bg-gradient-to-r from-amber-400 via-coral to-orange-400'
                : 'bg-gradient-to-r from-coral/50 via-sage/60 to-coral/30'
            }`} />

            {/* Warm ambient glow for top reviewers only */}
            {isTopReviewer && (
              <div className="absolute inset-0 bg-gradient-to-b from-amber-50/30 via-transparent to-transparent pointer-events-none" />
            )}

            {/* Hover tint — very subtle, doesn't fight bg-card-bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage/[0.03] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

            <div className="relative p-4 flex flex-col gap-3.5">

              {/* ── IDENTITY ROW ── avatar + name + status */}
              <div className="flex items-center gap-3">
                {/* Avatar — the human face is the highest-trust signal */}
                <div className="relative flex-shrink-0">
                  {isTopReviewer && (
                    <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-amber-400 via-coral/80 to-orange-300 opacity-70 blur-[3px]" />
                  )}
                  {!imgError && reviewerData?.profilePicture && reviewerData.profilePicture.trim() !== '' ? (
                    <Image
                      src={reviewerData.profilePicture}
                      alt={reviewerData?.name || "Reviewer"}
                      width={48}
                      height={48}
                      className="relative w-12 h-12 object-cover rounded-full ring-2 ring-white shadow-sm"
                      priority={false}
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-sage/25 to-coral/15 ring-2 ring-white shadow-sm">
                      <User className="text-charcoal/40" size={20} strokeWidth={1.8} />
                    </div>
                  )}

                  {/* Authority badge — bottom-right, small but legible */}
                  {isVerified && (
                    <div className="absolute -right-0.5 -bottom-0.5 z-20">
                      <div className="bg-white rounded-full p-[2px] shadow-sm">
                        <VerifiedBadge size="sm" />
                      </div>
                    </div>
                  )}
                  {isTopReviewer && (
                    <div className="absolute -right-0.5 -bottom-0.5 z-20 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center ring-2 ring-white shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-white text-white" />
                    </div>
                  )}
                </div>

                {/* Name + location — keep it scannable */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-[15px] font-bold text-charcoal truncate leading-tight tracking-[-0.02em]"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontWeight: 700 }}
                  >
                    {reviewerData?.name}
                  </h3>
                  {reviewerData?.location && (
                    <p
                      className="text-[12px] text-charcoal/45 font-medium mt-0.5 truncate"
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                    >
                      {reviewerData.location}
                    </p>
                  )}
                </div>
              </div>

              {/* ── SOCIAL PROOF ── 3-stat row */}
              {/* Keyframe: slide up from below → hold → slide out upward */}
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
                {/* Reviews */}
                <div className="flex flex-col items-center px-2 py-2 rounded-xl bg-off-white/60 border border-charcoal/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                  <span
                    className={`stat-tick text-[22px] font-black leading-none tracking-tight ${
                      isTopReviewer
                        ? 'text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-coral'
                        : 'text-charcoal'
                    }`}
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontWeight: 900, animationDelay: '0ms' }}
                  >
                    {reviewerData?.reviewCount ?? 0}
                  </span>
                  <span
                    className="text-[9px] text-charcoal/40 font-semibold uppercase tracking-[0.08em] mt-0.5"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                  >
                    Reviews
                  </span>
                </div>

                {/* Avg rating */}
                <div className="flex flex-col items-center px-2 py-2 rounded-xl bg-off-white/60 border border-charcoal/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                  <span
                    className="stat-tick text-[22px] font-black leading-none tracking-tight text-charcoal"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontWeight: 900, animationDelay: '120ms' }}
                  >
                    {reviewerData?.avgRatingGiven != null
                      ? reviewerData.avgRatingGiven.toFixed(1)
                      : '—'}
                  </span>
                  <span
                    className="text-[9px] text-charcoal/40 font-semibold uppercase tracking-[0.08em] mt-0.5"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                  >
                    Avg
                  </span>
                </div>

                {/* Helpful votes */}
                <div className="flex flex-col items-center px-2 py-2 rounded-xl bg-off-white/60 border border-charcoal/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                  <span
                    className="stat-tick text-[22px] font-black leading-none tracking-tight text-charcoal"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontWeight: 900, animationDelay: '240ms' }}
                  >
                    {reviewerData?.helpfulVotes ?? 0}
                  </span>
                  <span
                    className="text-[9px] text-charcoal/40 font-semibold uppercase tracking-[0.08em] mt-0.5"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                  >
                    Helpful
                  </span>
                </div>
              </div>

              {/* ── EARNED STATUS ── badge pills — proof of expertise */}
              {visibleBadges.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {visibleBadges.map((badge) => (
                    <BadgePill key={badge.id} badge={badge} size="sm" />
                  ))}
                  {overflowCount > 0 && (
                    <span
                      className="text-[10px] font-semibold text-charcoal/35 px-1.5 py-0.5 rounded-full bg-charcoal/[0.05] border border-charcoal/[0.08]"
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                    >
                      +{overflowCount}
                    </span>
                  )}
                </div>
              )}

              {/* ── CURIOSITY GAP ── latest review snippet — makes you want to read more */}
              {latestReview && (
                <div className="rounded-xl px-3 py-2.5 bg-off-white/50 border border-charcoal/[0.06] relative overflow-hidden">
                  {/* Decorative quote — background element, not interactive */}
                  <span className="absolute -top-1 -right-1 text-[48px] leading-none text-charcoal/[0.05] font-serif select-none pointer-events-none">&rdquo;</span>

                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="flex gap-[2px]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-[10px] h-[10px] fill-coral text-coral" />
                      ))}
                    </div>
                    <span
                      className="text-[9px] text-charcoal/35 font-semibold uppercase tracking-[0.08em]"
                      style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                    >
                      Latest
                    </span>
                  </div>
                  <p
                    className="text-[12px] text-charcoal/60 leading-snug line-clamp-2 font-medium"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontStyle: 'italic', letterSpacing: '-0.005em' }}
                  >
                    {latestReview.reviewText}
                  </p>
                </div>
              )}

            </div>
          </div>
        </Link>
      </div>
    );
  }

  // ─── REVIEW CARD VARIANT ──────────────────────────────────────────────────
  // Psychology: face → name + credibility → earned status → what they wrote → social proof (likes)
  // Fixed height card — content must fit cleanly, no overflow
  return (
    <li className="w-[calc(50vw-12px)] sm:w-auto sm:min-w-[213px] flex-shrink-0">
      <Link href={cardHref} className="block group/card">
        <div className="bg-card-bg rounded-2xl cursor-pointer h-[187px] flex flex-col relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-out group-hover/card:-translate-y-0.5">

          {/* Top accent */}
          <div className="h-[3px] w-full bg-gradient-to-r from-coral/50 via-sage/50 to-coral/30 flex-shrink-0" />

          {/* Hover tint overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage/[0.03] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

          {/* ── HEADER: face + name + credibility ── */}
          <div className="flex items-center gap-2 px-2.5 pt-2 pb-0">
            <div className="relative flex-shrink-0">
              <ProfilePicture
                src={review?.reviewer.profilePicture || ""}
                alt={review?.reviewer.name || ""}
                size="md"
                badge={review?.reviewer.badge}
              />
              {review?.reviewer.badge === "verified" && (
                <div className="absolute -right-1 -top-1 z-20">
                  <VerifiedBadge />
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
              {/* Review count inline — immediate credibility signal */}
              <div className="flex items-center gap-1 mt-0.5">
                <MessageSquare className="w-2.5 h-2.5 text-charcoal/35" strokeWidth={2} />
                <span
                  className="text-[11px] text-charcoal/45 font-semibold"
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                >
                  {review?.reviewer.reviewCount || 0} reviews
                </span>
              </div>
            </div>
          </div>

          {/* ── EARNED STATUS: badges ── */}
          {visibleBadges.length > 0 && (
            <div className="px-2.5 pt-1.5 pb-0 flex items-center gap-1 flex-nowrap overflow-hidden">
              {visibleBadges.map((badge) => (
                <BadgePill key={badge.id} badge={badge} size="sm" />
              ))}
              {overflowCount > 0 && (
                <span
                  className="inline-flex items-center px-1.5 py-[3px] rounded-full text-[10px] font-semibold text-charcoal/30 bg-charcoal/[0.05] border border-charcoal/[0.07] flex-shrink-0"
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                >
                  +{overflowCount}
                </span>
              )}
            </div>
          )}

          {/* ── REVIEW CONTENT: what they said ── */}
          <div className="flex-1 min-h-0 px-2.5 pt-1.5 pb-2 flex flex-col justify-between">
            {/* Business name + review text */}
            <div>
              {(review?.businessName) && (
                <p
                  className="text-[10px] font-semibold text-charcoal/50 uppercase tracking-[0.06em] truncate mb-0.5"
                  style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                >
                  {review.businessName}
                </p>
              )}
              <p
                className="text-[11px] text-charcoal/70 leading-snug line-clamp-3 font-medium"
                style={{ fontFamily: "'Urbanist', system-ui, sans-serif", fontStyle: 'italic' }}
              >
                {review?.reviewText
                  ? `"${review.reviewText}"`
                  : ""}
              </p>
            </div>

            {/* ── SOCIAL PROOF: likes + date ── */}
            <div className="flex items-center justify-between mt-1">
              <span
                className="text-[10px] text-charcoal/35 font-medium"
                style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
              >
                {review?.date || ""}
              </span>
              {(review?.likes ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 fill-coral/60 text-coral/60" strokeWidth={2} />
                  <span
                    className="text-[10px] font-semibold text-charcoal/40"
                    style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
                  >
                    {review?.likes}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </Link>
    </li>
  );
}
