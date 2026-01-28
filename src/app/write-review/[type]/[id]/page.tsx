"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Star, ArrowLeft, Calendar, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { PageLoader } from "../../../components/Loader";
import Footer from "../../../components/Footer/Footer";
import RatingSelector from "../../../components/ReviewForm/RatingSelector";
import ReviewTextForm from "../../../components/ReviewForm/ReviewTextForm";
import ReviewSubmitButton from "../../../components/ReviewForm/ReviewSubmitButton";
import OptimizedImage from "../../../components/Performance/OptimizedImage";

const ImageUpload = dynamic(() => import("../../../components/ReviewForm/ImageUpload"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-32 rounded-[20px] border-2 border-dashed border-charcoal/20 bg-charcoal/5 animate-pulse flex items-center justify-center">
      <Star className="w-8 h-8 text-charcoal/20" />
    </div>
  ),
});

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

  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const isFormValid = rating > 0 && content.trim().length > 0;

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loading) {
      showToast("Please log in to write a review", "sage");
      router.push("/login");
      return;
    }
  }, [user, loading, router, showToast]);

  // Fetch target data
  useEffect(() => {
    const fetchTarget = async () => {
      if (!type || !id) return;

      try {
        setLoading(true);
        let endpoint = "";

        if (type === "event") {
          endpoint = `/api/events/${id}`;
        } else if (type === "special") {
          endpoint = `/api/specials/${id}`;
        } else {
          throw new Error("Invalid type");
        }

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error("Target not found");
        }

        const data = await response.json();
        setTarget(data);
      } catch (error) {
        console.error("Error fetching target:", error);
        showToast("Item not found", "sage");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchTarget();
  }, [type, id, router, showToast]);

  const handleSubmit = async () => {
    if (!user || !target || rating === 0 || !content.trim()) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("target_id", id);
      formData.append("type", type);
      formData.append("rating", rating.toString());
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      formData.append("content", content.trim());
      images.forEach((image, index) => {
        const fileName = image.name && image.name.trim() ? image.name : `photo_${Date.now()}_${index}.jpg`;
        formData.append("images", image, fileName);
      });

      const response = await fetch("/api/reviews", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit review");
      }

      showToast("Review submitted successfully!", "success");
      router.push(type === "event" ? `/event/${id}` : `/special/${id}`);
    } catch (error) {
      console.error("Error submitting review:", error);
      showToast(error instanceof Error ? error.message : "Failed to submit review", "sage");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!target) {
    return (
      <div className="min-h-screen bg-off-white">
        <main className="pt-20 pb-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-charcoal mb-4">Item Not Found</h1>
              <p className="text-charcoal/70 mb-6">The item you're trying to review doesn't exist.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-navbar-bg text-white px-6 py-3 rounded-full font-semibold hover:scale-105 transition-transform"
              >
                <ArrowLeft className="w-4 h-4" />
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
  const displayTitle = isEvent ? (target as Event).name : (target as Special).title;
  const displayImage = target.image || (target.images && target.images[0]);
  const businessName = target.business_name;

  return (
    <div className="min-h-screen bg-off-white">
      <main className="pt-20 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Link
              href={isEvent ? `/event/${id}` : `/special/${id}`}
              className="inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {isEvent ? "Event" : "Special"}
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[20px] p-6 mb-6 shadow-sm"
          >
            <div className="flex gap-4">
              {/* Image */}
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
                    <Star className="w-8 h-8 text-charcoal/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-charcoal mb-1">{displayTitle}</h1>

                {businessName && (
                  <p className="text-charcoal/70 text-sm mb-2">by {businessName}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-charcoal/60">
                  {isEvent ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date((target as Event).date).toLocaleDateString()}</span>
                      </div>
                      {(target as Event).venue && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{(target as Event).venue}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {(target as Special).valid_until && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Valid until {new Date((target as Special).valid_until).toLocaleDateString()}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Review Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[20px] p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-charcoal mb-6">Write Your Review</h2>

            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-charcoal mb-3">
                Rating <span className="text-red-500">*</span>
              </label>
              <RatingSelector
                overallRating={rating}
                onRatingChange={setRating}
              />
            </div>

            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-charcoal mb-3">
                Review Title <span className="text-charcoal/50">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sum up your experience..."
                className="w-full px-4 py-3 border border-charcoal/20 rounded-lg focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors"
                maxLength={100}
              />
            </div>

            {/* Content */}
            <div className="mb-6">
              <ReviewTextForm
                reviewTitle={title}
                reviewText={content}
                onTitleChange={setTitle}
                onTextChange={setContent}
              />
            </div>

            {/* Images */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-charcoal mb-3">
                Photos <span className="text-charcoal/50">(optional)</span>
              </label>
              <ImageUpload
                existingImages={images.map((file) => URL.createObjectURL(file))}
                onImagesChange={setImages}
                maxImages={5}
              />
            </div>

            {/* Submit */}
            <ReviewSubmitButton
              onSubmit={handleSubmit}
              isSubmitting={submitting}
              isFormValid={isFormValid}
            />
          </motion.div>
        </div>
      </main>
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
