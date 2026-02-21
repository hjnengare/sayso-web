"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useUserBadgesById } from "../../hooks/useUserBadges";
import { Review, Reviewer } from "../../types/community";
import { useAuth } from "../../contexts/AuthContext";
import ProfilePicture from "./ProfilePicture";
import ReviewerStats from "./ReviewerStats";
import ReviewContent from "./ReviewContent";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import BadgePill, { BadgePillData } from "../Badges/BadgePill";

import {
  Star,
  User,
  Quote,
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

  // Use badges from reviewer prop (batch-fetched by /api/reviewers/top) when available.
  // Falls back to SWR per-card fetch only when prop badges are not provided (avoids N+1).
  const MAX_VISIBLE_BADGES = 3;
  const propBadges = reviewerData?.badges;

  const { badges: fetchedBadges } = useUserBadgesById(
    propBadges && propBadges.length > 0 ? null : (userIdForBadges ?? null)
  );

  const userBadges: BadgePillData[] = propBadges && propBadges.length > 0
    ? [...propBadges].sort((a, b) => {
        const order = ['milestone', 'specialist', 'explorer', 'community'];
        return order.indexOf(a.badge_group || '') - order.indexOf(b.badge_group || '');
      })
    : fetchedBadges;

  const visibleBadges = userBadges.slice(0, MAX_VISIBLE_BADGES);
  const overflowCount = Math.max(0, userBadges.length - MAX_VISIBLE_BADGES);


  if (variant === "reviewer" || reviewer) {
    return (
      <div
        id={idForSnap}
        className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0"
      >
        <Link
          href={cardHref}
          className="block group/card h-full"
        >
          <div className="relative rounded-2xl cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 bg-card-bg flex flex-col overflow-hidden group/card">
            {/* Subtle shimmer on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 group-hover/card:from-sage/5 group-hover/card:via-transparent group-hover/card:to-coral/5 transition-all duration-500 rounded-2xl pointer-events-none" />

            {/* Top accent line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-coral/60 via-sage/40 to-coral/20 rounded-t-2xl" />

            {/* Content */}
            <div className="relative p-4 flex flex-col gap-3">

              {/* Header: avatar + name + badges */}
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {!imgError && reviewerData?.profilePicture && reviewerData.profilePicture.trim() !== '' ? (
                  <div className="relative flex-shrink-0">
                    {reviewerData?.badge === "top" && (
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-400/40 via-coral/30 to-orange-300/20 blur-md animate-pulse" />
                    )}
                    <Image
                      src={reviewerData.profilePicture}
                      alt={reviewerData?.name || "User avatar"}
                      width={44}
                      height={44}
                      className="relative w-11 h-11 object-cover rounded-full ring-2 ring-white/80 shadow-sm"
                      priority={false}
                      onError={() => setImgError(true)}
                    />
                    {reviewerData?.badge === "verified" && (
                      <div className="absolute -right-0.5 -bottom-0.5 z-20">
                        <div className="bg-white rounded-full p-[2px] shadow-sm">
                          <VerifiedBadge size="sm" />
                        </div>
                      </div>
                    )}
                    {reviewerData?.badge === "top" && (
                      <div className="absolute -right-0.5 -bottom-0.5 z-20 w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm ring-1 ring-white">
                        <Star className="w-2.5 h-2.5 fill-white text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-sage/20 to-coral/10 ring-2 ring-white/60 flex-shrink-0 shadow-sm">
                    <User className="text-charcoal/40" size={18} strokeWidth={1.8} />
                  </div>
                )}

                {/* Name + badges/location */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-[15px] font-bold text-charcoal truncate tracking-[-0.01em]"
                    style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 700 }}
                  >
                    {reviewerData?.name}
                  </h3>

                  {visibleBadges.length > 0 ? (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {visibleBadges.map((badge) => (
                        <BadgePill key={badge.id} badge={badge} size="sm" />
                      ))}
                      {overflowCount > 0 && (
                        <span
                          className="text-[10px] font-semibold text-charcoal/40 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-off-white/70 to-white/50 border border-white/60 shadow-sm"
                          style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                        >
                          +{overflowCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1 h-1 bg-gradient-to-r from-coral/60 to-sage/60 rounded-full" />
                      <p
                        className="text-[13px] text-charcoal/50 font-medium tracking-[-0.005em]"
                        style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                      >
                        {reviewerData?.location}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review count pill */}
              <div className="flex items-center justify-center">
                <div className="rounded-xl px-5 py-2 bg-gradient-to-br from-off-white/70 via-white/40 to-sage/10 border border-white/60 shadow-sm">
                  <div className="text-center">
                    <div
                      className="text-[22px] font-extrabold bg-gradient-to-br from-charcoal to-charcoal/70 bg-clip-text text-transparent tracking-tight"
                      style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 800 }}
                    >
                      {reviewerData?.reviewCount}
                    </div>
                    <div
                      className="text-[10px] text-charcoal/45 font-semibold uppercase tracking-[0.08em]"
                      style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                    >
                      Reviews
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest review preview */}
              {latestReview && (
                <div className="flex-shrink-0">
                  <div className="rounded-xl px-3 py-2.5 relative bg-gradient-to-br from-off-white/60 via-white/30 to-sage/10 border border-white/50 shadow-sm">
                    <Quote className="absolute top-2 right-2.5 w-3.5 h-3.5 text-coral/15" strokeWidth={2} />
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="flex items-center gap-[1px]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-[11px] h-[11px] fill-coral text-coral" />
                        ))}
                      </div>
                      <span
                        className="text-[9px] text-charcoal/40 font-semibold uppercase tracking-[0.06em]"
                        style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                      >
                        Latest
                      </span>
                    </div>
                    <p
                      className="text-[13px] text-charcoal/65 leading-snug line-clamp-2 font-medium"
                      style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontStyle: 'italic', letterSpacing: '-0.005em' }}
                    >
                      &ldquo;{latestReview.reviewText}&rdquo;
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </Link>
      </div>
    );
  }

  // --- REVIEW CARD VARIANT ---
  return (
    <li className="w-[calc(50vw-12px)] sm:w-auto sm:min-w-[213px] flex-shrink-0">
      <Link
        href={cardHref}
        className="block group/card"
      >
        <div
          className="bg-card-bg rounded-2xl cursor-pointer h-[187px] flex flex-col relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-out"
        >
          {/* Top accent line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-coral/60 via-sage/40 to-coral/20 rounded-t-2xl flex-shrink-0" />

          {/* Hover shimmer */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover/card:from-sage/5 group-hover/card:to-coral/5 transition-all duration-500 rounded-2xl pointer-events-none" />

          <div className="flex items-start gap-1.5 p-2 pb-0">
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
              <h3 className="text-sm font-bold text-charcoal/90 truncate tracking-[-0.01em] transition-colors duration-300" style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 700,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
              }}>
                {review?.reviewer.name}
              </h3>
              <ReviewerStats
                reviewCount={review?.reviewer.reviewCount || 0}
                location={review?.reviewer.location || ""}
              />
            </div>
          </div>

          {/* Badges row */}
          {visibleBadges.length > 0 && (
            <div className="px-2 pt-1 pb-0.5 flex items-center gap-1 flex-wrap">
              {visibleBadges.map((badge) => (
                <BadgePill key={badge.id} badge={badge} size="sm" />
              ))}
              {overflowCount > 0 && (
                <span
                  className="inline-flex items-center px-1.5 py-[3px] rounded-full text-[10px] font-semibold text-charcoal/35 bg-gradient-to-r from-white/60 to-off-white/40 border border-white/50 backdrop-blur-sm"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  +{overflowCount}
                </span>
              )}
            </div>
          )}

          <ReviewContent
            businessName={review?.businessName || ""}
            businessType={review?.businessType || ""}
            reviewText={review?.reviewText || ""}
            date={review?.date || ""}
            likes={review?.likes || 0}
            images={review?.images}
          />
        </div>
      </Link>
    </li>
  );
}
