import React from "react";
import { Edit, Bookmark, Share2 } from "lucide-react";

interface BusinessCardActionsProps {
  hasReviewed: boolean;
  isItemSaved: boolean;
  isBusinessAccount?: boolean;
  onWriteReview: (e: React.MouseEvent) => void;
  onViewProfile?: (e: React.MouseEvent) => void;
  onBookmark: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  businessName: string;
}

const BusinessCardActions: React.FC<BusinessCardActionsProps> = ({
  hasReviewed,
  isItemSaved,
  isBusinessAccount = false,
  onWriteReview,
  onViewProfile,
  onBookmark,
  onShare,
  businessName,
}) => (
  <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-2 transition-all duration-300 ease-out translate-x-12 opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
    {isBusinessAccount ? (
      // Business account: Show "View Profile" button
      <button
        className="w-10 h-10 bg-navbar-bg rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md hover:bg-navbar-bg/90 hover:scale-110 active:scale-95 active:translate-y-[1px] transform-gpu touch-manipulation select-none"
        onClick={onViewProfile}
        aria-label={`View ${businessName} profile`}
        title="View Business Profile"
      >
      </button>
    ) : (
      // Consumer account: Show "Write Review" button
      <button
        className={`w-10 h-10 bg-navbar-bg rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md active:translate-y-[1px] transform-gpu touch-manipulation select-none ${hasReviewed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-navbar-bg/90 hover:scale-110 active:scale-95'}`}
        onClick={onWriteReview}
        disabled={hasReviewed}
        aria-label={hasReviewed ? `You have already reviewed ${businessName}` : `Write a review for ${businessName}`}
        title={hasReviewed ? 'Already reviewed' : 'Write a review'}
      >
        <Edit className={`w-4 h-4 ${hasReviewed ? 'text-white/50' : 'text-white'}`} strokeWidth={2.5} />
      </button>
    )}
    <button
      className="w-10 h-10 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 active:scale-95 active:translate-y-[1px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md transform-gpu touch-manipulation select-none"
      onClick={onBookmark}
      aria-label={isItemSaved ? `Remove from saved ${businessName}` : `Save ${businessName}`}
      title={isItemSaved ? 'Remove from saved' : 'Save'}
    >
      <Bookmark className={`w-4 h-4 ${isItemSaved ? 'text-white fill-white' : 'text-white'}`} strokeWidth={2.5} />
    </button>
    <button
      className="w-10 h-10 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 active:scale-95 active:translate-y-[1px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md transform-gpu touch-manipulation select-none"
      onClick={onShare}
      aria-label={`Share ${businessName}`}
      title="Share"
    >
      <Share2 className="w-4 h-4 text-white" strokeWidth={2.5} />
    </button>
  </div>
);

export default BusinessCardActions;
