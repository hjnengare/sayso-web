import React from "react";
import Image from "next/image";
import OptimizedImage from "../../Performance/OptimizedImage";
import { getCategoryPng, isPngIcon } from "../../../utils/categoryToPngMapping";

interface BusinessCardImageProps {
  displayImage: string;
  isImagePng: boolean;
  displayAlt: string;
  usingFallback: boolean;
  imgError: boolean;
  onImageError: () => void;
  categoryKey: string;
  businessName: string;
  verified?: boolean;
}

const BusinessCardImage: React.FC<BusinessCardImageProps> = ({
  displayImage,
  isImagePng,
  displayAlt,
  usingFallback,
  imgError,
  onImageError,
  categoryKey,
  businessName,
  verified,
}) => {
  return (
    <div className="relative w-full h-full">
      {!imgError && displayImage ? (
        isImagePng || displayImage.includes("/png/") || displayImage.endsWith(".png") || usingFallback ? (
          <div className="relative w-full h-full rounded-t-[20px] flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85 shadow-sm overflow-hidden">
            <OptimizedImage
              src={usingFallback ? getCategoryPng(categoryKey) : displayImage}
              alt={displayAlt}
              width={320}
              height={350}
              sizes="(max-width: 768px) 540px, 340px"
              className="w-32 h-32 md:w-36 md:h-36 object-contain"
              priority={false}
              quality={90}
              onError={onImageError}
            />
          </div>
        ) : (
          <div className="relative w-full h-full overflow-hidden">
            <Image
              src={displayImage}
              alt={displayAlt}
              fill
              sizes="(max-width: 768px) 540px, 340px"
              className="object-cover"
              quality={90}
              onError={onImageError}
            />
          </div>
        )
      ) : (
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ backgroundColor: "#E5E0E5" }}
        >
          <div className="w-32 h-32 md:w-36 md:h-36 flex items-center justify-center">
            <OptimizedImage
              src={getCategoryPng(categoryKey)}
              alt={displayAlt}
              width={144}
              height={144}
              sizes="144px"
              className="w-full h-full object-contain opacity-60"
              priority={false}
              quality={90}
              onError={onImageError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessCardImage;
