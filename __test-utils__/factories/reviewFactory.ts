/**
 * Factory for creating test review data
 */

export interface ReviewFactoryOptions {
  id?: string;
  business_id?: string;
  user_id?: string;
  rating?: number;
  title?: string;
  content?: string;
  tags?: string[];
  helpful_count?: number;
  created_at?: string;
  updated_at?: string;
  images?: Array<{ id: string; image_url: string; alt_text?: string }>;
}

export function createReview(options: ReviewFactoryOptions = {}) {
  const id = options.id || `review-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  return {
    id,
    business_id: options.business_id || `business-${id}`,
    user_id: options.user_id || `user-${id}`,
    rating: options.rating ?? 5,
    title: options.title || `Great experience at ${options.business_id || 'business'}`,
    content: options.content || `This is a test review. The service was excellent and I would definitely recommend it!`,
    tags: options.tags || ['friendly', 'fast-service'],
    helpful_count: options.helpful_count ?? 0,
    created_at: options.created_at || timestamp,
    updated_at: options.updated_at || timestamp,
    review_images: options.images || [],
    // User profile data (when joined)
    profile: {
      user_id: options.user_id || `user-${id}`,
      display_name: `Test User ${id}`,
      avatar_url: `https://example.com/avatars/${id}.jpg`,
      username: `testuser${id}`,
    },
  };
}

export function createReviewArray(count: number, options: Partial<ReviewFactoryOptions> = {}) {
  return Array.from({ length: count }, (_, index) =>
    createReview({
      ...options,
      id: options.id || `review-${index}`,
      rating: options.rating ?? (3 + (index % 3)), // Vary ratings between 3-5
      created_at: new Date(Date.now() - index * 86400000).toISOString(), // Stagger dates
    })
  );
}

/**
 * Create a review with images
 */
export function createReviewWithImages(
  imageCount: number = 2,
  options: ReviewFactoryOptions = {}
) {
  const review = createReview(options);
  review.review_images = Array.from({ length: imageCount }, (_, index) => ({
    id: `image-${review.id}-${index}`,
    image_url: `https://example.com/reviews/${review.id}/image-${index}.jpg`,
    alt_text: `Review image ${index + 1}`,
    storage_path: `reviews/${review.id}/image-${index}.jpg`,
  }));

  return review;
}

/**
 * Create a review that matches specific criteria
 */
export function createReviewWithTags(tags: string[], options: ReviewFactoryOptions = {}) {
  return createReview({
    ...options,
    tags,
  });
}

/**
 * Create a helpful review (high helpful_count)
 */
export function createHelpfulReview(helpfulCount: number = 10, options: ReviewFactoryOptions = {}) {
  return createReview({
    ...options,
    helpful_count: helpfulCount,
    rating: options.rating ?? 5,
  });
}

