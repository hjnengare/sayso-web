"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { Business } from "../../components/BusinessCard/BusinessCard";
import {
  getCategoryLabelFromBusiness,
  getCategorySlugFromBusiness,
  getSubcategoryPlaceholderFromCandidates,
  isPlaceholderImage,
} from "../../utils/subcategoryPlaceholders";

const FONT_STACK = "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

function getDisplayImage(business: Business): { src: string; isPlaceholder: boolean } {
  const raw = business as any;
  
  // Priority 1: Check business_images array with is_primary flag (most explicit)
  if (raw.business_images && Array.isArray(raw.business_images) && raw.business_images.length > 0) {
    // First try to find image explicitly marked as primary
    const primaryImage = raw.business_images.find((img: any) => img?.is_primary === true);
    const imageUrl = primaryImage?.url || raw.business_images[0]?.url;
    
    if (imageUrl && typeof imageUrl === "string" && !isPlaceholderImage(imageUrl)) {
      return { src: imageUrl, isPlaceholder: false };
    }
  }
  
  // Priority 2: Check uploaded_images array (backward compatibility, pre-sorted by is_primary DESC)
  if (raw.uploaded_images?.[0] && typeof raw.uploaded_images[0] === "string" && !isPlaceholderImage(raw.uploaded_images[0])) {
    return { src: raw.uploaded_images[0], isPlaceholder: false };
  }
  
  // Priority 3: Check image_url
  if (business.image_url && !isPlaceholderImage(business.image_url)) {
    return { src: business.image_url, isPlaceholder: false };
  }
  
  // Priority 4: Check legacy image field
  if (business.image && !isPlaceholderImage(business.image)) {
    return { src: business.image, isPlaceholder: false };
  }
  
  // Priority 5: Canonical subcategory placeholder
  const slug = getCategorySlugFromBusiness(business);
  const placeholder = getSubcategoryPlaceholderFromCandidates([
    raw.sub_interest_id,
    business.subInterestId,
    raw.sub_interest_slug,
    raw.interest_id,
    business.interestId,
    business.category,
  ]);
  return { src: placeholder, isPlaceholder: true };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusLabel(business: Business): { label: string; className: string } {
  const raw = business as any;
  if (raw.status === "pending_approval") {
    return { label: "Pending Approval", className: "bg-amber-100 text-amber-800 border-amber-200" };
  }
  const hasRating =
    (business.rating != null && business.rating > 0) ||
    (business.totalRating != null && business.totalRating > 0) ||
    (business.reviews != null && business.reviews > 0);
  if (!hasRating) {
    return { label: "New", className: "bg-card-bg/15 text-sage border-sage/30" };
  }
  return { label: "Active", className: "bg-charcoal/5 text-charcoal/80 border-charcoal/10" };
}

interface MyBusinessesTableProps {
  businesses: Business[];
}

export default function MyBusinessesTable({ businesses }: MyBusinessesTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-[12px] border border-charcoal/10 bg-white shadow-sm overflow-hidden">
      {/* Desktop: table header */}
      <div
        className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-3 bg-charcoal/5 border-b border-charcoal/10 text-left text-caption font-semibold text-charcoal/70"
        style={{ fontFamily: FONT_STACK }}
      >
        <div className="md:col-span-4">Business</div>
        <div className="md:col-span-2">Category</div>
        <div className="md:col-span-2">Status</div>
        <div className="md:col-span-2">Updated</div>
        <div className="md:col-span-2 text-right">Actions</div>
      </div>

      <div className="divide-y divide-charcoal/10">
        {businesses.map((business) => {
          const profileRoute = `/my-businesses/businesses/${business.slug || business.id}`;
          const { src: imageSrc, isPlaceholder } = getDisplayImage(business);
          const categoryLabel = getCategoryLabelFromBusiness(business);
          const statusInfo = getStatusLabel(business);
          const raw = business as any;
          const updatedAt = formatDate(raw.updated_at ?? raw.created_at);

          const handleRowClick = () => router.push(profileRoute);

          return (
            <div
              key={business.id}
              role="button"
              tabIndex={0}
              onClick={handleRowClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleRowClick();
                }
              }}
              className="md:grid md:grid-cols-12 md:gap-3 md:items-center md:px-4 md:py-2.5 md:min-h-[64px] cursor-pointer transition-colors md:hover:bg-off-white/40 border-b border-charcoal/10 last:border-b-0"
              style={{ fontFamily: FONT_STACK }}
              aria-label={`View ${business.name} details`}
            >
              {/* Business: thumb + name */}
              <div className="flex items-center gap-3 p-4 md:p-0 md:col-span-4 min-w-0">
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-lg overflow-hidden bg-charcoal/5">
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized={isPlaceholder}
                  />
                  {raw.status === "pending_approval" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-charcoal/40 rounded-lg">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wide">Pending</span>
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-charcoal truncate" style={{ fontFamily: FONT_STACK }}>
                    {business.name}
                  </p>
                  {/* Mobile: category + status on same block */}
                  <div className="flex flex-wrap items-center gap-2 mt-1 md:hidden">
                    <span className="text-body-sm text-charcoal/60" style={{ fontFamily: FONT_STACK }}>
                      {categoryLabel}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusInfo.className}`}
                      style={{ fontFamily: FONT_STACK }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category (desktop only) */}
              <div className="hidden md:flex md:col-span-2 text-body-sm text-charcoal/80 truncate">
                {categoryLabel}
              </div>

              {/* Status (desktop only) */}
              <div className="hidden md:flex md:col-span-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusInfo.className}`}
                  style={{ fontFamily: FONT_STACK }}
                >
                  {statusInfo.label}
                </span>
              </div>

              {/* Updated (desktop only) */}
              <div className="hidden md:flex md:col-span-2 text-body-sm text-charcoal/60">
                {updatedAt}
              </div>

              {/* Actions */}
              <div
                className="flex items-center justify-end gap-2 p-4 pt-0 md:py-0 md:px-0 md:col-span-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  href={profileRoute}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-body-sm font-semibold bg-card-bg text-white hover:bg-card-bg/90 transition-colors focus:outline-none focus:ring-2 focus:ring-sage/40"
                  style={{ fontFamily: FONT_STACK }}
                >
                  View
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
