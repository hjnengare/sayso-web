"use client";

import Image from "next/image";
import { Star, Heart, MapPin, Calendar, User, MessageSquare } from "lucide-react";

interface SmallReview {
  id: string;
  user: { name: string; avatar?: string; location?: string };
  business: string;
  rating: number;
  text: string;
  date: string;
  likes: number;
  image?: string;
}

interface ReviewSidebarProps {
  otherReviews: SmallReview[];
  businessInfo?: {
    name: string;
    phone?: string;
    website?: string;
    address?: string;
    email?: string;
    category?: string;
    location?: string;
  };
  businessRating?: number;
}

const frostyPanel = `
  relative overflow-hidden rounded-[20px]
  bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md
  border border-white/50 ring-1 ring-white/20
  shadow-lg shadow-sage/20
`.replace(/\s+/g, " ");

export default function ReviewSidebar({ otherReviews, businessInfo, businessRating }: ReviewSidebarProps) {
  return (
    <>
      {/* Desktop: Aligned with form */}
      <div className={`hidden lg:block`}>
        <div className={frostyPanel}>
          <div className="relative z-[1]">
            <h3 className="text-sm font-bold text-charcoal font-urbanist px-3 pt-4 pb-3 border-b border-white/30" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
              What others are saying
            </h3>
            {businessInfo && (
              <div className="px-3 py-3 border-b border-white/30">
                <div className="flex items-center justify-center space-x-2">
                  <div className="flex items-center space-x-1 bg-gradient-to-br from-amber-400 to-amber-600 px-3 py-1.5 rounded-full">
                    <Star size={16} className="text-white" style={{ fill: "currentColor" }} />
                    <span className="text-sm font-600 text-white">
                      {businessRating?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="px-3 py-4 space-y-2 xl:space-y-3 max-h-[600px] overflow-y-auto custom-scroll">
              {otherReviews.length === 0 ? (
                <div className="rounded-[20px] border border-sage/10 bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-md px-4 py-8 relative overflow-hidden border border-white/30">
                  {/* subtle glows */}
                  <span className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-sage/10 blur-lg" />
                  <span className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-coral/10 blur-lg" />
                  
                  <div className="flex flex-col items-center justify-center text-center relative z-10 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-sage/60" />
                    </div>
                    <div>
                      <p className="text-sm font-600 text-charcoal/80 font-urbanist mb-1">
                        No reviews yet
                      </p>
                      <p className="text-sm sm:text-xs text-charcoal/60 font-urbanist leading-relaxed">
                        Other community reviews will appear here once they're submitted
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                otherReviews.map((r) => (
                <div key={r.id} className="rounded-[20px] border border-sage/10 bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-md px-3 py-6 relative overflow-hidden border border-white/30">
                  {/* subtle glows */}
                  <span className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-sage/10 blur-lg" />
                  <span className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-coral/10 blur-lg" />
                  <div className="flex gap-3 relative z-10">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-sage/10">
                      {r.user.avatar ? (
                        <Image
                          src={r.user.avatar}
                          alt={`${r.user.name} avatar`}
                          fill
                          className="object-cover"
                          sizes="40px"
                          quality={85}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sage">
                          <User className="w-5 h-5 text-sage/70" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-charcoal font-urbanist truncate" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{r.user.name}</p>
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-coral" style={{ fill: "currentColor" }} />
                          <span className="text-[20px] text-charcoal/60 font-urbanist" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{r.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[20px] text-charcoal/60 mb-1 font-urbanist" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
                        {r.user.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {r.user.location}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {r.date}
                        </span>
                      </div>
                      <p className="text-sm sm:text-[0.92rem] text-charcoal/90 leading-relaxed mb-2 font-urbanist" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{r.text}</p>
                      {r.image && (
                        <div className="relative mt-2 w-full h-20 rounded-md overflow-hidden">
                          <Image
                            src={r.image}
                            alt={`${r.business} photo`}
                            fill
                            className="object-cover"
                            sizes="320px"
                            quality={85}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-charcoal/60 mt-2">
                        <Heart size={12} />
                        <span className="text-[10px] font-urbanist" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{r.likes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet horizontal list */}
      <div className="lg:hidden mt-4 sm:mt-6">
        <h3 className="text-sm font-bold text-charcoal font-urbanist px-4 pt-4 pb-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>What others are saying</h3>
        <div className="mt-2 sm:mt-3 overflow-x-auto hide-scrollbar">
          {otherReviews.length === 0 ? (
            <div className="mx-4 rounded-[20px] border border-sage/10 bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-md px-4 py-8 relative overflow-hidden">
              {/* subtle glows */}
              <span className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-sage/10 blur-lg" />
              <span className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-coral/10 blur-lg" />
              
              <div className="flex flex-col items-center justify-center text-center relative z-10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-sage/60" />
                </div>
                <div>
                  <p className="text-sm font-600 text-charcoal/80 font-urbanist mb-1">
                    No reviews yet
                  </p>
                  <p className="text-sm sm:text-xs text-charcoal/60 font-urbanist leading-relaxed">
                    Other community reviews will appear here once they're submitted
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ul className="flex gap-2 sm:gap-3 px-4 pb-4">
              {otherReviews.map((r) => (
              <li key={r.id} className="min-w-[240px] sm:min-w-[260px] max-w-[260px] sm:max-w-[280px] bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-md border border-sage/10 rounded-[20px] p-3 sm:p-4 relative overflow-hidden">
                {/* subtle glows */}
                <span className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-sage/10 blur-lg" />
                <span className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-coral/10 blur-lg" />
                <div className="flex items-center gap-2 sm:gap-3 relative z-10">
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 bg-sage/10">
                    {r.user.avatar ? (
                      <Image
                        src={r.user.avatar}
                        alt={`${r.user.name} avatar`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 32px, 40px"
                        quality={85}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sage">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-sage/70" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal font-urbanist truncate" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{r.user.name}</p>
                    <div className="flex items-center gap-1 text-[20px] text-charcoal/60 font-urbanist" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
                      <Star size={12} className="text-coral" style={{ fill: "currentColor" }} />
                      <span>{r.rating}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm sm:text-[0.92rem] text-charcoal/90 leading-relaxed mt-1 sm:mt-2 line-clamp-2 sm:line-clamp-3 font-urbanist" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{r.text}</p>

                {r.image && (
                  <div className="relative mt-2 sm:mt-3 w-full h-20 sm:h-24 rounded-md overflow-hidden">
                    <Image
                      src={r.image}
                      alt={`${r.business} photo`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 240px, 260px"
                      quality={85}
                    />
                  </div>
                )}

                <div className="flex items-center gap-1 text-charcoal/60 mt-2 sm:mt-3">
                  <Heart size={12} />
                  <span className="text-[10px] font-urbanist" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{r.likes}</span>
                </div>
              </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
