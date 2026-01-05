"use client";

import { Suspense, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "../../../components/Header/Header";
import Footer from "../../../components/Footer/Footer";
import BusinessCard from "../../../components/BusinessCard/BusinessCard";
import { useBusinesses } from "../../../hooks/useBusinesses";
import { Loader } from "../../../components/Loader/Loader";
import { ChevronLeft, ChevronRight, MapPin } from "react-feather";
import { Fontdiner_Swanky } from "next/font/google";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Area data - can be made dynamic later
const AREAS: Record<string, { name: string; description: string }> = {
  'woodstock': { name: 'Woodstock', description: 'Trendy neighborhood with cafes and art' },
  'observatory': { name: 'Observatory', description: 'Vibrant student area' },
  'cbd': { name: 'CBD', description: 'City center businesses' },
  'green-point': { name: 'Green Point', description: 'Waterfront dining and nightlife' },
  'sea-point': { name: 'Sea Point', description: 'Beachside restaurants' },
  'camps-bay': { name: 'Camps Bay', description: 'Upscale beachfront' },
};

function AreaDetailContent() {
  const params = useParams();
  const areaId = params?.id as string;
  const area = AREAS[areaId];

  // Fetch businesses filtered by location
  const {
    businesses,
    loading,
    error,
    refetch,
  } = useBusinesses({
    limit: 100,
    sortBy: "created_at",
    sortOrder: "desc",
    feedStrategy: "standard", // No personalization
    searchQuery: area?.name || null, // Search by area name in location
  });

  if (!area) {
    return (
      <div className="min-h-dvh bg-off-white">
        <Header showSearch={true} variant="white" backgroundClassName="bg-navbar-bg" />
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 text-center py-20">
            <h1 className="text-h2 font-semibold text-charcoal mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Area not found
            </h1>
            <Link
              href="/explore"
              className="text-sage hover:text-sage/80 font-semibold transition-colors"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              ← Back to Explore
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">
      <Header
        showSearch={true}
        variant="white"
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />

      <main className="pt-20 sm:pt-24 pb-28">
        <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="mb-4 sm:mb-6" aria-label="Breadcrumb">
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
                <Link href="/explore" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Explore
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/40" />
              </li>
              <li>
                <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  {area.name}
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-4 relative">
              <Link
                href="/explore"
                className="absolute left-0 w-10 h-10 rounded-full bg-sage hover:bg-sage/90 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sage/20 to-coral/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-sage" />
                </div>
                <div className="text-center">
                  <h1 
                    className={`${swanky.className} text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.2] tracking-tight text-charcoal`}
                    style={{ fontFamily: swanky.style.fontFamily }}
                  >
                    {area.name}
                  </h1>
                  <p className="text-body-sm text-charcoal/60 mt-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    {area.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Businesses Grid */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader size="lg" variant="wavy" color="sage" />
            </div>
          )}

          {!loading && error && (
            <div className="bg-white border border-sage/20 rounded-3xl shadow-sm px-6 py-10 text-center space-y-4">
              <p className="text-charcoal font-semibold text-h2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                We couldn't load businesses right now.
              </p>
              <p className="text-body-sm text-charcoal/60 max-w-[70ch]" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                {error}
              </p>
              <button
                onClick={refetch}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-sage text-white hover:bg-sage/90 transition-colors text-body font-semibold"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {businesses.length === 0 ? (
                <div className="bg-white border border-sage/20 rounded-3xl shadow-sm px-6 py-16 text-center space-y-3">
                  <h2 className="text-h2 font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    No businesses yet in {area.name}
                  </h2>
                  <p className="text-body-sm text-charcoal/60 max-w-[70ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                    Check back soon as new businesses join this area.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-body-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    {businesses.length} {businesses.length === 1 ? 'place' : 'places'} in {area.name}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3">
                    {businesses.map((business) => (
                      <div key={business.id} className="list-none">
                        <BusinessCard business={business} compact inGrid={true} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AreaDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-off-white">
        <Loader size="lg" variant="wavy" color="sage" />
      </div>
    }>
      <AreaDetailContent />
    </Suspense>
  );
}

