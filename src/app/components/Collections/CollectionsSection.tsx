"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, MapPin, ChevronRight, Award } from "lucide-react";

interface BusinessCollection {
  id: number;
  name: string;
  category: string;
  location: string;
  description: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  isSponsored: boolean;
  promotionalText?: string;
  ctaText: string;
  ctaLink: string;
}

const businessCollections: BusinessCollection[] = [
  {
    id: 1,
    name: "Ocean View Dental Studio",
    category: "Dental Care",
    location: "Sea Point",
    description: "Modern dental care with stunning ocean views. State-of-the-art equipment and gentle treatments.",
    imageUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop&crop=center",
    rating: 4.9,
    reviewCount: 127,
    isSponsored: true,
    promotionalText: "New patients get 20% off first consultation",
    ctaText: "Book Appointment",
    ctaLink: "/business/1"
  },
  {
    id: 2,
    name: "The Artisan Table",
    category: "Fine Dining",
    location: "V&A Waterfront",
    description: "Farm-to-table cuisine featuring the best of South African ingredients with international flair.",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&crop=center",
    rating: 4.8,
    reviewCount: 89,
    isSponsored: true,
    promotionalText: "Try our new tasting menu this month",
    ctaText: "Make Reservation",
    ctaLink: "/business/2"
  },
  {
    id: 3,
    name: "Roasted Coffee Co.",
    category: "Coffee Shop",
    location: "Observatory",
    description: "Locally roasted, ethically sourced coffee beans. Perfect for remote work with free WiFi.",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop&crop=center",
    rating: 4.7,
    reviewCount: 156,
    isSponsored: false,
    ctaText: "Visit Us",
    ctaLink: "/business/3"
  },
  {
    id: 4,
    name: "Wellness Springs Spa",
    category: "Wellness & Spa",
    location: "Constantia",
    description: "Holistic wellness treatments in a tranquil setting. Massage therapy, facials, and meditation.",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&crop=center",
    rating: 4.9,
    reviewCount: 78,
    isSponsored: true,
    promotionalText: "Book a couples massage and save 15%",
    ctaText: "Book Treatment",
    ctaLink: "/business/4"
  }
];

export default function CollectionsSection() {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  useEffect(() => {
    // Icons are now imported from Lucide React, no preloading needed

    // Staggered animation for cards
    const timer = setTimeout(() => {
      businessCollections.forEach((_, index) => {
        setTimeout(() => {
          setVisibleCards(prev => [...prev, index]);
        }, index * 150);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-coral fill-coral' : 'text-charcoal/20'
        }`}
      />
    ));
  };

  return (
    <section className="py-12 bg-off-white  /90">
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-sage/10 text-sage text-sm font-urbanist font-500 mb-4">
            <Award className="w-4 h-4 mr-2" />
            Featured Collections
          </div>
          <h2 className="font-urbanist text-lg md:text-4xl font-700 text-transparent bg-clip-text bg-gradient-to-r from-charcoal via-charcoal/90 to-sage mb-4">
            Businesses You'll Love
          </h2>
          <p className="text-charcoal/60 text-lg max-w-lg mx-auto">
            Discover exceptional local businesses that are proud to serve the Cape Town community
          </p>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {businessCollections.map((business, index) => (
            <div
              key={business.id}
              className={`group relative bg-off-white   rounded-lg shadow-sm hover:shadow-xl border border-charcoal/5 overflow-hidden transition-all duration-500 hover:scale-[1.02] ${
                visibleCards.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: `${index * 100}ms`
              }}
            >
              {/* Sponsored Badge */}
              {business.isSponsored && (
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-coral text-white text-sm sm:text-xs font-urbanist font-600 rounded-full">
                  Sponsored
                </div>
              )}

              {/* Business Image */}
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                  style={{
                    backgroundImage: `url(${business.imageUrl})`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                {/* Rating Badge */}
                <div className="absolute bottom-4 left-4 flex items-center space-x-1 bg-off-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                  {renderStars(business.rating)}
                  <span className="ml-1 text-sm font-urbanist font-600 text-charcoal">
                    {business.rating}
                  </span>
                  <span className="text-sm sm:text-xs text-charcoal/60">
                    ({business.reviewCount})
                  </span>
                </div>
              </div>

              {/* Business Info */}
              <div className="p-6">
                {/* Header Section */}
                <div className="text-center mb-4">
                  <h3 className="font-urbanist text-sm sm:text-base font-600 text-charcoal group-hover:text-navbar-bg transition-colors duration-300 mb-2">
                    {business.name}
                  </h3>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm font-urbanist font-500 text-coral">
                      {business.category}
                    </span>
                    <span className="text-charcoal/30">•</span>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-charcoal/40" />
                      <span className="text-sm text-charcoal/60">
                        {business.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <p className="text-charcoal/70 text-sm leading-relaxed text-center min-h-[48px] flex items-center justify-center">
                    {business.description}
                  </p>
                </div>

                {/* Promotional Text */}
                <div className="mb-4 min-h-[60px] flex items-center">
                  {business.promotionalText ? (
                    <div className="w-full p-3 bg-sage/5 border border-sage/20 rounded-lg">
                      <p className="text-sage text-sm font-urbanist font-500 text-center">
                        🎉 {business.promotionalText}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full"></div>
                  )}
                </div>

                {/* CTA Button */}
                <Link
                  href={business.ctaLink}
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-sage to-sage/90 hover:from-sage/90 hover:to-sage text-white rounded-[20px] font-urbanist text-sm font-600 transition-all duration-300 hover:scale-105 hover:shadow-lg group/btn"
                >
                  {business.ctaText}
                  <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        <div className="text-center mt-10">
          <Link
            href="/collections"
            className="inline-flex items-center px-8 py-4 border border-sage text-sage hover:bg-sage hover:text-white rounded-[20px] font-urbanist text-base font-600 transition-all duration-300 hover:scale-105 group"
          >
            View All Collections
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
      </div>
    </section>
  );
}
