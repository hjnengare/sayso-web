"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { BusinessOwnershipService } from "../../../lib/services/businessOwnershipService";
import { PageLoader, Loader } from "../../../components/Loader";
import Header from "../../../components/Header/Header";
import Footer from "../../../components/Footer/Footer";
import { Store, MapPin, Star, MessageSquare, Edit, BarChart3, ArrowLeft, Eye, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getBrowserSupabase } from "../../../lib/supabase/client";
import type { Business } from "../../../lib/types/database";

interface BusinessStats {
  average_rating: number | null;
  total_reviews: number;
}

export default function OwnerBusinessDashboard() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [analytics, setAnalytics] = useState<{
    profileViews: number;
    newReviews: number;
    newConversations: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // TEMPORARY: Bypass auth for UI development
      // if (authLoading || !user || !businessId) return;

      setIsLoading(true);
      try {
        // TEMPORARY: Bypass ownership check for UI development
        // // Check ownership
        // const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
        // const ownsThisBusiness = ownedBusinesses.some(b => b.id === businessId);
        // 
        // if (!ownsThisBusiness) {
        //   setError('You do not have access to this business');
        //   setIsLoading(false);
        //   return;
        // }

        setHasAccess(true);

        // Fetch business details
        const supabase = getBrowserSupabase();
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single();

        // TEMPORARY: Use mock data if business not found (for UI development)
        if (businessError || !businessData) {
          // Use mock data for UI development
          const mockBusiness: Business = {
            id: businessId,
            name: 'Sample Business',
            description: 'This is a sample business description for UI development purposes.',
            category: 'Restaurant',
            location: 'Cape Town, South Africa',
            address: '123 Main Street',
            phone: '+27 21 123 4567',
            email: 'info@samplebusiness.com',
            website: 'https://samplebusiness.com',
            image_url: null,
            verified: true,
            price_range: '$$' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setBusiness(mockBusiness);
        } else {
          setBusiness(businessData as Business);
        }

        // Fetch stats
        const { data: statsData, error: statsError } = await supabase
          .from('business_stats')
          .select('average_rating, total_reviews')
          .eq('business_id', businessId)
          .single();

        if (!statsError && statsData) {
          setStats({
            average_rating: statsData.average_rating,
            total_reviews: statsData.total_reviews || 0,
          });
        } else {
          // Default stats if not found
          setStats({
            average_rating: null,
            total_reviews: 0,
          });
        }

        // Fetch analytics (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Profile views (placeholder - would need a views table)
        const profileViews = 0; // TODO: Implement when views tracking is added

        // New reviews in last 30 days
        const { count: newReviewsCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('created_at', thirtyDaysAgo.toISOString());

        // New conversations in last 30 days
        const { count: newConversationsCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('created_at', thirtyDaysAgo.toISOString());

        setAnalytics({
          profileViews,
          newReviews: newReviewsCount || 0,
          newConversations: newConversationsCount || 0,
        });
      } catch (error) {
        console.error('Error fetching business data:', error);
        setError('Failed to load business data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [businessId]); // TEMPORARY: Removed user and authLoading dependencies for UI development

  // TEMPORARY: Bypass auth loading check for UI development
  // if (authLoading || isLoading) {
  if (isLoading) {
    return <PageLoader size="lg" variant="wavy" color="sage" />;
  }

  // TEMPORARY: Bypass user check for UI development
  // if (!user) {
  //   router.push('/business/login');
  //   return null;
  // }

  if (error || !business) {
    return (
      <div className="min-h-dvh bg-off-white">
        <Header />
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-charcoal/70">{error || 'Business not found'}</p>
              <Link
                href="/owners"
                className="inline-flex items-center gap-2 mt-4 text-sage hover:text-sage/80"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Your Businesses
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">
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
          <main className="relative font-urbanist">
            <div className="mx-auto w-full max-w-[2000px] px-3 sm:px-6 lg:px-10 2xl:px-16 relative z-10">
              {/* Breadcrumb Navigation */}
              <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm sm:text-base">
                  <li>
                    <Link href="/owners" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Your Businesses
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 text-charcoal/40" />
                  </li>
                  <li>
                    <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      {business.name}
                    </span>
                  </li>
                </ol>
              </nav>

              <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
                <div className="space-y-6">
                  {/* Business Header Card */}
                  <article
                    className="w-full sm:mx-0"
                    aria-labelledby="business-heading"
                  >
                    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>

                    <div className="relative z-10 p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="relative flex-shrink-0">
                          <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center bg-sage/20 rounded-full border-4 border-coral shadow-xl">
                            <Store className="text-navbar-bg" size={44} strokeWidth={2.5} />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h1
                              id="business-heading"
                              className="text-h1 sm:text-hero font-semibold text-charcoal"
                              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                            >
                              {business.name}
                            </h1>
                            {business.verified && (
                              <div className="px-2 py-1 rounded-full text-caption font-semibold flex items-center gap-1 bg-sage/20 text-sage">
                                <Star size={12} />
                                <span className="capitalize">Verified</span>
                              </div>
                            )}
                          </div>
                          
                          {business.description && (
                            <p className="text-body-sm text-charcoal/80 mb-4 leading-relaxed">
                              {business.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 mb-4 text-body-sm text-charcoal/70 flex-wrap">
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              <span>{business.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Store size={14} />
                              <span>{business.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  </article>

                  {/* Stats Cards */}
                  <section
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                    aria-label="Business statistics"
                  >
                    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-coral" />
                        <span className="text-sm text-charcoal/70">Average Rating</span>
                      </div>
                      <p className="text-2xl font-bold text-charcoal">
                        {stats?.average_rating ? stats.average_rating.toFixed(1) : '—'}
                      </p>
                      <p className="text-xs text-charcoal/60">From reviews</p>
                    </div>

                    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-coral" />
                        <span className="text-sm text-charcoal/70">Reviews</span>
                      </div>
                      <p className="text-2xl font-bold text-charcoal">
                        {stats?.total_reviews || 0}
                      </p>
                      <p className="text-xs text-charcoal/60">Total received</p>
                    </div>

                    {analytics && (
                      <>
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-5 h-5 text-coral" />
                            <span className="text-sm text-charcoal/70">Profile Views</span>
                          </div>
                          <p className="text-2xl font-bold text-charcoal">
                            {analytics.profileViews}
                          </p>
                          <p className="text-xs text-charcoal/60">Last 30 days</p>
                        </div>

                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-5 h-5 text-coral" />
                            <span className="text-sm text-charcoal/70">Conversations</span>
                          </div>
                          <p className="text-2xl font-bold text-charcoal">
                            {analytics.newConversations}
                          </p>
                          <p className="text-xs text-charcoal/60">Last 30 days</p>
                        </div>
                      </>
                    )}
                  </section>


                  {/* Quick Actions */}
                  <section
                    className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-6 sm:p-8 space-y-4"
                    aria-label="Business management"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-charcoal flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                          <Store className="w-5 h-5 text-sage" />
                        </span>
                        Manage Your Business
                      </h3>
                    </div>
                    <p className="text-sm text-charcoal/70 font-medium max-w-[520px]">
                      Keep your business information up to date, respond to community feedback, and track performance insights from one place.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/owners/businesses/${businessId}/reviews`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-coral/20 border border-coral/30 w-fit"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        <MessageSquare size={14} strokeWidth={2.5} />
                        <span>View & Reply to Reviews</span>
                      </Link>
                      <Link
                        href={`/dm?businessId=${businessId}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-coral/20 border border-coral/30 w-fit"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        <MessageSquare size={14} strokeWidth={2.5} />
                        <span>Open Messages</span>
                      </Link>
                      <Link
                        href={`/business/${businessId}/edit`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-coral/20 border border-coral/30 w-fit"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        <Edit size={14} strokeWidth={2.5} />
                        <span>Edit Business Details</span>
                      </Link>
                    </div>
                  </section>
                </div>
              </div>
            </div>
            </main>
          </div>
        </div>

      <Footer />
    </div>
  );
}

