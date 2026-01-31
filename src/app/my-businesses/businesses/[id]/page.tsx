"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { BusinessOwnershipService } from "../../../lib/services/businessOwnershipService";
import { PageLoader, Loader } from "../../../components/Loader";
import { Store, MapPin, Star, MessageSquare, Edit, BarChart3, ArrowLeft, Eye, TrendingUp, ChevronRight, Camera, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { getBrowserSupabase } from "../../../lib/supabase/client";
import type { Business } from "../../../lib/types/database";
import { useToast } from "../../../contexts/ToastContext";
import { STORAGE_BUCKETS } from "../../../lib/utils/storageBucketConfig";
import Image from "next/image";

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
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      // If auth is still loading, wait
      if (authLoading) return;

      // If auth resolved but no user, stop loading (will redirect below)
      if (!user) {
        setIsLoading(false);
        return;
      }

      // If no business ID, stop loading
      if (!businessId) {
        setIsLoading(false);
        setError('No business ID provided');
        return;
      }

      setIsLoading(true);
      try {
        // Check ownership and fetch business
        const businessData = await BusinessOwnershipService.getOwnedBusinessById(user.id, businessId);

        if (cancelled) return;

        if (!businessData) {
          setError('You do not have access to this business or it does not exist');
          setIsLoading(false);
          return;
        }

        setHasAccess(true);
        setBusiness(businessData);

        // Fetch stats, reviews, and conversations in parallel
        const supabase = getBrowserSupabase();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [statsResult, reviewsResult, conversationsResult] = await Promise.allSettled([
          supabase
            .from('business_stats')
            .select('average_rating, total_reviews')
            .eq('business_id', businessId)
            .single(),
          supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .gte('created_at', thirtyDaysAgo.toISOString()),
          supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .gte('created_at', thirtyDaysAgo.toISOString()),
        ]);

        if (cancelled) return;

        // Handle stats
        if (statsResult.status === 'fulfilled' && !statsResult.value.error && statsResult.value.data) {
          setStats({
            average_rating: statsResult.value.data.average_rating,
            total_reviews: statsResult.value.data.total_reviews || 0,
          });
        } else {
          setStats({ average_rating: null, total_reviews: 0 });
        }

        // Handle analytics
        const newReviewsCount = reviewsResult.status === 'fulfilled' ? reviewsResult.value.count : 0;
        const newConversationsCount = conversationsResult.status === 'fulfilled' ? conversationsResult.value.count : 0;

        setAnalytics({
          profileViews: 0, // TODO: Implement when views tracking is added
          newReviews: newReviewsCount || 0,
          newConversations: newConversationsCount || 0,
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching business data:', error);
        setError('Failed to load business data');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, businessId]);

  // Refetch when page becomes visible (e.g., returning from edit page)
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refetchBusiness = async () => {
      if (cancelled || !businessId) return;
      try {
        const supabase = getBrowserSupabase();
        const [businessResult, statsResult] = await Promise.allSettled([
          supabase.from('businesses').select('*').eq('id', businessId).single(),
          supabase.from('business_stats').select('average_rating, total_reviews').eq('business_id', businessId).single(),
        ]);

        if (cancelled) return;

        if (businessResult.status === 'fulfilled' && !businessResult.value.error && businessResult.value.data) {
          setBusiness(businessResult.value.data as Business);
        }
        if (statsResult.status === 'fulfilled' && !statsResult.value.error && statsResult.value.data) {
          setStats({
            average_rating: statsResult.value.data.average_rating,
            total_reviews: statsResult.value.data.total_reviews || 0,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error refetching business data:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && businessId) {
        timeoutId = setTimeout(refetchBusiness, 100);
      }
    };

    const handleFocus = () => {
      refetchBusiness();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [businessId]);

  // Listen for business deletion events
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    import('../../../lib/utils/businessUpdateEvents').then(({ businessUpdateEvents }) => {
      unsubscribe = businessUpdateEvents.onDelete((deletedBusinessId: string) => {
        // If this business was deleted, redirect to owners list
        if (deletedBusinessId === businessId) {
          router.push('/my-businesses');
        }
      });
    }).catch(err => {
      console.error('Error loading business update events:', err);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [businessId, router]);

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !businessId) return;

    // Validate file
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (file.size > MAX_SIZE) {
      showToast('Image file is too large. Please upload images smaller than 5MB.', 'error', 5000);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Invalid file type. Please upload JPG, PNG, WebP, or GIF images.', 'error', 5000);
      return;
    }

    setUploadingProfilePicture(true);
    try {
      const supabase = getBrowserSupabase();
      
      // Delete old profile picture if it exists and is in our storage
      if (business?.image_url && business.image_url.includes(STORAGE_BUCKETS.BUSINESS_IMAGES)) {
        try {
          // Extract path from URL
          const urlParts = business.image_url.split('/');
          const pathIndex = urlParts.findIndex(part => part === STORAGE_BUCKETS.BUSINESS_IMAGES);
          if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
            const oldPath = urlParts.slice(pathIndex + 1).join('/');
            await supabase.storage
              .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
              .remove([oldPath]);
          }
        } catch (deleteError) {
          console.warn('Could not delete old profile picture:', deleteError);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new profile picture
      const fileExt = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const fileName = `profile_${timestamp}.${fileExt}`;
      const filePath = `${businessId}/${fileName}`;

      // Upload with upsert (will use UPDATE policy if file exists, INSERT if new)
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true, // Replace if exists
        });

      if (uploadError) {
        console.error('[Owner Dashboard] Error uploading profile picture:', uploadError);
        showToast(`Failed to upload profile picture: ${uploadError.message}`, 'error', 5000);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
        .getPublicUrl(filePath);

      if (!publicUrl) {
        showToast('Failed to get image URL. Please try again.', 'error', 5000);
        return;
      }

      // Update business image_url
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ image_url: publicUrl })
        .eq('id', businessId);

      if (updateError) {
        console.error('[Owner Dashboard] Error updating profile picture:', updateError);
        showToast(`Failed to save profile picture: ${updateError.message}`, 'error', 5000);
        // Clean up uploaded file
        await supabase.storage
          .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
          .remove([filePath]);
        return;
      }

      // Update local state
      setBusiness(prev => prev ? { ...prev, image_url: publicUrl } : null);
      showToast('Profile picture updated successfully!', 'success', 3000);

      // Notify other components
      const { notifyBusinessUpdated } = await import('../../../lib/utils/businessUpdateEvents');
      notifyBusinessUpdated(businessId);
    } catch (error: any) {
      console.error('[Owner Dashboard] Error uploading profile picture:', error);
      showToast(error.message || 'Failed to upload profile picture. Please try again.', 'error', 5000);
    } finally {
      setUploadingProfilePicture(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Show loader while auth or data is loading
  if (authLoading || isLoading) {
    return <PageLoader size="lg" variant="wavy" color="sage" />;
  }

  // Redirect to login if no user
  if (!user) {
    router.push('/login');
    return null;
  }

  if (error || !business) {
    return (
      <div className="min-h-dvh bg-off-white">
        <main className="">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-charcoal/70">{error || 'Business not found'}</p>
              <Link
                href="/my-businesses"
                className="inline-flex items-center gap-2 mt-4 text-sage hover:text-sage/80"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Your Businesses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">

      <main className="pb-8 font-urbanist">
        <div className="mx-auto w-full max-w-[2000px] px-3 sm:px-6 lg:px-10 2xl:px-16">
              {/* Breadcrumb Navigation */}
              <nav className="py-1" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm sm:text-base">
                  <li>
                    <Link href="/my-businesses" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      My Businesses
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 text-charcoal/60" />
                  </li>
                  <li>
                    <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      {business.name}
                    </span>
                  </li>
                </ol>
              </nav>

              <div className="pt-2 pb-6">
                <div className="space-y-6">
                  {/* Business Header Card */}
                  <article
                    className="w-full sm:mx-0"
                    aria-labelledby="business-heading"
                  >
                    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>

                    <div className="relative z-10 p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="relative flex-shrink-0 group">
                          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-coral shadow-xl overflow-hidden bg-sage/20">
                            {business.image_url ? (
                              <Image
                                src={business.image_url}
                                alt={business.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 96px, 128px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Store className="text-navbar-bg" size={44} strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                          {/* Upload overlay */}
                          <label
                            htmlFor="profile-picture-upload"
                            className="absolute inset-0 flex items-center justify-center bg-charcoal/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full cursor-pointer"
                            title="Change profile picture"
                          >
                            {uploadingProfilePicture ? (
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            ) : (
                              <Camera className="w-6 h-6 text-white" />
                            )}
                          </label>
                          <input
                            id="profile-picture-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleProfilePictureUpload}
                            className="hidden"
                            disabled={uploadingProfilePicture}
                          />
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
                    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-coral" />
                        <span className="text-sm text-charcoal/70">Average Rating</span>
                      </div>
                      <p className="text-2xl font-bold text-charcoal">
                        {stats?.average_rating ? stats.average_rating.toFixed(1) : '—'}
                      </p>
                      <p className="text-xs text-charcoal/60">From reviews</p>
                    </div>

                    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-4">
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
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-5 h-5 text-coral" />
                            <span className="text-sm text-charcoal/70">Profile Views</span>
                          </div>
                          <p className="text-2xl font-bold text-charcoal">
                            {analytics.profileViews}
                          </p>
                          <p className="text-xs text-charcoal/60">Last 30 days</p>
                        </div>

                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-4">
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
                    className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] shadow-lg p-6 sm:p-8 space-y-4"
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
                        href={`/my-businesses/businesses/${businessId}/reviews`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-coral/30 w-fit"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        <MessageSquare size={14} strokeWidth={2.5} />
                        <span>View & Reply to Reviews</span>
                      </Link>
                      <Link
                        href={`/business/${businessId}/edit`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-coral/30 w-fit"
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
  );
}

