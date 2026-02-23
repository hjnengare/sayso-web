"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import React, { useMemo, useState, useEffect } from "react";
import { useReviewerProfile } from "../../hooks/useReviewerProfile";
import {
    ArrowLeft,
    Star,
    Heart,
    Award,
    MapPin,
    Check,
    Users,
    Share2,
    Calendar,
    TrendingUp,
    ThumbsUp,
    Eye,
    Clock,
    ChevronUp,
    ChevronRight,
    ChevronLeft,
    User,
} from "lucide-react";
import { GoldBanner } from "@/app/components/GoldBanner";
import Footer from "../../components/Footer/Footer";
import { ReviewsList } from "@/components/organisms/ReviewsList";
import ReviewerProfileSkeleton from "../../components/ReviewerCard/ReviewerProfileSkeleton";
import { LiveIndicator } from "../../components/Realtime/RealtimeIndicators";

// CSS animations
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInFromTop {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.96) translateY(-12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-slide-in-top {
    animation: slideInFromTop 0.5s ease-out forwards;
  }
  
  .animate-fade-in-scale {
    animation: fadeInScale 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;

interface ReviewerProfile {
    id: string;
    name: string;
    profilePicture: string;
    reviewCount: number;
    rating: number;
    badge?: "top" | "verified" | "local";
    trophyBadge?: "gold" | "silver" | "bronze" | "rising-star" | "community-favorite";
    location: string;
    memberSince: string;
    helpfulVotes: number;
    badgesCount: number;
    impactScore: number;
    averageRating: number;
    reviews: Array<{
        id: string;
        businessId: string;
        businessName: string;
        businessImageUrl?: string | null;
        businessType: string;
        rating: number;
        text: string;
        date: string;
        likes: number;
        tags: string[];
        images?: string[];
    }>;
    badges: Array<{
        id: string;
        name: string;
        icon: string;
        description: string;
        earnedDate: string;
        badge_group?: string;
    }>;
}

export default function ReviewerProfilePage() {
    const params = useParams();
    const reviewerId = params?.id as string;
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [imgError, setImgError] = useState(false);

    // SWR-backed reviewer profile (caching, dedup, visibility refetch, realtime)
    const { reviewer, loading, isRealtimeConnected, refetch } = useReviewerProfile(reviewerId || null);

    // Handle scroll to top button visibility
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return (
            <>
                <style dangerouslySetInnerHTML={{ __html: animations }} />
                <style jsx global>{`
                    .font-urbanist {
                        font-family: "Urbanist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, system-ui,
                            sans-serif;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                        font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
                    }
                `}</style>
                <ReviewerProfileSkeleton />
                <Footer />
            </>
        );
    }

    if (!reviewer) {
        return (
            <div className="min-h-screen bg-off-white">
                <div className="container mx-auto px-4 py-20 text-center">
                    <div className="text-charcoal">Reviewer not found</div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: animations }} />
            <style jsx global>{`
                .font-urbanist {
                    font-family: "Urbanist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, system-ui,
                        sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
                }
            `}</style>
            <div
                className="min-h-dvh bg-gradient-to-br from-off-white via-off-white/98 to-sage/5 relative overflow-hidden font-urbanist"
                style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
            >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

                <div className="pb-0 relative z-10">
                  
                        <main className="relative font-urbanist" id="main-content" role="main" aria-label="Reviewer profile content">
                            <div className="mx-auto w-full max-w-[1400px] px-2 sm:px-4 lg:px-6 2xl:px-8 relative z-10">
                                {/* Breadcrumb Navigation */}
                                <nav className="pb-1" aria-label="Breadcrumb">
                                    <ol className="flex items-center gap-2 text-sm sm:text-base">
                                        <li>
                                            <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Home
                                            </Link>
                                        </li>
                                        <li className="flex items-center">
                                            <ChevronRight className="w-4 h-4 text-charcoal/60" />
                                        </li>
                                        <li>
                                            <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Reviewer Profile
                                            </span>
                                        </li>
                                    </ol>
                                </nav>
                                <div className="pt-4 pb-16 sm:pb-20 md:pb-24">
                                    <div className="space-y-8">
                                        {/* Profile Header Section */}
                                        <article className="w-full sm:mx-0" aria-labelledby="profile-heading">
                                            <div className="bg-gradient-to-br bg-card-bg backdrop-blur-xl border border-white/80 rounded-[12px] shadow-2xl relative overflow-hidden animate-fade-in-up">
                                                {/* Decorative elements */}
                                                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-sage/15 via-coral/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
                                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-coral/15 via-sage/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>

                                                <div className="relative z-10 p-8 sm:p-10">
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                                                        {/* Profile Picture */}
                                                        <div className="relative flex-shrink-0">
                                                            {!imgError && reviewer.profilePicture && reviewer.profilePicture.trim() !== '' ? (
                                                                <div className="relative">
                                                                    <Image
                                                                        src={reviewer.profilePicture}
                                                                        alt={reviewer.name}
                                                                        width={120}
                                                                        height={120}
                                                                        className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-full border-4 border-white shadow-2xl ring-4 ring-white/60"
                                                                        priority
                                                                        onError={() => setImgError(true)}
                                                                    />
                                                                    {reviewer.badge === "verified" && (
                                                                        <div className="absolute -bottom-1 -right-1 z-20">
                                                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center ring-4 ring-white">
                                                                                <Check className="text-white" size={14} strokeWidth={3} />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {reviewer.badge === "top" && (
                                                                        <div className="absolute -top-1 -right-1 z-20">
                                                                            <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center ring-4 ring-white">
                                                                                <Award className="text-white" size={14} strokeWidth={2.5} />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center bg-gradient-to-br from-sage/20 to-coral/15 text-sage rounded-full border-4 border-white shadow-2xl ring-4 ring-white/60">
                                                                    <User className="text-navbar-bg" size={56} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Profile Info */}
                                                        <div className="flex-1 min-w-0 w-full">
                                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                <h2 id="profile-heading" className="text-h1 sm:text-hero font-semibold text-charcoal" style={{
                                                                    fontFamily: 'Urbanist, system-ui, sans-serif',
                                                                    letterSpacing: '-0.02em',
                                                                }}>
                                                                    {reviewer.name}
                                                                {isRealtimeConnected && <LiveIndicator isLive={isRealtimeConnected} />}
                                                                </h2>
                                                                {reviewer.trophyBadge && (
                                                                    <div className={`px-2 py-1 rounded-full text-xs font-600 flex items-center gap-1 ${
                                                                        reviewer.trophyBadge === "gold"
                                                                            ? "bg-yellow-100 text-yellow-700"
                                                                            : reviewer.trophyBadge === "silver"
                                                                            ? "bg-gray-100 text-gray-700"
                                                                            : reviewer.trophyBadge === "bronze"
                                                                            ? "bg-orange-100 text-orange-700"
                                                                            : reviewer.trophyBadge === "rising-star"
                                                                            ? "bg-purple-100 text-purple-700"
                                                                            : "bg-pink-100 text-pink-700"
                                                                    }`}>
                                                                        <Award size={12} />
                                                                        <span className="capitalize">{reviewer.trophyBadge.replace('-', ' ')}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 mb-4 text-sm text-charcoal/70 flex-wrap" style={{
                                                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                            }}>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                                                                        <MapPin className="w-3 h-3 text-charcoal/85" />
                                                                    </span>
                                                                    <span>{reviewer.location}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                                                                        <Calendar className="w-3 h-3 text-charcoal/85" />
                                                                    </span>
                                                                    <span>Member since {reviewer.memberSince}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6 mb-4 flex-wrap">
                                                                <div className="flex items-center gap-1">
                                                                    <Star className="w-5 h-5 fill-coral text-coral" />
                                                                    <span className="text-lg font-bold text-charcoal" style={{
                                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                                        fontWeight: 700,
                                                                    }}>
                                                                        {reviewer.averageRating.toFixed(1)}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm text-charcoal/70" style={{
                                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                                }}>
                                                                    {reviewer.reviewCount} reviews
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>

                                        {/* Stats Section */}
                                        <section className="grid grid-cols-2 sm:grid-cols-4 gap-6" aria-label="Reviewer statistics">
                                            <div className="bg-gradient-to-br bg-card-bg backdrop-blur-xl   rounded-[12px] shadow-xl p-6 animate-fade-in-up animate-delay-100 hover:shadow-2xl transition-all duration-300">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                                                        <ThumbsUp className="w-4 h-4 text-charcoal/85" />
                                                    </span>
                                                    <span className="text-sm text-charcoal/70" style={{
                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    }}>Helpful</span>
                                                </div>
                                                <div className="text-2xl font-bold text-charcoal" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    {reviewer.helpfulVotes.toLocaleString('en-US')}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br bg-card-bg backdrop-blur-xl   rounded-[12px] shadow-xl p-6 animate-fade-in-up animate-delay-300 hover:shadow-2xl transition-all duration-300">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                                                        <Award className="w-4 h-4 text-charcoal/85" />
                                                    </span>
                                                    <span className="text-sm text-charcoal/70" style={{
                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    }}>Badges</span>
                                                </div>
                                                <div className="text-2xl font-bold text-charcoal" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    {reviewer.badgesCount.toLocaleString('en-US')}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br bg-card-bg backdrop-blur-xl   rounded-[12px] shadow-xl p-6 animate-fade-in-up animate-delay-200 hover:shadow-2xl transition-all duration-300">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                                                        <TrendingUp className="w-4 h-4 text-charcoal/85" />
                                                    </span>
                                                    <span className="text-sm text-charcoal/70" style={{
                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    }}>Impact</span>
                                                </div>
                                                <div className="text-2xl font-bold text-charcoal" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    {reviewer.impactScore.toLocaleString('en-US')}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br bg-card-bg backdrop-blur-xl   rounded-[12px] shadow-xl p-6 animate-fade-in-up animate-delay-300 hover:shadow-2xl transition-all duration-300">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                                                        <TrendingUp className="w-4 h-4 text-charcoal/85" />
                                                    </span>
                                                    <span className="text-sm text-charcoal/70" style={{
                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    }}>Rating</span>
                                                </div>
                                                <div className="text-2xl font-bold text-charcoal" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    {reviewer.averageRating.toFixed(1)}
                                                </div>
                                            </div>
                                        </section>

                                        {/* Badges Section */}
                                        {reviewer.badges && reviewer.badges.length > 0 && (
                                            <section className="bg-gradient-to-br bg-card-bg backdrop-blur-xl   rounded-[12px] shadow-2xl p-8 sm:p-10 animate-fade-in-up hover:shadow-2xl transition-all duration-500" aria-label="Reviewer badges">
                                                <h3 className="text-lg font-bold text-charcoal mb-4" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    Badges & Achievements ({reviewer.badges?.length || 0})
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {reviewer.badges.map((badge) => (
                                                        <div
                                                            key={badge.id}
                                                            className="transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                                                        >
                                                            <GoldBanner className="rounded-[12px] shadow-lg">
                                                                <div className="rounded-[12px] p-6 h-full">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <div className="relative w-8 h-8 flex-shrink-0">
                                                                            <Image
                                                                                src={badge.icon}
                                                                                alt={badge.name}
                                                                                fill
                                                                                className="object-contain"
                                                                                unoptimized
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-bold text-charcoal" style={{
                                                                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                                                fontWeight: 700,
                                                                            }}>
                                                                                {badge.name}
                                                                            </div>
                                                                            <div className="text-xs text-charcoal/60" style={{
                                                                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                                            }}>
                                                                                Earned {badge.earnedDate}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-xs text-charcoal/70" style={{
                                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                                    }}>
                                                                        {badge.description}
                                                                    </p>
                                                                </div>
                                                            </GoldBanner>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Reviews Section */}
                                        <section
                                            className="bg-card-bg   rounded-[12px] shadow-2xl p-8 sm:p-10 hover:shadow-2xl transition-all duration-500"
                                            aria-label="Reviews written by this reviewer"
                                        >
                                           <div className="bg-off-white/80 shadow-md px-4 rounded-[12px] py-3 mb-6 border-none">
                                             <ReviewsList
                                                reviews={reviewer.reviews && reviewer.reviews.length > 0 ? reviewer.reviews.map((review) => ({
                                                    businessName: review.businessName,
                                                    businessImageUrl: review.businessImageUrl,
                                                    businessCategory: review.businessType,
                                                    rating: review.rating,
                                                    reviewText: review.text,
                                                    reviewTitle:  null,
                                                    helpfulCount: review.likes,
                                                    tags: review.tags || [],
                                                    isFeatured: reviewer.badge === "top",
                                                    createdAt: review.date,
                                                    businessId: review.businessId,
                                                })) : []}
                                                title={`Reviews by ${reviewer.name}`}
                                                initialDisplayCount={2}
                                                showToggle={true}
                                                className="!p-0 !bg-transparent !border-0 !shadow-none !mb-0 !rounded-none"
                                            />
                                           </div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>

                {/* Scroll to Top Button */}
                {showScrollTop && (
                    <button
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 z-40 w-14 h-14 bg-gradient-to-r from-navbar-bg to-navbar-bg/90 hover:from-navbar-bg/90 hover:to-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border border-white/30 hover:scale-110 transition-all duration-300 hover:shadow-coral/20"
                        aria-label="Scroll to top"
                    >
                        <ChevronUp className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </button>
                )}

                <Footer />
        </>
    );
}

