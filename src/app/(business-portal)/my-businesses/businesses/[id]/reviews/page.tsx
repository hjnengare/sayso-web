"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../../contexts/AuthContext";
import { PageLoader } from "../../../../../components/Loader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReviewsList from "../../../../../components/Reviews/ReviewsList";
import { useOwnerBusinessDashboard } from "../../../../../hooks/useOwnerBusinessDashboard";
import { useReviews } from "../../../../../hooks/useReviews";

export default function OwnerReviewsPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;
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
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm font-urbanist mb-4">
          {error || 'Business not found'}
        </div>
        <Link
          href={`/my-businesses/businesses/${businessId}`}
          className="inline-flex items-center gap-2 text-navbar-bg hover:text-navbar-bg/80 font-urbanist text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto font-urbanist">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="font-urbanist text-2xl font-bold text-charcoal tracking-tight">
            Reviews for {business.name}
          </h1>
        </div>
        <p className="font-urbanist text-sm text-charcoal/55">
          Respond to customer feedback and manage your reputation
        </p>
      </div>

      <Link
        href={`/my-businesses/businesses/${businessId}`}
        className="inline-flex items-center gap-2 mb-6 text-charcoal/60 hover:text-charcoal font-urbanist text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="rounded-2xl border border-charcoal/10 bg-white shadow-premium p-6 sm:p-8">
        <ReviewsList
          reviews={reviews}
          loading={reviewsLoading}
          error={error}
          showBusinessInfo={false}
          businessId={businessId}
          emptyMessage="No reviews yet. Reviews from customers will appear here."
          isOwnerView={true}
        />
      </div>
    </div>
  );
}
