"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/contexts/AuthContext";
import { Loader } from "@/app/components/Loader/Loader";
import { usePredefinedPageTitle } from "@/app/hooks/usePageTitle";
import {
  ArrowLeft,
  Award,
  Calendar,
  Check,
  MapPin,
  MessageSquare,
  Share2,
  ThumbsUp,
  TrendingUp,
  User,
  Eye,
  Star as StarIcon,
  Briefcase,
  AlertTriangle,
  X
} from "react-feather";
import { getBrowserSupabase } from "@/app/lib/supabase/client";

// Import components directly for faster loading
import Footer from "@/app/components/Footer/Footer";
import { ReviewsList } from "@/components/organisms/ReviewsList";
import { AchievementsList } from "@/components/organisms/AchievementsList";
import { DangerAction } from "@/components/molecules/DangerAction";
import { Skeleton } from "@/components/atoms/Skeleton";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import SavedBusinessRow from "@/app/components/Saved/SavedBusinessRow";
import { useSavedItems } from "@/app/contexts/SavedItemsContext";
import { EditProfileModal } from "@/app/components/EditProfile/EditProfileModal";
// Removed mock data import - use API calls instead
import { useMemo } from "react";

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
  
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.96) translateY(-12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
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
  
  .animate-fade-in-scale {
    animation: fadeInScale 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;


// Types
interface UserProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  onboarding_step: string;
  is_top_reviewer: boolean;
  reviews_count: number;
  badges_count: number;
  interests_count: number;
  last_interests_updated: string | null;
  created_at: string;
  updated_at: string;
}

interface Review {
  id: string;
  business_name: string;
  rating: number;
  review_text: string | null;
  is_featured: boolean;
  created_at: string;
  business_image_url?: string | null;
  business_slug?: string; // For navigation
}

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
}

interface UserAchievement {
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
}

function ProfileContent() {
  const { user, updateUser, isLoading, logout } = useAuth();
  const { savedItems } = useSavedItems();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarKey, setAvatarKey] = useState(0); // Force re-render of avatar
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const supabase = getBrowserSupabase();

  // Fetch user's reviews - MUST be before any early returns
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Get saved businesses for mobile display - TODO: Implement API call to fetch businesses by IDs
  const savedBusinesses = useMemo(() => {
    // TODO: Replace with actual API call to fetch businesses by IDs
    // Example: const businesses = await fetch(`/api/businesses?ids=${savedItems.join(',')}`);
    return [];
  }, [savedItems]);

  const profile = React.useMemo(() => {
    const rawProfile: any = user?.profile || {};
    const profileData = {
      username: rawProfile.username ?? (user?.email ? user.email.split('@')[0] : 'user'),
      display_name: rawProfile.display_name ?? null,
      avatar_url: rawProfile.avatar_url ?? null,
      is_top_reviewer: rawProfile.is_top_reviewer ?? false,
      reviews_count: rawProfile.reviews_count ?? 0,
      badges_count: rawProfile.badges_count ?? 0,
      created_at: rawProfile.created_at ?? (user?.created_at ?? new Date().toISOString()),
      ...rawProfile,
    };
    console.log('Profile memo recomputed:', {
      username: profileData.username,
      display_name: profileData.display_name,
      avatar_url: profileData.avatar_url,
      type: typeof profileData.avatar_url,
      rawProfile_username: rawProfile.username,
      rawProfile_display_name: rawProfile.display_name,
      rawProfile_avatar_url: rawProfile.avatar_url,
      user_profile_username: user?.profile?.username,
      user_profile_display_name: user?.profile?.display_name,
      user_profile_avatar_url: user?.profile?.avatar_url
    });
    return profileData;
  }, [user?.profile?.avatar_url, user?.profile?.username, user?.profile?.display_name, user?.email, user?.created_at]);

  // Note: Username and displayName state are now managed by EditProfileModal
  // This effect is kept for backwards compatibility but modal will initialize its own state
  useEffect(() => {
    if (isEditOpen) {
      setError(null);
    }
  }, [isEditOpen]);

  // Log profile changes for debugging
  useEffect(() => {
    console.log('Profile page - user.profile changed:', user?.profile);
  }, [user?.profile]);

  // Fetch user's reviews
  useEffect(() => {
    const fetchUserReviews = async () => {
      if (!user?.id) {
        setReviewsLoading(false);
        return;
      }

      try {
        setReviewsLoading(true);
        const supabase = getBrowserSupabase();
        
        // Fetch reviews by user_id
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            title,
            content,
            created_at,
            business:businesses!reviews_business_id_fkey (
              id,
              name,
              image_url,
              uploaded_image,
              slug
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (reviewsError) {
          console.error('Error fetching user reviews:', reviewsError);
          setUserReviews([]);
        } else {
          // Transform the data to match Review interface
          const transformedReviews: Review[] = (reviewsData || []).map((r: any) => ({
            id: r.id,
            business_name: r.business?.name || 'Unknown Business',
            rating: r.rating,
            review_text: r.content || r.title || null,
            is_featured: false,
            created_at: r.created_at,
            business_image_url: r.business?.uploaded_image || r.business?.image_url || null,
            business_slug: r.business?.slug || r.business?.id, // Store for navigation
          }));
          setUserReviews(transformedReviews);
        }
      } catch (err) {
        console.error('Error fetching user reviews:', err);
        setUserReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchUserReviews();
  }, [user?.id]);

  const handleSaveProfile = async (data?: { username: string; displayName: string; avatarFile: File | null }) => {
    if (!user) return;
    setSaving(true);
    setError(null);

    // Use data from parameters if provided, otherwise use state
    const usernameToSave = data?.username || username;
    const displayNameToSave = data?.displayName || displayName;
    const avatarFileToSave = data?.avatarFile !== undefined ? data.avatarFile : avatarFile;

    try {
      let avatar_url = profile.avatar_url || null;

      if (avatarFileToSave) {
        try {
          console.log('Starting avatar upload...', {
            fileName: avatarFile.name,
            fileSize: avatarFile.size,
            fileType: avatarFile.type,
            userId: user.id
          });

          // Validate file size (max 5MB)
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (avatarFile.size > maxSize) {
            throw new Error('Image file is too large. Maximum size is 5MB.');
          }

          const timestamp = Date.now();
          const fileExt = avatarFileToSave.name.split('.').pop() || 'jpg';
          const path = `${user.id}/avatar-${timestamp}.${fileExt}`;
          
          console.log('Uploading to path:', path);
          
          // Upload to Supabase Storage
          const { error: uploadErr, data: uploadData } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFileToSave, { 
              upsert: true, 
              cacheControl: '3600',
              contentType: avatarFileToSave.type || `image/${fileExt}`
            });
          
          if (uploadErr) {
            console.error('Avatar upload error details:', {
              error: uploadErr,
              message: uploadErr.message,
              name: uploadErr.name
            });
            
            // Provide more specific error messages
            let errorMessage = 'Failed to upload avatar image';
            if (uploadErr.message) {
              errorMessage = uploadErr.message;
              
              // Check for specific error patterns
              if (uploadErr.message.includes('413') || uploadErr.message.includes('too large')) {
                errorMessage = 'Image file is too large. Please choose a smaller image.';
              } else if (uploadErr.message.includes('401') || uploadErr.message.includes('403') || uploadErr.message.includes('permission') || uploadErr.message.includes('unauthorized')) {
                errorMessage = 'Permission denied. Please check your account permissions.';
              } else if (uploadErr.message.includes('duplicate') || uploadErr.message.includes('already exists')) {
                // If file already exists, try to get the URL anyway
                console.log('File already exists, getting public URL...');
                // Don't throw - continue to get the URL
              } else {
                errorMessage = `Upload failed: ${uploadErr.message}`;
              }
            }
            
            // Only throw if it's not a duplicate (we can still get the URL)
            if (!uploadErr.message?.includes('duplicate') && !uploadErr.message?.includes('already exists')) {
              throw new Error(errorMessage);
            }
          }
          
          console.log('Upload successful, getting public URL...');
          
          // Get public URL
          const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(path);
          
          if (!pubData?.publicUrl) {
            console.error('Failed to get public URL:', pubData);
            throw new Error('Failed to get public URL for uploaded image');
          }
          
          console.log('Got public URL:', pubData.publicUrl);
          
          // Store URL without query parameter (we can add cache-busting on display if needed)
          avatar_url = pubData.publicUrl;
          
          // Small delay to ensure image is available after upload
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('Avatar URL set:', avatar_url);
        } catch (uploadError: any) {
          console.error('Avatar upload failed:', uploadError);
          throw new Error(uploadError.message || 'Failed to upload profile image. Please try again.');
        }
      }

      // Use updateUser to handle both database update and local state update
      // Ensure we explicitly set username and display_name (use null for empty strings)
      const usernameValue = usernameToSave.trim() || null;
      const displayNameValue = displayNameToSave.trim() || null;
      
      await updateUser({
        profile: {
          ...(user.profile || {}),
          avatar_url: avatar_url,
          username: usernameValue,
          display_name: displayNameValue,
        } as any,
      });

      // Update local state if not already updated
      if (data) {
        setUsername(usernameToSave);
        setDisplayName(displayNameToSave);
        setAvatarFile(avatarFileToSave);
      }

      console.log('Profile updated:', { avatar_url, username: usernameToSave, display_name: displayNameToSave });

      // Force re-render of avatar component
      setAvatarKey(prev => prev + 1);

      setIsEditOpen(false);
      setAvatarFile(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatMemberSince = (d: string) => {
    const date = new Date(d);
    const year = date.getFullYear().toString().slice(-2);
    return `${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} '${year}`;
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handleDeactivate = async () => {
    if (!confirm("Are you sure you want to deactivate your account? You can reactivate it anytime by logging in.")) {
      return;
    }

    try {
      const response = await fetch('/api/user/deactivate-account', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate account');
      }

      // Account successfully deactivated, redirect to login
      window.location.href = '/login?message=Account deactivated. Log in to reactivate.';
    } catch (error: any) {
      console.error('Error deactivating account:', error);
      alert(`Failed to deactivate account: ${error.message}`);
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account successfully deleted, logout will be handled by the API
      setIsDeleteDialogOpen(false);
      window.location.href = '/onboarding';
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
      setDeleteError(`Failed to delete account: ${error.message}`);
    }
  };

  // Loading state - show full page loader with transition
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-off-white">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-off-white min-h-screen w-full flex items-center justify-center"
          >
            <Loader size="lg" variant="spinner" color="sage" />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const displayLabel =
    profile.display_name?.trim() ||
    profile.username ||
    user?.email?.split("@")[0] ||
    "Your Profile";
  const profileLocation =
    (profile.location as string) ||
    (profile.city as string) ||
    (profile.locale as string) ||
    "Location not set";
  const reviewsCount = profile.reviews_count ?? 0;
  const badgesCount = profile.badges_count ?? 0;
  const interestsCount = profile.interests_count ?? 0;
  const helpfulVotesCount =
    profile.helpful_votes ?? Math.max(0, reviewsCount * 3);
  const memberSinceLabel = profile.created_at
    ? formatMemberSince(profile.created_at)
    : "—";

  // Prepare reviews data
  const reviewsData = userReviews.map((review) => ({
    businessName: review.business_name,
    businessImageUrl: review.business_image_url,
    rating: review.rating,
    reviewText: review.review_text,
    isFeatured: review.is_featured,
    createdAt: review.created_at,
            onViewClick: () => {
              // Navigate to business page
              const reviewData = userReviews.find(r => r.id === review.id);
              if (reviewData) {
                // Get business slug or ID from the review data
                const businessSlug = (reviewData as any).business_slug;
                if (businessSlug) {
                  window.location.href = `/business/${businessSlug}`;
                }
              }
            },
  }));

  // Prepare achievements data (using empty list if none available)
  const achievements: UserAchievement[] = [];
  const achievementsData = achievements.map((ua) => ({
    name: ua.achievements.name,
    description: ua.achievements.description,
    icon: ua.achievements.icon,
    earnedAt: ua.earned_at,
  }));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animations }} />
      <style jsx global>{`
        .font-urbanist {
          font-family: "Urbanist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, system-ui,
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
        }
      `}</style>
      <AnimatePresence mode="wait">
        <motion.div
          key="profile"
          initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
            opacity: { duration: 0.5 },
            filter: { duration: 0.55 }
          }}
          className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
          style={{
            fontFamily:
              "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
        <header
          className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg/95 backdrop-blur-sm border-b border-charcoal/10 animate-slide-in-top"
          role="banner"
        >
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-10 2xl:px-16 py-4">
            <nav
              className="flex items-center justify-between"
              aria-label="Profile navigation"
            >
              <Link
                href="/home"
                className="group flex items-center focus:outline-none rounded-lg px-1 -mx-1"
                aria-label="Go back to home"
              >
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 mr-2 sm:mr-3"
                  aria-hidden="true"
                >
                  <ArrowLeft
                    className="w-6 h-6 text-white group-hover:text-white transition-colors duration-300"
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className="text-h3 sm:text-h2 font-semibold text-white animate-delay-100 animate-fade-in truncate max-w-[150px] sm:max-w-none" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  {displayLabel}
                </h3>
              </Link>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  className="w-10 h-10 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 min-h-[44px] min-w-[44px]"
                  aria-label="Share profile"
                >
                  <Share2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              </div>
            </nav>
          </div>
        </header>

        <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
          <div className="py-1 pt-20 md:px-20 sm:px-4">
            <main
              className="relative font-urbanist pt-4 sm:pt-6"
              id="main-content"
              role="main"
              aria-label="User profile content"
            >
              <div className="mx-auto w-full max-w-[2000px] px-3 sm:px-6 lg:px-10 2xl:px-16 relative z-10">
                <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
                  <div className="space-y-6">
                    <article
                      className="w-full sm:mx-0"
                      aria-labelledby="profile-heading"
                    >
                      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg relative overflow-hidden animate-fade-in-up">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>

                        <div className="relative z-10 p-6 sm:p-8">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            <div className="relative flex-shrink-0">
                              {!imgError && profile.avatar_url && profile.avatar_url.trim() !== "" ? (
                                <div className="relative">
                                  <Image
                                    key={`${profile.avatar_url || "avatar"}-${avatarKey}`}
                                    src={profile.avatar_url}
                                    alt={displayLabel}
                                    width={120}
                                    height={120}
                                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-full border-4 border-white shadow-xl ring-4 ring-white/50"
                                    priority
                                    onError={() => setImgError(true)}
                                  />
                                  {profile.is_top_reviewer && (
                                    <div className="absolute -bottom-1 -right-1 z-20">
                                      <div className="w-8 h-8 bg-sage rounded-full flex items-center justify-center ring-4 ring-white">
                                        <Check className="text-white" size={14} strokeWidth={3} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center bg-sage/20 rounded-full border-4 border-white shadow-xl ring-4 ring-white/50">
                                  <User className="text-navbar-bg" size={44} strokeWidth={2.5} />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 w-full">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h2
                                  id="profile-heading"
                                  className="text-h1 sm:text-hero font-semibold text-charcoal"
                                  style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                                >
                                  {displayLabel}
                                </h2>
                                {profile.is_top_reviewer && (
                                  <div className="px-2 py-1 rounded-full text-caption font-semibold flex items-center gap-1 bg-sage/20 text-sage">
                                    <Award size={12} />
                                    <span className="capitalize">Top Reviewer</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mb-4 text-body-sm text-charcoal/70 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <MapPin size={14} />
                                  <span>{profileLocation}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  <span>Member since {memberSinceLabel}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 mb-4 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <StarIcon className="w-5 h-5 fill-coral text-coral" />
                                  <span className="text-lg font-bold text-charcoal">
                                    {reviewsCount > 0 ? (Math.min(5, 4 + reviewsCount / 20)).toFixed(1) : "5.0"}
                                  </span>
                                  <span className="text-sm text-charcoal/70">rating</span>
                                </div>
                                <div className="text-sm text-charcoal/70">
                                  {reviewsCount} reviews
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <button
                                  onClick={() => setIsEditOpen(true)}
                                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-coral/90 hover:bg-charcoal/90 hover:border-white/30 text-white rounded-full text-caption sm:text-body-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-sage/20 border border-sage/20 whitespace-nowrap"
                                  aria-label="Edit profile"
                                >
                                  <MessageSquare size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
                                  <span>Edit Profile</span>
                                </button>
                                <Link
                                  href="/write-review"
                                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/90 hover:bg-off-white text-charcoal rounded-full text-caption sm:text-body-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-charcoal/10 border border-charcoal/10 whitespace-nowrap"
                                  aria-label="Write a review"
                                >
                                  <TrendingUp size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
                                  <span>Leave a Review</span>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    <section
                      className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                      aria-label="Profile statistics"
                    >
                      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 animate-fade-in-up animate-delay-100">
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsUp className="w-5 h-5 text-coral" />
                          <span className="text-sm text-charcoal/70">Helpful votes</span>
                        </div>
                        <p className="text-2xl font-bold text-charcoal">
                          {helpfulVotesCount}
                        </p>
                        <p className="text-xs text-charcoal/60">Community reactions</p>
                      </div>
                      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 animate-fade-in-up animate-delay-200">
                        <div className="flex items-center gap-2 mb-2">
                          <StarIcon className="w-5 h-5 text-coral" />
                          <span className="text-sm text-charcoal/70">Reviews</span>
                        </div>
                        <p className="text-2xl font-bold text-charcoal">{reviewsCount}</p>
                        <p className="text-xs text-charcoal/60">Total contributions</p>
                      </div>
                      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 animate-fade-in-up animate-delay-300">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-5 h-5 text-coral" />
                          <span className="text-sm text-charcoal/70">Badges</span>
                        </div>
                        <p className="text-2xl font-bold text-charcoal">{badgesCount}</p>
                        <p className="text-xs text-charcoal/60">Achievements unlocked</p>
                      </div>
                      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-4 animate-fade-in-up animate-delay-300">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-5 h-5 text-coral" />
                          <span className="text-sm text-charcoal/70">Interests</span>
                        </div>
                        <p className="text-2xl font-bold text-charcoal">{interestsCount}</p>
                        <p className="text-xs text-charcoal/60">Communities followed</p>
                      </div>
                    </section>

                    {/* Saved Businesses - Mobile Only */}
                    {savedBusinesses.length > 0 && (
                      <section
                        className="md:hidden bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-6 space-y-4 animate-fade-in-up animate-delay-300"
                        aria-label="Saved businesses"
                      >
                        <SavedBusinessRow
                          title="Your Saved Gems"
                          businesses={savedBusinesses}
                          showCount={true}
                        />
                      </section>
                    )}

                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-6 sm:p-8 space-y-4"
                      aria-label="Business management"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-charcoal flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                            <Briefcase className="w-5 h-5 text-sage" />
                          </span>
                          Manage Your Business Presence
                        </h3>
                      </div>
                      <p className="text-sm text-charcoal/70 font-medium max-w-[520px]">
                        Keep your business information up to date, respond to community feedback, and track performance insights from one place.
                      </p>
                      <Link
                        href="/manage-business"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-coral/20 border border-coral/30 w-fit"
                      >
                        <Briefcase className="w-4 h-4" />
                        Manage Businesses
                      </Link>
                    </section>

                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-6 sm:p-8"
                      aria-label="Your contributions"
                    >
                      {reviewsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader size="md" variant="spinner" color="sage" />
                        </div>
                      ) : reviewsData.length > 0 ? (
                        <ReviewsList
                          reviews={reviewsData}
                          title="Your Contributions"
                          initialDisplayCount={2}
                          showToggle={true}
                        />
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-charcoal/70 mb-4">You haven't written any reviews yet.</p>
                          <Link
                            href="/write-review"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sage hover:bg-sage/90 text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Write Your First Review
                          </Link>
                        </div>
                      )}
                    </section>

                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-6 sm:p-8"
                      aria-label="Your achievements"
                    >
                      <AchievementsList
                        achievements={achievementsData}
                        title="Your Achievements"
                      />
                    </section>

                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-lg p-6 sm:p-8 space-y-4"
                      aria-label="Account actions"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                          <AlertTriangle className="w-5 h-5 text-coral" />
                        </span>
                        <h3 className="text-base font-semibold text-charcoal">
                          Account Actions
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <DangerAction
                          title="Log Out"
                          description="Sign out of your account on this device."
                          buttonText="Log Out"
                          onAction={handleLogout}
                          variant="primary"
                          showBorder={false}
                        />
                        <DangerAction
                          title="Deactivate Account"
                          description="Temporarily deactivate your account. You can reactivate it anytime by logging in."
                          buttonText="Deactivate Account"
                          onAction={handleDeactivate}
                          variant="primary"
                          showBorder={true}
                        />
                        <DangerAction
                          title="Delete Account"
                          description="Permanently delete your account and all associated data. This action cannot be undone."
                          buttonText="Delete Account"
                          onAction={handleDeleteAccount}
                          variant="secondary"
                          showBorder={true}
                        />
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </main>
          </div>
          <Footer />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={async (data) => {
          // Call the save handler with the data from modal
          await handleSaveProfile(data);
        }}
        currentUsername={profile.username || ""}
        currentDisplayName={profile.display_name || null}
        currentAvatarUrl={profile.avatar_url || null}
        saving={saving}
        error={error}
      />
    </>
  );
}

export default function ProfilePage() {
  usePredefinedPageTitle('profile');
  return <ProfileContent />;
}
