"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Urbanist } from "next/font/google";
import { Edit, Star, ChevronUp, Info, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { useReviewForm } from "../../../hooks/useReviewForm";
import { useReviewSubmission, useReviews } from "../../../hooks/useReviews";
import { PageLoader } from "../../../components/Loader";
import ReviewForm from "../../../components/ReviewForm/ReviewForm";
import BusinessInfoAside from "../../../components/BusinessInfo/BusinessInfoAside";
import BusinessInfoModal, { BusinessInfo } from "../../../components/BusinessInfo/BusinessInfoModal";
import ReviewsList from "../../../components/Reviews/ReviewsList";
import Footer from "../../../components/Footer/Footer";
import WavyTypedTitle from "@/app/components/Animations/WavyTypedTitle";
import { isPlaceholderImage } from "../../../utils/subcategoryPlaceholders";
import { useDealbreakerQuickTags } from "../../../hooks/useDealbreakerQuickTags";
import { useBusinessDetail } from "../../../hooks/useBusinessDetail";
import { fireBadgeCelebration } from "../../../lib/celebration/badgeCelebration";

const urbanist = Urbanist({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

// CSS animations removed - using Framer Motion instead

// Lazy load BusinessCarousel for mobile
const BusinessCarousel = dynamic(() => import("../../../components/ReviewForm/BusinessCarousel"), {
  ssr: false,
  loading: () => <div className="h-48 bg-off-white/50 rounded-lg animate-pulse" />
});

function WriteReviewContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = (params?.id as string) || searchParams.get('business_id') || searchParams.get('businessId');
  const editReviewId = searchParams.get('edit'); // Get review ID if in edit mode

  const {
    overallRating,
    selectedTags,
    reviewText,
    reviewTitle,
    selectedImages,
    isFormValid,
    handleStarClick,
    handleTagToggle,
    setReviewText,
    setReviewTitle,
    setSelectedImages,
    setSelectedTags,
    resetForm,
  } = useReviewForm();

  const { user } = useAuth();
  const { showToast } = useToast();
  const { submitReview, submitting, error: submitError } = useReviewSubmission();

  // State for edit mode (guests cannot edit — only when logged in)
  const [loadingReview, setLoadingReview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!editReviewId);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [originalImageIds, setOriginalImageIds] = useState<Array<{ id: string; url: string }>>([]);

  // Ensure form validity updates reactively
  const effectiveIsFormValid = useMemo(() => {
    return isFormValid && !submitting;
  }, [isFormValid, submitting]);

  // Fetch business data via SWR
  const { business, loading, error } = useBusinessDetail(businessId);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch reviews for "What others are saying" section - use actual business ID from loaded business
  // Only fetch after business data is loaded to ensure we have the actual database ID (not slug)
  const actualBusinessId = business?.id || businessId;
  const { reviews, loading: reviewsLoading, refetch: refetchReviews, addOptimisticReview, replaceOptimisticReview } = useReviews(business?.id ? actualBusinessId : undefined);

  // Fetch existing review data if in edit mode (guests cannot edit)
  useEffect(() => {
    async function fetchReviewForEdit() {
      if (!editReviewId || !isEditMode || !user) return;

      try {
        setLoadingReview(true);
        const response = await fetch(`/api/reviews/${editReviewId}`);
        
        if (!response.ok) {
          console.error('Failed to fetch review for editing');
          return;
        }

        const data = await response.json();
        const review = data.review || data;

        // Populate form with existing review data
        if (review.rating) {
          handleStarClick(review.rating);
        }
        if (review.title) {
          setReviewTitle(review.title);
        }
        if (review.content) {
          setReviewText(review.content);
        }
        if (review.tags && Array.isArray(review.tags)) {
          // Set selected tags directly
          setSelectedTags(review.tags);
        }
        // Populate existing images
        if (review.review_images && Array.isArray(review.review_images)) {
          const imageData = review.review_images
            .map((img: any) => ({
              id: img.id,
              url: img.image_url,
            }))
            .filter((item: any) => item.url && item.url.trim() !== '');
          setOriginalImageIds(imageData);
          setExistingImageUrls(imageData.map((item: any) => item.url));
        } else if (review.images && Array.isArray(review.images)) {
          // Fallback to images array if review_images is not available
          const imageUrls = review.images
            .filter((url: string) => url && url.trim() !== '');
          setExistingImageUrls(imageUrls);
          // Create placeholder IDs for images without IDs
          setOriginalImageIds(imageUrls.map((url, idx) => ({ id: `temp-${idx}`, url })));
        }
      } catch (err) {
        console.error('Error fetching review for edit:', err);
      } finally {
        setLoadingReview(false);
      }
    }

    fetchReviewForEdit();
  }, [editReviewId, isEditMode, user, handleStarClick, setReviewTitle, setReviewText, setSelectedTags]);

  // Guests cannot edit: clear edit mode when not logged in
  useEffect(() => {
    if (!user && editReviewId) {
      setIsEditMode(false);
    } else if (user && editReviewId) {
      setIsEditMode(true);
    }
  }, [user, editReviewId]);

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Memoize computed values
  const businessName = useMemo(() => business?.name || "Loading...", [business?.name]);
  
  // Update page title dynamically when business name is available
  useEffect(() => {
    if (businessName && businessName !== "Loading...") {
      document.title = `SAYSO (Review ${businessName}) | Write a review for this business`;
    }
  }, [businessName]);
  
  const businessImages = useMemo(() => {
    if (!business) return [];

    let allImages: string[] = [];

    if (business.uploaded_images && Array.isArray(business.uploaded_images) && business.uploaded_images.length > 0) {
      allImages = business.uploaded_images
        .filter((url: string) => url && typeof url === 'string' && url.trim() !== '' && !isPlaceholderImage(url));
    }

    if (business.image_url && typeof business.image_url === 'string' && business.image_url.trim() !== '' && !isPlaceholderImage(business.image_url) && !allImages.includes(business.image_url)) {
      allImages.push(business.image_url);
    }

    if (Array.isArray(business.images)) {
      business.images.forEach((img: string) => {
        if (img && typeof img === 'string' && img.trim() !== '' && !isPlaceholderImage(img) && !allImages.includes(img)) {
          allImages.push(img);
        }
      });
    }

    if (business.image && typeof business.image === 'string' && business.image.trim() !== '' && !isPlaceholderImage(business.image) && !allImages.includes(business.image)) {
      allImages.push(business.image);
    }

    return allImages;
  }, [business?.uploaded_images, business?.image_url, business?.images, business?.image]);

  const businessRating = useMemo(() => 
    business?.stats?.average_rating || business?.business_stats?.[0]?.average_rating || 0,
    [business?.stats?.average_rating, business?.business_stats]
  );

  const businessInfo: BusinessInfo = useMemo(() => ({
    name: businessName,
    description: business?.description || '',
    category: business?.category || '',
    location: business?.location || '',
    address: business?.address || business?.location || '',
    phone: business?.phone || "",
    email: business?.email || "",
    website: business?.website || "",
    price_range: business?.price_range || '$$',
    verified: business?.verified || false,
  }), [businessName, business]);

  const quickTags = useDealbreakerQuickTags();

  const handleSubmitReview = async () => {
    // Use the actual database ID from the business object, not the URL slug
    const actualBusinessId = business?.id || businessId;
    
    if (!actualBusinessId) {
      alert('No business ID provided');
      return;
    }

    if (!business) {
      alert('Business information not loaded yet. Please wait...');
      return;
    }

    if (!isFormValid) {
      alert('Please fill in all required fields');
      return;
    }

    // If in edit mode, update the existing review
    if (isEditMode && editReviewId) {
      try {
        // First, update the review text/rating/tags
        const response = await fetch(`/api/reviews/${editReviewId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: overallRating,
            title: reviewTitle,
            content: reviewText,
            tags: selectedTags,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Failed to update review');
          return;
        }

        // Handle image updates if there are changes
        const currentImageUrls = new Set(existingImageUrls);
        const originalImageUrls = new Set(originalImageIds.map(img => img.url));
        
        // Find images that were removed
        const removedImageIds = originalImageIds
          .filter(img => !currentImageUrls.has(img.url))
          .map(img => img.id)
          .filter(id => !id.startsWith('temp-')); // Only remove real IDs, not temp placeholders

        // If there are new images to upload or images to remove, update images
        if (selectedImages.length > 0 || removedImageIds.length > 0) {
          const formData = new FormData();
          
          // Add new images
          selectedImages.forEach((file) => {
            formData.append('images', file);
          });
          
          // Add IDs of images to remove
          removedImageIds.forEach((id) => {
            formData.append('remove_image_ids', id);
          });
          
          formData.append('action', 'add'); // Add new images, don't replace all

          const imagesResponse = await fetch(`/api/reviews/${editReviewId}/images`, {
            method: 'PUT',
            body: formData,
          });

          if (!imagesResponse.ok) {
            const error = await imagesResponse.json();
            console.error('Failed to update review images:', error);
            // Don't fail the whole update if images fail, but log it
          }
        }

        // Success - navigate back to business page
        const targetId = business?.slug || business?.id || businessId;
        router.push(`/business/${targetId}`);
        return;
      } catch (err) {
        console.error('Error updating review:', err);
        alert('Failed to update review');
        return;
      }
    }

    // Build optimistic review to show immediately in the "What Others Are Saying" section
    const tempId = `optimistic-${Date.now()}`;
    const optimisticReview = {
      id: tempId,
      user_id: user?.id || null,
      business_id: actualBusinessId,
      rating: overallRating,
      title: reviewTitle || null,
      content: reviewText,
      tags: selectedTags,
      helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: user ? {
        user_id: user.id,
        display_name: (user as any).display_name || (user as any).user_metadata?.display_name || null,
        username: (user as any).username || (user as any).user_metadata?.username || null,
        avatar_url: (user as any).avatar_url || (user as any).user_metadata?.avatar_url || null,
      } : {},
      user: {
        id: user?.id || '',
        name: user ? ((user as any).display_name || (user as any).user_metadata?.display_name || 'You') : 'Anonymous',
        avatar_url: (user as any)?.avatar_url || (user as any)?.user_metadata?.avatar_url || null,
      },
      review_images: [],
      images: [],
    };

    // Insert optimistic review immediately
    addOptimisticReview?.(optimisticReview as any);

    // Create new review
    const result = await submitReview({
      business_id: actualBusinessId,
      rating: overallRating,
      title: reviewTitle,
      content: reviewText,
      tags: selectedTags,
      images: selectedImages,
    });

    if (!result.success) {
      // Rollback optimistic review on failure
      // removeReview is not destructured but we can refetch to clean up
      refetchReviews?.();
      return;
    }

    // Replace optimistic review with real data if available
    if (result.review?.id) {
      replaceOptimisticReview?.(tempId, {
        ...optimisticReview,
        ...result.review,
      } as any);
    }

    // Trigger confetti celebration
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Create confetti bursts from different positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#7D9B76', '#E88D67', '#FFFFFF', '#FFD700'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#7D9B76', '#E88D67', '#FFFFFF', '#FFD700'],
      });
    }, 250);

    // Check for newly earned badges
    if (user?.id) {
      fetch("/api/badges/check-and-award", { method: "POST", credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data?.newBadges?.length > 0) {
            void fireBadgeCelebration(`review-badge-${Date.now()}`);
          }
        })
        .catch(() => {});
    }

    resetForm();

    // Navigate back to business profile with a full page load to guarantee fresh data.
    // router.push uses Next.js client-side cache which can serve stale reviews.
    setTimeout(() => {
      const targetId = business?.slug || business?.id || businessId;
      window.location.href = `/business/${targetId}`;
    }, 1500);
  };

  // Loading state
  if (loading) {
    return <PageLoader size="lg" variant="wavy" color="sage"  />;
  }

  // Error state
  if (error || !business) {
    return (
      <div className="min-h-dvh bg-off-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-h1 font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
            {error || 'Business not found'}
          </h2>
          <p className="text-body text-charcoal/70 mb-6" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            {error || "The business you're looking for doesn't exist."}
          </p>
          <m.button
            onClick={() => router.back()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-card-bg text-white rounded-full text-body font-semibold"
          >
            Go Back
          </m.button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .font-urbanist {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "SF Pro Display", "Helvetica Neue", Helvetica, Arial, system-ui,
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
        }
      `}</style>
      <div
        className="min-h-dvh bg-off-white relative overflow-x-hidden font-urbanist"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
        }}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />
        
        {/* Main Header */}

        <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
            <main className="relative font-sf-pro" id="main-content" role="main" aria-label="Write review content">
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />
              
              <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
                {/* Breadcrumb Navigation */}
                <nav className="pb-1" aria-label="Breadcrumb">
                  <ol className="flex items-center gap-2 text-sm sm:text-base">
                    <li>
                      <Link
                        href={`/business/${business?.slug || business?.id || businessId}`}
                        className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium truncate max-w-[200px] sm:max-w-none"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        {businessName}
                      </Link>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-charcoal/60" />
                    </li>
                    <li>
                      <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Write Review
                      </span>
                    </li>
                  </ol>
                </nav>
                <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
                  <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3 items-start">
                      {/* Main Content Section */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Image Gallery Section - Matching Business Profile */}
                          <BusinessCarousel businessName={businessName} businessImages={businessImages} subcategorySlug={business?.sub_interest_id ?? business?.subInterestId} />
                    
                        {/* Review Form Section - Separated from images */}
                        <article className="w-full sm:mx-0 flex items-center justify-center" aria-labelledby="review-form-heading">
                          <div className="bg-card-bg border-0 sm:border-none rounded-[12px] shadow-none sm:shadow-lg relative overflow-hidden mx-auto w-full">
                            <div className="relative z-10">
                              {/* Review Form */}
                              <div className="p-4 md:p-6">
                                {!user && (
                                  <div className="mb-4 rounded-lg border border-sage/20 bg-card-bg/5 p-3">
                                    <p className="text-sm font-semibold text-charcoal">Posting as Anonymous</p>
                                    <p className="mt-1 text-xs text-charcoal/70">
                                      Sign in if you want this review tied to your profile identity.
                                    </p>
                                  </div>
                                )}
                                <ReviewForm
                                  businessName={businessName}
                                  businessRating={businessRating}
                                  businessImages={businessImages}
                                  overallRating={overallRating}
                                  selectedTags={selectedTags}
                                  reviewText={reviewText}
                                  reviewTitle={reviewTitle}
                                  selectedImages={selectedImages}
                                  isFormValid={effectiveIsFormValid}
                                  availableTags={quickTags}
                                  onRatingChange={handleStarClick}
                                  onTagToggle={handleTagToggle}
                                  onTitleChange={setReviewTitle}
                                  onTextChange={setReviewText}
                                  onImagesChange={setSelectedImages}
                                  onSubmit={handleSubmitReview}
                                  existingImages={existingImageUrls}
                                  onExistingImagesChange={setExistingImageUrls}
                                  isSubmitting={submitting}
                                  error={submitError}
                                />
                              </div>
                            </div>
                          </div>
                        </article>
                      </div>

                      {/* Sidebar - Business Info (Desktop Only) */}
                      <div className="hidden lg:block space-y-6">
                        <BusinessInfoAside
                          businessInfo={businessInfo}
                          className="self-start lg:sticky lg:top-28"
                          stacked={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* What Others Are Saying Section */}
                    <div className="lg:col-span-3 space-y-6">
                      <section className="space-y-6 pt-12" aria-labelledby="what-others-saying-heading">
                        <div className="flex justify-center">
                          <div className="flex flex-col gap-3">
                            <h2 id="what-others-saying-heading" className="sr-only">What Others Are Saying</h2>
                            <WavyTypedTitle
                              text="What Others Are Saying"
                              as="h2"
                              className={`${urbanist.className} text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal border-b border-charcoal/10 pt-4 pb-2`}
                              typingSpeedMs={40}
                              startDelayMs={300}
                              waveVariant="subtle"
                              loopWave={true}
                              disableWave={true}
                              style={{ 
                                fontFamily: urbanist.style.fontFamily,
                              }}
                            />
                          </div>
                        </div>

                        <ReviewsList
                          reviews={reviews}
                          loading={reviewsLoading}
                          error={null}
                          showBusinessInfo={false}
                          businessId={businessId}
                          onUpdate={refetchReviews}
                          emptyMessage="Be the first to review this business!"
                        />
                      </section>
                    </div>
                </div>
              </div>
            </main>
          </div>

        <Footer />

        {/* Business Info Modal - Mobile Only */}
        {businessInfo && (
          <BusinessInfoModal
            businessInfo={businessInfo}
            buttonRef={infoButtonRef}
            isOpen={isInfoModalOpen}
            onClose={() => setIsInfoModalOpen(false)}
          />
        )}
      </div>
    </>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function WriteReviewPage() {
  return (
    <Suspense fallback={<PageLoader size="xl" variant="wavy" color="sage"  />}>
      <WriteReviewContent />
    </Suspense>
  );
}

