"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface MasonryGalleryProps {
  images: string[];
  businessName: string;
}

export default function MasonryGallery({ images, businessName }: MasonryGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Pinterest-style masonry layout - different heights and spans (larger images)
  const getImageClasses = (index: number) => {
    const patterns = [
      { height: 'h-40', span: 'col-span-1' },
      { height: 'h-56', span: 'col-span-2' },
      { height: 'h-48', span: 'col-span-1' },
      { height: 'h-52', span: 'col-span-1' },
      { height: 'h-44', span: 'col-span-1' },
      { height: 'h-60', span: 'col-span-2' },
      { height: 'h-48', span: 'col-span-1' },
      { height: 'h-40', span: 'col-span-1' },
    ];
    const pattern = patterns[index % patterns.length];
    return `${pattern.height} ${pattern.span}`;
  };

  const openLightbox = (index: number) => {
    setSelectedImage(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = '';
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (selectedImage === null) return;

    if (direction === 'prev') {
      setSelectedImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1);
    } else {
      setSelectedImage(selectedImage === images.length - 1 ? 0 : selectedImage + 1);
    }
  };

  return (
    <>
      {/* Masonry Gallery - Square Container */}
      <div className="w-full aspect-square rounded-[12px] overflow-hidden bg-gradient-to-br from-white/80 to-white/50">
        <div className="w-full h-full p-3 grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-min overflow-y-auto scrollbar-hide">
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className={`${getImageClasses(index)} cursor-pointer group relative overflow-hidden rounded-[12px] shadow-sm hover:shadow-md transition-shadow duration-300`}
              onClick={() => openLightbox(index)}
            >
              <Image
                src={image}
                alt={`${businessName} photo ${index + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 768px) 33vw, 25vw"
                unoptimized
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/30 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-sm sm:text-xs font-urbanist font-600">
                  View
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-charcoal/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 bg-off-white  /10 hover:bg-off-white  /20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 z-10"
            aria-label="Close gallery"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 bg-off-white  /10 backdrop-blur-sm px-4 py-2 rounded-full z-10">
            <span className="text-white font-urbanist text-sm font-600">
              {selectedImage + 1} / {images.length}
            </span>
          </div>

          {/* Previous Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('prev');
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-off-white  /10 hover:bg-off-white  /20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Next Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('next');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-off-white  /10 hover:bg-off-white  /20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Main Image */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-4xl max-h-[80vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedImage]}
              alt={`${businessName} photo ${selectedImage + 1}`}
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
