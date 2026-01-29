"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PageLoader, Loader } from "../../components/Loader";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";
import {
    MessageSquare,
    X,
    ChevronRight,
} from "lucide-react";
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
    PersonalizationInsights,
} from "../../components/BusinessDetail";
import BusinessLocation from "../../components/BusinessDetail/BusinessLocation";
import BusinessOwnedEventsSection from "../../components/BusinessDetail/BusinessOwnedEventsSection";
export default function BusinessProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const businessId = params?.id as string;
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const { showToast } = useToast();
    const { hasReviewed } = useUserHasReviewed(businessId);
    const mapSectionRef = useRef<HTMLDivElement>(null);

    const scrollToMap = () => {
        mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };


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
        // Handle description as string or object { raw, friendly }
        const getDescriptionText = (desc: any): string => {
            if (!desc) return `${business.category || 'Business'} located in ${business.location || 'Cape Town'}`;
            if (typeof desc === 'string') return desc;
            if (typeof desc === 'object' && 'friendly' in desc) return desc.friendly || desc.raw || '';
            if (typeof desc === 'object' && 'raw' in desc) return desc.raw || '';
            return `${business.category || 'Business'} located in ${business.location || 'Cape Town'}`;
        };
        const businessDescription = getDescriptionText(business.description);

        if (navigator.share) {
            navigator.share({
                title: businessName,
                text: businessDescription,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            showToast("Copied to clipboard", "sage");
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
    const getDescriptionForTitle = (desc: any): string => {
        if (!desc) return "Read reviews and see photos";
        if (typeof desc === 'string') return desc;
        if (typeof desc === 'object' && 'friendly' in desc) return desc.friendly || desc.raw || "Read reviews and see photos";
        if (typeof desc === 'object' && 'raw' in desc) return desc.raw || "Read reviews and see photos";
        return "Read reviews and see photos";
    };
    
    usePageTitle(
        business?.name || "Loading...",
        getDescriptionForTitle(business?.description)
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
                    setError('Business not found or has been deleted');
                    // Business might have been deleted - emit deletion event
                    import('../../lib/utils/businessUpdateEvents').then(({ notifyBusinessDeleted }) => {
                        notifyBusinessDeleted(businessId);
                    }).catch(err => {
                        console.error('Error emitting deletion event:', err);
                    });
                } else if (response.status === 400) {
                    setError('Invalid business ID');
                } else if (response.status >= 500) {
                    // Try to get error details from response
                    let errorMessage = 'Server error loading business';
                    try {
                        const errorData = await response.json();
                        if (errorData.details) {
                            errorMessage = `Server error: ${errorData.details}`;
                        }
                    } catch {
                        // Ignore if response is not JSON
                    }
                    setError(errorMessage);
                    console.error('Server error fetching business:', { status: response.status, businessId });
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
            setError(`Failed to load business: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBusiness();
    }, [businessId, router]);

    // Refetch when page becomes visible (e.g., returning from edit page)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && businessId) {
                // Small delay to ensure edit page has finished redirecting
                setTimeout(() => {
                    fetchBusiness(true);
                }, 100);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Also refetch on focus (when user returns to tab)
        const handleFocus = () => {
            if (businessId) {
                fetchBusiness(true);
            }
        };
        
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [businessId]);

    // Listen for business deletion events
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        
        import('../../lib/utils/businessUpdateEvents').then(({ businessUpdateEvents }) => {
            unsubscribe = businessUpdateEvents.onDelete((deletedBusinessId: string) => {
                // If this business was deleted, redirect to home
                if (deletedBusinessId === businessId) {
                    showToast('This business has been deleted', 'sage', 3000);
                    setTimeout(() => {
                        router.push('/home');
                    }, 1000);
                }
            });
        }).catch(err => {
            console.error('Error loading business update events:', err);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [businessId, router, showToast]);

    // Refetch function for after delete
    const refetchBusiness = () => {
        fetchBusiness(true);
    };

    // Loading state - show skeleton components with proper layout matching actual page
    if (isLoading) {
        return (
            <div className="min-h-dvh bg-off-white">
                <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                    <div className="pt-20 sm:pt-24">
                        <section className="relative" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                            <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                                {/* Breadcrumb Skeleton */}
                                <nav className="pt-2 px-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-12 bg-charcoal/10 rounded animate-pulse" />
                                        <div className="h-4 w-4 bg-charcoal/5 rounded animate-pulse" />
                                        <div className="h-5 w-32 bg-charcoal/10 rounded animate-pulse" />
                                    </div>
                                </nav>

                                <div className="pt-2">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                                        {/* Left Column - Main Content */}
                                        <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                                            {/* Hero Image Skeleton */}
                                            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden border border-white/60 backdrop-blur-xl shadow-md animate-pulse">
                                                {/* Rating badge skeleton */}
                                                <div className="absolute right-4 top-4 z-20 h-8 w-16 rounded-full bg-off-white/40" />
                                                {/* Verified badge skeleton */}
                                                <div className="absolute left-4 top-4 z-20 h-8 w-24 rounded-full bg-sage/30" />
                                                {/* Gallery indicators skeleton */}
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className={`h-1.5 rounded-full bg-white/50 ${i === 1 ? 'w-6' : 'w-1.5'}`} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Business Info Skeleton */}
                                            <div className="space-y-3 px-2">
                                                <div className="h-8 sm:h-10 w-3/4 bg-charcoal/10 rounded-lg animate-pulse" />
                                                <div className="flex items-center gap-3">
                                                    <div className="h-5 w-20 bg-charcoal/5 rounded animate-pulse" />
                                                    <div className="h-5 w-32 bg-charcoal/5 rounded animate-pulse" />
                                                </div>
                                            </div>

                                            {/* Description Skeleton */}
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6">
                                                <div className="space-y-3">
                                                    <div className="h-4 bg-white/30 rounded animate-pulse" />
                                                    <div className="h-4 bg-white/30 rounded animate-pulse" />
                                                    <div className="h-4 bg-white/30 rounded w-3/4 animate-pulse" />
                                                </div>
                                            </div>

                                            {/* Details Cards Skeleton */}
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="space-y-2">
                                                            <div className="h-4 w-16 bg-white/20 rounded animate-pulse" />
                                                            <div className="h-6 w-24 bg-white/30 rounded animate-pulse" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Map Skeleton */}
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md overflow-hidden">
                                                <div className="h-[200px] sm:h-[300px] bg-sage/10 animate-pulse" />
                                                <div className="p-4 space-y-2">
                                                    <div className="h-5 w-48 bg-white/30 rounded animate-pulse" />
                                                    <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
                                                </div>
                                            </div>

                                            {/* Contact Info Skeleton - Mobile */}
                                            <div className="lg:hidden bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6">
                                                <div className="space-y-4">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse" />
                                                            <div className="h-5 w-32 bg-white/30 rounded animate-pulse" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column - Sidebar */}
                                        <div className="space-y-4 sm:space-y-6">
                                            {/* Action Card Skeleton */}
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6">
                                                <div className="space-y-4">
                                                    <div className="h-12 w-full bg-sage/40 rounded-full animate-pulse" />
                                                    <div className="h-12 w-full bg-coral/40 rounded-full animate-pulse" />
                                                    <div className="flex gap-3">
                                                        <div className="h-10 flex-1 bg-white/30 rounded-full animate-pulse" />
                                                        <div className="h-10 flex-1 bg-white/30 rounded-full animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Personalization Insights Skeleton */}
                                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6">
                                                <div className="h-6 w-40 bg-white/30 rounded animate-pulse mb-4" />
                                                <div className="space-y-3">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-white/20 animate-pulse" />
                                                            <div className="h-4 flex-1 bg-white/20 rounded animate-pulse" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Contact Info Skeleton - Desktop */}
                                            <div className="hidden lg:block bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6">
                                                <div className="space-y-4">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse" />
                                                            <div className="h-5 w-32 bg-white/30 rounded animate-pulse" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Reviews Section Skeleton */}
                        <section className="mx-auto w-full max-w-[2000px] px-2 relative z-10 mt-8">
                            <div className="text-center mb-6">
                                <div className="h-7 w-48 bg-charcoal/10 rounded-lg mx-auto animate-pulse" />
                            </div>
                            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6 sm:p-8">
                                <div className="space-y-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="border-b border-white/20 pb-6 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white/20 animate-pulse flex-shrink-0" />
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-5 w-24 bg-white/30 rounded animate-pulse" />
                                                        <div className="h-4 w-16 bg-white/20 rounded animate-pulse" />
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <div key={s} className="w-4 h-4 bg-white/20 rounded animate-pulse" />
                                                        ))}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="h-4 bg-white/20 rounded animate-pulse" />
                                                        <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
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

    // Prepare image data - prioritize uploaded_images array, fallback to legacy fields
    let allImages: string[] = [];
    let primaryImage = '';
    
    // Use uploaded_images array (new structure)
    // First image in array is the primary/cover image
    if (business.uploaded_images && Array.isArray(business.uploaded_images) && business.uploaded_images.length > 0) {
        allImages = business.uploaded_images
            .filter((url: string) => url && typeof url === 'string' && url.trim() !== '' && !isPngIcon(url));
        primaryImage = allImages[0] || '';
    }
    
    // Add image_url if not already included
    if (business.image_url && typeof business.image_url === 'string' && business.image_url.trim() !== '' && !isPngIcon(business.image_url) && !allImages.includes(business.image_url)) {
        allImages.push(business.image_url);
    }
    
    // Add images from images array if provided
    if (Array.isArray(business.images)) {
        business.images.forEach((img: string) => {
            if (img && typeof img === 'string' && img.trim() !== '' && !isPngIcon(img) && !allImages.includes(img)) {
                allImages.push(img);
            }
        });
    }
    
    // Add business.image as last fallback
    if (business.image && typeof business.image === 'string' && business.image.trim() !== '' && !isPngIcon(business.image) && !allImages.includes(business.image)) {
        allImages.push(business.image);
    }
    
    primaryImage = allImages[0] || '';

    const galleryImages = allImages;

    // Default values for missing data
    const businessData = {
        id: business.id || businessId,
        slug: business.slug || businessId, // Use slug if available, fallback to ID
        name: business.name || 'Unnamed Business',
        description: (() => {
            const desc = business.description;
            if (!desc) return `${business.category || 'Business'} located in ${business.location || 'Cape Town'}`;
            if (typeof desc === 'string') return desc;
            if (typeof desc === 'object' && 'friendly' in desc) return desc.friendly || desc.raw || '';
            if (typeof desc === 'object' && 'raw' in desc) return desc.raw || '';
            return `${business.category || 'Business'} located in ${business.location || 'Cape Town'}`;
        })(),
        category: business.category || 'Business',
        location: business.location || 'Cape Town',
        address: business.address,
        latitude: business.lat || business.latitude || null,
        longitude: business.lng || business.longitude || null,
        phone: business.phone,
        email: business.email,
        website: business.website,
        price_range: business.price_range,
        verified: business.verified || false,
        rating: business.stats?.average_rating || 0,
        image: primaryImage,
        images: galleryImages,
        uploaded_images: business.uploaded_images || [], // Preserve uploaded_images array
        trust: business.trust || business.stats?.percentiles?.trustworthiness || 100,
        punctuality: business.punctuality || business.stats?.percentiles?.punctuality || 100,
        friendliness: business.friendliness || business.stats?.percentiles?.friendliness || 100,
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
        <div
            className="min-h-dvh bg-off-white font-urbanist"
            style={{
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            }}
        >
                {/* Main Header */}

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
                                <nav className="py-1" aria-label="Breadcrumb">
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
                                            <span className="text-charcoal font-semibold truncate max-w-[200px] sm:max-w-none" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                {business?.name || 'Business'}
                                            </span>
                                        </li>
                                    </ol>
                                </nav>
                                <div className="pt-2">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                                        {/* Left Column - Main Content */}
                                        <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                                            <BusinessHeroImage
                                                image={businessData.image || businessData.images[0] || ""}
                                                alt={businessData.name}
                                                rating={businessData.rating}
                                                verified={businessData.verified}
                                                images={businessData.images}
                                                uploaded_images={businessData.uploaded_images}
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

                                            {/* Location Map */}
                                            <div ref={mapSectionRef}>
                                                <BusinessLocation
                                                    name={businessData.name}
                                                    address={businessData.address}
                                                    location={businessData.location}
                                                    latitude={businessData.latitude}
                                                    longitude={businessData.longitude}
                                                    isUserUploaded={!!business.owner_id}
                                                />
                                            </div>

                                            {/* Business Events & Specials */}
                                            <BusinessOwnedEventsSection
                                                businessId={businessData.id}
                                                businessName={businessData.name}
                                            />

                                            {/* Contact Information - Mobile Only */}
                                            <div className="lg:hidden">
                                                <BusinessContactInfo
                                                    phone={businessData.phone}
                                                    website={businessData.website}
                                                    address={businessData.address}
                                                    email={businessData.email}
                                                    location={businessData.location}
                                                    onViewMap={scrollToMap}
                                                    showMapLink={!!(businessData.address || businessData.location || businessData.latitude)}
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
                                            />
                                            
                                            {/* Personalization Insights */}
                                            <PersonalizationInsights
                                                business={{
                                                    id: businessData.id,
                                                    interestId: business.interest_id,
                                                    subInterestId: business.sub_interest_id,
                                                    category: businessData.category,
                                                    priceRange: businessData.price_range,
                                                    averageRating: businessData.rating,
                                                    totalReviews: business.reviews?.length || 0,
                                                    distanceKm: null, // Could add geolocation later
                                                    percentiles: business.stats?.percentiles || null,
                                                    verified: businessData.verified,
                                                }}
                                            />
                                            
                                            {/* Contact Information - Desktop Only */}
                                            <div className="hidden lg:block">
                                                <BusinessContactInfo
                                                    phone={businessData.phone}
                                                    website={businessData.website}
                                                    address={businessData.address}
                                                    email={businessData.email}
                                                    location={businessData.location}
                                                    onViewMap={scrollToMap}
                                                    showMapLink={!!(businessData.address || businessData.location || businessData.latitude)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <section className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                            {/* Reviews Section */}
                            <section className="space-y-6" aria-labelledby="reviews-heading">
                                <div className="text-center justify-center pb-2 px-3 sm:px-4 py-1">
                                    <h1 id="reviews-heading" className="sr-only">Community Reviews</h1>
                                    <WavyTypedTitle
                                        text="Community Reviews"
                                        as="h1"
                                        className="font-urbanist text-lg sm:text-xl font-700 text-charcoal rounded-lg cursor-default"
                                        typingSpeedMs={40}
                                        startDelayMs={300}
                                        disableWave={true}
                                        style={{ 
                                            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                            fontWeight: 700,
                                        }}
                                    />
                                </div>

                                {/* Reviews List Section */}
                                <section
                                    className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-md p-6 sm:p-8"
                                    aria-label="Business reviews"
                                >
                                    <ReviewsList
                                        reviews={businessData.reviews.map((review: any): ReviewWithUser => {
                                            // Ensure we use ISO date format, not formatted date strings
                                            const getValidDate = (dateValue: any): string => {
                                                if (!dateValue) return new Date().toISOString();
                                                // If it's already an ISO string, use it
                                                if (typeof dateValue === 'string' && dateValue.includes('T') && dateValue.includes('Z')) {
                                                    return dateValue;
                                                }
                                                // Try to parse as date
                                                const parsed = new Date(dateValue);
                                                if (!isNaN(parsed.getTime())) {
                                                    return parsed.toISOString();
                                                }
                                                // Fallback to current date
                                                return new Date().toISOString();
                                            };
                                            
                                            // Extract images from review.images (array of objects) or review.reviewImages (legacy string array)
                                            const reviewImages = review.images || review.reviewImages || [];
                                            const normalizedImages = Array.isArray(reviewImages) && reviewImages.length > 0
                                                ? reviewImages.map((img: any, idx: number) => {
                                                    // If it's already an object with image_url, use it
                                                    if (typeof img === 'object' && img.image_url) {
                                                        return {
                                                            id: img.id || `img-${idx}`,
                                                            review_id: img.review_id || review.id || '',
                                                            image_url: img.image_url,
                                                            alt_text: img.alt_text || null,
                                                            created_at: img.created_at || new Date().toISOString(),
                                                        };
                                                    }
                                                    // If it's a string URL, convert to object
                                                    if (typeof img === 'string') {
                                                        return {
                                                            id: `img-${idx}`,
                                                            review_id: review.id || '',
                                                            image_url: img,
                                                            alt_text: null,
                                                            created_at: new Date().toISOString(),
                                                        };
                                                    }
                                                    return null;
                                                }).filter(Boolean)
                                                : [];

                                            // Generate display name using the same logic as API
                                            const profile = review.profile || {};
                                            const userId = review.userId || review.user_id || profile.user_id || '';
                                            const displayName = profile.display_name || profile.username || review.author || review.user?.display_name || 'User';
                                            
                                            return {
                                                id: review.id || '',
                                                business_id: businessId,
                                                user_id: userId,
                                                rating: review.rating || 0,
                                                title: review.title,
                                                content: review.text || review.content || '',
                                                tags: review.tags || [],
                                                helpful_count: review.helpful_count || 0,
                                                created_at: getValidDate(review.created_at || review.date),
                                                updated_at: getValidDate(review.updated_at || review.created_at || review.date),
                                                user: {
                                                    id: userId,
                                                    name: displayName, // Use name field for consistency
                                                    display_name: displayName,
                                                    avatar_url: profile.avatar_url || review.profileImage || review.user?.avatar_url,
                                                    username: profile.username || review.user?.username,
                                                    email: review.user?.email || null,
                                                },
                                                images: normalizedImages,
                                            };
                                        })}
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
                                currentBusinessId={businessId}
                                category={businessData.category}
                                location={businessData.location}
                                interestId={business?.interest_id || business?.interestId}
                                subInterestId={business?.sub_interest_id || business?.subInterestId}
                                limit={3}
                            />
                        </section>

                        <div className="border-t border-charcoal/10"></div>
                        <Footer />
                    </div>
                </div>
        </div>
    );
}
