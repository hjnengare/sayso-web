"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Footer from "../../../components/Footer/Footer";
import BusinessCard from "../../../components/BusinessCard/BusinessCard";
import { useBusinesses } from "../../../hooks/useBusinesses";
import BusinessGridSkeleton from "../../../components/Explore/BusinessGridSkeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Utensils, Coffee, Activity, Heart, PartyPopper, ShoppingBag, Wrench } from "lucide-react";
import { Urbanist } from "next/font/google";

const urbanist = Urbanist({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

// Intent data
const INTENTS: Record<string, { 
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  searchTerms?: string[];
}> = {
  'eat': {
    label: 'Eat',
    icon: Utensils,
    description: 'Find the perfect place to grab a meal',
    color: 'from-coral/20 to-coral/10',
    searchTerms: ['restaurant', 'food', 'dining', 'eat'],
  },
  'drink': {
    label: 'Drink',
    icon: Coffee,
    description: 'Discover great spots for drinks and coffee',
    color: 'from-sage/20 to-sage/10',
    searchTerms: ['bar', 'cafe', 'coffee', 'drink'],
  },
  'move': {
    label: 'Move',
    icon: Activity,
    description: 'Active places for fitness and movement',
    color: 'from-blue-400/20 to-blue-400/10',
    searchTerms: ['gym', 'fitness', 'yoga', 'sports'],
  },
  'relax': {
    label: 'Relax',
    icon: Heart,
    description: 'Peaceful spots to unwind and recharge',
    color: 'from-purple-400/20 to-purple-400/10',
    searchTerms: ['spa', 'wellness', 'relax', 'peaceful'],
  },
  'celebrate': {
    label: 'Celebrate',
    icon: PartyPopper,
    description: 'Venues perfect for celebrations and events',
    color: 'from-yellow-400/20 to-yellow-400/10',
    searchTerms: ['party', 'event', 'celebration', 'venue'],
  },
  'shop': {
    label: 'Shop',
    icon: ShoppingBag,
    description: 'Shopping destinations and retail stores',
    color: 'from-pink-400/20 to-pink-400/10',
    searchTerms: ['shop', 'retail', 'store', 'shopping'],
  },
  'fix': {
    label: 'Fix something',
    icon: Wrench,
    description: 'Services to help you fix and repair',
    color: 'from-gray-400/20 to-gray-400/10',
    searchTerms: ['repair', 'service', 'fix', 'maintenance'],
  },
};

function IntentDetailContent() {
  const params = useParams();
  const intentId = params?.id as string;
  const intent = INTENTS[intentId];

  // Fetch businesses based on intent search terms
  const {
    businesses,
    loading,
    error,
    refetch,
  } = useBusinesses({
    limit: 100,
    sortBy: "created_at",
    sortOrder: "desc",
    feedStrategy: "standard",
    searchQuery: intent?.label || null,
  });

  const IconComponent = intent?.icon;

  if (!intent) {
    return (
      <div className="min-h-dvh bg-off-white">
        <main className="">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 text-center py-20">
            <h1 className="text-h2 font-semibold text-charcoal mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Intent not found
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

      <main className="">
        <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="pt-2" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Home
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/60" />
              </li>
              <li>
                <Link href="/explore" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Explore
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/60" />
              </li>
              <li>
                <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  {intent.label}
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-4 relative">
              <Link
                href="/explore"
                className="w-10 h-10 rounded-full bg-sage hover:bg-sage/90 flex items-center justify-center transition-colors absolute left-0"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </Link>
              <div className="flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${intent.color} flex items-center justify-center`}>
                  {IconComponent && <IconComponent className="w-6 h-6 text-charcoal" />}
                </div>
                <div>
                  <h1
                    className={`${urbanist.className} text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.2] tracking-tight text-charcoal`}
                    style={{ fontFamily: urbanist.style.fontFamily }}
                  >
                    {intent.label}
                  </h1>
                  <p className="text-body-sm text-charcoal/60 mt-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    {intent.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Businesses Grid */}
          {loading && (
            <div className="py-8">
              <BusinessGridSkeleton />
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
                    No businesses found for {intent.label.toLowerCase()}
                  </h2>
                  <p className="text-body-sm text-charcoal/60 max-w-[70ch] mx-auto" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}>
                    Check back soon as new businesses join this category.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-body-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    {businesses.length} {businesses.length === 1 ? 'place' : 'places'} found
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

export default function IntentDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-off-white">
        <BusinessGridSkeleton />
      </div>
    }>
      <IntentDetailContent />
    </Suspense>
  );
}

