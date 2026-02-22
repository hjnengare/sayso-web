"use client";

import Image from "next/image";
import { useState, useCallback, memo, useEffect } from "react";
import { m } from "framer-motion";
import { getResponsiveSizes, getOptimalQuality, preloadImage } from "../../lib/utils/cdnUtils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes: customSizes,
  quality: customQuality,
  placeholder = "empty",
  blurDataURL,
  fallback,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Determine optimal quality based on use case
  const quality = customQuality || getOptimalQuality(
    priority ? 'hero' : width && width < 200 ? 'thumbnail' : 'gallery'
  );

  // Generate responsive sizes if not provided
  const sizes = customSizes || getResponsiveSizes();

  // Preload priority images
  useEffect(() => {
    if (priority && src) {
      preloadImage(src);
    }
  }, [priority, src]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-card-bg/10 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
        </div>
      )}
      
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          priority={priority}
          sizes={sizes}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
        />
      </m.div>
    </div>
  );
}

export default memo(OptimizedImage);
