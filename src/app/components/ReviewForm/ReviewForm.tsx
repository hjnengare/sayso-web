"use client";

import BusinessInfo from "./BusinessInfo";
import BusinessCarousel from "./BusinessCarousel";
import RatingSelector from "./RatingSelector";
import TagSelector from "./TagSelector";
import ReviewTextForm from "./ReviewTextForm";
import ReviewSubmitButton from "./ReviewSubmitButton";
import dynamic from "next/dynamic";

const ImageUpload = dynamic(() => import("./ImageUpload"), {
  ssr: false,
  loading: () => (
    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-dashed border-navbar-bg/30 bg-off-white/30 animate-pulse" />
  ),
});

interface ReviewFormProps {
  businessName: string;
  businessRating: number;
  businessImages: string[];
  overallRating: number;
  selectedTags: string[];
  reviewText: string;
  reviewTitle: string;
  selectedImages: File[];
  isFormValid: boolean;
  availableTags: string[];
  onRatingChange: (rating: number) => void;
  onTagToggle: (tag: string) => void;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
  onImagesChange: (images: File[]) => void;
  onSubmit: () => void;
}

export default function ReviewForm({
  businessName,
  businessRating,
  businessImages,
  overallRating,
  selectedTags,
  reviewText,
  reviewTitle,
  selectedImages,
  isFormValid,
  availableTags,
  onRatingChange,
  onTagToggle,
  onTitleChange,
  onTextChange,
  onImagesChange,
  onSubmit,
}: ReviewFormProps) {
  return (
    <div className="p-0 md:p-8 mb-0 md:mb-8 relative overflow-hidden flex flex-col py-4 md:py-6">
      {/* Subtle glows - similar to review cards */}

      <div className="relative z-10 flex-1 flex flex-col">
        <RatingSelector overallRating={overallRating} onRatingChange={onRatingChange} />
        <TagSelector
          selectedTags={selectedTags}
          onTagToggle={onTagToggle}
          availableTags={availableTags}
        />
        <ReviewTextForm
          reviewTitle={reviewTitle}
          reviewText={reviewText}
          onTitleChange={onTitleChange}
          onTextChange={onTextChange}
        />

        {/* Image Upload */}
        <div className="mb-3 px-4">
          <h3 className="text-body-sm font-semibold text-charcoal mb-3 text-center md:text-left" style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}>
            Add Photos (Optional)
          </h3>
          <ImageUpload onImagesChange={onImagesChange} maxImages={5} disabled={false} />
        </div>

        <ReviewSubmitButton isFormValid={isFormValid} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
