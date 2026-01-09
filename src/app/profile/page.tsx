"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/contexts/AuthContext";
import { Loader } from "@/app/components/Loader/Loader";
import { usePredefinedPageTitle } from "@/app/hooks/usePageTitle";
import {
  Award,
  Calendar,
  Check,
  MapPin,
  MessageSquare,
  ThumbsUp,
  User,
  Eye,
  Star as StarIcon,
  Briefcase,
  AlertTriangle,
  X,
  ChevronRight
} from "react-feather";
import { Store } from "lucide-react";
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
import { useReviewSubmission } from "@/app/hooks/useReviews";
import { useRouter } from "next/navigation";
import Header from "../components/Header/Header";

// Types
import type { EnhancedProfile, UserStats } from '@/app/lib/types/user';

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
  // Enhanced profile fields
  bio?: string;
  location?: string;
  website_url?: string;
  social_links?: Record<string, string>;
  privacy_settings?: {
    showActivity?: boolean;
    showStats?: boolean;
    showSavedBusinesses?: boolean;
  };
  last_active_at?: string;
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
  const { deleteReview } = useReviewSubmission();
  const router = useRouter();

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
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [enhancedProfile, setEnhancedProfile] = useState<EnhancedProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const supabase = getBrowserSupabase();

  // Fetch user's reviews - MUST be before any early returns
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [reviewToEdit, setReviewToEdit] = useState<{ reviewId: string; businessSlug: string } | null>(null);

  // Fetch user achievements
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  // Fetch enhanced profile data from API
  useEffect(() => {
    const fetchEnhancedProfile = async () => {
      if (!user?.id) {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        const response = await fetch('/api/user/profile', { cache: 'no-store' });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.warn('Not authenticated for profile fetch');
            setProfileLoading(false);
            return;
          }
          // Get error details from response
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
          
          // Handle 404 gracefully - profile might not exist yet, use existing profile data
          if (response.status === 404) {
            console.warn('Profile not found, using existing profile data:', errorData.error);
            setEnhancedProfile(null);
            setProfileLoading(false);
            return;
          }
          // For other errors, log but don't break the page
          console.warn('Error fetching enhanced profile:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
          });
          setEnhancedProfile(null);
          setProfileLoading(false);
          return;
        }

        const result = await response.json();
        if (result.data) {
          setEnhancedProfile(result.data);
        } else {
          setEnhancedProfile(null);
        }
      } catch (err) {
        console.warn('Error fetching enhanced profile:', err);
        setEnhancedProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchEnhancedProfile();
  }, [user?.id]);

  // Fetch user stats from API
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user?.id) {
        setStatsLoading(false);
        return;
      }

      try {
        setStatsLoading(true);
        const response = await fetch('/api/user/stats', { cache: 'no-store' });
        
        if (!response.ok) {
          if (response.status === 401) {
            setStatsLoading(false);
            return;
          }
          // Get error details from response
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
          console.error('Error fetching user stats:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
          });
          setStatsLoading(false);
          return;
        }

        const result = await response.json();
        if (result.data) {
          setUserStats(result.data);
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchUserStats();
  }, [user?.id]);

  // Get saved businesses for mobile display - only fetch if user has saved items
  const [savedBusinesses, setSavedBusinesses] = useState<any[]>([]);
  const [savedBusinessesLoading, setSavedBusinessesLoading] = useState(false);
  const [ownedBusinesses, setOwnedBusinesses] = useState<any[]>([]);
  const [ownedBusinessesLoading, setOwnedBusinessesLoading] = useState(false);

  // Fetch businesses owned by the user
  useEffect(() => {
    const fetchOwnedBusinesses = async () => {
      if (!user?.id) {
        setOwnedBusinesses([]);
        setOwnedBusinessesLoading(false);
        return;
      }

      try {
        setOwnedBusinessesLoading(true);
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, slug, category, location, image_url, verified, status, created_at, business_images(url, is_primary, sort_order)')
          .eq('owner_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Error fetching owned businesses:', error);
          setOwnedBusinesses([]);
          return;
        }

        // Transform business_images to uploaded_images format for compatibility
        const transformedBusinesses = (data || []).map((business: any) => {
          const uploaded_images = business.business_images
            ?.filter((img: any) => img.is_primary || img.sort_order === 0)
            .map((img: any) => img.url) || [];
          
          return {
            ...business,
            uploaded_images: uploaded_images.length > 0 ? uploaded_images : (business.image_url ? [business.image_url] : []),
          };
        });

        setOwnedBusinesses(transformedBusinesses);
      } catch (error) {
        console.warn('Error fetching owned businesses:', error);
        setOwnedBusinesses([]);
      } finally {
        setOwnedBusinessesLoading(false);
      }
    };

    fetchOwnedBusinesses();
  }, [user?.id, supabase]);

  useEffect(() => {
    const fetchSavedBusinesses = async () => {
      if (!user?.id || savedItems.length === 0) {
        setSavedBusinesses([]);
        setSavedBusinessesLoading(false);
        return;
      }

      try {
        setSavedBusinessesLoading(true);
        // Limit to 20 for faster loading - user can see more on saved page
        const response = await fetch('/api/saved/businesses?limit=20&page=1', { cache: 'no-store' });
        
        if (!response.ok) {
          if (response.status === 401) {
            setSavedBusinesses([]);
            return;
          }
          console.warn('Error fetching saved businesses for profile:', response.status);
          setSavedBusinesses([]);
          return;
        }

        const data = await response.json();
        if (data.businesses && Array.isArray(data.businesses)) {
          setSavedBusinesses(data.businesses);
        } else {
          setSavedBusinesses([]);
        }
      } catch (error) {
        console.warn('Error fetching saved businesses for profile:', error);
        setSavedBusinesses([]);
      } finally {
        setSavedBusinessesLoading(false);
      }
    };

    fetchSavedBusinesses();
  }, [user?.id, savedItems.length]);

  const profile = React.useMemo((): UserProfile => {
    const rawProfile: any = user?.profile || {};
    const enhanced: any = enhancedProfile || {};
    
    // Merge enhanced profile data with existing profile
    const profileData: UserProfile = {
      user_id: user?.id || '',
      username: (enhanced.username ?? rawProfile.username ?? (user?.email ? user.email.split('@')[0] : 'user')) as string | null,
      display_name: (enhanced.display_name ?? rawProfile.display_name ?? null) as string | null,
      avatar_url: (enhanced.avatar_url ?? rawProfile.avatar_url ?? null) as string | null,
      locale: (rawProfile.locale || 'en') as string,
      onboarding_step: (rawProfile.onboarding_step || 'interests') as string,
      is_top_reviewer: rawProfile.is_top_reviewer ?? false,
      reviews_count: rawProfile.reviews_count ?? 0,
      badges_count: rawProfile.badges_count ?? 0,
      interests_count: rawProfile.interests_count ?? 0,
      last_interests_updated: (rawProfile.last_interests_updated ?? null) as string | null,
      created_at: (enhanced.created_at ?? rawProfile.created_at ?? (user?.created_at ?? new Date().toISOString())) as string,
      updated_at: (enhanced.updated_at ?? rawProfile.updated_at ?? new Date().toISOString()) as string,
      // Enhanced fields
      bio: enhanced.bio as string | undefined,
      location: enhanced.location as string | undefined,
      website_url: enhanced.website_url as string | undefined,
      social_links: (enhanced.social_links || {}) as Record<string, string> | undefined,
      privacy_settings: enhanced.privacy_settings as { showActivity?: boolean; showStats?: boolean; showSavedBusinesses?: boolean } | undefined,
      last_active_at: enhanced.last_active_at as string | undefined,
    };
    return profileData;
  }, [user?.profile, enhancedProfile, user?.email, user?.created_at, user?.id]);

  // Note: Username and displayName state are now managed by EditProfileModal
  // This effect is kept for backwards compatibility but modal will initialize its own state
  useEffect(() => {
    if (isEditOpen) {
      setError(null);
    }
  }, [isEditOpen]);

  // Removed debug logging useEffect - was causing unnecessary re-renders

  // Fetch user's reviews - use API endpoint for better performance
  useEffect(() => {
    const fetchUserReviews = async () => {
      if (!user?.id) {
        setReviewsLoading(false);
        return;
      }

      try {
        setReviewsLoading(true);
        
        // Use new user reviews API endpoint
        const response = await fetch(`/api/user/reviews?page=1&pageSize=20`);
        
        if (!response.ok) {
          console.error('Error fetching user reviews:', response.status);
          setUserReviews([]);
          return;
        }

        const result = await response.json();
        if (result.data?.data && Array.isArray(result.data.data)) {
          // Transform the data to match Review interface
          const transformedReviews: Review[] = result.data.data.map((r: any) => ({
            id: r.id,
            business_name: r.business?.name || 'Unknown Business',
            rating: r.rating,
            review_text: r.body || r.title || null,
            is_featured: false,
            created_at: r.created_at,
            business_image_url: r.business?.image_url || null,
            business_slug: r.business?.slug || r.business?.id, // Store for navigation
          }));
          setUserReviews(transformedReviews);
        } else {
          setUserReviews([]);
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

  // Fetch user achievements
  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user?.id) {
        setAchievementsLoading(false);
        return;
      }

      try {
        setAchievementsLoading(true);
        const response = await fetch('/api/user/achievements', { cache: 'no-store' });
        
        if (!response.ok) {
          if (response.status === 401) {
            setAchievements([]);
            return;
          }
          console.warn('Error fetching achievements:', response.status);
          setAchievements([]);
          return;
        }

        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          // Transform API response to match UserAchievement interface
          const transformedAchievements: UserAchievement[] = result.data.map((achievement: any) => ({
            achievement_id: achievement.name.toLowerCase().replace(/\s+/g, '-'),
            earned_at: achievement.earnedAt || new Date().toISOString(),
            achievements: {
              id: achievement.name.toLowerCase().replace(/\s+/g, '-'),
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              category: 'general',
            },
          }));
          setAchievements(transformedAchievements);
        } else {
          setAchievements([]);
        }
      } catch (err) {
        console.warn('Error fetching achievements:', err);
        setAchievements([]);
      } finally {
        setAchievementsLoading(false);
      }
    };

    fetchAchievements();
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

      // Handle avatar removal: if avatarFileToSave is explicitly null (user removed it)
      if (avatarFileToSave === null && data?.avatarFile === null) {
        // User explicitly removed the avatar
        avatar_url = null;
        
        // Delete old avatar from storage if it exists
        if (profile.avatar_url) {
          try {
            // Extract path from URL
            const urlParts = profile.avatar_url.split('/');
            const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
            const path = `${user.id}/${fileName}`;
            
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([path]);
            
            if (deleteError) {
              console.warn('Error deleting old avatar:', deleteError);
              // Continue even if deletion fails
            }
          } catch (deleteErr) {
            console.warn('Error deleting old avatar:', deleteErr);
            // Continue even if deletion fails
          }
        }
      } else if (avatarFileToSave) {
        try {
          console.log('Starting avatar upload...', {
            fileName: avatarFileToSave.name,
            fileSize: avatarFileToSave.size,
            fileType: avatarFileToSave.type,
            userId: user.id
          });

          // Validate file size (max 5MB)
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (avatarFileToSave.size > maxSize) {
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
      
      // Update via AuthContext (for username, display_name, avatar_url)
      await updateUser({
        profile: {
          ...(user.profile || {}),
          avatar_url: avatar_url,
          username: usernameValue,
          display_name: displayNameValue,
        } as any,
      });

      // Refresh enhanced profile from API to get latest data
      const profileResponse = await fetch('/api/user/profile', { cache: 'no-store' });
      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        if (profileResult.data) {
          setEnhancedProfile(profileResult.data);
        }
      }

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

  const handleDeactivate = () => {
    setIsDeactivateDialogOpen(true);
  };

  const confirmDeactivateAccount = async () => {
    setIsDeactivating(true);
    setDeactivateError(null);
    
    try {
      const response = await fetch('/api/user/deactivate-account', {
        method: 'POST',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate account');
      }

      // Account successfully deactivated, redirect to login
      setIsDeactivateDialogOpen(false);
      window.location.href = '/login?message=Account deactivated. Log in to reactivate.';
    } catch (error: any) {
      console.error('Error deactivating account:', error);
      setIsDeactivating(false);
      setDeactivateError(`Failed to deactivate account: ${error.message}`);
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteAccountDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteAccountError(null);
    
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account successfully deleted, logout will be handled by the API
      setIsDeleteAccountDialogOpen(false);
      window.location.href = '/onboarding';
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setIsDeletingAccount(false);
      setDeleteAccountError(`Failed to delete account: ${error.message}`);
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
            <Loader size="lg" variant="wavy" color="sage" />
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
    enhancedProfile?.location ||
    profile.location ||
    profile.locale ||
    "Location not set";
  const reviewsCount = userStats?.totalReviewsWritten ?? profile.reviews_count ?? 0;
  const badgesCount = profile.badges_count ?? 0;
  const interestsCount = profile.interests_count ?? 0;
  const helpfulVotesCount = userStats?.helpfulVotesReceived ?? 
    userStats?.totalHelpfulVotesGiven ?? 
    Math.max(0, reviewsCount * 3);
  const memberSinceLabel = userStats?.accountCreationDate 
    ? formatMemberSince(userStats.accountCreationDate)
    : profile.created_at
    ? formatMemberSince(profile.created_at)
    : "—";

  // Handle review edit
  const handleEditReview = (reviewId: string, businessSlug: string) => {
    router.push(`/business/${businessSlug}/review?edit=${reviewId}`);
  };

  // Handle review delete
  const handleDeleteReviewClick = (reviewId: string) => {
    setReviewToDelete(reviewId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteReview = async () => {
    if (!reviewToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const success = await deleteReview(reviewToDelete);
      if (success) {
        // Remove the review from the list
        setUserReviews(prev => prev.filter(r => r.id !== reviewToDelete));
        setIsDeleteDialogOpen(false);
        setReviewToDelete(null);
        
        // Refresh reviews count in stats if available
        if (userStats) {
          setUserStats(prev => prev ? { ...prev, totalReviewsWritten: Math.max(0, prev.totalReviewsWritten - 1) } : null);
        }
      } else {
        setDeleteError('Failed to delete review');
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      setDeleteError('Failed to delete review');
    } finally {
      setIsDeleting(false);
    }
  };

  // Prepare reviews data
  const reviewsData = userReviews.map((review) => {
    const businessSlug = (review as any).business_slug || review.id;
    return {
      businessName: review.business_name,
      businessImageUrl: review.business_image_url,
      rating: review.rating,
      reviewText: review.review_text,
      isFeatured: review.is_featured,
      createdAt: review.created_at,
      onViewClick: () => {
        // Navigate to business page
        if (businessSlug) {
          window.location.href = `/business/${businessSlug}`;
        }
      },
      onEdit: () => handleEditReview(review.id, businessSlug),
      onDelete: () => handleDeleteReviewClick(review.id),
    };
  });

  // Prepare achievements data
  const achievementsData = achievements.map((ua) => ({
    name: ua.achievements.name,
    description: ua.achievements.description,
    icon: ua.achievements.icon,
    earnedAt: ua.earned_at,
  }));

  return (
    <>
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
            <main
              className="relative font-urbanist"
              id="main-content"
              role="main"
              aria-label="User profile content"
            >
              <div className="mx-auto w-full max-w-[2000px] px-3 sm:px-6 lg:px-10 2xl:px-16 relative z-10">
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
                        Profile
                      </span>
                    </li>
                  </ol>
                </nav>
                <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
                  <div className="space-y-6">
                    <article
                      className="w-full sm:mx-0"
                      aria-labelledby="profile-heading"
                    >
                          <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md relative overflow-hidden">
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
                                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-full border-4 border-coral shadow-xl"
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
                                <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center bg-sage/20 rounded-full border-4 border-coral shadow-xl">
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
                              {/* Bio */}
                              {enhancedProfile?.bio && (
                                <p className="text-body-sm text-charcoal/80 mb-4 leading-relaxed">
                                  {enhancedProfile.bio}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 mb-4 text-body-sm text-charcoal/70 flex-wrap">
                                {profileLocation && profileLocation !== "Location not set" && (
                                  <div className="flex items-center gap-1">
                                    <MapPin size={14} />
                                    <span>{profileLocation}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  <span>Member since {memberSinceLabel}</span>
                                </div>
                                {enhancedProfile?.website_url && (
                                  <a
                                    href={enhancedProfile.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-coral transition-colors"
                                  >
                                    <Briefcase size={14} />
                                    <span>Website</span>
                                  </a>
                                )}
                              </div>
                              
                              {/* Social Links */}
                              {enhancedProfile?.social_links && Object.keys(enhancedProfile.social_links).length > 0 && (
                                <div className="flex items-center gap-3 mb-4">
                                  {Object.entries(enhancedProfile.social_links).map(([platform, url]) => {
                                    if (!url) return null;
                                    const platformIcons: Record<string, any> = {
                                      instagram: '📷',
                                      x: '𝕏',
                                      twitter: '🐦',
                                      tiktok: '🎵',
                                      facebook: '👤',
                                      linkedin: '💼',
                                      youtube: '▶️',
                                    };
                                    return (
                                      <a
                                        key={platform}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-charcoal/70 hover:text-coral transition-colors"
                                        aria-label={platform}
                                      >
                                        {platformIcons[platform.toLowerCase()] || '🔗'}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="flex items-center gap-6 mb-4 flex-wrap">
                                <div className="text-sm text-charcoal/70">
                                  {reviewsCount} reviews
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <button
                                  onClick={() => setIsEditOpen(true)}
                                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-coral/90 hover:bg-charcoal/90 hover:border-white/30 text-white rounded-full text-caption sm:text-body-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-sage/20 border border-sage/20 whitespace-nowrap"
                                  aria-label="Edit profile"
                                >
                                  <MessageSquare size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
                                  <span>Edit Profile</span>
                                </button>
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
                          <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsUp className="w-5 h-5 text-coral" />
                          <span className="text-sm text-charcoal/70">Helpful votes</span>
                        </div>
                        <p className="text-2xl font-bold text-charcoal">
                          {statsLoading ? '—' : helpfulVotesCount}
                        </p>
                        <p className="text-xs text-charcoal/60">Received</p>
                      </div>
                          <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <StarIcon className="w-5 h-5 text-coral" />
                          <span className="text-sm text-charcoal/70">Reviews</span>
                        </div>
                        <p className="text-2xl font-bold text-charcoal">
                          {statsLoading ? '—' : reviewsCount}
                        </p>
                        <p className="text-xs text-charcoal/60">Total written</p>
                      </div>
                          <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-5 h-5 text-coral" />
                          <span className="text-sm text-charcoal/70">Badges</span>
                        </div>
                        <p className="text-2xl font-bold text-charcoal">{badgesCount}</p>
                        <p className="text-xs text-charcoal/60">Achievements unlocked</p>
                      </div>
                          <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-5 h-5 text-coral" />
                          <span className="text-sm text-charcoal/70">Interests</span>
                        </div>
                        <p className="text-2xl font-bold text-charcoal">{interestsCount}</p>
                        <p className="text-xs text-charcoal/60">Communities followed</p>
                      </div>
                      {userStats && (
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-4 sm:col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-5 h-5 text-coral" />
                            <span className="text-sm text-charcoal/70">Saved Businesses</span>
                          </div>
                          <p className="text-2xl font-bold text-charcoal">
                            {statsLoading ? '—' : userStats.totalBusinessesSaved}
                          </p>
                          <p className="text-xs text-charcoal/60">Your saved gems</p>
                        </div>
                      )}
                    </section>

                    {/* Saved Businesses - Mobile Only */}
                    {savedBusinesses.length > 0 && (
                      <section
                            className="md:hidden bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-6 space-y-4"
                        aria-label="Saved businesses"
                      >
                        <SavedBusinessRow
                          title="Your Saved Gems"
                          businesses={savedBusinesses}
                          showCount={true}
                        />
                      </section>
                    )}

                    {/* My Businesses Section */}
                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-6 sm:p-8 space-y-4"
                      aria-label="My businesses"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-charcoal flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                            <Store className="w-5 h-5 text-coral" />
                          </span>
                          My Businesses
                        </h3>
                      </div>
                      {ownedBusinessesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader size="md" variant="wavy" color="sage" />
                        </div>
                      ) : ownedBusinesses.length > 0 ? (
                        <div className="space-y-3">
                          {ownedBusinesses.map((business) => {
                            const businessSlug = business.slug || business.id;
                            const displayImage = business.uploaded_images?.[0] || business.image_url || null;
                            return (
                              <Link
                                key={business.id}
                                href={`/business/${businessSlug}/edit`}
                                className="flex items-center gap-4 p-4 bg-white/50 hover:bg-white/70 rounded-[16px] border border-white/60 transition-all duration-200 hover:shadow-md group"
                              >
                                {displayImage ? (
                                  <div className="relative w-16 h-16 rounded-[12px] overflow-hidden flex-shrink-0">
                                    <Image
                                      src={displayImage}
                                      alt={business.name}
                                      fill
                                      className="object-cover"
                                      sizes="64px"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 rounded-[12px] bg-gradient-to-br from-sage/20 to-sage/10 flex items-center justify-center flex-shrink-0">
                                    <Store className="w-6 h-6 text-sage/60" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-charcoal truncate group-hover:text-navbar-bg transition-colors">
                                      {business.name}
                                    </h4>
                                    {business.verified && (
                                      <Check className="w-4 h-4 text-sage flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-charcoal/60">
                                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{business.location || 'Location not set'}</span>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-charcoal/40 group-hover:text-charcoal transition-colors flex-shrink-0" />
                              </Link>
                            );
                          })}
                          <Link
                            href="/for-businesses"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md shadow-coral/20 border border-coral/30 w-fit mt-2"
                          >
                            <Briefcase className="w-4 h-4" />
                            Add another business
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-charcoal/70 font-medium max-w-[520px]">
                            You haven't added any businesses yet. Start by adding your first business listing!
                          </p>
                          <Link
                            href="/for-businesses"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md shadow-coral/20 border border-coral/30 w-fit"
                          >
                            <Briefcase className="w-4 h-4" />
                            Add your business
                          </Link>
                        </div>
                      )}
                    </section>

                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-6 sm:p-8 space-y-4"
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
                        href="/for-businesses"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-coral/90 hover:bg-coral text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md shadow-coral/20 border border-coral/30 w-fit"
                      >
                        <Briefcase className="w-4 h-4" />
                        {ownedBusinesses.length > 0 ? 'Manage businesses' : 'Add your business'}
                      </Link>
                    </section>

                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-6 sm:p-8"
                      aria-label="Your contributions"
                    >
                      {reviewsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader size="md" variant="wavy" color="sage" />
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
                          <p className="text-charcoal/70">You haven't written any reviews yet.</p>
                        </div>
                      )}
                    </section>

                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-6 sm:p-8"
                      aria-label="Your achievements"
                    >
                      {achievementsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader size="md" variant="wavy" color="sage" />
                        </div>
                      ) : (
                        <AchievementsList
                          achievements={achievementsData}
                          title="Your Achievements"
                        />
                      )}
                    </section>

                    <section
                      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-6 sm:p-8 space-y-4"
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
          </div>

        <Footer />
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

      {/* Delete Review Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setReviewToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDeleteReview}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        error={deleteError}
      />

      {/* Deactivate Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeactivateDialogOpen}
        onClose={() => {
          setIsDeactivateDialogOpen(false);
          setDeactivateError(null);
        }}
        onConfirm={confirmDeactivateAccount}
        title="Deactivate Account"
        message="Are you sure you want to deactivate your account? You can reactivate it anytime by logging in."
        confirmText={isDeactivating ? "Deactivating..." : "Deactivate Account"}
        cancelText="Cancel"
        variant="warning"
        isLoading={isDeactivating}
        error={deactivateError}
      />

      {/* Delete Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteAccountDialogOpen}
        onClose={() => {
          setIsDeleteAccountDialogOpen(false);
          setDeleteAccountError(null);
        }}
        onConfirm={confirmDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText={isDeletingAccount ? "Deleting..." : "Delete Account"}
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingAccount}
        error={deleteAccountError}
        requireConfirmText="DELETE"
      />
    </>
  );
}

export default function ProfilePage() {
  usePredefinedPageTitle('profile');
  return <ProfileContent />;
}
