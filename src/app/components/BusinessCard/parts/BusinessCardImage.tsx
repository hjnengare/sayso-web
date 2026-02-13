import React from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
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
  sharedLayoutId?: string;
}

const BusinessCardImage: React.FC<BusinessCardImageProps> = ({
  displayImage,
  displayAlt,
  usingFallback,
  imgError,
  onImageError,
  categoryKey,
  priority = false,
  sharedLayoutId,
}) => {
  return (
    <motion.div layoutId={sharedLayoutId} className="relative w-full h-full">
      {!imgError && displayImage ? (
        <div className="relative w-full h-full overflow-hidden">
          <Image
            src={usingFallback ? getCategoryPlaceholder(categoryKey) : displayImage}
            alt={displayAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 340px, 340px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] group-active:scale-[0.98] motion-reduce:transition-none"
            quality={priority ? 85 : 75}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            onError={onImageError}
            style={{ aspectRatio: '4/3' }}
          />
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500 ease-out group-hover:opacity-0 motion-reduce:transition-none"
            style={{ background: "hsla(0, 0%, 0%, 0.2)" }}
            aria-hidden="true"
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
    </motion.div>
  );
};

export default BusinessCardImage;
