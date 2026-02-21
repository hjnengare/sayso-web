"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Image as ImageIcon, X, Upload, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  disabled?: boolean;
  existingImages?: string[]; // URLs of existing images
  onExistingImagesChange?: (urls: string[]) => void; // Callback when existing images are removed
}

interface ImageItem {
  type: 'file' | 'url';
  file?: File;
  url?: string;
  preview?: string;
}

export default function ImageUpload({
  onImagesChange,
  maxImages = 5,
  disabled = false,
  existingImages = [],
  onExistingImagesChange,
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(existingImages);
  const [isDragging, setIsDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Update existing images when prop changes
  useEffect(() => {
    setExistingImageUrls(existingImages);
  }, [existingImages]);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      Array.from(selectedFiles).forEach((file) => {
        if (existingImageUrls.length + files.length + newFiles.length >= maxImages) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
          alert(`${file.name} is not an image file`);
          return;
        }

        // Validate file size (2MB max per image)
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
        if (file.size > MAX_FILE_SIZE) {
          alert(`${file.name} is too large. Maximum size is 2MB per image`);
          return;
        }

        newFiles.push(file);
        const preview = URL.createObjectURL(file);
        newPreviews.push(preview);
      });

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles];
        const updatedPreviews = [...previews, ...newPreviews];
        setFiles(updatedFiles);
        setPreviews(updatedPreviews);
        onImagesChange(updatedFiles);
      }
    },
    [files, previews, maxImages, existingImageUrls, onImagesChange]
  );

  const handleRemove = useCallback(
    (index: number, isExisting: boolean = false) => {
      if (isExisting) {
        // Remove existing image URL
        const updatedUrls = existingImageUrls.filter((_, i) => i !== index);
        setExistingImageUrls(updatedUrls);
        if (onExistingImagesChange) {
          onExistingImagesChange(updatedUrls);
        }
      } else {
        // Remove new file
        const updatedFiles = files.filter((_, i) => i !== index);
        const updatedPreviews = previews.filter((_, i) => i !== index);
        
        // Revoke object URL to free memory
        URL.revokeObjectURL(previews[index]);
        
        setFiles(updatedFiles);
        setPreviews(updatedPreviews);
        onImagesChange(updatedFiles);
      }
    },
    [files, previews, existingImageUrls, onImagesChange, onExistingImagesChange]
  );

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && (existingImageUrls.length + files.length) < maxImages) {
      setIsDragging(true);
    }
  }, [disabled, existingImageUrls.length, files.length, maxImages]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled || (existingImageUrls.length + files.length) >= maxImages) return;
    
    handleFileSelect(e.dataTransfer.files);
  }, [disabled, existingImageUrls.length, files.length, maxImages, handleFileSelect]);

  const handlePreviewClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewIndex(index);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewIndex(null);
  }, []);

  const handlePrevPreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewIndex !== null && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  }, [previewIndex]);

  const handleNextPreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const totalImages = existingImageUrls.length + previews.length;
    if (previewIndex !== null && previewIndex < totalImages - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  }, [previewIndex, existingImageUrls.length, previews.length]);

  // Handle keyboard navigation in preview
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (previewIndex === null) return;
    
    if (e.key === 'Escape') {
      handleClosePreview();
    } else if (e.key === 'ArrowLeft' && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    } else if (e.key === 'ArrowRight') {
      const totalImages = existingImageUrls.length + previews.length;
      if (previewIndex < totalImages - 1) {
        setPreviewIndex(previewIndex + 1);
      }
    }
  }, [previewIndex, existingImageUrls.length, previews.length, handleClosePreview]);

  // Add keyboard event listener
  useEffect(() => {
    if (previewIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [previewIndex, handleKeyDown]);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Image Previews Grid - Existing Images */}
      {existingImageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {existingImageUrls.map((url, index) => (
            <div
              key={`existing-${index}`}
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-charcoal/20 bg-charcoal/10 group shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={(e) => {
                // Calculate total index including existing images
                const totalIndex = index;
                handlePreviewClick(totalIndex, e);
              }}
            >
              <Image
                src={url}
                alt={`Existing image ${index + 1}`}
                fill
                className="object-cover"
                sizes="112px"
              />
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Preview icon on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                  <Maximize2 className="w-5 h-5 text-charcoal" strokeWidth={2} />
                </div>
              </div>
              
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index, true);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-coral/95 hover:bg-coral text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg border border-white/30 z-10"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Previews Grid - New Files */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {previews.map((preview, index) => (
            <div
              key={`new-${index}`}
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-charcoal/20 bg-charcoal/10 group shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={(e) => {
                // Calculate total index including existing images
                const totalIndex = existingImageUrls.length + index;
                handlePreviewClick(totalIndex, e);
              }}
            >
              <Image
                src={preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
                sizes="112px"
              />
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Preview icon on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                  <Maximize2 className="w-5 h-5 text-charcoal" strokeWidth={2} />
                </div>
              </div>
              
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index, false);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-coral/95 hover:bg-coral text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg border border-white/30 z-10"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full-size Image Preview Modal */}
      {previewIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClosePreview}
        >
          {/* Close button */}
          <button
            onClick={handleClosePreview}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 border border-white/20"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </button>

          {/* Previous button */}
          {previewIndex > 0 && (
            <button
              onClick={handlePrevPreview}
              className="absolute left-4 sm:left-6 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 border border-white/20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            </button>
          )}

          {/* Next button */}
          {previewIndex < (existingImageUrls.length + previews.length) - 1 && (
            <button
              onClick={handleNextPreview}
              className="absolute right-4 sm:right-6 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 border border-white/20"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            </button>
          )}

          {/* Image container */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-w-5xl max-h-[85vh] rounded-[12px] overflow-hidden shadow-2xl">
              <Image
                src={
                  previewIndex < existingImageUrls.length
                    ? existingImageUrls[previewIndex]
                    : previews[previewIndex - existingImageUrls.length]
                }
                alt={`Preview ${previewIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </div>
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
            <p className="text-sm text-white font-medium" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {previewIndex + 1} / {existingImageUrls.length + previews.length}
            </p>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {!disabled && (existingImageUrls.length + files.length) < maxImages && (
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative w-full min-h-[120px] rounded-[12px] border-2 border-dashed
            transition-all duration-300 cursor-pointer group
            ${isDragging
              ? 'border-coral bg-coral/10 scale-[1.01]'
              : 'border-charcoal/20 hover:border-charcoal/40 bg-charcoal/5 hover:bg-charcoal/10'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[120px] px-4 py-5">
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-3
              transition-all duration-300
              ${isDragging
                ? 'bg-coral/20 scale-110'
                : 'bg-charcoal/10 group-hover:bg-charcoal/20'
              }
            `}>
              {isDragging ? (
                <Upload className="w-6 h-6 text-coral animate-bounce" strokeWidth={2} />
              ) : (
                <ImageIcon className="w-6 h-6 text-charcoal/60 group-hover:text-charcoal/80 transition-colors duration-300" strokeWidth={2} />
              )}
            </div>

            <p className="text-base font-semibold text-charcoal/70 mb-1 text-center" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {isDragging ? 'Drop images here' : 'Tap to add photos'}
            </p>

            <p className="text-sm text-charcoal/60 text-center" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {(existingImageUrls.length + files.length) > 0
                ? `${existingImageUrls.length + files.length}/${maxImages} added`
                : maxImages === 2
                  ? 'Up to 2 images only, max 2MB each'
                  : `Up to ${maxImages} images, max 2MB each`
              }
            </p>
          </div>
        </div>
      )}

      {/* Disabled state message */}
      {disabled && (existingImageUrls.length + files.length) >= maxImages && (
        <div className="w-full min-h-[120px] rounded-[12px] border-2 border-dashed border-charcoal/10 bg-off-white/20 flex items-center justify-center">
          <p className="text-sm text-charcoal/70 text-center" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
            Maximum {maxImages} images reached
          </p>
        </div>
      )}
    </div>
  );
}

