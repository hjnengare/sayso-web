"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'react-feather';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import BusinessCard from '../../components/BusinessCard/BusinessCard';
import { useState, useMemo } from 'react';

interface CategoryPageClientProps {
  categoryName: string;
  categorySlug: string;
  businesses: any[];
}

export default function CategoryPageClient({
  categoryName,
  categorySlug,
  businesses: initialBusinesses,
}: CategoryPageClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Transform businesses for BusinessCard component
  const businesses = useMemo(() => {
    return initialBusinesses.map((business: any) => ({
      id: business.id,
      slug: business.slug,
      name: business.name,
      description: business.description,
      category: categoryName,
      location: business.location || 'Cape Town',
      image_url: business.image_url,
      uploaded_image: business.uploaded_image,
      alt: `${business.name} - ${categoryName} in ${business.location || 'Cape Town'}`,
      rating: business.average_rating?.[0]?.average_rating || 0,
      reviews: 0,
      verified: false,
      percentiles: undefined,
    }));
  }, [initialBusinesses, categoryName]);

  const paginatedBusinesses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return businesses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [businesses, currentPage]);

  const totalPages = Math.ceil(businesses.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-dvh bg-off-white">
      <Header showSearch={true} variant="white" backgroundClassName="bg-navbar-bg" />
      
      <main className="pt-20 pb-16 px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
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
                  {categoryName}
                </span>
              </li>
            </ol>
          </nav>
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {categoryName}
            </h1>
            <p className="text-charcoal/70 text-lg">
              Discover the best {categoryName.toLowerCase()} businesses in your area
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
              <p className="text-charcoal/70 text-lg">No businesses found in this category.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-sage text-white'
                      : 'bg-off-white text-charcoal hover:bg-sage/10'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

