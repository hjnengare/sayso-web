"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
    ArrowLeft,
    Star,
    MessageSquare,
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
    UserPlus,
} from "react-feather";
import { PremiumReviewCard } from "../../components/Business/PremiumReviewCard";
import Footer from "../../components/Footer/Footer";
import { TOP_REVIEWERS, FEATURED_REVIEWS, type Reviewer } from "../../data/communityHighlightsData";

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
    followers: number;
    following: number;
    totalViews: number;
    averageRating: number;
    reviews: Array<{
        id: string;
        businessName: string;
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
    }>;
    achievements: Array<{
        id: string;
        title: string;
        description: string;
        icon: string;
        unlocked: boolean;
    }>;
}

export default function ReviewerProfilePage() {
    const params = useParams();
    const reviewerId = params?.id as string;
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [imgError, setImgError] = useState(false);

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

    // Mock reviewer data (replace with API in production)
    const reviewer: ReviewerProfile = useMemo(() => {
        const baseReviewer = TOP_REVIEWERS.find(r => r.id === reviewerId) || TOP_REVIEWERS[0];
        const reviewerReviews = FEATURED_REVIEWS.filter(r => r.reviewer.id === reviewerId).slice(0, 10);

        return {
            id: baseReviewer.id,
            name: baseReviewer.name,
            profilePicture: baseReviewer.profilePicture,
            reviewCount: baseReviewer.reviewCount,
            rating: baseReviewer.rating,
            badge: baseReviewer.badge,
            trophyBadge: baseReviewer.trophyBadge,
            location: baseReviewer.location,
            memberSince: "Jan 2023",
            helpfulVotes: Math.floor(baseReviewer.reviewCount * 3.5),
            followers: Math.floor(baseReviewer.reviewCount * 2.1),
            following: Math.floor(baseReviewer.reviewCount * 0.8),
            totalViews: Math.floor(baseReviewer.reviewCount * 15.3),
            averageRating: baseReviewer.rating,
            reviews: reviewerReviews.length > 0 ? reviewerReviews.map(r => ({
                id: r.id,
                businessName: r.businessName,
                businessType: r.businessType,
                rating: r.rating,
                text: r.reviewText,
                date: r.date,
                likes: r.likes,
                tags: [],
                images: r.images,
            })) : [
                {
                    id: "1",
                    businessName: "The Cozy Corner Cafe",
                    businessType: "Coffee Shop",
                    rating: 5,
                    text: "Absolutely love this hidden gem! The barista remembers my order and the atmosphere is perfect for working. Their lavender latte is to die for!",
                    date: "2 days ago",
                    likes: 24,
                    tags: ["cozy", "great coffee", "friendly staff"],
                    images: ["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&h=200&fit=crop"]
                },
                {
                    id: "2",
                    businessName: "Mama Rosa's Trattoria",
                    businessType: "Italian Restaurant",
                    rating: 5,
                    text: "Best authentic Italian food outside of Italy! The pasta is made fresh daily and the tiramisu is heavenly. Service is impeccable too.",
                    date: "1 week ago",
                    likes: 31,
                    tags: ["authentic", "fresh pasta", "excellent service"],
                    images: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=200&fit=crop"]
                },
            ],
            badges: [
                { id: "1", name: "Top Reviewer", icon: "🏆", description: "Among the top 10 reviewers this month", earnedDate: "Feb 2024" },
                { id: "2", name: "Helpful Contributor", icon: "👍", description: "Received 100+ helpful votes", earnedDate: "Jan 2024" },
                { id: "3", name: "Photo Expert", icon: "📸", description: "Added photos to 50+ reviews", earnedDate: "Dec 2023" },
            ],
            achievements: [
                { id: "1", title: "First Review", description: "Posted your first review", icon: "⭐", unlocked: true },
                { id: "2", title: "Century Club", description: "Posted 100 reviews", icon: "💯", unlocked: baseReviewer.reviewCount >= 100 },
                { id: "3", title: "Photo Master", description: "Added 50 photos", icon: "📷", unlocked: true },
                { id: "4", title: "Helpful Hero", description: "Received 500 helpful votes", icon: "👑", unlocked: false },
            ],
        };
    }, [reviewerId]);

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
                className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
                style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
            >
                {/* Fixed Premium Header */}
                <header
                    className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg backdrop-blur-sm border-b border-charcoal/10 shadow-md md:shadow-none animate-slide-in-top"
                    role="banner"
                    style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                >
                    <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-10 2xl:px-16 py-4">
                        <nav className="flex items-center justify-between" aria-label="Reviewer profile navigation">
                            <Link
                                href="/home"
                                className="group flex items-center focus:outline-none rounded-lg px-1 -mx-1"
                                aria-label="Go back to home"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 mr-2 sm:mr-3" aria-hidden="true">
                                    <ArrowLeft className="w-6 h-6 text-white group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-h3 sm:text-h2 font-semibold text-white animate-delay-100 animate-fade-in truncate max-w-[150px] sm:max-w-none" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                                    {reviewer.name}
                                </h3>
                            </Link>

                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    className="w-10 h-10 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 min-h-[44px] min-w-[44px]"
                                    aria-label="Share reviewer profile"
                                >
                                    <Share2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </button>
                            </div>
                        </nav>
                    </div>
                </header>

                <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                    <div className="py-1 pt-20 md:px-20 sm:px-4">
                        <main className="relative font-sf-pro pt-4 sm:pt-6" id="main-content" role="main" aria-label="Reviewer profile content">
                            <div className="mx-auto w-full max-w-[2000px] px-3 sm:px-6 lg:px-10 2xl:px-16 relative z-10">
                                <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
                                    <div className="space-y-6">
                                        {/* Profile Header Section */}
                                        <article className="w-full sm:mx-0" aria-labelledby="profile-heading">
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg relative overflow-hidden animate-fade-in-up">
                                                {/* Decorative elements */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
                                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>

                                                <div className="relative z-10 p-6 sm:p-8">
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                                        {/* Profile Picture */}
                                                        <div className="relative flex-shrink-0">
                                                            {!imgError && reviewer.profilePicture && reviewer.profilePicture.trim() !== '' ? (
                                                                <div className="relative">
                                                                    <Image
                                                                        src={reviewer.profilePicture}
                                                                        alt={reviewer.name}
                                                                        width={120}
                                                                        height={120}
                                                                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-full border-4 border-white shadow-xl ring-4 ring-white/50"
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
                                                                <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center bg-sage/20 text-sage rounded-full border-4 border-white shadow-xl ring-4 ring-white/50">
                                                                    <Users className="text-sage/70" size={48} />
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
                                                            <div className="flex items-center gap-4 mb-4 text-sm text-charcoal/70 flex-wrap" style={{
                                                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                            }}>
                                                                <div className="flex items-center gap-1">
                                                                    <MapPin size={14} />
                                                                    <span>{reviewer.location}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar size={14} />
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

                                                            {/* Action Buttons */}
                                                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                                <Link
                                                                    href={`/dm/${reviewer.id}`}
                                                                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-coral/90 hover:bg-charcoal/90 hover:border-white/30 text-white rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-sage/20 border border-sage/20 whitespace-nowrap"
                                                                    style={{
                                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                                        fontWeight: 600,
                                                                    }}
                                                                    aria-label="Send message"
                                                                >
                                                                    <MessageSquare size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
                                                                    <span>Message</span>
                                                                </Link>
                                                                <button
                                                                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/90 hover:bg-off-white text-charcoal rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-charcoal/10 border border-charcoal/10 whitespace-nowrap"
                                                                    style={{
                                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                                        fontWeight: 600,
                                                                    }}
                                                                    aria-label="Add friend"
                                                                >
                                                                    <UserPlus size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
                                                                    <span>Add Friend</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>

                                        {/* Stats Section */}
                                        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="Reviewer statistics">
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 animate-fade-in-up animate-delay-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <ThumbsUp className="w-5 h-5 text-coral" />
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
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 animate-fade-in-up animate-delay-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users className="w-5 h-5 text-coral" />
                                                    <span className="text-sm text-charcoal/70" style={{
                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    }}>Followers</span>
                                                </div>
                                                <div className="text-2xl font-bold text-charcoal" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    {reviewer.followers.toLocaleString('en-US')}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 animate-fade-in-up animate-delay-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Eye className="w-5 h-5 text-coral" />
                                                    <span className="text-sm text-charcoal/70" style={{
                                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    }}>Views</span>
                                                </div>
                                                <div className="text-2xl font-bold text-charcoal" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    {reviewer.totalViews.toLocaleString('en-US')}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 animate-fade-in-up animate-delay-300">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <TrendingUp className="w-5 h-5 text-coral" />
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
                                        {reviewer.badges.length > 0 && (
                                            <section className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-6 sm:p-8 animate-fade-in-up" aria-label="Reviewer badges">
                                                <h3 className="text-lg font-bold text-charcoal mb-4" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    Badges & Achievements
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {reviewer.badges.map((badge) => (
                                                        <div key={badge.id} className="bg-off-white/50 rounded-xl p-4 border border-white/40">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="text-2xl">{badge.icon}</span>
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
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Reviews Section */}
                                        <section aria-label="Reviews written by this reviewer">
                                            <div className="flex justify-center mb-4">
                                                <h2 id="reviews-heading" className="text-sm font-bold text-charcoal font-urbanist border-b border-charcoal/10 pb-2" style={{
                                                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                                    fontWeight: 700,
                                                }}>
                                                    Reviews by {reviewer.name}
                                                </h2>
                                            </div>
                                            <div className="space-y-4">
                                                {reviewer.reviews.map((review) => (
                                                    <PremiumReviewCard
                                                        key={review.id}
                                                        author={reviewer.name}
                                                        rating={review.rating}
                                                        text={review.text}
                                                        date={review.date}
                                                        tags={review.tags}
                                                        highlight={reviewer.badge === "top" ? "Top Reviewer" : reviewer.badge === "verified" ? "Verified" : undefined}
                                                        verified={reviewer.badge === "verified"}
                                                        profileImage={reviewer.profilePicture}
                                                        reviewImages={review.images}
                                                    />
                                                ))}
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
                        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg hover:bg-navbar-bg backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:scale-110 transition-all duration-300"
                        aria-label="Scroll to top"
                    >
                        <ChevronUp className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </button>
                )}

                <Footer />
            </div>
        </>
    );
}

