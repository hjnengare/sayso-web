'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { useReviewHelpful } from '../../hooks/useReviewHelpful';
import { useReviewReplies } from '../../hooks/useReviewReplies';
import { useUserBadgesById } from '../../hooks/useUserBadges';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useRouter } from 'next/navigation';
import { Trash2, Image as ImageIcon, ChevronUp, Heart, X, MessageCircle, Send, Edit, Flag, Loader2, AlertCircle } from 'lucide-react';
import type { ReviewWithUser } from '../../lib/types/database';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useReviewSubmission } from '../../hooks/useReviews';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { getDisplayUsername } from '../../utils/generateUsername';
import { ConfirmationDialog } from '@/app/components/molecules/ConfirmationDialog/ConfirmationDialog';
import BadgePill, { BadgePillData } from '../Badges/BadgePill';
import VerifiedBadge from '../VerifiedBadge/VerifiedBadge';
import { isOptimisticId, isValidUUID } from '../../lib/utils/validation';

interface ReviewCardProps {
  review: ReviewWithUser;
  onUpdate?: () => void;
  showBusinessInfo?: boolean;
  isOwnerView?: boolean; // If true, show owner-specific actions like "Message Customer"
  realtimeHelpfulCount?: number; // Real-time helpful count from subscription
}

const FLAG_REASONS = [
  { value: 'spam', label: 'Spam', desc: 'Promotional or repetitive content' },
  { value: 'inappropriate', label: 'Inappropriate', desc: 'Offensive or adult content' },
  { value: 'harassment', label: 'Harassment', desc: 'Targets or bullies someone' },
  { value: 'off_topic', label: 'Off-topic', desc: 'Not related to this business' },
  { value: 'other', label: 'Other', desc: 'Something else' },
] as const;

type FlagReason = (typeof FLAG_REASONS)[number]['value'];

function ReviewCard({
  review,
  onUpdate,
  showBusinessInfo = false,
  isOwnerView = false,
  realtimeHelpfulCount,
}: ReviewCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { likeReview, deleteReview } = useReviewSubmission();
  const isDesktop = useIsDesktop();
  const isTransientReviewId = isOptimisticId(review.id) || !isValidUUID(review.id);

  // Helper function to check if current user owns this review with fallback logic
  const isReviewOwner = (): boolean => {
    if (!user) return false;

    // Primary check: user ID matches review user_id
    if (user.id === review.user_id) return true;
    
    // Fallback 1: user ID matches review.user.id
    if (user.id === review.user?.id) return true;
    
    // Fallback 2: email match (if both exist)
    if (user.email && review.user?.email && user.email === review.user.email) return true;
    
    // Fallback 3: email + display_name combination (if both exist)
    const userIdentifier = user.email && user.profile?.display_name 
      ? `${user.email}:${user.profile.display_name}` 
      : null;
    const reviewIdentifier = review.user?.email && review.user?.display_name
      ? `${review.user.email}:${review.user.display_name}`
      : null;
    if (userIdentifier && reviewIdentifier && userIdentifier === reviewIdentifier) return true;

    return false;
  };
  const [showAllImages, setShowAllImages] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteReplyDialog, setShowDeleteReplyDialog] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<string | null>(null);
  const [isFlagged, setIsFlagged] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [checkingFlagStatus, setCheckingFlagStatus] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const replyFormRef = useRef<HTMLDivElement>(null);

  // SWR-backed badges for the review author
  const authorId = review.user_id || review.user?.id;
  const { badges: fetchedAuthorBadges } = useUserBadgesById(authorId ?? null);
  const userBadges: BadgePillData[] = fetchedAuthorBadges.slice(0, 3);

  // SWR-backed helpful status and count (with optimistic toggle)
  const {
    count: helpfulCount,
    isHelpful: isLiked,
    loading: loadingHelpful,
    toggle: toggleHelpful,
  } = useReviewHelpful(review.id, typeof review.helpful_count === 'number' ? review.helpful_count : 0);

  // SWR-backed replies (with optimistic add/update/delete)
  const {
    replies,
    loading: loadingReplies,
    addReply,
    updateReply,
    deleteReply: deleteReplyById,
  } = useReviewReplies(review.id);


  const handleLike = async () => {
    if (!user) return;
    await toggleHelpful();
  };

  const handleEdit = () => {
    if (!review.id) return;
    // Get the current business ID from the URL or review
    const pathParts = window.location.pathname.split('/');
    const businessSlugOrId = pathParts[pathParts.indexOf('business') + 1] || review.business_id;
    
    // Navigate to write review page with edit mode (query param)
    router.push(`/business/${businessSlugOrId}/review?edit=${review.id}`);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    const success = await deleteReview(review.id);
    if (success && onUpdate) {
      onUpdate();
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !user || submittingReply) return;
    if (isOptimisticId(review.id) || !isValidUUID(review.id)) return;

    setSubmittingReply(true);
    const result = await addReply(replyText.trim());
    if (result) {
      setReplyText('');
      setShowReplyForm(false);
    } else {
      alert('Failed to submit reply');
    }
    setSubmittingReply(false);
  };

  const handleEditReply = (reply: any) => {
    setEditingReplyId(reply.id);
    setEditReplyText(reply.content);
  };

  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditReplyText('');
  };

  const handleSaveEdit = async (replyId: string) => {
    if (!editReplyText.trim() || !user) return;
    const success = await updateReply(replyId, editReplyText.trim());
    if (success) {
      setEditingReplyId(null);
      setEditReplyText('');
    } else {
      alert('Failed to update reply');
    }
  };

  const handleDeleteReply = (replyId: string) => {
    setReplyToDelete(replyId);
    setShowDeleteReplyDialog(true);
  };

  const confirmDeleteReply = async () => {
    if (!replyToDelete || !user) return;
    setShowDeleteReplyDialog(false);
    const replyId = replyToDelete;
    setReplyToDelete(null);
    setDeletingReplyId(replyId);
    const success = await deleteReplyById(replyId);
    if (!success) {
      alert('Failed to delete reply');
    }
    setDeletingReplyId(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Recently';
    
    try {
      // Ensure we have a valid date string
      let date: Date;
      
      // If it's already an ISO string, parse it directly
      if (typeof dateString === 'string' && (dateString.includes('T') || dateString.includes('Z'))) {
        date = new Date(dateString);
      } else {
        // Try to parse as date
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Recently';
      }
      
      // Use dayjs for relative time
      return dayjs(date).fromNow();
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return 'Recently';
    }
  };

  const displayedImages = showAllImages ? review.images : review.images?.slice(0, 3);
  const isAnonymousReview = !review.user_id;
  const isOwner = isReviewOwner();
  const reportButtonDisabled =
    isOwner || flagging || isFlagged || isTransientReviewId || checkingFlagStatus;

  useEffect(() => {
    let cancelled = false;

    if (!user || isOwner || isTransientReviewId) {
      setIsFlagged(false);
      setCheckingFlagStatus(false);
      return;
    }

    const checkFlagStatus = async () => {
      setCheckingFlagStatus(true);
      try {
        const res = await fetch(`/api/reviews/${review.id}/flag`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setIsFlagged(Boolean(data?.flagged));
        }
      } catch (error) {
        console.error('Error checking review flag status:', error);
      } finally {
        if (!cancelled) {
          setCheckingFlagStatus(false);
        }
      }
    };

    void checkFlagStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.id, review.id, isOwner, isTransientReviewId]);

  const handleOpenFlagModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (reportButtonDisabled) return;

    if (!user) {
      showToast('Please log in to report reviews.', 'error');
      return;
    }

    setShowFlagModal(true);
  };

  const submitFlag = async (reason: FlagReason, details: string) => {
    if (!user || reportButtonDisabled) return;

    setFlagging(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });

      if (res.ok) {
        setIsFlagged(true);
        setShowFlagModal(false);
        showToast('Review reported. Thank you for your feedback.', 'success');
        return;
      }

      const err = await res.json().catch(() => ({}));
      const errorMessage =
        typeof err?.error === 'string' ? err.error : 'Failed to report review';

      if (
        res.status === 400 &&
        errorMessage.toLowerCase().includes('already flagged')
      ) {
        setIsFlagged(true);
        setShowFlagModal(false);
      }

      showToast(errorMessage, 'error');
    } catch (error) {
      console.error('Error reporting review:', error);
      showToast('Failed to report review', 'error');
    } finally {
      setFlagging(false);
    }
  };

  return (
    <m.div
      initial={isDesktop ? false : { opacity: 0, y: 20 }}
      animate={isDesktop ? undefined : { opacity: 1, y: 0 }}
      transition={isDesktop ? undefined : { duration: 0.5 }}
      whileHover={isDesktop ? undefined : { scale: 1.01, x: 5 }}
      className={`relative bg-gradient-to-br from-off-white via-off-white to-off-white/95 backdrop-blur-sm rounded-lg p-6 border-none ${
        isDesktop ? '' : 'transition-all duration-300 group hover:border-white/80 hover:-translate-y-1'
      }`}
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <m.div
          whileHover={isDesktop ? undefined : { scale: 1.1, rotate: 5 }}
          transition={isDesktop ? undefined : { duration: 0.3 }}
          className="flex-shrink-0"
        >
          {review.user.avatar_url ? (
            <div className="relative">
              <div className="w-12 h-12 rounded-full p-0.5 bg-off-white ring-2 ring-white/40">
                <Image
                  src={review.user.avatar_url}
                  alt={review.user?.name || getDisplayUsername(
                    review.user?.username,
                    review.user?.display_name,
                    review.user?.email,
                    review.user_id
                  )}
                  width={48}
                  height={48}
                  className={`w-full h-full rounded-full object-cover ${
                    isDesktop ? '' : 'group-hover:ring-2 group-hover:ring-sage/40 transition-all duration-300'
                  }`}
                />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-sage/20 to-sage/10 rounded-full flex items-center justify-center ring-2 ring-white/40 transition-shadow duration-300">
              <span className="font-urbanist text-lg font-700 text-sage">
                {(review.user?.name || getDisplayUsername(
                  review.user?.username,
                  review.user?.display_name,
                  review.user?.email,
                  review.user_id
                ))?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </m.div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 space-y-2 md:space-y-0">
            <div className="flex min-w-0 items-start sm:items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                  <span
                    className={`min-w-0 truncate font-urbanist text-lg font-600 leading-tight text-charcoal-700 ${
                      isDesktop ? '' : 'transition-colors duration-300 group-hover:text-sage'
                    }`}
                    title={review.user?.name || getDisplayUsername(
                      review.user?.username,
                      review.user?.display_name,
                      review.user?.email,
                      review.user_id
                    )}
                  >
                    {review.user?.name || getDisplayUsername(
                      review.user?.username,
                      review.user?.display_name,
                      review.user?.email,
                      review.user_id
                    )}
                  </span>
                  {isAnonymousReview ? (
                    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-charcoal/12 px-2 py-0.5 text-xs font-semibold text-charcoal/75">
                      Anonymous
                    </span>
                  ) : (
                    <span className="inline-flex flex-shrink-0 items-center">
                      <VerifiedBadge size="sm" />
                    </span>
                  )}
                </div>
                {/* Achievement badges - review author's earned badges */}
                {userBadges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {userBadges.slice(0, 3).map((badge) => (
                      <span
                        key={badge.id}
                        className="inline-flex origin-left scale-[1.03] rounded-full shadow-premium-sm sm:scale-100"
                      >
                        <BadgePill badge={badge} size="sm" />
                      </span>
                    ))}
                    {userBadges.length > 3 && (
                      <span className="inline-flex items-center rounded-full border border-charcoal/15 bg-charcoal/10 px-2 py-0.5 text-[10px] font-bold text-charcoal/60 shadow-premium-sm">
                        +{userBadges.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between sm:justify-end gap-2 sm:gap-3">
              <div className="flex flex-col items-start sm:items-end gap-1">
                <div className="flex items-center space-x-1">
                  <svg width="0" height="0" className="absolute">
                    <defs>
                      <linearGradient id="reviewCardGoldStar" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F5D547" />
                        <stop offset="100%" stopColor="#E6A547" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {[...Array(5)].map((_, i) => (
                    <m.div
                      key={i}
                      initial={isDesktop ? false : { scale: 0 }}
                      animate={isDesktop ? undefined : { scale: 1 }}
                      transition={isDesktop ? undefined : { delay: i * 0.05, duration: 0.3 }}
                    >
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          fill={i < review.rating ? "url(#reviewCardGoldStar)" : "none"}
                          stroke={i < review.rating ? "url(#reviewCardGoldStar)" : "#9ca3af"}
                          strokeWidth={i < review.rating ? 0 : 2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </m.div>
                  ))}
                </div>
                <span className="font-urbanist text-xs sm:text-sm font-600 text-charcoal/60">
                  {formatDate(review.created_at)}
                </span>
              </div>
               
              {/* Direct action icons - Mobile-first design */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {isOwner && (
                  <>
                    <m.button
                      whileHover={isDesktop ? undefined : { scale: 1.1 }}
                      whileTap={isDesktop ? undefined : { scale: 0.9 }}
                      onClick={handleEdit}
                      className={`min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center active:scale-95 touch-manipulation ${
                        isDesktop ? '' : 'hover:bg-navbar-bg/90 transition-all duration-300'
                      }`}
                      aria-label="Edit review"
                      title="Edit review"
                    >
                      <Edit className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-white" />
                    </m.button>
                    <m.button
                      whileHover={isDesktop ? undefined : { scale: 1.1 }}
                      whileTap={isDesktop ? undefined : { scale: 0.9 }}
                      onClick={handleDelete}
                      className={`min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center active:scale-95 touch-manipulation ${
                        isDesktop ? '' : 'hover:bg-navbar-bg/90 transition-all duration-300'
                      }`}
                      aria-label="Delete review"
                      title="Delete review"
                    >
                      <Trash2 className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-white" />
                    </m.button>
                  </>
                )}
                {/* Reply functionality commented out */}
                {/* <m.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="w-7 h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 transition-colors"
                  aria-label="Reply to review"
                  title="Reply"
                  disabled={!user}
                >
                  <MessageCircle className="w-[18px] h-[18px] text-white" />
                </m.button> */}
              </div>
            </div>
          </div>

          {/* Review Title */}
          {review.title && (
            <h4
              className={`font-urbanist text-xl font-600 text-charcoal mb-2 ${
                isDesktop ? '' : 'group-hover:text-sage transition-colors duration-300'
              }`}
            >
              {review.title}
            </h4>
          )}

          {/* Business Info (if showing) */}
          {showBusinessInfo && 'business' in review && (
            <div className="mb-3 p-2 bg-card-bg/10 rounded-lg">
              <span className="font-urbanist text-sm font-500 text-sage">
                Review for: {(review as ReviewWithUser & { business: { name: string } }).business?.name}
              </span>
            </div>
          )}

          {/* Review Text */}
          <p className="font-urbanist text-base font-600 text-charcoal/90 leading-relaxed mb-4">
            {review.content}
          </p>

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {review.tags.map((tag, index) => (
                <m.span
                  key={tag}
                  initial={isDesktop ? false : { opacity: 0, scale: 0.8 }}
                  animate={isDesktop ? undefined : { opacity: 1, scale: 1 }}
                  transition={isDesktop ? undefined : { delay: index * 0.05, duration: 0.3 }}
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  className={`inline-flex items-center px-3 py-1 bg-card-bg/10 text-sage text-sm font-500 rounded-full border border-sage/20 ${
                    isDesktop ? '' : 'hover:bg-card-bg/20 transition-colors duration-300'
                  }`}
                >
                  {tag}
                </m.span>
              ))}
            </div>
          )}

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {displayedImages?.map((image, index) => (
                  <m.div
                    key={image.id}
                    initial={isDesktop ? false : { opacity: 0, scale: 0.8 }}
                    animate={isDesktop ? undefined : { opacity: 1, scale: 1 }}
                    transition={isDesktop ? undefined : { delay: index * 0.1, duration: 0.3 }}
                    whileHover={isDesktop ? undefined : { scale: 1.05 }}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer group/image"
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <Image
                      src={image.image_url}
                      alt={image.alt_text || `Review image ${index + 1}`}
                      width={200}
                      height={200}
                      className={`w-full h-full object-cover ${
                        isDesktop ? '' : 'transition-transform duration-300 group-hover/image:scale-110'
                      }`}
                    />
                  </m.div>
                ))}
              </div>

              {!showAllImages && review.images.length > 3 && (
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={() => setShowAllImages(true)}
                  className={`text-sage font-urbanist text-sm font-500 flex items-center space-x-1 ${
                    isDesktop ? '' : 'hover:text-sage/80'
                  }`}
                >
                  <ImageIcon size={16} />
                  <span>Show {review.images.length - 3} more images</span>
                </m.button>
              )}

              {showAllImages && review.images.length > 3 && (
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={() => setShowAllImages(false)}
                  className={`text-charcoal/60 font-urbanist text-sm font-500 flex items-center space-x-1 ${
                    isDesktop ? '' : 'hover:text-charcoal'
                  }`}
                >
                  <ChevronUp size={16} />
                  <span>Show less</span>
                </m.button>
              )}
            </div>
          )}

          {/* Actions */}
          <div
            className={`flex items-center justify-between pt-3 border-t border-sage/10 ${
              user && !isOwner ? 'pr-12 sm:pr-14' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {!isOwnerView && (
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={handleLike}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                    isDesktop ? '' : 'transition-all duration-300'
                  } ${
                    isLiked
                      ? 'bg-card-bg/10 text-sage'
                      : isDesktop
                        ? 'text-charcoal/60'
                        : 'text-charcoal/60 hover:bg-card-bg/10 hover:text-sage'
                  } ${loadingHelpful ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!user || loadingHelpful}
                >
                  <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                  <span className="font-urbanist text-sm font-500">
                    Helpful ({helpfulCount})
                  </span>
                </m.button>
              )}

              {/* Reply button - available to all authenticated users */}
              {user && (
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full font-semibold ${
                    isDesktop ? '' : 'transition-all duration-300'
                  } ${
                    isOwnerView
                      ? isDesktop
                        ? 'bg-card-bg text-white px-4'
                        : 'bg-card-bg text-white hover:bg-card-bg/90 px-4'
                      : isDesktop
                        ? 'text-charcoal/60'
                        : 'text-charcoal/60 hover:bg-card-bg/10 hover:text-sage'
                  }`}
                >
                  <MessageCircle size={isOwnerView ? 16 : 18} />
                  <span className="font-urbanist text-sm">
                    Reply{replies.length > 0 ? ` (${replies.length})` : ''}
                  </span>
                </m.button>
              )}

              {/* Owner-only: Message Customer */}
              {isOwnerView && user && review.user_id && (
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={() => router.push(`/my-businesses/messages?user_id=${review.user_id}&business_id=${review.business_id}`)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full bg-coral text-white font-semibold ${
                    isDesktop ? '' : 'transition-all duration-300 hover:bg-coral/90'
                  }`}
                >
                  <MessageCircle size={16} />
                  <span className="font-urbanist text-sm">
                    Message Customer
                  </span>
                </m.button>
              )}
            </div>

            {!user && !isOwnerView && (
              <span className="font-urbanist text-sm sm:text-xs text-charcoal/60">
                Login to interact
              </span>
            )}
          </div>

          {user && !isOwner && (
            <button
              type="button"
              onClick={handleOpenFlagModal}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                }
              }}
              disabled={reportButtonDisabled}
              aria-label="Report review"
              title={isFlagged ? 'Review already reported' : 'Report review'}
              className={`absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-10 inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full touch-manipulation ${
                isDesktop ? '' : 'transition-all duration-200'
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-off-white ${
                isFlagged
                  ? 'text-red-500 bg-red-50/70 cursor-not-allowed'
                  : isDesktop
                    ? 'text-charcoal/50'
                    : 'text-charcoal/50 hover:text-red-500 hover:bg-red-50/70'
              } ${reportButtonDisabled && !isFlagged ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {flagging ? (
                <Loader2 className="w-[18px] h-[18px] sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Flag className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
              )}
            </button>
          )}

          {/* Reply Form - Available to all authenticated users */}
          <AnimatePresence>
            {showReplyForm && user && (
                <m.div
                  initial={isDesktop ? false : { opacity: 0, height: 0 }}
                  animate={isDesktop ? undefined : { opacity: 1, height: 'auto' }}
                  exit={isDesktop ? undefined : { opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-sage/10"
                  ref={replyFormRef}
                >
                  <div className="space-y-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a public reply to this review..."
                      className="w-full px-4 py-3 rounded-lg border border-sage/20 bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 resize-none font-urbanist text-sm"
                      rows={3}
                      disabled={submittingReply}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <m.button
                        whileHover={isDesktop ? undefined : { scale: 1.05 }}
                        whileTap={isDesktop ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          setShowReplyForm(false);
                          setReplyText('');
                        }}
                        className={`px-4 py-2 text-sm font-semibold bg-charcoal/10 text-charcoal rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDesktop ? '' : 'hover:bg-charcoal/20 transition-colors'
                        }`}
                        disabled={submittingReply}
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        Cancel
                      </m.button>
                      <m.button
                        whileHover={isDesktop ? undefined : { scale: 1.05 }}
                        whileTap={isDesktop ? undefined : { scale: 0.95 }}
                        onClick={handleSubmitReply}
                        disabled={!replyText.trim() || submittingReply}
                        className={`px-4 py-2 text-sm font-semibold bg-card-bg text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                          isDesktop ? '' : 'hover:bg-card-bg/90 transition-colors'
                        }`}
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        <Send size={16} />
                        <span>{submittingReply ? 'Sending...' : 'Save Reply'}</span>
                      </m.button>
                    </div>
                  </div>
                </m.div>
              )}
          </AnimatePresence>

          {/* Replies List - Visible to everyone */}
          {replies.length > 0 && (
            <div className="mt-4 pt-4 border-t border-sage/10 space-y-3">
              <h5 className="font-urbanist text-sm font-semibold text-charcoal/70 mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                {replies.length === 1 ? '1 Reply' : `${replies.length} Replies`}
              </h5>
              {replies.map((reply) => {
                const isEditing = editingReplyId === reply.id;
                const isDeleting = deletingReplyId === reply.id;

                const replyDisplayName = reply.user?.name || 'Anonymous';
                const replyActionButtons = !isEditing && (isOwnerView || reply.user_id === user?.id) ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <m.button
                      whileHover={isDesktop ? undefined : { scale: 1.1 }}
                      whileTap={isDesktop ? undefined : { scale: 0.9 }}
                      onClick={() => handleEditReply(reply)}
                      className={`w-7 h-7 bg-card-bg rounded-full flex items-center justify-center ${
                        isDesktop ? '' : 'hover:bg-card-bg/90 transition-colors'
                      }`}
                      aria-label="Edit reply"
                      title="Edit reply"
                    >
                      <Edit className="w-[18px] h-[18px] text-white" />
                    </m.button>
                    <m.button
                      whileHover={isDesktop ? undefined : { scale: 1.1 }}
                      whileTap={isDesktop ? undefined : { scale: 0.9 }}
                      onClick={() => handleDeleteReply(reply.id)}
                      disabled={isDeleting}
                      className={`w-7 h-7 bg-coral rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDesktop ? '' : 'hover:bg-coral/90 transition-colors'
                      }`}
                      aria-label="Delete reply"
                      title="Delete reply"
                    >
                      <Trash2 className="w-[18px] h-[18px] text-white" />
                    </m.button>
                  </div>
                ) : null;

                return (
                  <m.div
                    key={reply.id}
                    initial={isDesktop ? false : { opacity: 0, y: 10 }}
                    animate={isDesktop ? undefined : { opacity: 1, y: 0 }}
                    className="pl-4 border-l-2 border-sage/20 bg-off-white/30 rounded-r-lg p-3 relative flex flex-col w-full min-w-0"
                  >
                    {/* Row 1: username + time (mobile: stacked/inline); desktop: same row as buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                        <span className="font-urbanist text-sm font-semibold text-charcoal-700 truncate min-w-0" title={replyDisplayName}>
                          {replyDisplayName}
                        </span>
                        <span className="font-urbanist text-xs font-semibold text-charcoal/70 flex-shrink-0">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      {replyActionButtons ? <div className="hidden sm:flex">{replyActionButtons}</div> : null}
                    </div>
                    {/* Row 2: reply content or edit form */}
                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          value={editReplyText}
                          onChange={(e) => setEditReplyText(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-sage/20 bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 resize-none font-urbanist text-sm min-w-0"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <m.button
                            whileHover={isDesktop ? undefined : { scale: 1.05 }}
                            whileTap={isDesktop ? undefined : { scale: 0.95 }}
                            onClick={handleCancelEdit}
                            className={`px-3 py-1.5 text-xs font-medium text-charcoal/70 ${
                              isDesktop ? '' : 'hover:text-charcoal transition-colors'
                            }`}
                          >
                            Cancel
                          </m.button>
                          <m.button
                            whileHover={isDesktop ? undefined : { scale: 1.05 }}
                            whileTap={isDesktop ? undefined : { scale: 0.95 }}
                            onClick={() => handleSaveEdit(reply.id)}
                            disabled={!editReplyText.trim()}
                            className={`px-3 py-1.5 text-xs font-medium bg-navbar-bg text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDesktop ? '' : 'hover:bg-navbar-bg/90 transition-colors'
                            }`}
                          >
                            Save
                          </m.button>
                        </div>
                      </div>
                    ) : (
                      <p className="font-urbanist text-sm font-bold text-charcoal/80 min-w-0 break-words">
                        {reply.content}
                      </p>
                    )}
                    {/* Row 3: action buttons on mobile only, right-aligned */}
                    {replyActionButtons ? (
                      <div className="flex sm:hidden items-center justify-end gap-1 mt-2 w-full">
                        {replyActionButtons}
                      </div>
                    ) : null}
                  </m.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImageIndex !== null && review.images && (
          <m.div
            initial={isDesktop ? false : { opacity: 0 }}
            animate={isDesktop ? undefined : { opacity: 1 }}
            exit={isDesktop ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedImageIndex(null)}
          >
            <m.div
              initial={isDesktop ? false : { scale: 0.8 }}
              animate={isDesktop ? undefined : { scale: 1 }}
              exit={isDesktop ? undefined : { scale: 0.8 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={review.images[selectedImageIndex].image_url}
                alt={review.images[selectedImageIndex].alt_text || 'Review image'}
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <m.button
                whileHover={isDesktop ? undefined : { scale: 1.1 }}
                whileTap={isDesktop ? undefined : { scale: 0.9 }}
                onClick={() => setSelectedImageIndex(null)}
                className="absolute -top-4 -right-4 w-8 h-8 bg-off-white/95 backdrop-blur-xl text-black rounded-full flex items-center justify-center border-none"
              >
                <X size={20} />
              </m.button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {showFlagModal && (
        <ReviewFlagModal
          onClose={() => setShowFlagModal(false)}
          onSubmit={submitFlag}
          submitting={flagging}
        />
      )}

      {/* Delete Review Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Delete Reply Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteReplyDialog}
        onClose={() => {
          setShowDeleteReplyDialog(false);
          setReplyToDelete(null);
        }}
        onConfirm={confirmDeleteReply}
        title="Delete Reply"
        message="Are you sure you want to delete this reply? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </m.div>
  );
}

function ReviewFlagModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (reason: FlagReason, details: string) => Promise<void>;
  submitting: boolean;
}) {
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [details, setDetails] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason) {
      setLocalError('Please select a reason.');
      return;
    }
    if (reason === 'other' && !details.trim()) {
      setLocalError("Please add details for 'Other'.");
      return;
    }

    await onSubmit(reason, details);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-charcoal/20" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 sm:pt-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-urbanist text-lg font-bold text-charcoal">Report Review</h2>
              <p className="font-urbanist text-sm text-charcoal/50">Help us keep sayso trustworthy</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-charcoal/8 text-charcoal/40 hover:text-charcoal transition-colors"
              aria-label="Close report modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {FLAG_REASONS.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setReason(value);
                  setLocalError(null);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  reason === value
                    ? 'border-navbar-bg bg-navbar-bg/5'
                    : 'border-charcoal/10 hover:border-charcoal/20 hover:bg-charcoal/[0.025]'
                }`}
              >
                <div className="flex-1">
                  <p className="font-urbanist text-sm font-semibold text-charcoal">{label}</p>
                  <p className="font-urbanist text-xs text-charcoal/50">{desc}</p>
                </div>
                {reason === value && (
                  <div className="w-4 h-4 rounded-full bg-navbar-bg flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-none stroke-white stroke-[1.5]">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {reason && (
            <label className="block mb-4">
              <span className="font-urbanist text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-1.5 block">
                Additional details {reason === 'other' ? '(required)' : '(optional)'}
              </span>
              <textarea
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  setLocalError(null);
                }}
                rows={3}
                placeholder="Describe the issue..."
                className="w-full rounded-2xl border border-charcoal/15 bg-charcoal/[0.025] px-4 py-3 font-urbanist text-sm text-charcoal placeholder-charcoal/35 focus:outline-none focus:ring-2 focus:ring-navbar-bg/25 focus:border-navbar-bg/40 resize-none"
              />
            </label>
          )}

          {localError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm font-urbanist mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl border border-charcoal/15 font-urbanist text-sm font-semibold text-charcoal/70 hover:bg-charcoal/5 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="flex-1 py-3 rounded-2xl bg-navbar-bg font-urbanist text-sm font-semibold text-white hover:bg-navbar-bg/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent updates
export default memo(ReviewCard);

