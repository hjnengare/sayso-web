"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
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
  index = 0,
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
  const revealStyle = useMemo(() => {
    const bucket = Math.abs(index) % 6;
    const x = bucket === 1 ? -6 : bucket === 2 ? 6 : bucket === 4 ? -3 : bucket === 5 ? 3 : 0;
    const y = 10 + (bucket % 3);
    const delay = Math.min(90, bucket * 18);
    return {
      ['--reveal-x' as any]: `${x}px`,
      ['--reveal-y' as any]: `${y}px`,
      ['--reveal-delay' as any]: `${delay}ms`,
    } as React.CSSProperties;
  }, [index]);
  const [imgError, setImgError] = useState(false);
  const [userBadges, setUserBadges] = useState<BadgePillData[]>([]);

  // Use badges from reviewer prop (batch-fetched by /api/reviewers/top) when available.
  // Falls back to per-card fetch only when prop badges are not provided.
  const MAX_VISIBLE_BADGES = 3;
  const propBadges = reviewerData?.badges;

  useEffect(() => {
    // If badges were provided via props, use those directly (no N+1)
    if (propBadges && propBadges.length > 0) {
      const priorityOrder = ['milestone', 'specialist', 'explorer', 'community'];
      const sorted = [...propBadges].sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a.badge_group || '');
        const bIdx = priorityOrder.indexOf(b.badge_group || '');
        return aIdx - bIdx;
      });
      setUserBadges(sorted);
      return;
    }

    // Fallback: fetch per-card (for contexts that don't provide prop badges)
    if (!userIdForBadges) return;

    async function fetchUserBadges() {
      try {
        const response = await fetch(`/api/badges/user?user_id=${userIdForBadges}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const earnedBadges = (data.badges || [])
            .filter((b: any) => b.earned)
            .map((b: any) => ({
              id: b.id,
              name: b.name,
              icon_path: b.icon_path,
              badge_group: b.badge_group,
            }));

          const priorityOrder = ['milestone', 'specialist', 'explorer', 'community'];
          const sortedBadges = earnedBadges.sort((a: any, b: any) => {
            const aIndex = priorityOrder.indexOf(a.badge_group);
            const bIndex = priorityOrder.indexOf(b.badge_group);
            return aIndex - bIndex;
          });

          setUserBadges(sortedBadges);
        }
      } catch (err) {
        console.error('Error fetching user badges:', err);
      }
    }

    fetchUserBadges();
  }, [userIdForBadges, propBadges]);

  const visibleBadges = userBadges.slice(0, MAX_VISIBLE_BADGES);
  const overflowCount = Math.max(0, userBadges.length - MAX_VISIBLE_BADGES);


  if (variant === "reviewer" || reviewer) {
    return (
      <div
        id={idForSnap}
        className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0"
        data-reveal
        style={revealStyle}
      >
        <Link
          href={cardHref}
          className="block group/card"
        >
          <div
            className="relative rounded-2xl overflow-hidden cursor-pointer h-[268px] border border-white/50 shadow-sm hover:shadow-xl transition-all duration-500 ease-out"
            style={{
              background: 'linear-gradient(165deg, rgba(255,255,255,0.92) 0%, rgba(229,224,229,0.85) 50%, rgba(157,171,155,0.18) 100%)',
              backdropFilter: 'blur(20px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
            }}
          >

            {/* Content */}
            <div className="relative p-4 h-full flex flex-col">
              {/* Header with profile pic, name, location */}
              <div className="flex items-start gap-3 mb-3">
                {!imgError && reviewerData?.profilePicture && reviewerData.profilePicture.trim() !== '' ? (
                  <div className="relative flex-shrink-0">
                    <div className="relative">
                      <Image
                        src={reviewerData.profilePicture}
                        alt={reviewerData?.name || "User avatar"}
                        width={44}
                        height={44}
                        className="w-11 h-11 object-cover rounded-full ring-[2.5px] ring-white/80 shadow-sm"
                        priority={false}
                        onError={() => setImgError(true)}
                      />
                    </div>
                    {reviewerData?.badge === "verified" && (
                      <div className="absolute -right-0.5 -top-0.5 z-20">
                        <div className="bg-white rounded-full p-[3px] shadow-sm">
                          <VerifiedBadge size="sm" />
                        </div>
                      </div>
                    )}
                    {reviewerData?.badge === "top" && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-coral/25 to-coral/15 blur-lg animate-pulse" />
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-11 h-11 flex items-center justify-center rounded-full ring-[2.5px] ring-white/80 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #f0ece8 0%, #e5e0e5 100%)' }}>
                      <User className="text-charcoal/40" size={18} strokeWidth={1.8} />
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-charcoal/90 truncate tracking-[-0.01em]" style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    fontWeight: 700,
                  }}>
                    {reviewerData?.name}
                  </h3>
                  {/* Badges with gradient bg */}
                  {visibleBadges.length > 0 ? (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {visibleBadges.map((badge) => (
                        <BadgePill key={badge.id} badge={badge} size="sm" />
                      ))}
                      {overflowCount > 0 && (
                        <span className="text-[10px] font-semibold text-charcoal/35 px-1.5 py-0.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/40"
                          style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                          +{overflowCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1 h-1 bg-sage/50 rounded-full" />
                      <p className="text-[13px] text-charcoal/50 font-medium tracking-[-0.005em]" style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}>
                        {reviewerData?.location}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats section */}
              <div className="mb-3">
                <div className="flex items-center justify-center">
                  <div className="rounded-xl px-5 py-2 border border-white/50"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(229,224,229,0.5) 100%)',
                      backdropFilter: 'blur(8px)',
                    }}>
                    <div className="text-center">
                      <div className="text-[22px] font-extrabold text-charcoal/85 tracking-tight" style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        fontWeight: 800,
                      }}>
                        {reviewerData?.reviewCount}
                      </div>
                      <div className="text-[10px] text-charcoal/45 font-semibold uppercase tracking-[0.08em]" style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}>Reviews</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest Review Preview */}
              {latestReview && (
                <div className="flex-1 min-h-0">
                  <div className="rounded-xl px-3 py-2.5 border border-white/50 relative"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.65) 0%, rgba(229,224,229,0.4) 100%)',
                      backdropFilter: 'blur(8px)',
                    }}>
                    <Quote className="absolute top-2 right-2.5 w-3.5 h-3.5 text-charcoal/10" strokeWidth={2} />
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="flex items-center gap-[1px]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-[11px] h-[11px] fill-coral/80 text-coral/80" />
                        ))}
                      </div>
                      <span className="text-[9px] text-charcoal/40 font-semibold uppercase tracking-[0.06em]" style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}>Latest</span>
                    </div>
                    <p className="text-[13px] text-charcoal/65 leading-snug line-clamp-2 font-medium" style={{
                      fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      fontStyle: 'italic',
                      letterSpacing: '-0.005em',
                    }}>
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
        className="block"
      >
        <div
          className="bg-card-bg rounded-2xl group cursor-pointer h-[187px] flex flex-col relative overflow-hidden border border-white/50 shadow-sm hover:shadow-lg transition-all duration-500 ease-out"
        >
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

          {/* Badges row - compact, under reviewer header */}
          {visibleBadges.length > 0 && (
            <div className="px-2 pt-1 pb-0.5 flex items-center gap-1 flex-wrap">
              {visibleBadges.map((badge) => (
                <BadgePill key={badge.id} badge={badge} size="sm" />
              ))}
              {overflowCount > 0 && (
                <span
                  className="inline-flex items-center px-1.5 py-[3px] rounded-full text-[10px] font-semibold text-charcoal/35 bg-white/60 backdrop-blur-sm border border-white/40"
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
