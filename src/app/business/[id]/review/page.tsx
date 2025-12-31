"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Fontdiner_Swanky } from "next/font/google";
import { Edit, Star, ChevronUp, Info, ChevronRight } from "react-feather";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useReviewForm } from "../../../hooks/useReviewForm";
import { useReviewSubmission, useReviews } from "../../../hooks/useReviews";
import { PageLoader } from "../../../components/Loader";
import ReviewForm from "../../../components/ReviewForm/ReviewForm";
import BusinessInfoAside from "../../../components/BusinessInfo/BusinessInfoAside";
import BusinessInfoModal, { BusinessInfo } from "../../../components/BusinessInfo/BusinessInfoModal";
import { PremiumReviewCard } from "../../../components/Business/PremiumReviewCard";
import { TestimonialCarousel } from "../../../components/Business/TestimonialCarousel";
import Footer from "../../../components/Footer/Footer";
import Header from "../../../components/Header/Header";
import { usePageTitle } from "../../../hooks/usePageTitle";
import AnimatedElement from "../../../components/Animations/AnimatedElement";
import WavyTypedTitle from "../../../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// CSS animations with elements spawning from different sides
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
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
  
  @keyframes slideInFromLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes slideInFromRight {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.96) translateY(-12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  
  @keyframes gentleFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out forwards;
  }
  
  .animate-slide-in-top {
    animation: slideInFromTop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  
  .animate-slide-in-left {
    animation: slideInFromLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  
  .animate-slide-in-right {
    animation: slideInFromRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  
  .animate-fade-in-scale {
    animation: fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  
  .animate-gentle-fade {
    animation: gentleFadeIn 0.7s ease-out forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
  .animate-delay-400 { animation-delay: 0.4s; opacity: 0; }
  .animate-delay-500 { animation-delay: 0.5s; opacity: 0; }
`;

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

  const { submitReview, submitting } = useReviewSubmission();
  
  // State for edit mode
  const [loadingReview, setLoadingReview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!editReviewId);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [originalImageIds, setOriginalImageIds] = useState<Array<{ id: string; url: string }>>([]);

  // Ensure form validity updates reactively
  const effectiveIsFormValid = useMemo(() => {
    return isFormValid && !submitting;
  }, [isFormValid, submitting]);

  // State for business data
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch reviews for "What others are saying" section - use actual business ID from loaded business
  // Only fetch after business data is loaded to ensure we have the actual database ID (not slug)
  const actualBusinessId = business?.id || businessId;
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(business?.id ? actualBusinessId : undefined);

  // Fetch existing review data if in edit mode
  useEffect(() => {
    async function fetchReviewForEdit() {
      if (!editReviewId || !isEditMode) return;

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
  }, [editReviewId, isEditMode, handleStarClick, setReviewTitle, setReviewText, setSelectedTags]);

  // Fetch business data using optimized API route
  useEffect(() => {
    async function fetchBusiness() {
      if (!businessId) {
        setError('No business ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/businesses/${businessId}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Business not found');
          } else {
            throw new Error('Failed to load business');
          }
          return;
        }

        const data = await response.json();
        setBusiness(data);
      } catch (err) {
        console.error('Error fetching business:', err);
        setError('Failed to load business information');
      } finally {
        setLoading(false);
      }
    }

    fetchBusiness();
  }, [businessId]);

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
  
  const isPngPlaceholder = (url: string | null | undefined) => {
    if (!url) return true;
    return url.startsWith('/png/') || url.includes('/png/');
  };
  
  const businessImages = useMemo(() => {
    if (!business) return [];
    
    // Priority 1: Use uploaded_images array (new structure)
    // First image in array is the primary/cover image
    let allImages: string[] = [];
    
    if (business.uploaded_images && Array.isArray(business.uploaded_images) && business.uploaded_images.length > 0) {
      allImages = business.uploaded_images
        .filter((url: string) => url && typeof url === 'string' && url.trim() !== '' && !isPngPlaceholder(url));
    }
    
    // Priority 2: Add image_url if not already included
    if (business.image_url && typeof business.image_url === 'string' && business.image_url.trim() !== '' && !isPngPlaceholder(business.image_url) && !allImages.includes(business.image_url)) {
      allImages.push(business.image_url);
    }
    
    // Priority 3: Add images from images array if provided
    if (Array.isArray(business.images)) {
      business.images.forEach((img: string) => {
        if (img && typeof img === 'string' && img.trim() !== '' && !isPngPlaceholder(img) && !allImages.includes(img)) {
          allImages.push(img);
        }
      });
    }
    
    // Priority 4: Add business.image as last fallback
    if (business.image && typeof business.image === 'string' && business.image.trim() !== '' && !isPngPlaceholder(business.image) && !allImages.includes(business.image)) {
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

  const quickTags = ["Trustworthy", "On Time", "Friendly", "Good Value"];

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

    // Create new review
    const success = await submitReview({
      business_id: actualBusinessId,
      rating: overallRating,
      title: reviewTitle,
      content: reviewText,
      tags: selectedTags,
      images: selectedImages,
    });

    if (success) {
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

      resetForm();
      
      // Note: Prioritization is now handled on the backend - the API will automatically
      // prioritize businesses the user has reviewed within the last 24 hours
      
      // Refetch reviews immediately so the new review appears first
      if (refetchReviews) {
        setTimeout(() => {
          refetchReviews();
        }, 500);
      }
      // Navigate back to business profile (fresh data will be fetched automatically)
      setTimeout(() => {
        // Use the business slug or ID for navigation - prefer slug for SEO-friendly URLs
        const targetId = business?.slug || business?.id || businessId;
        router.push(`/business/${targetId}`);
      }, 1500);
    }
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
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-sage text-white rounded-full text-body font-semibold hover:bg-sage/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animations }} />
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
            <main className="relative font-sf-pro" id="main-content" role="main" aria-label="Write review content">
              <div className="mx-auto w-full max-w-[2000px] px-3 relative z-10">
                {/* Breadcrumb Navigation */}
                <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
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
                      <ChevronRight className="w-4 h-4 text-charcoal/40" />
                    </li>
                    <li>
                      <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Review
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
                        <AnimatedElement index={0} direction="bottom">
                          <BusinessCarousel businessName={businessName} businessImages={businessImages} />
                        </AnimatedElement>

                        {/* Review Form Section - Separated from images */}
                          <AnimatedElement index={1} direction="right">
                        <article className="w-full sm:mx-0 flex items-center justify-center" aria-labelledby="review-form-heading">
                              <div className="bg-card-bg border-0 sm:border border-white/60 rounded-[20px] shadow-none sm:shadow-lg relative overflow-hidden mx-auto w-full">
                            <div className="relative z-10">
                              {/* Review Form */}
                              <div className="p-4 md:p-6">
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
                                />
                              </div>
                            </div>
                          </div>
                        </article>
                      </AnimatedElement>
                      </div>

                      {/* Sidebar - Business Info (Desktop Only) */}
                        <AnimatedElement index={2} direction="right">
                      <div className="hidden lg:block space-y-6">
                        <BusinessInfoAside
                          businessInfo={businessInfo}
                          className="self-start lg:sticky lg:top-28"
                          stacked={true}
                        />
                          </div>
                        </AnimatedElement>
                      </div>
                    </div>

                    {/* What Others Are Saying Section */}
                  <AnimatedElement index={3} direction="bottom">
                    <div className="lg:col-span-3 space-y-6">
                      <section className="space-y-6" aria-labelledby="what-others-saying-heading">
                        <div className="flex justify-center">
                          <div className="flex flex-col gap-3">
                            <h2 id="what-others-saying-heading" className="sr-only">What Others Are Saying</h2>
                            <WavyTypedTitle
                              text="What Others Are Saying"
                              as="h2"
                              className={`${swanky.className} text-h3 font-semibold text-charcoal border-b border-charcoal/10 pt-4 pb-2`}
                              typingSpeedMs={40}
                              startDelayMs={300}
                              waveVariant="subtle"
                              loopWave={true}
                              disableWave={true}
                              style={{ 
                                fontFamily: swanky.style.fontFamily,
                              }}
                            />
                          </div>
                        </div>

                        {reviewsLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <PageLoader size="md" variant="wavy" color="sage"  />
                          </div>
                        ) : reviews.length > 0 ? (
                          <div style={{ minHeight: '480px' }}>
                            <TestimonialCarousel
                              onDelete={() => {
                                // Refetch reviews after deletion
                                if (refetchReviews) {
                                  setTimeout(() => {
                                    refetchReviews();
                                  }, 500);
                                }
                              }}
                              reviews={[...reviews]
                                // Sort reviews by created_at descending (newest first)
                                .sort((a: any, b: any) => {
                                  const dateA = new Date(a.created_at || 0).getTime();
                                  const dateB = new Date(b.created_at || 0).getTime();
                                  return dateB - dateA;
                                })
                                .map((review: any, index: number) => {
                                  const profile = review.profile || {};
                                  // Extract review images - API provides image_url
                                  const reviewImages = review.review_images?.map((img: any) => img.image_url).filter(Boolean) || review.images || [];
                                  
                                  return {
                                    id: review.id,
                                    userId: review.user_id,
                                    author: profile.display_name || profile.username || review.author,
                                    rating: review.rating,
                                    text: review.content || review.text || review.title || '',
                                    date: review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      year: 'numeric'
                                    }) : review.date || '',
                                    tags: review.tags || [],
                                    highlight: index === 0 ? "Top Reviewer" : index < 2 ? "Local Guide" : undefined,
                                    verified: index < 2,
                                    profileImage: profile.avatar_url || review.profileImage,
                                    reviewImages: reviewImages,
                                    location: profile.location || review.location || '',
                                    profile: profile,
                                  };
                                })}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-charcoal/5 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Star className="w-8 h-8 text-charcoal/40" />
                            </div>
                            <h3 className="text-h2 font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                              No reviews yet
                            </h3>
                            <p className="text-body text-charcoal/70 mb-6 max-w-[70ch] mx-auto text-center" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                              Be the first to review this business!
                            </p>
                          </div>
                        )}
                      </section>
                    </div>
                  </AnimatedElement>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-[100] w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sage to-sage/90 hover:from-sage/90 hover:to-sage/80 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-sage/30 hover:scale-110"
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
            }}
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </button>
        )}

        <AnimatedElement index={4} direction="bottom">
        <Footer />
        </AnimatedElement>

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

