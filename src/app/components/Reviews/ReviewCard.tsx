'use client';

import React, { useState, useRef, memo } from 'react';
import { useReviewHelpful } from '../../hooks/useReviewHelpful';
import { useReviewReplies } from '../../hooks/useReviewReplies';
import { useUserBadgesById } from '../../hooks/useUserBadges';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useRouter } from 'next/navigation';
import { Trash2, Image as ImageIcon, ChevronUp, Heart, X, MessageCircle, Send, Edit } from 'lucide-react';
import type { ReviewWithUser } from '../../lib/types/database';
import { useAuth } from '../../contexts/AuthContext';
import { useReviewSubmission } from '../../hooks/useReviews';
import { getDisplayUsername } from '../../utils/generateUsername';
import { ConfirmationDialog } from '@/app/components/molecules/ConfirmationDialog/ConfirmationDialog';
import BadgePill, { BadgePillData } from '../Badges/BadgePill';
import { isOptimisticId, isValidUUID } from '../../lib/utils/validation';

interface ReviewCardProps {
  review: ReviewWithUser;
  onUpdate?: () => void;
  showBusinessInfo?: boolean;
  isOwnerView?: boolean; // If true, show owner-specific actions like "Message Customer"
  realtimeHelpfulCount?: number; // Real-time helpful count from subscription
}

function ReviewCard({
  review,
  onUpdate,
  showBusinessInfo = false,
  isOwnerView = false,
  realtimeHelpfulCount,
}: ReviewCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { likeReview, deleteReview } = useReviewSubmission();

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

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01, x: 5 }}
      className="bg-gradient-to-br from-off-white via-off-white to-off-white/95 backdrop-blur-sm rounded-lg p-6 border-none transition-all duration-300 group hover:border-white/80 hover:-translate-y-1"
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <m.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.3 }}
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
                  className="w-full h-full rounded-full object-cover group-hover:ring-2 group-hover:ring-sage/40 transition-all duration-300"
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
            <div className="flex items-start sm:items-center gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                  <span className="font-urbanist text-lg font-600 text-charcoal-700 group-hover:text-sage transition-colors duration-300">
                    {review.user?.name || getDisplayUsername(
                      review.user?.username,
                      review.user?.display_name,
                      review.user?.email,
                      review.user_id
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isAnonymousReview
                        ? "bg-charcoal/10 text-charcoal/70"
                        : "bg-card-bg/15 text-sage"
                    }`}
                  >
                    {isAnonymousReview ? "Anonymous" : "Verified account"}
                  </span>
                </div>
                {/* Achievement badges — review author's earned badges */}
                {userBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {userBadges.slice(0, 3).map((badge) => (
                      <BadgePill key={badge.id} badge={badge} size="sm" />
                    ))}
                    {userBadges.length > 3 && (
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-charcoal/6 text-charcoal/50 border border-charcoal/10">
                        +{userBadges.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <m.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={i < review.rating ? "currentColor" : "none"}
                      stroke={i < review.rating ? "none" : "currentColor"}
                      viewBox="0 0 24 24"
                      style={{
                        color: i < review.rating ? "#722F37" : "#9ca3af",
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={i < review.rating ? 0 : 2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </m.div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-urbanist text-sm font-600 text-charcoal/60">
                {formatDate(review.created_at)}
              </span>
              
              {/* Direct action icons - Mobile-first design */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {isReviewOwner() && (
                  <>
                    <m.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleEdit}
                      className="min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 active:scale-95 transition-all duration-300 touch-manipulation"
                      aria-label="Edit review"
                      title="Edit review"
                    >
                      <Edit className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-white" />
                    </m.button>
                    <m.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleDelete}
                      className="min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 active:scale-95 transition-all duration-300 touch-manipulation"
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
            <h4 className="font-urbanist text-xl font-600 text-charcoal mb-2 group-hover:text-sage transition-colors duration-300">
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
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center px-3 py-1 bg-card-bg/10 text-sage text-sm font-500 rounded-full border border-sage/20 hover:bg-card-bg/20 transition-colors duration-300"
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
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer group/image"
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <Image
                      src={image.image_url}
                      alt={image.alt_text || `Review image ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-110"
                    />
                  </m.div>
                ))}
              </div>

              {!showAllImages && review.images.length > 3 && (
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllImages(true)}
                  className="text-sage hover:text-sage/80 font-urbanist text-sm font-500 flex items-center space-x-1"
                >
                  <ImageIcon size={16} />
                  <span>Show {review.images.length - 3} more images</span>
                </m.button>
              )}

              {showAllImages && review.images.length > 3 && (
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllImages(false)}
                  className="text-charcoal/60 hover:text-charcoal font-urbanist text-sm font-500 flex items-center space-x-1"
                >
                  <ChevronUp size={16} />
                  <span>Show less</span>
                </m.button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-sage/10">
            <div className="flex items-center gap-3">
              {!isOwnerView && (
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLike}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                    isLiked
                      ? 'bg-card-bg/10 text-sage'
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 font-semibold ${
                    isOwnerView
                      ? 'bg-card-bg text-white hover:bg-card-bg/90 px-4'
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(`/dm?user_id=${review.user_id}&business_id=${review.business_id}`)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 bg-coral text-white hover:bg-coral/90 font-semibold"
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

          {/* Reply Form - Available to all authenticated users */}
          <AnimatePresence>
            {showReplyForm && user && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
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
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setShowReplyForm(false);
                          setReplyText('');
                        }}
                        className="px-4 py-2 text-sm font-semibold bg-charcoal/10 text-charcoal rounded-lg hover:bg-charcoal/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={submittingReply}
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        Cancel
                      </m.button>
                      <m.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSubmitReply}
                        disabled={!replyText.trim() || submittingReply}
                        className="px-4 py-2 text-sm font-semibold bg-card-bg text-white rounded-lg hover:bg-card-bg/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEditReply(reply)}
                      className="w-7 h-7 bg-card-bg rounded-full flex items-center justify-center hover:bg-card-bg/90 transition-colors"
                      aria-label="Edit reply"
                      title="Edit reply"
                    >
                      <Edit className="w-[18px] h-[18px] text-white" />
                    </m.button>
                    <m.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteReply(reply.id)}
                      disabled={isDeleting}
                      className="w-7 h-7 bg-coral rounded-full flex items-center justify-center hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
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
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancelEdit}
                            className="px-3 py-1.5 text-xs font-medium text-charcoal/70 hover:text-charcoal transition-colors"
                          >
                            Cancel
                          </m.button>
                          <m.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSaveEdit(reply.id)}
                            disabled={!editReplyText.trim()}
                            className="px-3 py-1.5 text-xs font-medium bg-navbar-bg text-white rounded-lg hover:bg-navbar-bg/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedImageIndex(null)}
          >
            <m.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
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
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedImageIndex(null)}
                className="absolute -top-4 -right-4 w-8 h-8 bg-off-white/95 backdrop-blur-xl text-black rounded-full flex items-center justify-center border-none"
              >
                <X size={20} />
              </m.button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

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

// Memoize to prevent re-renders when parent updates
export default memo(ReviewCard);

