"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { m } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { PageLoader } from "../../../components/Loader";
import Footer from "../../../components/Footer/Footer";
import ReviewForm from "../../../components/ReviewForm/ReviewForm";
import OptimizedImage from "../../../components/Performance/OptimizedImage";
import { useReviewForm } from "../../../hooks/useReviewForm";
import { useDealbreakerQuickTags } from "../../../hooks/useDealbreakerQuickTags";
import { useReviewTarget } from "../../../hooks/useReviewTarget";
import { fireBadgeCelebration } from "../../../lib/celebration/badgeCelebration";

function IconStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconMapPin({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconClock({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Error code to message mapping
const REVIEW_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "You can post as Anonymous, or sign in for a verified profile review.",
  MISSING_FIELDS: "Please fill in all required fields.",
  INVALID_RATING: "Please select a rating (1-5 stars).",
  CONTENT_TOO_SHORT: "Your review is too short. Please write at least 10 characters.",
  VALIDATION_FAILED: "Please check your review and try again.",
  CONTENT_MODERATION_FAILED: "Your review contains content that doesn't meet our guidelines.",
  EVENT_NOT_FOUND: "We couldn't find that event. It may have been removed.",
  SPECIAL_NOT_FOUND: "We couldn't find that special. It may have expired.",
  DUPLICATE_ANON_REVIEW: "You already posted an anonymous review for this item on this device.",
  RATE_LIMITED: "Too many anonymous reviews in a short time. Please try again later.",
  SPAM_DETECTED: "This review was flagged as spam-like. Please adjust wording and try again.",
  DB_ERROR: "We couldn't save your review. Please try again.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
};

function getErrorMessage(result: { message?: string; code?: string; error?: string }): string {
  if (result.message) return result.message;
  if (result.code && REVIEW_ERROR_MESSAGES[result.code]) {
    return REVIEW_ERROR_MESSAGES[result.code];
  }
  if (result.error) return result.error;
  return "An error occurred. Please try again.";
}

// Types
interface Event {
  id: string;
  ticketmaster_id: string;
  name: string;
  image?: string;
  images?: string[];
  date: string;
  venue?: string;
  location?: string;
  description?: string;
  business_id?: string;
  business_name?: string;
}

interface Special {
  id: string;
  title: string;
  description?: string;
  image?: string;
  images?: string[];
  business_id?: string;
  business_name?: string;
  valid_from?: string;
  valid_until?: string;
  terms?: string;
}

type ReviewTarget = Event | Special;

function WriteReviewContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const type = params?.type as string;
  const id = params?.id as string;

  const { target: fetchedTarget, loading, error: targetError } = useReviewTarget(type, id);
  const target = fetchedTarget as ReviewTarget | null;
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

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
    resetForm,
  } = useReviewForm();

  const effectiveIsFormValid = isFormValid && reviewText.trim().length >= 10 && !submitting;
  const quickTags = useDealbreakerQuickTags();

  // Clear error when form fields change
  const handleRatingChange = (newRating: number) => {
    setFormError(null);
    handleStarClick(newRating);
  };

  const handleTitleChange = (newTitle: string) => {
    setFormError(null);
    setReviewTitle(newTitle);
  };

  const handleContentChange = (newContent: string) => {
    setFormError(null);
    setReviewText(newContent);
  };

  const handleImagesChange = (newImages: File[]) => {
    setFormError(null);
    setSelectedImages(newImages);
  };

  // Redirect if target not found after load
  useEffect(() => {
    if (!loading && targetError) {
      showToast("Item not found", "sage");
      router.back();
    }
  }, [loading, targetError, showToast, router]);

  const handleSubmit = async () => {
    setFormError(null);

    if (!target) {
      setFormError("Target not found. Please try again.");
      return;
    }

    if (overallRating === 0) {
      setFormError("Please select a rating (1-5 stars).");
      return;
    }

    if (reviewText.trim().length < 10) {
      setFormError("Your review is too short. Please write at least 10 characters.");
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("target_id", id);
      formData.append("type", type);
      formData.append("rating", overallRating.toString());
      if (reviewTitle.trim()) {
        formData.append("title", reviewTitle.trim());
      }
      formData.append("content", reviewText.trim());
      selectedTags.forEach((tag) => formData.append("tags", tag));

      // Honeypot
      const honeypotEl = document.querySelector('input[name="website_url"]') as HTMLInputElement;
      if (honeypotEl) {
        formData.append("website_url", honeypotEl.value);
      }

      selectedImages.forEach((image, index) => {
        const fileName = image.name && image.name.trim() ? image.name : `photo_${Date.now()}_${index}.jpg`;
        formData.append("images", image, fileName);
      });

      let anonymousId: string | null = null;
      if (!user) {
        const mod = await import("../../../lib/utils/anonymousClient");
        anonymousId = mod.getOrCreateAnonymousId();
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: anonymousId ? { "x-anonymous-id": anonymousId } : undefined,
        body: formData,
      });

      let result;
      try {
        result = await response.json();
      } catch {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      if (!response.ok || result.success === false) {
        const errorMessage = getErrorMessage(result);
        setFormError(errorMessage);
        return;
      }

      if (type === "event" && typeof window !== "undefined") {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reducedMotion) {
          import("canvas-confetti").then((mod) => {
            const confetti = mod.default;
            const colors = ["#7D9B76", "#E88D67", "#FFFFFF", "#FFD700"];
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, colors, zIndex: 9999 });
            confetti({ particleCount: 25, angle: 60, spread: 55, origin: { x: 0.2, y: 0.8 }, colors, zIndex: 9999 });
            confetti({ particleCount: 25, angle: 120, spread: 55, origin: { x: 0.8, y: 0.8 }, colors, zIndex: 9999 });
          }).catch(() => {});
        }
      }

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
      showToast("Review submitted successfully!", "success");
      resetForm();
      router.push(type === "event" ? `/event/${id}` : `/special/${id}`);
    } catch (error) {
      console.error("Error submitting review:", error);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!target) {
    return (
      <div className="min-h-dvh bg-off-white">
        <main className="pt-20 pb-12">
          <div className="mx-auto w-full max-w-[2000px] px-3">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-charcoal mb-4">Item Not Found</h1>
              <p className="text-charcoal/70 mb-6">The item you&apos;re trying to review doesn&apos;t exist.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-navbar-bg text-white px-6 py-3 rounded-full font-semibold hover:scale-105 transition-transform"
              >
                Go Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isEvent = type === "event";
  const displayTitle = isEvent
    ? ((target as Event).name || (target as any).title)
    : (target as Special).title;
  const displayImage =
    target.image || (target as any).image_url || (target.images && target.images[0]);
  const businessName = target.business_name;
  const displayVenue = isEvent
    ? ((target as Event).venue || (target as any).venue_name || (target as any).location)
    : (target as any).location;
  const displayDate = isEvent
    ? ((target as Event).date || (target as any).start_date)
    : null;

  return (
    <div
      className="min-h-dvh bg-off-white relative overflow-x-hidden font-urbanist"
      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />
      
      <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative z-10">
        <main className="relative" id="main-content" role="main" aria-label="Write review content">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />
          
          <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
            {/* Breadcrumb */}
            <nav className="pb-1" aria-label="Breadcrumb">
              <ol className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base flex-nowrap min-w-0">
                <li className="shrink-0">
                  <Link
                    href="/events-specials"
                    className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium whitespace-nowrap"
                  >
                    <span className="sm:hidden">{isEvent ? "Events" : "Specials"}</span>
                    <span className="hidden sm:inline">Events & Specials</span>
                  </Link>
                </li>
                <li className="flex items-center shrink-0">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-charcoal/60" />
                </li>
                <li className="min-w-0">
                  <Link
                    href={isEvent ? `/event/${id}` : `/special/${id}`}
                    className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium block truncate"
                    title={displayTitle}
                  >
                    {displayTitle}
                  </Link>
                </li>
                <li className="flex items-center shrink-0">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-charcoal/60" />
                </li>
                <li className="shrink-0">
                  <span className="text-charcoal font-semibold">Review</span>
                </li>
              </ol>
            </nav>

            <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
              <div className="grid gap-6 lg:grid-cols-3 items-start">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Event/Special Info Header */}
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card-bg border-none rounded-[12px] p-4 md:p-6 shadow-lg"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {displayImage ? (
                          <OptimizedImage
                            src={displayImage}
                            alt={displayTitle}
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-charcoal/10 flex items-center justify-center">
                            <IconStar className="w-8 h-8 text-charcoal/40" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h1 className="font-urbanist text-lg sm:text-xl font-bold text-charcoal mb-1 line-clamp-2">{displayTitle}</h1>

                        {businessName && (
                          <p className="text-charcoal/70 text-sm mb-2">by {businessName}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-charcoal/60">
                          {isEvent ? (
                            <>
                              {displayDate && (
                                <div className="flex items-center gap-1">
                                  <IconCalendar className="w-4 h-4 text-charcoal/70" />
                                  <span>{new Date(displayDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              {displayVenue && (
                                <div className="flex items-center gap-1">
                                  <IconMapPin className="w-4 h-4 text-charcoal/70" />
                                  <span className="truncate max-w-[200px]">{displayVenue}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {(target as Special).valid_until && (
                                <div className="flex items-center gap-1">
                                  <IconClock className="w-4 h-4 text-charcoal/70" />
                                  <span>Valid until {new Date((target as Special).valid_until!).toLocaleDateString()}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </m.div>

                  {/* Review Form */}
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card-bg border-0 sm:border-none rounded-[12px] shadow-none sm:shadow-lg relative overflow-hidden"
                  >
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
                    
                    <div className="p-4 md:p-6 relative z-10">
                      {!user && (
                        <div className="mb-4 rounded-lg border border-sage/20 bg-card-bg/5 p-3">
                          <p className="text-sm font-semibold text-charcoal">Posting as Anonymous</p>
                          <p className="mt-1 text-sm text-charcoal/70">
                            Sign in if you want this review tied to your profile identity.
                          </p>
                        </div>
                      )}

                      {/* Honeypot field - hidden from real users */}
                      <input
                        type="text"
                        name="website_url"
                        defaultValue=""
                        tabIndex={-1}
                        autoComplete="off"
                        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
                        aria-hidden="true"
                      />

                      <ReviewForm
                        businessName={displayTitle}
                        businessRating={0}
                        businessImages={displayImage ? [displayImage] : []}
                        overallRating={overallRating}
                        selectedTags={selectedTags}
                        reviewText={reviewText}
                        reviewTitle={reviewTitle}
                        selectedImages={selectedImages}
                        isFormValid={effectiveIsFormValid}
                        availableTags={quickTags}
                        onRatingChange={handleRatingChange}
                        onTagToggle={handleTagToggle}
                        onTitleChange={handleTitleChange}
                        onTextChange={handleContentChange}
                        onImagesChange={handleImagesChange}
                        onSubmit={handleSubmit}
                        existingImages={existingImageUrls}
                        onExistingImagesChange={setExistingImageUrls}
                        isSubmitting={submitting}
                        error={formError}
                      />
                    </div>
                  </m.div>
                </div>

                {/* Sidebar — context card (desktop only) */}
                <div className="hidden lg:block space-y-6">
                  <div className="bg-card-bg border-none rounded-[12px] p-5 shadow-lg sticky top-28">
                    <h3 className="font-urbanist text-base font-bold text-charcoal mb-3">
                      {isEvent ? "About this Event" : "About this Special"}
                    </h3>
                    {displayImage && (
                      <OptimizedImage
                        src={displayImage}
                        alt={displayTitle}
                        width={400}
                        height={220}
                        className="w-full h-40 rounded-lg object-cover mb-3"
                      />
                    )}
                    <p className="text-sm font-medium text-charcoal mb-1 line-clamp-2">{displayTitle}</p>
                    {businessName && (
                      <p className="text-sm text-charcoal/60 mb-3">by {businessName}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default function WriteReviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <WriteReviewContent />
    </Suspense>
  );
}
