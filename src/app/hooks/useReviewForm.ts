"use client";

import { useState, useMemo, useCallback } from "react";

interface UseReviewFormReturn {
  overallRating: number;
  selectedTags: string[];
  reviewText: string;
  reviewTitle: string;
  selectedImages: File[];
  isFormValid: boolean;
  handleStarClick: (rating: number) => void;
  handleTagToggle: (tag: string) => void;
  setReviewText: (text: string) => void;
  setReviewTitle: (title: string) => void;
  setSelectedImages: (images: File[]) => void;
  setSelectedTags: (tags: string[]) => void;
  resetForm: () => void;
}

export function useReviewForm(): UseReviewFormReturn {
  const [overallRating, setOverallRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleStarClick = useCallback((rating: number) => {
    setOverallRating(rating);
  }, []);

  const isFormValid = useMemo(() => {
    const ratingValid = overallRating > 0;
    const textValid = reviewText.trim().length > 0;
    const valid = ratingValid && textValid;
    return valid;
  }, [overallRating, reviewText]);

  const setReviewTextCallback = useCallback((text: string) => {
    // Use functional update to ensure we're working with latest state
    setReviewText((prev) => {
      // Always return the new text to ensure state updates even if same value
      return text;
    });
  }, []);

  const setReviewTitleCallback = useCallback((title: string) => {
    setReviewTitle(title);
  }, []);

  const setSelectedImagesCallback = useCallback((images: File[]) => {
    setSelectedImages(images);
  }, []);

  const setSelectedTagsCallback = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);

  const resetForm = () => {
    setOverallRating(0);
    setSelectedTags([]);
    setReviewText("");
    setReviewTitle("");
    setSelectedImages([]);
  };

  return {
    overallRating,
    selectedTags,
    reviewText,
    reviewTitle,
    selectedImages,
    isFormValid,
    handleStarClick,
    handleTagToggle,
    setReviewText: setReviewTextCallback,
    setReviewTitle: setReviewTitleCallback,
    setSelectedImages: setSelectedImagesCallback,
    setSelectedTags: setSelectedTagsCallback,
    resetForm,
  };
}
