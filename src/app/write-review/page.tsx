"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Search, Briefcase, MapPin, ChevronRight } from "react-feather";
import EmailVerificationGuard from "../components/Auth/EmailVerificationGuard";

export default function WriteReviewPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});


  const mockBusinesses = [
    {
      id: 1,
      name: "Blue Bottle Coffee",
      category: "Coffee Shop",
      location: "Downtown",
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop&auto=format"
    },
    {
      id: 2,
      name: "The French Laundry",
      category: "Fine Dining",
      location: "Napa Valley",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop&auto=format"
    },
    {
      id: 3,
      name: "Yoga Flow Studio",
      category: "Fitness",
      location: "Mission District",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop&auto=format"
    },
    {
      id: 4,
      name: "Local Bookstore",
      category: "Retail",
      location: "Castro",
      image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop&auto=format"
    }
  ];

  const filteredBusinesses = mockBusinesses.filter(business =>
    business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <EmailVerificationGuard>
      <AnimatePresence mode="wait">
        <motion.div
          key="write-review"
          initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
            opacity: { duration: 0.5 },
            filter: { duration: 0.55 }
          }}
          className="min-h-screen bg-off-white relative overflow-hidden"
        >
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg backdrop-blur-sm border-b border-charcoal/10 shadow-md md:shadow-none">
        <div className="mx-auto w-full max-w-[2000px] px-2 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="group flex items-center"
              aria-label="Go back"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 mr-2 sm:mr-3">
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-white transition-colors duration-300" />
              </div>
              <h1 className="text-base sm:text-xl font-700 text-white transition-all duration-300 relative" style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}>
               Leave a Review
              </h1>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
        <div className="py-1 pt-20">
          <section className="relative font-sf-pro pt-16 sm:pt-20">
            <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
              <div className="pt-4 sm:pt-6 md:pt-8 pb-12 sm:pb-16 md:pb-20">
                <div className="max-w-[800px] mx-auto">
        {/* Search Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-600 text-charcoal mb-2" style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}>
              Which business would you like to review?
            </h2>
            <p className="text-charcoal/60 text-sm" >
              Search for a business or select from your recent visits
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-charcoal/60" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search businesses..."
              className="w-full pl-12 pr-2 sm:pr-4 py-3.5 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl
                         text-sm placeholder:text-charcoal/50 text-charcoal
                         focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20
                         hover:border-charcoal/30 transition-all duration-200"
              style={{
                fontFamily: '"Livvic", sans-serif',
                fontWeight: 600
              }}
            />
          </div>
        </div>

        {/* Business Results */}
        <div className="space-y-3">
          {filteredBusinesses.map((business) => (
            <Link
              key={business.id}
              href="/business/review"
              className="block p-4 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] ring-1 ring-white/30 hover:border-white/80 hover:-translate-y-1
                         transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Business Image or Placeholder */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-sage/10 group-hover:bg-sage/20 transition-colors duration-200">
                    {business.image && !imageErrors[business.id] ? (
                      <Image
                        src={business.image}
                        alt={business.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={() => setImageErrors(prev => ({ ...prev, [business.id]: true }))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-sage" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-600 text-charcoal group-hover:text-sage transition-colors duration-200" style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}>
                      {business.name}
                    </h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-sm text-charcoal/60" >{business.category}</span>
                      <span className="text-charcoal/30">•</span>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-charcoal/40" />
                        <span className="text-sm text-charcoal/60" >{business.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-sage transition-colors duration-200" />
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {searchQuery && filteredBusinesses.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-charcoal/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-charcoal/40" />
            </div>
            <h3 className="text-lg font-600 text-charcoal mb-2" style={{ fontFamily: '"Changa One", cursive, sans-serif' }}>
              No businesses found
            </h3>
            <p className="text-charcoal/60 text-sm mb-6" >
              Can&apos;t find the business you&apos;re looking for? Try a different search term.
            </p>
            <button className="px-6 py-3 bg-sage text-white rounded-lg text-sm font-500
                               hover:bg-sage/90 transition-colors duration-200" >
              Suggest a Business
            </button>
          </div>
        )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
        </motion.div>
      </AnimatePresence>
    </EmailVerificationGuard>
  );
}
