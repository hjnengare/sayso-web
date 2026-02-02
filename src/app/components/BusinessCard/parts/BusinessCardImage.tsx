import React from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { getCategoryPlaceholder } from "../../../utils/categoryToPngMapping";

interface BusinessCardImageProps {
  displayImage: string;
  isImagePng?: boolean;
  displayAlt: string;
  usingFallback: boolean;
  imgError: boolean;
  onImageError: () => void;
  categoryKey: string;
  businessName: string;
  verified?: boolean;
  /** Set to true for above-fold images (first ~3 cards) to improve LCP */
  priority?: boolean;
}

const BusinessCardImage: React.FC<BusinessCardImageProps> = ({
  displayImage,
  displayAlt,
  usingFallback,
  imgError,
  onImageError,
  categoryKey,
  priority = false,
}) => {
  return (
    <div className="relative w-full h-full">
      {!imgError && displayImage ? (
        <div className="relative w-full h-full overflow-hidden">
          <Image
            src={usingFallback ? getCategoryPlaceholder(categoryKey) : displayImage}
            alt={displayAlt}
            fill
            sizes="(max-width: 768px) 540px, 340px"
            className="object-cover"
            quality={85}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            onError={onImageError}
          />
        </div>
      ) : (
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ backgroundColor: "#E5E0E5" }}
        >
          <ImageIcon className="w-16 h-16 text-charcoal/20" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export default BusinessCardImage;
