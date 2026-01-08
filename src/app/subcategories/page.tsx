"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import SubcategoryStyles from "../components/Subcategories/SubcategoryStyles";
import SubcategoryHeader from "../components/Subcategories/SubcategoryHeader";
import SubcategorySelection from "../components/Subcategories/SubcategorySelection";
import SubcategoryGrid from "../components/Subcategories/SubcategoryGrid";
import SubcategoryActions from "../components/Subcategories/SubcategoryActions";
import { Loader } from "../components/Loader";
import { useSubcategoriesPage } from "../hooks/useSubcategoriesPage";
import { OnboardingErrorBoundary } from "../components/Onboarding/OnboardingErrorBoundary";

const MAX_SELECTIONS = 10;

function SubcategoriesContent() {
  const {
    subcategories,
    groupedSubcategories,
    selectedSubcategories,
    isNavigating,
    shakingIds,
    canProceed,
    handleToggle,
    handleNext,
    isLoading,
    error,
  } = useSubcategoriesPage();

  if (isLoading) {
    return (
      <OnboardingLayout step={2} backHref="/interests">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size="md" variant="wavy" color="sage" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingErrorBoundary>
      <SubcategoryStyles />
      <OnboardingLayout step={2} backHref="/interests">
        <SubcategoryHeader />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center mb-4"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
                delay: 0.1,
              }}
            >
              <p className="text-sm font-semibold text-red-600">
                {error.message || 'An error occurred'}
              </p>
            </motion.div>
          )}

          <SubcategorySelection selectedCount={selectedSubcategories.length} maxSelections={MAX_SELECTIONS}>
            <SubcategoryGrid
              groupedSubcategories={groupedSubcategories}
              selectedSubcategories={selectedSubcategories.map(id => {
                const subcategory = subcategories.find(s => s.id === id);
                return { id, interest_id: subcategory?.interest_id || '' };
              })}
              maxSelections={MAX_SELECTIONS}
              onToggle={handleToggle}
              subcategories={subcategories}
              loading={false}
              shakingIds={shakingIds}
            />
          </SubcategorySelection>

          <SubcategoryActions
            canProceed={canProceed}
            isNavigating={isNavigating}
            isLoading={false}
            selectedCount={selectedSubcategories.length}
            onContinue={handleNext}
          />
        </motion.div>
      </OnboardingLayout>
    </OnboardingErrorBoundary>
  );
}

// Force dynamic rendering to prevent stale data
export const dynamic = 'force-dynamic';

export default function SubcategoriesPage() {
  return (
    <ProtectedRoute requiresAuth={true}>
      <Suspense fallback={
        <OnboardingLayout step={2} backHref="/interests">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader size="md" variant="wavy" color="sage" />
          </div>
        </OnboardingLayout>
      }>
        <SubcategoriesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
