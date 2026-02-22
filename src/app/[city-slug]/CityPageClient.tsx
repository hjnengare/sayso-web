"use client";

import { m } from 'framer-motion';
import Footer from '../components/Footer/Footer';
import BusinessCard from '../components/BusinessCard/BusinessCard';
import { useState, useMemo } from 'react';

interface CityPageClientProps {
  cityName: string;
  categoryName?: string;
  citySlug: string;
  businesses: any[];
}

export default function CityPageClient({
  cityName,
  categoryName,
  businesses: initialBusinesses,
}: CityPageClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Transform businesses for BusinessCard component
  const businesses = useMemo(() => {
    return initialBusinesses.map((business: any) => ({
      id: business.id,
      slug: business.slug,
      name: business.name,
      description: business.description,
      category: business.category || categoryName || 'Business',
      location: business.location || cityName,
      image_url: business.image_url,
      uploaded_images: business.uploaded_images,
      alt: `${business.name} - ${business.category || categoryName || 'Business'} in ${business.location || cityName}`,
      rating: business.average_rating?.[0]?.average_rating || 0,
      reviews: 0,
      verified: false,
      percentiles: undefined,
    }));
  }, [initialBusinesses, categoryName, cityName]);

  const paginatedBusinesses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return businesses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [businesses, currentPage]);

  const totalPages = Math.ceil(businesses.length / ITEMS_PER_PAGE);

  const pageTitle = categoryName 
    ? `Best ${categoryName}s in ${cityName}`
    : `Best Businesses in ${cityName}`;

  return (
    <div className="min-h-dvh bg-off-white">
      
      <main className="pt-20 pb-6 px-4 sm:px-6 md:px-8 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
        
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto relative z-10"
        >
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {pageTitle}
            </h1>
            <p className="text-charcoal/70 text-lg">
              {categoryName 
                ? `Discover top-rated ${categoryName.toLowerCase()}s in ${cityName}`
                : `Discover the best local businesses in ${cityName}`}
            </p>
            {businesses.length > 0 && (
              <p className="text-charcoal/60 text-sm mt-2">
                {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} found
              </p>
            )}
          </div>

          {/* Business Grid */}
          {paginatedBusinesses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {paginatedBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-charcoal/70 text-lg">No businesses found in {cityName}.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const isActive = currentPage === page;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[40px] h-10 px-4 rounded-full font-semibold transition-all duration-300 shadow-md ${
                      isActive
                        ? "bg-gradient-to-br from-sage to-sage/80 text-white shadow-lg scale-105"
                        : "bg-gradient-to-br from-sage/20 to-sage/10 hover:from-sage/40 hover:to-sage/20 text-charcoal hover:text-sage hover:shadow-lg active:scale-95"
                    }`}
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          )}
        </m.div>
      </main>

      <Footer />
    </div>
  );
}

