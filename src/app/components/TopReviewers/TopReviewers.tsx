"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import ReviewerCard from "../ReviewerCard/ReviewerCard";
import { Reviewer } from "../../types/community";
import { useReviewersTop } from "../../hooks/useReviewersTop";

// Sample review texts for variety
const sampleReviewTexts = [
  "Absolutely love this place! Great atmosphere and amazing service. Will definitely come back!",
  "The best spot in town! Quality is top-notch and the staff is incredibly friendly.",
  "Hidden gem discovered! Food was incredible and the ambiance is perfect for a relaxed evening.",
  "Outstanding experience! Every detail was perfect, from service to quality. Highly recommend!",
  "Wow, just wow! Exceeded all my expectations. This is my new favorite spot in the area.",
  "Incredible find! Great value for money and the atmosphere is unbeatable. Can't wait to return!",
  "Perfect place for a date night! Romantic ambiance, delicious food, and excellent service.",
  "Top tier quality! The attention to detail here is amazing. Will be a regular customer for sure.",
  "Fantastic experience all around! Staff went above and beyond to make our visit memorable.",
  "This place never disappoints! Consistent quality and friendly service every single time.",
  "Amazing spot with great vibes! The perfect blend of quality, service, and atmosphere.",
  "Exceptional! From the moment we walked in, everything was perfect. Must visit!"
];

interface TopReviewersProps {
  title?: string;
  reviewers?: Reviewer[]; // Optional - will fetch from API if not provided
  cta?: string;
  href?: string;
}

export default function TopReviewers({
  title = "Top Reviewers",
  reviewers: propReviewers,
  cta = "See More",
  href = "/reviewers"
}: TopReviewersProps) {
  const router = useRouter();

  // Use SWR hook only when reviewers are not passed via props
  const { reviewers: fetchedReviewers, loading } = useReviewersTop(propReviewers ? 0 : 12);
  const reviewers = propReviewers ?? fetchedReviewers;

  const handleSeeMore = () => {
    router.push(href);
  };

  if (!propReviewers && loading) {
    return (
      <section className="py-8 bg-off-white relative" aria-label="top reviewers">
        <div className="container mx-auto max-w-[1300px] px-4 relative z-10">
          <div className="text-center text-charcoal/60">Loading top reviewers...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 bg-off-white  relative" aria-label="top reviewers" data-section>
      {/* Subtle section decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-20 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-gradient-to-br from-coral/8 to-transparent rounded-full blur-xl" />
      </div>

      <div className="container mx-auto max-w-[1300px] px-4 relative z-10">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-[18px]">
          <h2 className="font-urbanist text-lg font-800 text-charcoal relative">
            {title}

          </h2>
          <button
            onClick={handleSeeMore}
            className="group font-urbanist font-700 text-charcoal/70 transition-all duration-300 hover:text-sage text-base flex items-center gap-1"
          >
            <span className="transition-transform duration-300 group-hover:translate-x-[-2px]">
              {cta}
            </span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-[2px]" />
          </button>
        </div>

        <div className="overflow-x-auto -mb-6">
          <ul className="flex gap-3 pb-4 sm:pb-5 md:pb-6 pt-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {reviewers.map((reviewer, index) => {
              // Get a consistent review text for each reviewer based on their ID
              const reviewIndex = parseInt(reviewer.id) % sampleReviewTexts.length;
              const sampleText = sampleReviewTexts[reviewIndex];

              return (
                <ReviewerCard
                  key={reviewer.id}
                  reviewer={reviewer}
                  index={index}
                  latestReview={{
                    id: `${reviewer.id}-latest`,
                    reviewer,
                    businessName: `${reviewer.location} Favorite`,
                    businessType: "Local Business",
                    rating: reviewer.rating,
                    reviewText: sampleText,
                    date: index < 3 ? `${index + 1} days ago` : `${index + 1} weeks ago`,
                    likes: Math.floor((reviewer.reviewCount * 0.3) + 5)
                  }}
                />
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
