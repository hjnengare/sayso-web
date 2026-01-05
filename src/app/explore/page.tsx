"use client";

import React, { Suspense, useState } from "react";
import { Fontdiner_Swanky } from "next/font/google";
import Link from "next/link";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import SearchInput from "../components/SearchInput/SearchInput";
import { Loader } from "../components/Loader/Loader";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";
import CategoryGrid from "../components/Explore/CategoryGrid";
import AreaExplorer from "../components/Explore/AreaExplorer";
import Collections from "../components/Explore/Collections";
import IntentBrowser from "../components/Explore/IntentBrowser";
import { ChevronRight } from "react-feather";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

function ExplorePageContent() {
  usePredefinedPageTitle('explore');
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSubmitQuery = (query: string) => {
    // Navigate to search results page or show results
    if (query.trim()) {
      window.location.href = `/explore/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

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
                <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Explore
                </span>
              </li>
            </ol>
          </nav>

          {/* Title and Description Block */}
          <div className="mb-8 sm:mb-10 text-center">
            <div className="my-4">
              <h1 
                className={`${swanky.className} text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.2] tracking-tight text-charcoal mx-auto`}
                style={{ 
                  fontFamily: swanky.style.fontFamily,
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  hyphens: 'none',
                }}
              >
                <WavyTypedTitle
                  text="Explore local gems"
                  as="span"
                  className="inline-block"
                  typingSpeedMs={50}
                  startDelayMs={200}
                  waveVariant="subtle"
                  loopWave={true}
                  enableScrollTrigger={true}
                  style={{
                    fontFamily: swanky.style.fontFamily,
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal',
                    hyphens: 'none',
                  }}
                />
              </h1>
            </div>
            <p className="text-sm sm:text-base text-charcoal/70 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Discover categories, places, and areas you haven't thought of yet. Browse intentionally, not algorithmically.
            </p>
          </div>

          {/* Search + Browse by Section */}
          <div className="mb-8 sm:mb-10">
            <div className="mb-6">
              <SearchInput
                variant="header"
                placeholder="Search places, categories, areas..."
                mobilePlaceholder="Search..."
                onSearch={handleSearchChange}
                onSubmitQuery={handleSubmitQuery}
                showFilter={false}
              />
            </div>
            
            {/* Browse by quick links */}
            <div className="flex flex-wrap items-center gap-3 text-body-sm">
              <span className="text-charcoal/60 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                Browse by:
              </span>
              <Link 
                href="#categories" 
                className="text-sage hover:text-sage/80 font-semibold transition-colors"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Categories
              </Link>
              <span className="text-charcoal/30">•</span>
              <Link 
                href="#areas" 
                className="text-sage hover:text-sage/80 font-semibold transition-colors"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Areas
              </Link>
              <span className="text-charcoal/30">•</span>
              <Link 
                href="#collections" 
                className="text-sage hover:text-sage/80 font-semibold transition-colors"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Collections
              </Link>
              <span className="text-charcoal/30">•</span>
              <Link 
                href="#intent" 
                className="text-sage hover:text-sage/80 font-semibold transition-colors"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Intent
              </Link>
            </div>
          </div>

          {/* Category Grid - Primary Section */}
          <section id="categories" className="mb-12 sm:mb-16 scroll-mt-20">
            <div className="mb-6">
              <WavyTypedTitle
                text="Browse Categories"
                as="h2"
                className={`${swanky.className} text-h2 sm:text-h1 font-bold text-charcoal px-3 sm:px-4 py-1 rounded-lg cursor-default mb-2`}
                typingSpeedMs={40}
                startDelayMs={300}
                waveVariant="subtle"
                loopWave={true}
                enableScrollTrigger={true}
                disableWave={true}
                style={{ 
                  fontFamily: swanky.style.fontFamily,
                }}
              />
              <p 
                className="text-body-sm text-charcoal/60"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Explore by category to find exactly what you're looking for
              </p>
            </div>
            <CategoryGrid />
          </section>

          {/* Explore by Area */}
          <section id="areas" className="mb-12 sm:mb-16 scroll-mt-20">
            <AreaExplorer />
          </section>

          {/* Curated Collections */}
          <section id="collections" className="mb-12 sm:mb-16 scroll-mt-20">
            <Collections />
          </section>

          {/* Browse by Intent */}
          <section id="intent" className="mb-12 sm:mb-16 scroll-mt-20">
            <IntentBrowser />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-off-white">
        <Loader size="lg" variant="wavy" color="sage" />
      </div>
    }>
      <ExplorePageContent />
    </Suspense>
  );
}
