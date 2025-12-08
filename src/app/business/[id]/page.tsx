"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { motion, AnimatePresence } from "framer-motion";
import { PageLoader, Loader } from "../../components/Loader";
import {
    MessageSquare,
    X,
    ChevronRight,
} from "react-feather";
import ReviewsList from "../../components/Reviews/ReviewsList";
import type { ReviewWithUser } from "../../lib/types/database";
import { getCategoryPng, isPngIcon } from "../../utils/categoryToPngMapping";
import Footer from "../../components/Footer/Footer";
import { BusinessInfo } from "../../components/BusinessInfo/BusinessInfoModal";
import SimilarBusinesses from "../../components/SimilarBusinesses/SimilarBusinesses";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useUserHasReviewed } from "../../hooks/useReviews";
import nextDynamic from "next/dynamic";
import {
    BusinessHeroImage,
    BusinessInfo as BusinessInfoComponent,
    BusinessDetailsCard,
    BusinessDescription,
    BusinessActionCard,
    BusinessContactInfo,
} from "../../components/BusinessDetail";
import Header from "../../components/Header/Header";

export default function BusinessProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const businessId = params?.id as string;
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const { showToast } = useToast();
    const { hasReviewed } = useUserHasReviewed(businessId);


    const handleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        showToast(
            isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
            "success"
        );
    };

    const handleLike = () => {
        setIsLiked(!isLiked);
        showToast(
            isLiked ? "Removed from favorites" : "Added to favorites",
            "success"
        );
    };

    const handleShare = () => {
        if (!business) return;
        
        const businessName = business.name || 'Unnamed Business';
        const businessDescription = business.description || `${business.category || 'Business'} located in ${business.location || 'Cape Town'}`;
        
        if (navigator.share) {
            navigator.share({
                title: businessName,
                text: businessDescription,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            showToast("Link copied to clipboard", "success");
        }
    };

    const handleSpecials = () => {
        // Navigate to events-specials page or show specials modal
        router.push("/events-specials");
    };

    // Fetch business data from API
    const [business, setBusiness] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Update page title dynamically - must be called before any conditional returns
    usePageTitle(
        business?.name || "Loading...",
        business?.description || "Read reviews and see photos"
    );

    const fetchBusiness = async (forceRefresh = false) => {
        if (!businessId) {
            setError('Business ID is required');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Always fetch fresh data - no caching
            const response = await fetch(`/api/businesses/${businessId}`, {
                cache: 'no-store',
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setError('Business not found');
                } else {
                    setError('Failed to load business');
                }
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            setBusiness(data);

            // SEO: Redirect from ID to slug if we have a slug and the URL uses an ID
            // Only redirect if the current URL uses an ID (UUID format) and we have a slug
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId);
            if (data.slug && data.slug !== businessId && isUUID) {
                // Only redirect if the slug is different (slug-based URL would be different)
                const slugUrl = `/business/${data.slug}`;
                if (window.location.pathname !== slugUrl) {
                    // Use replace to keep history clean
                    router.replace(slugUrl);
                    return;
                }
            }
        } catch (err: any) {
            console.error('Error fetching business:', err);
            setError('Failed to load business');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBusiness();
    }, [businessId, router]);

    // Refetch function for after delete
    const refetchBusiness = () => {
        fetchBusiness(true);
    };

    // Loading state - show full page loader with transition
    if (isLoading) {
        return (
            <div className="min-h-dvh bg-off-white">
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9999] bg-off-white min-h-screen w-full flex items-center justify-center"
                    >
                        <Loader size="lg" variant="wavy" color="sage" />
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    // Error state
    if (error || !business) {
        return (
            <div className="min-h-dvh bg-off-white flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                    <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-coral" />
                    </div>
                    <h2 className="text-h1 font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                        {error || 'Business not found'}
                    </h2>
                    <p className="text-body text-charcoal/70 mb-6 max-w-[70ch]" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        The business you're looking for doesn't exist or has been removed.
                    </p>
                    <Link
                        href="/home"
                        className="inline-block px-6 py-3 bg-coral text-white rounded-full text-body font-semibold hover:bg-coral/90 transition-colors"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Check if current user is the business owner
    const isBusinessOwner = user && business.owner_id && user.id === business.owner_id;

    // Prepare image data without using PNG placeholders
    const cleanedGalleryImages = Array.isArray(business.images)
        ? business.images.filter((img: string) => img && img.trim() !== '' && !isPngIcon(img))
        : [];

    const fallbackImageCandidate = [
        business.uploaded_image,
        business.uploadedImage,
        business.image_url,
        business.image,
    ].find((img) => img && img.trim() !== '' && !isPngIcon(img as string));

    const galleryImages = cleanedGalleryImages.length > 0
        ? cleanedGalleryImages
        : (fallbackImageCandidate ? [fallbackImageCandidate] : []);

    // Default values for missing data
    const businessData = {
        id: business.id || businessId,
        slug: business.slug || businessId, // Use slug if available, fallback to ID
        name: business.name || 'Unnamed Business',
        description: business.description || `${business.category || 'Business'} located in ${business.location || 'Cape Town'}`,
        category: business.category || 'Business',
        location: business.location || 'Cape Town',
        address: business.address,
        phone: business.phone,
        email: business.email,
        website: business.website,
        price_range: business.price_range,
        verified: business.verified || false,
        rating: business.stats?.average_rating || 0,
        image: fallbackImageCandidate || '',
        images: galleryImages,
        trust: business.trust || business.stats?.percentiles?.trustworthiness || 85,
        punctuality: business.punctuality || business.stats?.percentiles?.punctuality || 85,
        friendliness: business.friendliness || business.stats?.percentiles?.friendliness || 85,
        specials: [], // TODO: Fetch from events/specials table
        reviews: business.reviews || [],
    };

    // Use slug for URLs, fallback to ID for SEO-friendly URLs
    const businessSlug = businessData.slug || businessData.id;

    const businessInfo: BusinessInfo = {
        name: businessData.name,
        description: businessData.description,
        category: businessData.category,
        location: businessData.location,
        address: businessData.address,
        phone: businessData.phone,
        email: businessData.email,
        website: businessData.website,
        price_range: businessData.price_range,
        verified: businessData.verified,
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={businessId}
                initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
                transition={{
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                    opacity: { duration: 0.5 },
                    filter: { duration: 0.55 }
                }}
                className="min-h-dvh bg-off-white font-urbanist"
                style={{
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                }}
            >
                {/* Main Header */}
                <Header
                  showSearch={false}
                  variant="white"
                  backgroundClassName="bg-navbar-bg"
                  topPosition="top-0"
                  reducedPadding={true}
                  whiteText={true}
                />

                <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                    <div className="pt-20 sm:pt-24">

                        {/* Main Content Section */}
                        <section
                            className="relative"
                            style={{
                                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                            }}
                        >
                            <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                                {/* Breadcrumb Navigation */}
                                <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
                                    <ol className="flex items-center gap-2 text-sm sm:text-base flex-nowrap overflow-x-auto scrollbar-hide">
                                        <li className="flex-shrink-0">
                                            <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium whitespace-nowrap" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Home
                                            </Link>
                                        </li>
                                        <li className="flex items-center flex-shrink-0">
                                            <ChevronRight className="w-4 h-4 text-charcoal/40" />
                                        </li>
                                        <li className="min-w-0 flex-1">
                                            <span className="text-charcoal font-semibold truncate block" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                {business?.name || 'Business'}
                                            </span>
                                        </li>
                                    </ol>
                                </nav>
                                <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                                        {/* Left Column - Main Content */}
                                        <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                                            <BusinessHeroImage
                                                image={businessData.image || businessData.images[0] || ""}
                                                alt={businessData.name}
                                                rating={businessData.rating}
                                                isLiked={isLiked}
                                                onLike={handleLike}
                                                verified={businessData.verified}
                                            />
                                            <BusinessInfoComponent
                                                name={businessData.name}
                                                rating={businessData.rating}
                                                location={businessData.location}
                                                category={businessData.category}
                                            />
                                            <BusinessDescription description={businessData.description} />
                                            <BusinessDetailsCard
                                                priceRange={businessData.price_range}
                                                verified={businessData.verified}
                                                hours={business.hours || business.opening_hours || business.openingHours || undefined}
                                            />

                                            {/* Contact Information - Mobile Only */}
                                            <div className="lg:hidden">
                                                <BusinessContactInfo
                                                    phone={businessData.phone}
                                                    website={businessData.website}
                                                    address={businessData.address}
                                                    email={businessData.email}
                                                    location={businessData.location}
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column - Sidebar */}
                                        <div className="space-y-4 sm:space-y-6">
                                            <BusinessActionCard
                                                businessSlug={businessSlug}
                                                businessId={businessId}
                                                isBusinessOwner={isBusinessOwner}
                                                hasReviewed={hasReviewed}
                                                ownerId={business.owner_id}
                                            />
                                            {/* Contact Information - Desktop Only */}
                                            <div className="hidden lg:block">
                                                <BusinessContactInfo
                                                    phone={businessData.phone}
                                                    website={businessData.website}
                                                    address={businessData.address}
                                                    email={businessData.email}
                                                    location={businessData.location}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section className="mx-auto w-full max-w-[2000px] px-2 sm:px-4 relative z-10">

                            {/* Reviews Section */}
                            <section className="space-y-6" aria-labelledby="reviews-heading">
                                <h2
                                    id="reviews-heading"
                                    className="text-h3 font-semibold text-charcoal pb-2 px-3 sm:px-4 py-1 rounded-lg cursor-default text-center justify-center"
                                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                                >
                                    Community Reviews
                                </h2>

                                {/* Reviews List Section */}
                                <section
                                    className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-6 sm:p-8"
                                    aria-label="Business reviews"
                                >
                                    <ReviewsList
                                        reviews={businessData.reviews.map((review: any): ReviewWithUser => ({
                                            id: review.id || '',
                                            business_id: businessId,
                                            user_id: review.userId || review.user_id || '',
                                            rating: review.rating || 0,
                                            title: review.title,
                                            content: review.text || review.content || '',
                                            tags: review.tags || [],
                                            helpful_count: review.helpful_count || 0,
                                            created_at: review.date || review.created_at || new Date().toISOString(),
                                            updated_at: review.updated_at || review.date || new Date().toISOString(),
                                            user: {
                                                id: review.userId || review.user_id || '',
                                                display_name: review.author || review.user?.display_name || 'Anonymous',
                                                avatar_url: review.profileImage || review.user?.avatar_url,
                                                username: review.user?.username,
                                                email: review.user?.email,
                                            },
                                            images: review.reviewImages?.map((img: string, idx: number) => ({
                                                id: `img-${idx}`,
                                                review_id: review.id || '',
                                                image_url: img,
                                                created_at: new Date().toISOString(),
                                            })) || [],
                                        }))}
                                        loading={false}
                                        error={null}
                                        showBusinessInfo={false}
                                        onUpdate={refetchBusiness}
                                        emptyMessage="No reviews yet. Be the first to review this business!"
                                        emptyStateAction={{
                                            label: hasReviewed ? 'Already Reviewed' : 'Write First Review',
                                            href: `/business/${businessSlug}/review`,
                                            disabled: hasReviewed,
                                        }}
                                    />
                                </section>
                            </section>

                            {/* Similar Businesses Section */}
                            <SimilarBusinesses
                                currentBusinessId={businessData.id}
                                currentBusinessSlug={businessData.slug}
                                category={businessData.category}
                                location={businessData.location}
                                limit={3}
                            />
                        </section>

                        <Footer />
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
