"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../contexts/AuthContext";
import { PageLoader } from "../../../../components/Loader";
import { ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReviewsList from "../../../../components/Reviews/ReviewsList";
import { usePreviousPageBreadcrumb } from "../../../../hooks/usePreviousPageBreadcrumb";
import { useOwnerBusinessDashboard } from "../../../../hooks/useOwnerBusinessDashboard";
import { useReviews } from "../../../../hooks/useReviews";

export default function OwnerReviewsPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;
  const { previousHref, previousLabel } = usePreviousPageBreadcrumb({
    fallbackHref: `/my-businesses/businesses/${businessId}`,
    fallbackLabel: "Business",
  });
  const { user, isLoading: authLoading } = useAuth();

  const {
    business,
    isLoading: dashboardLoading,
    error,
  } = useOwnerBusinessDashboard(authLoading ? null : user?.id, businessId);

  const { reviews, loading: reviewsLoading } = useReviews(business?.id);

  const isLoading = authLoading || dashboardLoading;

  if (authLoading || isLoading) {
    return <PageLoader size="lg" variant="wavy" color="sage" />;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (error || !business) {
    return (
      <div className="min-h-dvh bg-off-white relative">
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />

        <main className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />

          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-charcoal/70">{error || 'Business not found'}</p>
              <Link
                href={`/my-businesses/businesses/${businessId}`}
                className="inline-flex items-center gap-2 mt-4 text-sage hover:text-sage/80"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white relative">
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />

      <main className="pb-8 font-urbanist relative">
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />

        <div className="mx-auto w-full max-w-[2000px] px-2 sm:px-4 lg:px-6 2xl:px-8 relative z-10">
              {/* Breadcrumb Navigation */}
              <nav className="pb-1" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm sm:text-base">
                  <li>
                    <Link href={previousHref} className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      {previousLabel}
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 text-charcoal/60" />
                  </li>
                  <li>
                    <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Reviews
                    </span>
                  </li>
                </ol>
              </nav>

              <div className="pt-2 pb-6">
                <div className="space-y-6">
                  {/* Header Section */}
                  <div className="px-2">
                    <h1 className="text-h1 sm:text-hero font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      Reviews for {business?.name || 'Business'}
                    </h1>
                    <p className="text-body-sm text-charcoal/70 mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Respond to customer feedback and manage your reputation
                    </p>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3 mt-4">
                      <Link
                        href={`/my-businesses/businesses/${businessId}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-charcoal/10 hover:bg-charcoal/20 text-charcoal rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-charcoal/20 w-fit"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        <ArrowLeft size={14} strokeWidth={2.5} />
                        <span>Back to Dashboard</span>
                      </Link>
                    </div>
                  </div>

                  {/* Reviews List Section */}
                  <section
                    className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-lg p-6 sm:p-8"
                    aria-label="Business reviews"
                  >
                    <ReviewsList
                      reviews={reviews}
                      loading={reviewsLoading}
                      error={error}
                      showBusinessInfo={false}
                      businessId={businessId}
                      emptyMessage="No reviews yet. Reviews from customers will appear here."
                      isOwnerView={true}
                    />
                  </section>
                </div>
              </div>
            </div>
          </main>
    </div>
  );
}
