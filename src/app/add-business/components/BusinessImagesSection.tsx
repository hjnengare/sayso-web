"use client";

import React from "react";
import Image from "next/image";
import { ImageIcon, Upload, X, Loader2 } from "lucide-react";

interface BusinessImagesSectionProps {
    imagePreviews: string[];
    uploadingImages: boolean;
    onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: (index: number) => void;
}

const ICON_CHIP_CLASS =
    "grid h-10 w-10 place-items-center rounded-full bg-off-white/70 text-charcoal/85 transition-colors duration-200 hover:bg-off-white/90";

const BusinessImagesSection: React.FC<BusinessImagesSectionProps> = ({
    imagePreviews,
    uploadingImages,
    onImageUpload,
    onRemoveImage,
}) => {
    return (
        <div className="relative bg-white rounded-[12px] overflow-hidden border border-charcoal/10 shadow-md px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
            <div className="relative z-10">
                <h3 className="font-urbanist text-base font-semibold text-charcoal mb-6 flex items-center gap-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                    <span className={ICON_CHIP_CLASS}>
                        <ImageIcon className="w-5 h-5" />
                    </span>
                    Business Photos (Optional)
                </h3>

                <div className="space-y-4">
                    {/* Image Grid */}
                    {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative group aspect-square rounded-[16px] overflow-hidden bg-white/60 border border-charcoal/10">
                                    <Image
                                        src={preview}
                                        alt={`Business photo ${index + 1}`}
                                        width={200}
                                        height={200}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onRemoveImage(index)}
                                        className="absolute top-2 right-2 w-7 h-7 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 border border-white/30 shadow-lg"
                                        aria-label="Remove image"
                                    >
                                        <X className="w-4 h-4" strokeWidth={2.5} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload Button */}
                    <label className="block">
                        <div className="w-full min-h-[120px] border-2 border-dashed border-charcoal/20 rounded-[16px] flex flex-col items-center justify-center gap-3 p-6 cursor-pointer hover:border-charcoal/30 hover:bg-off-white/70 transition-all duration-200">
                            <Upload className="w-8 h-8 text-charcoal/60" />
                            <div className="text-center">
                                <span className="text-sm font-semibold text-charcoal block mb-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                    {imagePreviews.length === 0 ? 'Add Photos' : 'Add More Photos'}
                                </span>
                                <span className="text-xs text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                    {imagePreviews.length}/10 images  Max 5MB each
                                </span>
                            </div>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={onImageUpload}
                            className="hidden"
                            disabled={uploadingImages || imagePreviews.length >= 10}
                        />
                    </label>

                    {uploadingImages && (
                        <div className="flex items-center justify-center gap-2 py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-charcoal/60" />
                            <span className="text-sm text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Uploading images...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BusinessImagesSection;
