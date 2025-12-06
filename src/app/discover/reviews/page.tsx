"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { ArrowLeft, Briefcase, Image as ImageIcon, ThumbsUp, FileText, Star, ChevronRight, TrendingUp } from "react-feather";
import VerifiedBadge from "../../components/VerifiedBadge/VerifiedBadge";

// Mock reviews data - in production this would come from API
const MOCK_REVIEWS = [
  {
    id: 1,
    businessName: "Mama's Kitchen",
    businessId: "demo",
    author: "Jessica Martinez",
    avatar: "JM",
    profilePic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    date: "2 days ago",
    text: "Absolutely amazing experience! The atmosphere was perfect, staff were incredibly friendly and attentive. The food came out fast and hot. Will definitely be coming back with friends!",
    helpful: 24,
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop"
    ],
    tags: ["trustworthy", "on time", "friendly", "great atmosphere"]
  },
  {
    id: 2,
    businessName: "The Coffee Spot",
    businessId: "coffee-spot",
    author: "Michael Chen",
    avatar: "MC",
    profilePic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    rating: 4,
    date: "1 week ago",
    text: "Really good coffee and service. The portions were generous and everything tasted fresh. Only minor complaint is it got a bit noisy during peak hours, but that's expected for a popular spot.",
    helpful: 18,
    tags: ["on time", "quality food", "good value"]
  },
  {
    id: 3,
    businessName: "Mama's Kitchen",
    businessId: "demo",
    author: "Sarah Williams",
    avatar: "SW",
    profilePic: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    date: "2 weeks ago",
    text: "One of the best dining experiences I've had in a while. The staff went above and beyond to accommodate our dietary restrictions. The presentation was beautiful and taste was phenomenal!",
    helpful: 32,
    images: [
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop"
    ],
    tags: ["trustworthy", "friendly", "accommodating", "excellent service"]
  },
  {
    id: 4,
    businessName: "Urban Bistro",
    businessId: "urban-bistro",
    author: "David Thompson",
    avatar: "DT",
    profilePic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    rating: 3,
    date: "3 weeks ago",
    text: "Decent place overall. Food was good but nothing extraordinary. Service was a bit slow on the day we visited, but the staff were apologetic about it. Would give it another try during off-peak hours.",
    helpful: 9,
    tags: ["average experience"]
  },
  {
    id: 5,
    businessName: "The Coffee Spot",
    businessId: "coffee-spot",
    author: "Emily Rodriguez",
    avatar: "ER",
    profilePic: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    date: "1 month ago",
    text: "Love this place! Been coming here for years and the quality never disappoints. The specials are always creative and delicious. Staff remembers regulars which makes you feel valued.",
    helpful: 45,
    tags: ["trustworthy", "loyal customer", "consistent quality", "friendly"]
  },
  {
    id: 6,
    businessName: "Mama's Kitchen",
    businessId: "demo",
    author: "James Parker",
    avatar: "JP",
    profilePic: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces",
    rating: 4,
    date: "1 month ago",
    text: "Great spot for a casual dinner. The menu has something for everyone. Prices are reasonable for the quality you get. The only downside is parking can be challenging during weekends.",
    helpful: 15,
    tags: ["good value", "variety", "casual dining"]
  },
  {
    id: 7,
    businessName: "Sunset Grill",
    businessId: "sunset-grill",
    author: "Olivia Anderson",
    avatar: "OA",
    profilePic: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    date: "2 months ago",
    text: "Perfect for special occasions! The ambiance is romantic and intimate. We celebrated our anniversary here and the staff made it extra special with a complimentary dessert. Highly recommend!",
    helpful: 28,
    images: [
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=300&fit=crop"
    ],
    tags: ["romantic", "special occasion", "excellent service", "friendly"]
  },
  {
    id: 8,
    businessName: "Urban Bistro",
    businessId: "urban-bistro",
    author: "Ryan Mitchell",
    avatar: "RM",
    profilePic: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
    rating: 4,
    date: "2 months ago",
    text: "Solid choice for lunch meetings. Quick service, quiet atmosphere during daytime, and the lunch specials are a great deal. Coffee is excellent too!",
    helpful: 12,
    tags: ["on time", "professional", "good value"]
  }
];

const FILTER_OPTIONS = [
  { id: "all", label: "All Reviews", icon: "list-outline" },
  { id: "5", label: "5 Stars", icon: "star" },
  { id: "4", label: "4 Stars", icon: "star-half" },
  { id: "photos", label: "With Photos", icon: "images-outline" }
];

const SORT_OPTIONS = [
  { id: "recent", label: "Most Recent" },
  { id: "helpful", label: "Most Helpful" },
  { id: "highest", label: "Highest Rated" },
  { id: "lowest", label: "Lowest Rated" }
];

export default function GeneralReviewsPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedSort, setSelectedSort] = useState("recent");
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<number, number>>({});

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalReviews = MOCK_REVIEWS.length;
    const avgRating = MOCK_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const ratingBreakdown = {
      5: MOCK_REVIEWS.filter(r => r.rating === 5).length,
      4: MOCK_REVIEWS.filter(r => r.rating === 4).length,
      3: MOCK_REVIEWS.filter(r => r.rating === 3).length,
      2: MOCK_REVIEWS.filter(r => r.rating === 2).length,
      1: MOCK_REVIEWS.filter(r => r.rating === 1).length,
    };

    return {
      totalReviews,
      avgRating: Number(avgRating.toFixed(1)),
      ratingBreakdown
    };
  }, []);

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let filtered = [...MOCK_REVIEWS];

    // Apply filter
    if (selectedFilter === "5") {
      filtered = filtered.filter(r => r.rating === 5);
    } else if (selectedFilter === "4") {
      filtered = filtered.filter(r => r.rating === 4);
    } else if (selectedFilter === "photos") {
      filtered = filtered.filter(r => r.images && r.images.length > 0);
    }

    // Apply sort
    if (selectedSort === "helpful") {
      filtered.sort((a, b) => b.helpful - a.helpful);
    } else if (selectedSort === "highest") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (selectedSort === "lowest") {
      filtered.sort((a, b) => a.rating - b.rating);
    }
    // "recent" is default order

    return filtered;
  }, [selectedFilter, selectedSort]);

  const toggleExpanded = (reviewId: number) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const nextImage = (reviewId: number, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [reviewId]: ((prev[reviewId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (reviewId: number, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [reviewId]: ((prev[reviewId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  return (
    <div className="min-h-screen  bg-off-white   relative overflow-hidden">
      {/* Premium background elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-sage/8 via-sage/4 to-transparent rounded-full blur-lg" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-gradient-to-br from-coral/6 via-coral/3 to-transparent rounded-full blur-lg" />
      </div>

      {/* Premium Header */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed top-0 left-0 right-0 z-50 bg-off-white/80 backdrop-blur-xl border-b border-charcoal/10 px-2 py-4 sm:py-6 shadow-premium-md"
      >
        <div className="flex items-center justify-between mx-auto w-full max-w-[2000px] px-2">
          <Link href="/home" className="group flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-charcoal/10 to-charcoal/5 hover:from-sage/20 hover:to-sage/10 rounded-full flex items-center justify-center shadow-premium-sm hover:shadow-premium-md transition-all duration-premium ease-premium hover:scale-110 border border-charcoal/5 hover:border-sage/20 mr-2 sm:mr-4">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-charcoal/70 group-hover:text-sage transition-colors duration-premium ease-premium" />
            </div>
            <motion.h1
              className="text-base sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sage via-sage/90 to-charcoal transition-all duration-premium ease-premium group-hover:from-sage/90 group-hover:to-sage relative tracking-[-0.02em]"
              style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
            >
              Community Reviews
            </motion.h1>
          </Link>
          <Link
            href="/write-review"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-sage hover:bg-sage/90 text-white rounded-full text-sm sm:text-base font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-sage/20 border border-sage/20 whitespace-nowrap"
            aria-label="Write a review"
          >
            <TrendingUp size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Write a Review</span>
            <span className="sm:hidden">Review</span>
          </Link>
        </div>
      </motion.header>

      <div className="mx-auto w-full max-w-[2000px] px-2 pt-20 sm:pt-24 py-6 sm:py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm sm:text-base">
            <li>
              <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                Home
              </Link>
            </li>
            <li className="flex items-center">
              <ChevronRight className="w-4 h-4 text-charcoal/40" />
            </li>
            <li>
              <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                Discover Reviews
              </span>
            </li>
          </ol>
        </nav>

        {/* Filters and Sort */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className=" bg-off-white   backdrop-blur-lg rounded-lg shadow-premium-md border border-charcoal/10 p-4 sm:p-6 mb-6 relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((filter) => (
                <motion.button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-full font-urbanist text-sm font-600
                    transition-all duration-premium ease-premium tracking-[-0.015em]
                    ${selectedFilter === filter.id
                      ? 'bg-sage text-white shadow-premium-md'
                      : 'bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 shadow-premium-sm hover:shadow-premium-md'
                    }
                  `}
                >
                  {filter.id === "all" && <FileText className="w-4 h-4" />}
                  {filter.id === "5" && <Star className="w-4 h-4" />}
                  {filter.id === "4" && <Star className="w-4 h-4" />}
                  {filter.id === "photos" && <ImageIcon className="w-4 h-4" />}
                  <span>{filter.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3">
              <span className="font-urbanist text-sm font-500 text-charcoal/70 tracking-[-0.015em]">
                Sort by:
              </span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="bg-charcoal/5 border border-charcoal/10 rounded-full px-4 py-2 font-urbanist text-sm font-600 text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-premium shadow-premium-sm hover:shadow-premium-md tracking-[-0.015em]"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Reviews List - Masonry Layout */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-3 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredReviews.map((review, index) => {
              const isExpanded = expandedReviews.has(review.id);
              const shouldTruncate = review.text.length > 200;
              const displayText = isExpanded || !shouldTruncate
                ? review.text
                : review.text.slice(0, 200) + "...";

              const isNavy = index % 2 === 1;
              const cardClasses = isNavy
                ? "border-navbar-bg/40 bg-gradient-to-br from-navbar-bg/95 via-navbar-bg/90 to-navbar-bg/85 text-white"
                : "border-white/30 bg-gradient-to-br from-white/90 via-white/80 to-white/70 text-charcoal";
              const titleText = isNavy ? "text-white" : "text-charcoal";
              const subtleText = isNavy ? "text-white/70" : "text-charcoal/60";
              const bodyText = isNavy ? "text-white/85" : "text-charcoal/90";
              const chipClasses = isNavy
                ? "bg-white/10 border border-white/25 text-white"
                : "bg-sage/10 border border-sage/20 text-sage";
              const buttonClasses = isNavy
                ? "inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full font-urbanist text-sm font-600 text-white transition-all duration-premium shadow-premium-sm hover:shadow-premium-md tracking-[-0.015em]"
                : "inline-flex items-center gap-2 px-4 py-2 bg-charcoal/5 hover:bg-charcoal/10 rounded-full font-urbanist text-sm font-600 text-charcoal/70 transition-all duration-premium shadow-premium-sm hover:shadow-premium-md tracking-[-0.015em]";

              return (
                <motion.div
                  key={review.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  className={`backdrop-blur-lg rounded-[12px] border relative overflow-hidden transition-all duration-premium ease-premium break-inside-avoid mb-4 sm:mb-6 group shadow-[0_15px_40px_rgba(15,23,42,0.08)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)] ${cardClasses}`}
                >
                  {/* Hero Image Section - Instagram-like Carousel */}
                  {review.images && review.images.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + index * 0.05, duration: 0.6 }}
                      className="relative w-full aspect-[16/10] overflow-hidden bg-charcoal/5"
                    >
                      {/* Carousel Images */}
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={`${review.id}-${currentImageIndex[review.id] || 0}`}
                          src={review.images[currentImageIndex[review.id] || 0]}
                          alt={`${review.businessName} - Review by ${review.author}`}
                          className="w-full h-full object-cover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      </AnimatePresence>

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent pointer-events-none" />

                      {/* Business Name Badge - Floating on image */}
                      <Link
                        href={`/business/${review.businessId}`}
                        className={`absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-premium shadow-premium-md hover:shadow-premium-lg hover:scale-105 z-20 ${
                          isNavy ? "bg-white/10 text-white" : "bg-off-white/95 hover:bg-off-white"
                        }`}
                      >
                        <Briefcase className={`w-4 h-4 ${isNavy ? "text-white" : "text-sage"}`} />
                        <span className={`font-urbanist text-sm font-600 tracking-[-0.015em] ${isNavy ? "text-white" : "text-sage"}`}>
                          {review.businessName}
                        </span>
                      </Link>

                      {/* Gallery Icon with count (top right) */}
                      {review.images.length > 1 && (
                        <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-charcoal/80 backdrop-blur-md rounded-lg z-20">
                          <ImageIcon className="w-4 h-4 text-white" />
                          <span className="font-urbanist text-sm font-600 text-white tracking-[-0.015em]">
                            {review.images.length}
                          </span>
                        </div>
                      )}

                      {/* Dot Indicators (Instagram style) */}
                      {review.images.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                          {review.images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentImageIndex(prev => ({ ...prev, [review.id]: idx }));
                              }}
                              className={`transition-all duration-premium ${
                                idx === (currentImageIndex[review.id] || 0)
                                  ? 'w-2 h-2 bg-off-white  '
                                  : 'w-1.5 h-1.5 bg-off-white  /60 hover:bg-off-white  /80'
                              } rounded-full`}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Content Section with padding */}
                  <div className="p-6 sm:p-8 relative z-10">
                    {/* Subtle decorative element */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sage/5 to-transparent rounded-full blur-xl pointer-events-none" />

                    {/* Business Name Badge for reviews without images */}
                    {(!review.images || review.images.length === 0) && (
                      <Link
                        href={`/business/${review.businessId}`}
                        className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-sage/10 hover:bg-sage/20 rounded-full transition-all duration-premium"
                      >
                        <Briefcase className="w-4 h-4 text-sage" />
                        <span className="font-urbanist text-sm font-600 text-sage tracking-[-0.015em]">
                          {review.businessName}
                        </span>
                      </Link>
                    )}

                    {/* Review Header */}
                    <div className="flex items-start gap-3 mb-4">
                      {/* Avatar */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 + index * 0.05, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                        className="relative flex-shrink-0"
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-premium-md ring-2 ring-sage/20 hover:ring-sage/40 transition-all duration-premium ease-premium hover:scale-110">
                          {review.profilePic ? (
                            <img
                              src={review.profilePic}
                              alt={review.author}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-sage/20 to-sage/10 flex items-center justify-center">
                              <span className="font-urbanist text-lg sm:text-xl font-700 text-sage tracking-[-0.02em]">
                                {review.avatar}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Verified badge for 5-star reviews */}
                        {review.rating === 5 && (
                          <div className="absolute -bottom-1 -right-1">
                            <VerifiedBadge size="md" delay={0.4 + index * 0.05} />
                          </div>
                        )}
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <h3 className={`font-urbanist text-lg sm:text-xl font-600 tracking-[-0.02em] ${titleText}`}>
                            {review.author}
                          </h3>
                          <span className={`font-urbanist text-sm font-600 tracking-[-0.015em] ${subtleText}`}>
                            {review.date}
                          </span>
                        </div>

                        {/* Star Rating */}
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-[18px] h-[18px]"
                              fill={i < review.rating ? "var(--amber-500)" : "transparent"}
                              stroke={i < review.rating ? "var(--amber-500)" : "var(--charcoal-300)"}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className={`font-urbanist text-base font-600 leading-[1.65] mb-4 tracking-[-0.015em] ${bodyText}`}>
                      {displayText}
                    </p>

                    {/* Read More/Less Button */}
                    {shouldTruncate && (
                      <button
                        onClick={() => toggleExpanded(review.id)}
                        className="font-urbanist text-sm font-600 text-sage hover:text-sage/80 transition-colors duration-premium mb-4 tracking-[-0.015em]"
                      >
                        {isExpanded ? "Read less" : "Read more"}
                      </button>
                    )}

                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {review.tags.map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className={`inline-flex items-center px-3 py-1 text-sm font-500 rounded-full font-urbanist tracking-[-0.015em] ${chipClasses}`}
                          >
                            <span className="mr-1">@</span>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Helpful Button */}
                    <div className={`flex items-center gap-3 pt-4 border-t ${isNavy ? "border-white/20" : "border-charcoal/10"}`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={buttonClasses}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>Helpful</span>
                        <span className={isNavy ? "text-white/60" : "text-charcoal/50"}>({review.helpful})</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredReviews.length === 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className=" bg-off-white   backdrop-blur-lg rounded-lg shadow-premium-md border border-charcoal/10 p-12 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-charcoal/10 to-charcoal/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-charcoal/40" />
            </div>
            <h3 className="font-urbanist text-xl font-600 text-charcoal mb-2 tracking-[-0.02em]">
              No reviews found
            </h3>
            <p className="font-urbanist text-base font-600 text-charcoal/70 tracking-[-0.015em]">
              Try adjusting your filters
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
