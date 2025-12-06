"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Image as ImageIcon, X, Upload, ChevronLeft, ChevronRight, Maximize2 } from "react-feather";
import Image from "next/image";

interface ImageUploadProps {
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export default function ImageUpload({
  onImagesChange,
  maxImages = 5,
  disabled = false,
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      Array.from(selectedFiles).forEach((file) => {
        if (files.length + newFiles.length >= maxImages) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
          alert(`${file.name} is not an image file`);
          return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum size is 5MB`);
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
    [files, previews, maxImages, onImagesChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index);
      const updatedPreviews = previews.filter((_, i) => i !== index);
      
      // Revoke object URL to free memory
      URL.revokeObjectURL(previews[index]);
      
      setFiles(updatedFiles);
      setPreviews(updatedPreviews);
      onImagesChange(updatedFiles);
    },
    [files, previews, onImagesChange]
  );

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && files.length < maxImages) {
      setIsDragging(true);
    }
  }, [disabled, files.length, maxImages]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled || files.length >= maxImages) return;
    
    handleFileSelect(e.dataTransfer.files);
  }, [disabled, files.length, maxImages, handleFileSelect]);

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
    if (previewIndex !== null && previewIndex < previews.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  }, [previewIndex, previews.length]);

  // Handle keyboard navigation in preview
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (previewIndex === null) return;
    
    if (e.key === 'Escape') {
      handleClosePreview();
    } else if (e.key === 'ArrowLeft' && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    } else if (e.key === 'ArrowRight' && previewIndex < previews.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  }, [previewIndex, previews.length, handleClosePreview]);

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

      {/* Image Previews Grid */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[12px] overflow-hidden border-2 border-white/60 bg-off-white/50 group shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={(e) => handlePreviewClick(index, e)}
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
                    handleRemove(index);
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
      {previewIndex !== null && previews[previewIndex] && (
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
          {previewIndex < previews.length - 1 && (
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
                src={previews[previewIndex]}
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
              {previewIndex + 1} / {previews.length}
            </p>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {!disabled && files.length < maxImages && (
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative w-full min-h-[160px] rounded-[12px] border-2 border-dashed 
            transition-all duration-300 cursor-pointer
            ${isDragging 
              ? 'border-sage bg-sage/10 scale-[1.02] shadow-lg' 
              : 'border-charcoal/20 hover:border-sage/50 bg-gradient-to-br from-off-white/40 to-off-white/20 hover:from-sage/5 hover:to-sage/10'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden rounded-[12px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-2xl opacity-50" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-xl opacity-50" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[160px] px-4 py-6">
            <div className={`
              w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4
              transition-all duration-300
              ${isDragging 
                ? 'bg-sage/20 scale-110' 
                : 'bg-gradient-to-br from-sage/10 to-coral/10 group-hover:from-sage/20 group-hover:to-coral/20'
              }
            `}>
              {isDragging ? (
                <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-sage animate-bounce" strokeWidth={2} />
              ) : (
                <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-charcoal/60 group-hover:text-sage transition-colors duration-300" strokeWidth={2} />
              )}
            </div>
            
            <p className="text-sm sm:text-base font-semibold text-charcoal mb-1 text-center" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {isDragging ? 'Drop images here' : 'Click or drag images here'}
            </p>
            
            <p className="text-xs text-charcoal/60 text-center mb-3" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {files.length > 0 
                ? `${files.length} of ${maxImages} images selected` 
                : `Add up to ${maxImages} images (JPEG, PNG, WebP)`
              }
            </p>
            
            <p className="text-xs text-charcoal/40 text-center" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              Max 5MB per image
            </p>
          </div>
        </div>
      )}

      {/* Disabled state message */}
      {disabled && files.length >= maxImages && (
        <div className="w-full min-h-[120px] rounded-[12px] border-2 border-dashed border-charcoal/10 bg-off-white/20 flex items-center justify-center">
          <p className="text-sm text-charcoal/50 text-center" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
            Maximum {maxImages} images reached
          </p>
        </div>
      )}
    </div>
  );
}

