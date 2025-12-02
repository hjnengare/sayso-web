"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "react-feather";
import {
    Store,
    Plus,
    BarChart3,
    MessageSquare,
} from "lucide-react";
import { PageLoader } from "../components/Loader";
import Header from "../components/Header/Header";

// Import components
import { 
    BusinessStatsCard, 
    BusinessListCard, 
    QuickActionCard, 
    WelcomeSection,
    type Business as BusinessCard 
} from "./components";
import { useRequireBusinessOwner } from "../hooks/useBusinessAccess";

// CSS animations to match the design schema
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInFromTop {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-slide-in-top {
    animation: slideInFromTop 0.5s ease-out forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;

function formatLastUpdated(primary?: string | null, fallback?: string | null) {
    const source = primary ?? fallback;

    if (!source) {
        return "recently";
    }

    const date = new Date(source);
    if (Number.isNaN(date.getTime())) {
        return "recently";
    }

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ManageBusinessPage() {
    const pathname = usePathname();
    const redirectTo = `/business/login?redirect=${encodeURIComponent(pathname || "/manage-business")}`;
    const { isChecking, hasAccess, businesses: ownedBusinesses } = useRequireBusinessOwner({ redirectTo });

    const businessCards = useMemo<BusinessCard[]>(() => ownedBusinesses.map((biz) => {
        const rawStatus = (biz as any).status;
        const normalizedStatus: BusinessCard["status"] = rawStatus === "pending" || rawStatus === "inactive" ? rawStatus : "active";

        const rawRating = (biz as any).average_rating ?? (biz as any).rating ?? 0;
        const numericRating = Number(rawRating);
        const rating = Number.isFinite(numericRating) ? Number(numericRating.toFixed(1)) : 0;

        const rawReviews = (biz as any).total_reviews ?? (biz as any).reviews ?? 0;
        const numericReviews = Number(rawReviews);
        const reviews = Number.isFinite(numericReviews) ? numericReviews : 0;

        const rawPending = (biz as any).pending_reviews ?? (biz as any).pendingReviews ?? 0;
        const numericPending = Number(rawPending);
        const pendingReviews = Number.isFinite(numericPending) ? numericPending : 0;

        const updatedAt = (biz as any).updated_at ?? biz.updated_at ?? null;
        const createdAt = (biz as any).created_at ?? biz.created_at ?? null;

        const image = (biz as any).uploaded_image ?? (biz as any).uploadedImage ?? biz.image_url ?? (biz as any).image ?? "";

        const verificationStatus: BusinessCard["verificationStatus"] = (biz as any).owner_verified || (biz as any).ownerVerified ? "verified" : "pending";

        return {
            id: biz.id,
            name: biz.name,
            category: biz.category || "Business",
            status: normalizedStatus,
            rating,
            reviews,
            image,
            lastUpdated: formatLastUpdated(updatedAt, createdAt),
            pendingReviews,
            verificationStatus,
        };
    }), [ownedBusinesses]);

    const totalPendingReviews = useMemo(() => businessCards.reduce((sum, business) => sum + (business.pendingReviews || 0), 0), [businessCards]);

    const averageRating = useMemo(() => {
        const ratedBusinesses = businessCards.filter((business) => business.rating > 0);
        if (ratedBusinesses.length === 0) {
            return "N/A";
        }
        const total = ratedBusinesses.reduce((sum, business) => sum + business.rating, 0);
        return (total / ratedBusinesses.length).toFixed(1);
    }, [businessCards]);

    if (isChecking) {
        return <PageLoader size="lg" variant="wavy" color="sage" />;
    }

    if (!hasAccess) {
        return (
            <div className="min-h-dvh bg-off-white flex items-center justify-center px-6 text-center">
                <div className="space-y-4 max-w-sm">
                    <h2 className="text-xl font-semibold text-charcoal font-urbanist">Business access required</h2>
                    <p className="text-sm text-charcoal/70 font-urbanist">
                        Sign in with your business account or claim a business to manage listings.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/business/login"
                            className="px-5 py-2.5 rounded-full bg-sage text-white font-urbanist font-600 hover:bg-sage/90 transition-all duration-200"
                        >
                            Business Login
                        </Link>
                        <Link
                            href="/claim-business"
                            className="px-5 py-2.5 rounded-full border border-sage/40 text-charcoal font-urbanist font-600 hover:bg-sage/10 transition-all duration-200"
                        >
                            Claim a Business
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: animations }} />
            {/* Google Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            {/* SF Pro Font Setup */}
            <style jsx global>{`
                .font-urbanist {
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
                        "SF Pro Display", "Helvetica Neue", Helvetica, Arial, system-ui,
                        sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
                }
            `}</style>
            <div
                className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
                style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                }}
            >
                {/* Main Header */}
                <Header
                  showSearch={false}
                  variant="white"
                  backgroundClassName="bg-navbar-bg"
                  topPosition="top-0"
                  reducedPadding={true}
                  whiteText={true}
                />

                <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                    <div className="pt-20 sm:pt-24">
                        <section
                            className="relative"
                            style={{
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                            }}
                        >
                            <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
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
                                                Manage Business
                                            </span>
                                        </li>
                                    </ol>
                                </nav>
                                <div className="max-w-6xl mx-auto pt-8 pb-8">
                    <div className="space-y-6">
                        {/* Welcome Section */}
                        <WelcomeSection />

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <BusinessStatsCard
                                icon={Store}
                                label="Total Businesses"
                                value={businessCards.length}
                                color="sage"
                                delay={200}
                            />
                            <BusinessStatsCard
                                icon={MessageSquare}
                                label="Pending Reviews"
                                value={totalPendingReviews}
                                color="coral"
                                delay={200}
                            />
                            <BusinessStatsCard
                                icon={BarChart3}
                                label="Avg Rating"
                                value={averageRating}
                                color="sage"
                                delay={200}
                            />
                        </div>

                        {/* Business List */}
                        <BusinessListCard businesses={businessCards} />

                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <QuickActionCard
                                href="/claim-business"
                                icon={Plus}
                                title="Claim Business"
                                description="Claim an existing business or add a new one to your portfolio."
                                color="sage"
                                delay={0}
                            />
                            <QuickActionCard
                                href="/analytics"
                                icon={BarChart3}
                                title="Analytics"
                                description="View detailed analytics and performance metrics for your businesses."
                                color="coral"
                                delay={0}
                            />
                        </div>
                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
