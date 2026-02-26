"use client";

import React from 'react';
import { FilterProvider } from '@/app/contexts/FilterContext';
import { FilterBar } from './FilterBar';
import { AdvancedFilters } from './AdvancedFilters';

/**
 * Filter Demo Component
 *
 * This is a demonstration of the new filtering system.
 * To integrate into your home page:
 *
 * 1. Wrap your home page content with <FilterProvider>
 * 2. Add <FilterBar /> below your header/search
 * 3. Add <AdvancedFilters /> anywhere (it's a modal)
 * 4. Use the useFilters() hook to access filter state
 *
 * Example usage in home page:
 * ```tsx
 * import { FilterProvider, useFilters } from '@/app/contexts/FilterContext';
 * import { FilterBar, AdvancedFilters } from '@/app/components/Home';
 *
 * function HomePage() {
 *   const { filters } = useFilters();
 *
 *   // Use filters.location, filters.categories, filters.minRating, etc.
 *   // to filter your business data
 *
 *   return (
 *     <>
 *       <FilterBar />
 *       <AdvancedFilters />
 *       {/* Your existing content *\/}
 *     </>
 *   );
 * }
 *
 * export default function WrappedHome() {
 *   return (
 *     <FilterProvider>
 *       <HomePage />
 *     </FilterProvider>
 *   );
 * }
 * ```
 */
export function FilterDemo() {
  return (
    <FilterProvider>
      <div className="min-h-[100dvh] bg-off-white">
        {/* Header */}
        <div className="bg-white border-b border-charcoal/10 p-4">
          <div className="max-w-7xl mx-auto">
            <h1
              className="text-2xl font-bold text-charcoal"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 700 }}
            >
              Filter System Demo
            </h1>
            <p
              className="text-sm text-charcoal/60 mt-1"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              Try the filters below to see how they work
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar />

        {/* Demo Content */}
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-white rounded-xl p-6 border border-charcoal/10">
            <h2
              className="text-lg font-semibold text-charcoal mb-3"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
            >
              Filter State (for debugging)
            </h2>
            <FilterStateDisplay />
          </div>

          <div className="mt-6 bg-white rounded-xl p-6 border border-charcoal/10">
            <h2
              className="text-lg font-semibold text-charcoal mb-3"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
            >
              Integration Instructions
            </h2>
            <ol
              className="list-decimal list-inside space-y-2 text-sm text-charcoal/80"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              <li>Wrap your home page with <code className="bg-card-bg/10 px-1 py-0.5 rounded">FilterProvider</code></li>
              <li>Add <code className="bg-card-bg/10 px-1 py-0.5 rounded">FilterBar</code> component below your header</li>
              <li>Add <code className="bg-card-bg/10 px-1 py-0.5 rounded">AdvancedFilters</code> component (it's a modal)</li>
              <li>Use <code className="bg-card-bg/10 px-1 py-0.5 rounded">useFilters()</code> hook to access filter state</li>
              <li>Apply filters to your business query/API calls</li>
            </ol>
          </div>
        </div>

        {/* Advanced Filters Modal */}
        <AdvancedFilters />
      </div>
    </FilterProvider>
  );
}

// Helper component to display current filter state
function FilterStateDisplay() {
  const { filters } = require('@/app/contexts/FilterContext').useFilters();

  return (
    <pre className="bg-charcoal/5 p-4 rounded-lg overflow-auto text-xs">
      {JSON.stringify(filters, null, 2)}
    </pre>
  );
}
