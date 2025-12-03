'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Trash2, Image as ImageIcon, ChevronUp, Heart, X, MessageCircle, Send, Edit, Bookmark } from 'react-feather';
import type { ReviewWithUser } from '../../lib/types/database';
import { useAuth } from '../../contexts/AuthContext';
import { useReviewSubmission } from '../../hooks/useReviews';
import { useSavedItems } from '../../contexts/SavedItemsContext';
import { getDisplayUsername } from '../../utils/generateUsername';

interface ReviewCardProps {
  review: ReviewWithUser;
  onUpdate?: () => void;
  showBusinessInfo?: boolean;
}

export default function ReviewCard({
  review,
  onUpdate,
  showBusinessInfo = false
}: ReviewCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { likeReview, deleteReview } = useReviewSubmission();
  const { toggleSavedItem, isItemSaved } = useSavedItems();

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
  const [isLiked, setIsLiked] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [loadingHelpful, setLoadingHelpful] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const replyFormRef = useRef<HTMLDivElement>(null);

  // Fetch helpful status and count on mount
  useEffect(() => {
    const fetchHelpfulData = async () => {
      try {
        // Fetch count
        const countRes = await fetch(`/api/reviews/${review.id}/helpful/count`);
        if (countRes.ok) {
          const countData = await countRes.json();
          if (typeof countData.count === 'number') {
            setHelpfulCount(countData.count);
          }
        }

        // Fetch current user status
        const statusRes = await fetch(`/api/reviews/${review.id}/helpful`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (typeof statusData.helpful === 'boolean') {
            setIsLiked(statusData.helpful);
          }
        }
      } catch (err) {
        console.error('Error fetching helpful data:', err);
      }
    };

    if (user) {
      fetchHelpfulData();
    }
  }, [review.id, user]);

  // Fetch replies on mount and after updates
  useEffect(() => {
    const fetchReplies = async () => {
      try {
        setLoadingReplies(true);
        const res = await fetch(`/api/reviews/${review.id}/replies`);
        if (res.ok) {
          const data = await res.json();
          // Ensure user_id is included for ownership checks
          const repliesWithUserId = (data.replies || []).map((reply: any) => ({
            ...reply,
            user_id: reply.user_id || reply.user?.id,
          }));
          setReplies(repliesWithUserId);
        }
      } catch (err) {
        console.error('Error fetching replies:', err);
      } finally {
        setLoadingReplies(false);
      }
    };

    fetchReplies();
  }, [review.id]);


  const handleLike = async () => {
    if (loadingHelpful || !user) return;
    
    setLoadingHelpful(true);
    const prevHelpful = isLiked;
    const prevCount = helpfulCount;

    // Optimistic update
    if (prevHelpful) {
      setIsLiked(false);
      setHelpfulCount((c) => Math.max(0, c - 1));
    } else {
      setIsLiked(true);
      setHelpfulCount((c) => c + 1);
    }

    try {
      const method = prevHelpful ? 'DELETE' : 'POST';
      const res = await fetch(`/api/reviews/${review.id}/helpful`, {
        method,
      });

      if (!res.ok) {
        // Revert if server failed
        setIsLiked(prevHelpful);
        setHelpfulCount(prevCount);
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to toggle helpful:', errorData);
      } else {
        // Update count from server response if needed
        const countRes = await fetch(`/api/reviews/${review.id}/helpful/count`);
        if (countRes.ok) {
          const countData = await countRes.json();
          if (typeof countData.count === 'number') {
            setHelpfulCount(countData.count);
          }
        }
      }
    } catch (err) {
      // Revert on network error
      console.error('Error toggling helpful:', err);
      setIsLiked(prevHelpful);
      setHelpfulCount(prevCount);
    } finally {
      setLoadingHelpful(false);
    }
  };

  const handleEdit = () => {
    if (!review.id) return;
    // Get the current business ID from the URL or review
    const pathParts = window.location.pathname.split('/');
    const businessSlugOrId = pathParts[pathParts.indexOf('business') + 1] || review.business_id;
    
    // Navigate to write review page with edit mode (query param)
    router.push(`/business/${businessSlugOrId}/review?edit=${review.id}`);
  };

  const handleDelete = async () => {
    const confirmed = confirm('Are you sure you want to delete this review?');
    if (confirmed) {
      const success = await deleteReview(review.id);
      if (success && onUpdate) {
        onUpdate();
      }
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!review.business_id) return;
    await toggleSavedItem(review.business_id);
  };

  const isBusinessSaved = review.business_id ? isItemSaved(review.business_id) : false;

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !user || submittingReply) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplies(prev => [data.reply, ...prev]);
        setReplyText('');
        setShowReplyForm(false);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit reply');
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
      alert('Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
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

    try {
      const res = await fetch(`/api/reviews/${review.id}/replies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId, content: editReplyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplies(prev => prev.map(r => r.id === replyId ? data.reply : r));
        setEditingReplyId(null);
        setEditReplyText('');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update reply');
      }
    } catch (err) {
      console.error('Error updating reply:', err);
      alert('Failed to update reply');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    if (!user) return;

    setDeletingReplyId(replyId);
    try {
      const res = await fetch(`/api/reviews/${review.id}/replies`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId }),
      });

      if (res.ok) {
        setReplies(prev => prev.filter(r => r.id !== replyId));
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete reply');
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      alert('Failed to delete reply');
    } finally {
      setDeletingReplyId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const displayedImages = showAllImages ? review.images : review.images?.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01, x: 5 }}
      className="bg-gradient-to-br from-off-white via-off-white to-off-white/95 backdrop-blur-sm rounded-lg p-6 border border-white/60 ring-1 ring-white/30 transition-all duration-300 group hover:border-white/80 hover:-translate-y-1"
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          {review.user.avatar_url ? (
            <div className="relative">
              <div className="w-12 h-12 rounded-full p-0.5 bg-off-white ring-2 ring-white/40">
                <Image
                  src={review.user.avatar_url}
                  alt={getDisplayUsername(
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
                {getDisplayUsername(
                  review.user?.username,
                  review.user?.display_name,
                  review.user?.email,
                  review.user_id
                )?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </motion.div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 space-y-2 md:space-y-0">
            <div className="flex items-center space-x-3">
              <span className="font-urbanist text-lg font-600 text-charcoal-700 group-hover:text-sage transition-colors duration-300">
                {getDisplayUsername(
                  review.user?.username,
                  review.user?.display_name,
                  review.user?.email,
                  review.user_id
                )}
              </span>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
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
                        color: i < review.rating ? "#f59e0b" : "#9ca3af",
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={i < review.rating ? 0 : 2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-urbanist text-sm font-600 text-charcoal/60">
                {formatDate(review.created_at)}
              </span>
              
              {/* Direct action icons - Mobile-first design */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Bookmark button - Save/Unsave business */}
                {review.business_id && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleBookmark}
                    className="min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 active:scale-95 transition-all duration-300 touch-manipulation"
                    aria-label={isBusinessSaved ? "Unsave business" : "Save business"}
                    title={isBusinessSaved ? "Unsave business" : "Save business"}
                  >
                    <Bookmark 
                      className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-white transition-all duration-200" 
                      fill={isBusinessSaved ? "currentColor" : "none"}
                      strokeWidth={2.5}
                    />
                  </motion.button>
                )}
                {isReviewOwner() && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleEdit}
                      className="min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 active:scale-95 transition-all duration-300 touch-manipulation"
                      aria-label="Edit review"
                      title="Edit review"
                    >
                      <Edit className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-white" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleDelete}
                      className="min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 active:scale-95 transition-all duration-300 touch-manipulation"
                      aria-label="Delete review"
                      title="Delete review"
                    >
                      <Trash2 className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-white" />
                    </motion.button>
                  </>
                )}
                {/* Reply functionality commented out */}
                {/* <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="w-7 h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 transition-colors"
                  aria-label="Reply to review"
                  title="Reply"
                  disabled={!user}
                >
                  <MessageCircle className="w-[18px] h-[18px] text-white" />
                </motion.button> */}
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
            <div className="mb-3 p-2 bg-sage/10 rounded-lg">
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
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center px-3 py-1 bg-sage/10 text-sage text-sm font-500 rounded-full border border-sage/20 hover:bg-sage/20 transition-colors duration-300"
                >
                  <span className="mr-1">@</span>
                  {tag}
                </motion.span>
              ))}
            </div>
          )}

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {displayedImages?.map((image, index) => (
                  <motion.div
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
                  </motion.div>
                ))}
              </div>

              {!showAllImages && review.images.length > 3 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllImages(true)}
                  className="text-sage hover:text-sage/80 font-urbanist text-sm font-500 flex items-center space-x-1"
                >
                  <ImageIcon size={16} />
                  <span>Show {review.images.length - 3} more images</span>
                </motion.button>
              )}

              {showAllImages && review.images.length > 3 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllImages(false)}
                  className="text-charcoal/60 hover:text-charcoal font-urbanist text-sm font-500 flex items-center space-x-1"
                >
                  <ChevronUp size={16} />
                  <span>Show less</span>
                </motion.button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-sage/10">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLike}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                  isLiked
                    ? 'bg-sage/10 text-sage'
                    : 'text-charcoal/60 hover:bg-sage/10 hover:text-sage'
                } ${loadingHelpful ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!user || loadingHelpful}
              >
                <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                <span className="font-urbanist text-sm font-500">
                  Helpful ({helpfulCount})
                </span>
              </motion.button>

              {/* Reply functionality commented out */}
              {/* <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 text-charcoal/60 hover:bg-sage/10 hover:text-sage"
                disabled={!user}
              >
                <MessageCircle size={18} />
                <span className="font-urbanist text-sm font-500">
                  Reply {replies.length > 0 && `(${replies.length})`}
                </span>
              </motion.button> */}
            </div>

            {!user && (
              <span className="font-urbanist text-sm sm:text-xs text-charcoal/40">
                Login to interact
              </span>
            )}
          </div>

          {/* Reply Form - Commented out */}
          {/* <AnimatePresence>
            {showReplyForm && user && (
              <motion.div
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
                    placeholder="Write a reply..."
                    className="w-full px-4 py-3 rounded-lg border border-sage/20 bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 resize-none font-urbanist text-sm"
                    rows={3}
                    disabled={submittingReply}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyText('');
                      }}
                      className="px-4 py-2 text-sm font-bold bg-navbar-bg text-white rounded-lg hover:bg-navbar-bg/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submittingReply}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSubmitReply}
                      disabled={!replyText.trim() || submittingReply}
                      className="px-4 py-2 text-sm font-bold bg-navbar-bg text-white rounded-lg hover:bg-navbar-bg/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send size={16} />
                      <span>{submittingReply ? 'Sending...' : 'Send'}</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence> */}

          {/* Replies List - Commented out */}
          {/* {replies.length > 0 && (
            <div className="mt-4 pt-4 border-t border-sage/10 space-y-3">
              <h5 className="font-urbanist text-sm font-bold text-charcoal/70 mb-3">
                Replies ({replies.length})
              </h5>
              {replies.map((reply) => {
                const isOwner = user?.id === reply.user_id;
                const isEditing = editingReplyId === reply.id;
                const isDeleting = deletingReplyId === reply.id;

                return (
                  <motion.div
                    key={reply.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pl-4 border-l-2 border-sage/20 bg-off-white/30 rounded-r-lg p-3 relative"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-urbanist text-sm font-semibold text-charcoal-700">
                          {reply.user?.name || 'User'}
                        </span>
                        <span className="font-urbanist text-xs font-semibold text-charcoal/50">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      {isOwner && !isEditing && (
                        <div className="flex items-center gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditReply(reply)}
                            className="w-7 h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 transition-colors"
                            aria-label="Edit reply"
                            title="Edit reply"
                          >
                            <Edit className="w-[18px] h-[18px] text-white" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteReply(reply.id)}
                            disabled={isDeleting}
                            className="w-7 h-7 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Delete reply"
                            title="Delete reply"
                          >
                            <Trash2 className="w-[18px] h-[18px] text-white" />
                          </motion.button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          value={editReplyText}
                          onChange={(e) => setEditReplyText(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-sage/20 bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 resize-none font-urbanist text-sm"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancelEdit}
                            className="px-3 py-1.5 text-xs font-medium text-charcoal/70 hover:text-charcoal transition-colors"
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSaveEdit(reply.id)}
                            disabled={!editReplyText.trim()}
                            className="px-3 py-1.5 text-xs font-medium bg-navbar-bg text-white rounded-lg hover:bg-navbar-bg/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <p className="font-urbanist text-sm font-bold text-charcoal/80">
                        {reply.content}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )} */}
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImageIndex !== null && review.images && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedImageIndex(null)}
          >
            <motion.div
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
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedImageIndex(null)}
                className="absolute -top-4 -right-4 w-8 h-8 bg-off-white/95 backdrop-blur-xl text-black rounded-full flex items-center justify-center border border-white/40"
              >
                <X size={20} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

