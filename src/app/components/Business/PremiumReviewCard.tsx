"use client";

import { useState, useRef, useEffect } from "react";
import { Star, BadgeCheck, ShieldCheck, ThumbsUp, Share2, Flag, MoreHorizontal, User, Edit, Trash2, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ZoomIn, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useReviewSubmission } from "../../hooks/useReviews";
import { useToast } from "../../contexts/ToastContext";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ConfirmationDialog } from "@/app/components/molecules/ConfirmationDialog/ConfirmationDialog";
import { getDisplayUsername } from "../../utils/generateUsername";
import { isOptimisticId, isValidUUID } from "../../lib/utils/validation";

interface PremiumReviewCardProps {
    reviewId?: string;
    userId?: string;
    author: string;
    rating: number;
    text: string;
    date: string;
    tags?: string[];
    highlight?: string;
    verified?: boolean;
    profileImage?: string;
    reviewImages?: string[];
    compact?: boolean;
    onDelete?: () => void;
}

export function PremiumReviewCard({
    reviewId,
    userId,
    author,
    rating,
    text,
    date,
    tags,
    highlight = "Top Reviewer",
    verified = true,
    profileImage,
    reviewImages,
    compact = false,
    onDelete,
}: PremiumReviewCardProps) {
    const rounded = Math.round(rating);
    const [imageError, setImageError] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
    const imageRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const { deleteReview } = useReviewSubmission();
    const { showToast } = useToast();
    const router = useRouter();
    const isTransientReviewId = !!reviewId && (isOptimisticId(reviewId) || !isValidUUID(reviewId));

    // State for helpful and flag
    const [isLiked, setIsLiked] = useState(false);
    const [helpfulCount, setHelpfulCount] = useState(0);
    const [loadingHelpful, setLoadingHelpful] = useState(false);
    const [isFlagged, setIsFlagged] = useState(false);
    const [flagging, setFlagging] = useState(false);
    const [showFlagModal, setShowFlagModal] = useState(false);

    // Use current user's profile data if this is the current user's review
    const displayAuthor = (() => {
        if (userId && user?.id === userId) {
            // Use current user's profile data for real-time updates
            const profile = user?.profile;
            return getDisplayUsername(
                profile?.username,
                profile?.display_name,
                user?.email,
                userId
            );
        }
        // For other users, use the author prop (which should come from API with username)
        return author;
    })();

    // Use current user's avatar if this is the current user's review
    const displayProfileImage = (() => {
        if (userId && user?.id === userId && user?.profile?.avatar_url) {
            return user.profile.avatar_url;
        }
        return profileImage;
    })();

    // Reset image error when profile image changes
    useEffect(() => {
        if (displayProfileImage) {
            setImageError(false);
        }
    }, [displayProfileImage]);

    // Fetch helpful status and count on mount
    useEffect(() => {
        if (!reviewId) return;
        if (isTransientReviewId) {
            setHelpfulCount(0);
            setIsLiked(false);
            setIsFlagged(false);
            return;
        }

        const fetchHelpfulData = async () => {
            try {
                // Fetch count
                const countRes = await fetch(`/api/reviews/${reviewId}/helpful/count`);
                if (countRes.ok) {
                    const countData = await countRes.json();
                    if (typeof countData.count === 'number') {
                        setHelpfulCount(countData.count);
                    }
                }

                // Fetch current user status
                if (user) {
                    const statusRes = await fetch(`/api/reviews/${reviewId}/helpful`);
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        if (typeof statusData.helpful === 'boolean') {
                            setIsLiked(statusData.helpful);
                        }
                    }

                    // Check if user has flagged this review
                    const flagRes = await fetch(`/api/reviews/${reviewId}/flag`);
                    if (flagRes.ok) {
                        const flagData = await flagRes.json();
                        setIsFlagged(flagData.flagged || false);
                    }
                }
            } catch (err) {
                console.error('Error fetching helpful data:', err);
            }
        };

        fetchHelpfulData();
    }, [reviewId, user, isTransientReviewId]);

    // Check if current user owns this review
    const isOwner = user && userId && user.id === userId;
    
    // Handle image click
    const handleImageClick = (index: number) => {
        setSelectedImageIndex(index);
        setZoomLevel(1);
        setImagePosition({ x: 0, y: 0 });
        document.body.style.overflow = 'hidden';
    };

    // Close lightbox
    const closeLightbox = () => {
        setSelectedImageIndex(null);
        setZoomLevel(1);
        setImagePosition({ x: 0, y: 0 });
        document.body.style.overflow = '';
    };

    // Navigate between images
    const navigateImage = (direction: 'prev' | 'next') => {
        if (selectedImageIndex === null || !reviewImages) return;
        const newIndex = direction === 'next' 
            ? (selectedImageIndex + 1) % reviewImages.length
            : (selectedImageIndex - 1 + reviewImages.length) % reviewImages.length;
        setSelectedImageIndex(newIndex);
        setZoomLevel(1);
        setImagePosition({ x: 0, y: 0 });
    };

    // Zoom in/out
    const handleZoom = (delta: number) => {
        setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
    };

    // Reset zoom
    const resetZoom = () => {
        setZoomLevel(1);
        setImagePosition({ x: 0, y: 0 });
    };

    // Mouse wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        if (selectedImageIndex === null) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        handleZoom(delta);
    };

    // Drag to pan when zoomed
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevel > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoomLevel > 1) {
            setImagePosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Calculate menu position when it opens - position above the button at bottom of card
    useEffect(() => {
        if (showMenu && buttonRef.current) {
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                if (buttonRef.current) {
                    const buttonRect = buttonRef.current.getBoundingClientRect();
                    const menuHeight = 88; // Approximate height of menu (2 buttons)
                    const menuWidth = 192; // w-48 = 192px
                    const spacing = 8; // spacing above button
                    const padding = 16; // Viewport padding
                    
                    // Always position above the button (at bottom of card)
                    let top = buttonRect.top - menuHeight - spacing;
                    
                    // Ensure menu doesn't go off-screen at top
                    if (top < padding) {
                        top = buttonRect.bottom + spacing; // Position below if no room above
                    }
                    
                    // Calculate right position, ensuring it doesn't go off-screen
                    let right = window.innerWidth - buttonRect.right;
                    const minRight = padding;
                    const maxRight = window.innerWidth - menuWidth - padding;
                    right = Math.max(minRight, Math.min(right, maxRight));
                    
                    setMenuPosition({
                        top,
                        right,
                    });
                }
            });
        }
    }, [showMenu]);

    // Close menu when clicking or touching outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (
                menuRef.current && 
                !menuRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target)
            ) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            // Listen for both mouse and touch events
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
            };
        }
    }, [showMenu]);

    const handleEdit = () => {
        if (!reviewId) return;
        // Get the current business ID from the URL
        const pathParts = window.location.pathname.split('/');
        const businessSlugOrId = pathParts[pathParts.indexOf('business') + 1];
        
        // Navigate to write review page with edit mode (query param)
        router.push(`/business/${businessSlugOrId}/review?edit=${reviewId}`);
        setShowMenu(false);
    };

    const handleDelete = async () => {
        if (!reviewId || !isOwner) return;
        
        const confirmed = confirm('Are you sure you want to delete this review? This action cannot be undone.');
        if (!confirmed) {
            setShowMenu(false);
            return;
        }

        try {
            const success = await deleteReview(reviewId);
            if (success) {
                if (onDelete) {
                    onDelete();
                } else {
                    // Reload the page to refresh reviews if no callback provided
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Error deleting review:', error);
        } finally {
            setShowMenu(false);
        }
    };

    // Handle helpful/like
    const handleHelpful = async () => {
        if (loadingHelpful || !user || !reviewId || isTransientReviewId) return;
        
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
            const res = await fetch(`/api/reviews/${reviewId}/helpful`, {
                method,
            });

            if (!res.ok) {
                // Revert if server failed
                setIsLiked(prevHelpful);
                setHelpfulCount(prevCount);
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to toggle helpful:', errorData);
                showToast('Failed to update helpful vote', 'error');
            } else {
                // Update count from server response if needed
                const countRes = await fetch(`/api/reviews/${reviewId}/helpful/count`);
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
            showToast('Failed to update helpful vote', 'error');
        } finally {
            setLoadingHelpful(false);
        }
    };

    // Handle share
    const handleShare = async () => {
        if (!reviewId) return;

        const shareUrl = `${window.location.origin}/business/${window.location.pathname.split('/')[2]}`;
        const shareText = `Check out this review by ${displayAuthor} on sayso!`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Review by ${displayAuthor}`,
                    text: shareText,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showToast('Link copied to clipboard', 'success');
            }
        } catch (err) {
            // User cancelled share or error occurred
            if ((err as Error).name !== 'AbortError') {
                console.error('Error sharing:', err);
            }
        }
    };

    // Handle flag/report — opens modal
    const handleFlag = () => {
        if (!user || !reviewId || flagging || isTransientReviewId || isFlagged || isOwner) return;
        setShowFlagModal(true);
    };

    const submitFlag = async (reason: string, details: string) => {
        if (!reviewId) return;
        setFlagging(true);
        try {
            const res = await fetch(`/api/reviews/${reviewId}/flag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, details: details.trim() || undefined }),
            });
            if (res.ok) {
                setIsFlagged(true);
                setShowFlagModal(false);
                showToast('Review reported. Thank you for your feedback.', 'success');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.error || 'Failed to report review', 'error');
            }
        } catch {
            showToast('Failed to report review', 'error');
        } finally {
            setFlagging(false);
        }
    };

    return (
        <>
        <div
            className={`relative overflow-hidden rounded-[12px] border backdrop-blur-md transition-shadow duration-300 border-white/50 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 ring-1 ring-white/20 text-charcoal shadow-[0_15px_40px_rgba(15,23,42,0.08)] ${
                compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'
            }`}
        >
            {/* Glass depth overlay - matching BusinessCard */}
            <div className="absolute inset-0 bg-gradient-to-br from-off-white/5 via-transparent to-transparent pointer-events-none z-0" />
            {/* subtle glows - matching BusinessCard style */}
            <span
                className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full blur-lg bg-card-bg/10"
            />
            <span
                className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full blur-lg bg-coral/10"
            />

            <div className={`flex items-start gap-2 sm:gap-3 relative z-10 ${compact ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-3'}`}>
                {/* Avatar */}
                <div className="relative shrink-0">
                    {displayProfileImage && !imageError ? (
                        <div
                            className={`rounded-full overflow-hidden  ${
                                compact ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-8 w-8 sm:h-10 sm:w-10'
                            }`}
                        >
                            <img
                                key={displayProfileImage} // Force re-render when image URL changes
                                src={displayProfileImage}
                                alt={`${displayAuthor} profile`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                onError={() => setImageError(true)}
                            />
                        </div>
                    ) : (
                        <div
                            className={`grid place-items-center rounded-full ring-1 bg-off-white/95 ring-white/30 border border-white/30 ${
                                compact ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-8 w-8 sm:h-10 sm:w-10'
                            }`}
                        >
                            <User className={`text-charcoal/60 ${compact ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
                        </div>
                    )}
                    {verified && (
                        <span
                            className={`absolute -bottom-1 -right-1 grid place-items-center rounded-full shadow ring-1 bg-off-white/95 ring-white/30 border border-white/30 ${
                                compact ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'
                            }`}
                        >
                            <BadgeCheck className={`text-sage ${compact ? 'h-2.5 w-2.5 sm:h-3 sm:w-3' : 'h-3 w-3 sm:h-3.5 sm:w-3.5'}`} />
                        </span>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                    <div className={`flex items-start justify-between gap-2 ${compact ? 'mb-0.5' : 'mb-1 sm:mb-1.5'}`}>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className={`truncate font-semibold text-charcoal ${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
                                    {displayAuthor}
                                </span>
                                {highlight && !compact && (
                                    <span
                                        className="inline-flex items-center gap-1 rounded-full border px-1.5 sm:px-2 py-0.5 text-[12px] sm:text-[10px] border-sage/20 bg-card-bg/10 text-sage"
                                    >
                                        <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                        <span className="hidden xs:inline">{highlight}</span>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <span className={`text-charcoal/60 ${compact ? 'text-[10px] sm:text-[11px]' : 'text-sm sm:text-[12px]'}`}>{date}</span>
                                {/* Show counts on smaller screens */}
                                <div className="flex items-center gap-3 sm:hidden">
                                    {helpfulCount > 0 && (
                                        <span className="text-xs text-charcoal/70 flex items-center gap-1">
                                            <ThumbsUp className="h-3 w-3 text-charcoal/60" />
                                            {helpfulCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Stars */}
                        <div className="flex items-center shrink-0">
                            {[...Array(5)].map((_, i) => {
                                const fill = i < rounded;
                                return (
                                    <span key={i} className={fill ? "text-coral" : "text-gray-300"}>
                                        <Star className={compact ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3 w-3 sm:h-3.5 sm:w-3.5"} fill={fill ? "currentColor" : "none"} />
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <p
                        className={`leading-relaxed text-charcoal/90 ${
                            compact 
                                ? 'text-base sm:text-sm mb-1.5 line-clamp-4 font-semibold sm:font-normal' 
                                : 'text-base sm:text-sm md:text-[0.92rem] mb-2 sm:mb-3 font-semibold sm:font-normal'
                        }`}
                    >
                        {text}
                    </p>

                    {/* Review Images - Show in compact mode too, just limit count */}
                    {reviewImages && reviewImages.length > 0 && (
                        <div className={compact ? 'mb-2' : 'mb-2 sm:mb-3'}>
                            <div className={`grid ${
                                compact 
                                    ? 'grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-1.5' 
                                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2'
                            }`}>
                                {reviewImages.slice(0, compact ? 4 : 8).map((image, index) => (
                                    <div
                                        key={index}
                                        className="relative aspect-square rounded-md overflow-hidden bg-card-bg/10 border border-white/30 cursor-pointer group hover:border-sage/50 transition-all duration-200"
                                        onClick={() => handleImageClick(index)}
                                    >
                                        <img
                                            src={image}
                                            alt={`Review image ${index + 1}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            loading={index < 4 ? "eager" : "lazy"}
                                            decoding="async"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-200 flex items-center justify-center">
                                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tags && tags.length > 0 && !compact && (
                        <div className={`flex flex-wrap gap-1 sm:gap-1.5 ${compact ? 'mb-1' : 'mb-2 sm:mb-3'}`}>
                            {tags.slice(0, compact ? 2 : tags.length).map((t) => (
                                <span
                                    key={t}
                                    className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-full border px-1.5 sm:px-2 py-0.5 border-sage/25 bg-card-bg/10 text-sage ${
                                        compact ? 'text-[12px] sm:text-[10px]' : 'text-[10px] sm:text-[11px]'
                                    }`}
                                >
                                    @ {t}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Actions - hide in compact mode */}
                    {!compact && (
                        <div className="pt-1 sm:pt-2">
                            <div className="flex items-center justify-between gap-1 sm:justify-around">
                                <button
                                    onClick={handleHelpful}
                                    disabled={!user || loadingHelpful}
                                    className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3 py-2 sm:py-2 text-xs sm:text-sm transition min-h-[44px] min-w-[44px] flex-1 sm:flex-initial bg-navbar-bg hover:bg-navbar-bg/90 ${
                                        loadingHelpful ? 'opacity-60 cursor-not-allowed' : ''
                                    }`}
                                    aria-label={`Helpful ${helpfulCount > 0 ? `(${helpfulCount})` : ''}`}
                                >
                                    <ThumbsUp className={`h-4 w-4 sm:h-4 sm:w-4 text-white ${isLiked ? 'fill-current' : ''}`} strokeWidth={2.5} />
                                    <span className="font-urbanist font-700 text-white hidden sm:inline">
                                        Helpful {helpfulCount > 0 && `(${helpfulCount})`}
                                    </span>
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3 py-2 sm:py-2 text-xs sm:text-sm transition bg-navbar-bg hover:bg-navbar-bg/90 min-h-[44px] min-w-[44px] flex-1 sm:flex-initial"
                                >
                                    <Share2 className="h-4 w-4 sm:h-4 sm:w-4 text-white" strokeWidth={2.5} />
                                    <span className="font-urbanist font-700 text-white hidden sm:inline">Share</span>
                                </button>
                                {isOwner && (
                                    <>
                                        <button
                                            ref={buttonRef}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu(!showMenu);
                                            }}
                                            className="flex items-center justify-center rounded-full p-2 transition bg-navbar-bg hover:bg-navbar-bg/90 min-h-[44px] min-w-[44px] flex-1 sm:flex-initial"
                                            aria-label="More options"
                                        >
                                            <MoreHorizontal className="h-4 w-4 sm:h-4 sm:w-4 text-white" strokeWidth={2.5} />
                                        </button>
                                        
                                        {showMenu && menuPosition.top > 0 && (
                                            <div 
                                                ref={menuRef}
                                                className="fixed w-48 sm:w-52 bg-gradient-to-br from-off-white via-off-white to-off-white/95 border-none rounded-lg shadow-xl z-[99999] overflow-hidden backdrop-blur-md"
                                                style={{
                                                    top: `${menuPosition.top}px`,
                                                    right: `${menuPosition.right}px`,
                                                    position: 'fixed',
                                                    visibility: menuPosition.top > 0 ? 'visible' : 'hidden',
                                                }}
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit();
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 sm:py-3 text-left text-sm font-medium text-charcoal hover:bg-card-bg/10 flex items-center gap-2 transition-colors border-b border-charcoal/5 whitespace-nowrap min-h-[44px]"
                                                >
                                                    <Edit className="h-4 w-4 text-sage flex-shrink-0" />
                                                    <span>Edit Review</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete();
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 sm:py-3 text-left text-sm font-medium text-coral hover:bg-coral/10 flex items-center gap-2 transition-colors whitespace-nowrap min-h-[44px]"
                                                >
                                                    <Trash2 className="h-4 w-4 flex-shrink-0" />
                                                    <span>Delete Review</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                                {!isOwner && (
                                    <button
                                        onClick={handleFlag}
                                        disabled={!user || flagging || isFlagged || isOwner}
                                        className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3 py-2 sm:py-2 text-xs sm:text-sm transition min-h-[44px] min-w-[44px] flex-1 sm:flex-initial bg-navbar-bg hover:bg-navbar-bg/90 ${
                                            flagging || isOwner ? 'opacity-60 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        <Flag className="h-4 w-4 sm:h-4 sm:w-4 text-white" strokeWidth={2.5} />
                                        <span className="font-urbanist font-700 text-white hidden sm:inline">
                                            {isFlagged ? 'Reported' : 'Report'}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>

        {/* Image Lightbox with Zoom */}
        <AnimatePresence>
            {selectedImageIndex !== null && reviewImages && reviewImages[selectedImageIndex] && (
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] bg-charcoal/95 backdrop-blur-xl flex items-center justify-center p-4"
                    onClick={closeLightbox}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    {/* Close Button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 w-12 h-12 bg-off-white/10 hover:bg-off-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 z-10 border border-white/20"
                        aria-label="Close image viewer"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Image Counter */}
                    {reviewImages.length > 1 && (
                        <div className="absolute top-4 left-4 bg-off-white/10 backdrop-blur-sm px-4 py-2 rounded-full z-10 border border-white/20">
                            <span className="text-white font-urbanist text-sm font-600">
                                {selectedImageIndex + 1} / {reviewImages.length}
                            </span>
                        </div>
                    )}

                    {/* Zoom Controls */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-off-white/10 backdrop-blur-sm px-4 py-2 rounded-full z-10 flex items-center gap-3 border border-white/20">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleZoom(-0.2);
                            }}
                            className="w-8 h-8 rounded-full bg-off-white/20 hover:bg-off-white/30 flex items-center justify-center transition-colors text-white"
                            disabled={zoomLevel <= 0.5}
                            aria-label="Zoom out"
                        >
                            <span className="text-lg font-bold">−</span>
                        </button>
                        <span className="text-white font-urbanist text-sm font-600 min-w-[3rem] text-center">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleZoom(0.2);
                            }}
                            className="w-8 h-8 rounded-full bg-off-white/20 hover:bg-off-white/30 flex items-center justify-center transition-colors text-white"
                            disabled={zoomLevel >= 3}
                            aria-label="Zoom in"
                        >
                            <span className="text-lg font-bold">+</span>
                        </button>
                        {zoomLevel !== 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resetZoom();
                                }}
                                className="px-3 py-1 text-xs text-white hover:bg-off-white/20 rounded transition-colors"
                                aria-label="Reset zoom"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Previous Button */}
                    {reviewImages.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigateImage('prev');
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-off-white/10 hover:bg-off-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 z-10 border border-white/20"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* Next Button */}
                    {reviewImages.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigateImage('next');
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-off-white/10 hover:bg-off-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 z-10 border border-white/20"
                            aria-label="Next image"
                        >
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* Image Container */}
                    <m.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="relative max-w-[90vw] max-h-[90vh] cursor-move"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={handleMouseDown}
                        ref={imageRef}
                        style={{
                            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        }}
                    >
                        <img
                            src={reviewImages[selectedImageIndex]}
                            alt={`Review image ${selectedImageIndex + 1}`}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg select-none"
                            style={{
                                transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
                                transformOrigin: 'center center',
                                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                            }}
                            draggable={false}
                        />
                    </m.div>
                </m.div>
            )}
        </AnimatePresence>

        {/* Keyboard Navigation */}
        {selectedImageIndex !== null && (
            <KeyboardNavigation
                onPrev={() => navigateImage('prev')}
                onNext={() => navigateImage('next')}
                onClose={closeLightbox}
                onZoomIn={() => handleZoom(0.2)}
                onZoomOut={() => handleZoom(-0.2)}
                onResetZoom={resetZoom}
                showPrev={reviewImages && reviewImages.length > 1}
                showNext={reviewImages && reviewImages.length > 1}
            />
        )}

        {/* Flag modal */}
        {showFlagModal && (
            <FlagModal
                onClose={() => setShowFlagModal(false)}
                onSubmit={submitFlag}
                submitting={flagging}
            />
        )}

        </>
    );
}

// ─── Flag Modal ───────────────────────────────────────────────────────────────

const FLAG_REASONS = [
    { value: "spam", label: "Spam", desc: "Promotional or repetitive content" },
    { value: "inappropriate", label: "Inappropriate", desc: "Offensive or adult content" },
    { value: "harassment", label: "Harassment", desc: "Targets or bullies someone" },
    { value: "off_topic", label: "Off-topic", desc: "Not related to this business" },
    { value: "other", label: "Other", desc: "Something else" },
] as const;

type FlagReason = (typeof FLAG_REASONS)[number]["value"];

function FlagModal({
    onClose,
    onSubmit,
    submitting,
}: {
    onClose: () => void;
    onSubmit: (reason: string, details: string) => void;
    submitting: boolean;
}) {
    const [reason, setReason] = useState<FlagReason | null>(null);
    const [details, setDetails] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    function handleSubmit() {
        if (!reason) { setLocalError("Please select a reason."); return; }
        if (reason === "other" && !details.trim()) { setLocalError("Please add details for 'Other'."); return; }
        onSubmit(reason, details);
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
                {/* Drag handle */}
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
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 mb-4">
                        {FLAG_REASONS.map(({ value, label, desc }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => { setReason(value); setLocalError(null); }}
                                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                                    reason === value
                                        ? "border-navbar-bg bg-navbar-bg/5"
                                        : "border-charcoal/10 hover:border-charcoal/20 hover:bg-charcoal/[0.025]"
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
                                Additional details {reason === "other" ? "(required)" : "(optional)"}
                            </span>
                            <textarea
                                value={details}
                                onChange={(e) => { setDetails(e.target.value); setLocalError(null); }}
                                rows={3}
                                placeholder="Describe the issue…"
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
                            {submitting && (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            )}
                            Submit Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Keyboard Navigation Component
function KeyboardNavigation({
    onPrev,
    onNext,
    onClose,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    showPrev,
    showNext,
}: {
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    showPrev: boolean;
    showNext: boolean;
}) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    if (showPrev) {
                        e.preventDefault();
                        onPrev();
                    }
                    break;
                case 'ArrowRight':
                    if (showNext) {
                        e.preventDefault();
                        onNext();
                    }
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    onZoomIn();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    onZoomOut();
                    break;
                case '0':
                    e.preventDefault();
                    onResetZoom();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onPrev, onNext, onClose, onZoomIn, onZoomOut, onResetZoom, showPrev, showNext]);

    return null;
}
