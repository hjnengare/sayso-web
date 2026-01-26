"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
    Store,
    Loader2,
    Building2,
    Truck,
    Monitor,
    Link as LinkIcon,
} from "lucide-react";
import { Subcategory, BusinessFormData } from "./types";

interface BasicInfoSectionProps {
    formData: BusinessFormData;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    subcategories: Subcategory[];
    loadingCategories: boolean;
    onInputChange: (field: string, value: string | boolean) => void;
    onBlur: (field: string) => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
    formData,
    errors,
    touched,
    subcategories,
    loadingCategories,
    onInputChange,
    onBlur,
}) => {
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isCategoryModalClosing, setIsCategoryModalClosing] = useState(false);
    const [categoryModalPos, setCategoryModalPos] = useState<{left: number; top: number} | null>(null);
    const categoryButtonRef = useRef<HTMLButtonElement>(null);
    const categoryModalRef = useRef<HTMLDivElement>(null);

    const openCategoryModal = useCallback(() => {
        setIsCategoryModalClosing(false);
        setIsCategoryModalOpen(true);
    }, []);

    const closeCategoryModal = useCallback(() => {
        setIsCategoryModalClosing(true);
        setTimeout(() => {
            setIsCategoryModalOpen(false);
            setIsCategoryModalClosing(false);
        }, 150);
    }, []);

    // Position category modal
    useEffect(() => {
        if (isCategoryModalOpen && categoryButtonRef.current) {
            const buttonRect = categoryButtonRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const dropdownWidth = 320;
            const padding = 16;

            let leftPos = buttonRect.left;
            const maxLeft = viewportWidth - dropdownWidth - padding;
            leftPos = Math.max(padding, Math.min(leftPos, maxLeft));

            const gap = 8;
            setCategoryModalPos({ left: leftPos, top: buttonRect.bottom + gap });
        } else {
            setCategoryModalPos(null);
        }
    }, [isCategoryModalOpen]);

    // Close category modal when clicking outside
    useEffect(() => {
        if (!isCategoryModalOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideButton = categoryButtonRef.current?.contains(target);
            const clickedInsideModal = categoryModalRef.current?.contains(target);

            if (!clickedInsideButton && !clickedInsideModal) {
                closeCategoryModal();
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCategoryModalOpen, closeCategoryModal]);

    // Lock body scroll when category modal is open
    useEffect(() => {
        if (!isCategoryModalOpen) return;

        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [isCategoryModalOpen]);

    return (
        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/60 backdrop-blur-xl shadow-md px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
            <div className="relative z-10">
                <h3 className="font-urbanist text-base font-semibold text-charcoal mb-6 flex items-center gap-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-navbar-bg/20 to-navbar-bg/10">
                        <Store className="w-5 h-5 text-navbar-bg" />
                    </span>
                    Basic Information
                </h3>

                <div className="space-y-6">
                    {/* Business Name */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                            Business Name <span className="text-coral">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={(e) => onInputChange('name', e.target.value)}
                            onBlur={() => onBlur('name')}
                            aria-invalid={touched.name && errors.name ? "true" : "false"}
                            aria-describedby={touched.name && errors.name ? "name-error" : undefined}
                            aria-required="true"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                            className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                errors.name
                                    ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                    : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                            }`}
                            placeholder="Enter business name"
                        />
                        {touched.name && errors.name && (
                            <p
                                id="name-error"
                                className="mt-2 text-sm text-navbar-bg font-medium flex items-center gap-1.5"
                                role="alert"
                                aria-live="polite"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', color: 'white' }}
                            >
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                            Category <span className="text-coral">*</span>
                        </label>
                        {loadingCategories ? (
                            <div className="w-full bg-white/95 backdrop-blur-sm border border-white/60 pl-4 pr-4 py-3 sm:py-4 md:py-5 rounded-full flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-charcoal/60" />
                                <span className="text-body text-charcoal/60 font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Loading categories...</span>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    ref={categoryButtonRef}
                                    onClick={() => {
                                        if (isCategoryModalOpen) {
                                            closeCategoryModal();
                                        } else {
                                            openCategoryModal();
                                        }
                                    }}
                                    onBlur={() => onBlur('category')}
                                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                    className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full flex items-center justify-between ${
                                        errors.category
                                            ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                            : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                    }`}
                                >
                                    <span className={formData.category ? 'text-charcoal' : 'text-charcoal/70'}>
                                        {formData.category || 'Select a category'}
                                    </span>
                                    <ChevronDown size={20} className={`text-charcoal/60 transition-transform duration-300 ${isCategoryModalOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {touched.category && errors.category && (
                                    <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{errors.category}</p>
                                )}
                                {/* Category Modal */}
                                {isCategoryModalOpen && categoryModalPos && typeof window !== 'undefined' && createPortal(
                                    <div
                                        ref={categoryModalRef}
                                        className={`fixed z-[1000] bg-off-white rounded-[20px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[320px] max-w-[400px] max-h-[60vh] overflow-y-auto transition-all duration-300 ease-out backdrop-blur-xl ${
                                            isCategoryModalClosing ? 'opacity-0 scale-95 translate-y-[-8px]' : 'opacity-100 scale-100 translate-y-0'
                                        }`}
                                        style={{
                                            left: categoryModalPos.left,
                                            top: categoryModalPos.top,
                                            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                            animation: isCategoryModalClosing ? 'none' : 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                                            transformOrigin: 'top center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="px-5 pt-4 pb-3 border-b border-charcoal/10 bg-off-white flex items-center gap-2 sticky top-0 z-10">
                                            <h3 className="text-sm md:text-base font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Select Category</h3>
                                        </div>
                                        <div className="py-3">
                                            {subcategories.map((subcategory) => {
                                                const isSelected = formData.category === subcategory.label;
                                                return (
                                                    <button
                                                        key={subcategory.id}
                                                        type="button"
                                                        onClick={() => {
                                                            onInputChange('category', subcategory.label);
                                                            closeCategoryModal();
                                                        }}
                                                        className={`group flex items-start gap-3 px-5 py-3 hover:bg-gradient-to-r hover:from-sage/10 hover:to-coral/5 transition-all duration-200 rounded-lg mx-2 w-[calc(100%-1rem)] text-left ${
                                                            isSelected ? 'bg-gradient-to-r from-sage/10 to-sage/5' : ''
                                                        }`}
                                                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                                    >
                                                        <div className="flex-1">
                                                            <div className={`text-sm font-semibold ${isSelected ? 'text-sage' : 'text-charcoal group-hover:text-coral'}`}>
                                                                {subcategory.label}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </>
                        )}
                    </div>

                    {/* Business Type & Intent - Shows after category is selected */}
                    {formData.category && (
                        <div className="space-y-4 pt-4 border-t border-charcoal/10">
                            <div>
                                <label className="block text-sm font-semibold text-charcoal mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                    What kind of business is this?
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => onInputChange('businessType', 'physical')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-[20px] border-2 transition-all duration-200 ${
                                            formData.businessType === 'physical'
                                                ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-charcoal'
                                                : 'bg-white/60 border-charcoal/10 text-charcoal/70 hover:border-charcoal/20 hover:bg-white/80'
                                        }`}
                                    >
                                        <Building2 className={`w-6 h-6 ${formData.businessType === 'physical' ? 'text-coral' : ''}`} />
                                        <span className="text-sm font-semibold text-center">Physical Location</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onInputChange('businessType', 'service-area')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-[20px] border-2 transition-all duration-200 ${
                                            formData.businessType === 'service-area'
                                                ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-charcoal'
                                                : 'bg-white/60 border-charcoal/10 text-charcoal/70 hover:border-charcoal/20 hover:bg-white/80'
                                        }`}
                                    >
                                        <Truck className={`w-6 h-6 ${formData.businessType === 'service-area' ? 'text-coral' : ''}`} />
                                        <span className="text-sm font-semibold text-center">Service-Area</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onInputChange('businessType', 'online-only')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-[20px] border-2 transition-all duration-200 ${
                                            formData.businessType === 'online-only'
                                                ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-charcoal'
                                                : 'bg-white/60 border-charcoal/10 text-charcoal/70 hover:border-charcoal/20 hover:bg-white/80'
                                        }`}
                                    >
                                        <Monitor className={`w-6 h-6 ${formData.businessType === 'online-only' ? 'text-coral' : ''}`} />
                                        <span className="text-sm font-semibold text-center">Online-Only</span>
                                    </button>
                                </div>
                            </div>

                            {formData.businessType && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <label className="flex items-center gap-3 p-3 rounded-[20px] bg-white/60 border border-charcoal/10 cursor-pointer hover:bg-white/80 transition-all duration-200">
                                        <input
                                            type="checkbox"
                                            checked={formData.isChain}
                                            onChange={(e) => onInputChange('isChain', e.target.checked)}
                                            className="w-5 h-5 rounded border-charcoal/20 bg-white text-coral focus:ring-coral/30 focus:ring-offset-0"
                                        />
                                        <LinkIcon className="w-5 h-5 text-charcoal/60" />
                                        <span className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            Part of a chain
                                        </span>
                                    </label>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => onInputChange('description', e.target.value)}
                            rows={4}
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                            className="w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-[20px] resize-none border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg"
                            placeholder="Describe your business..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicInfoSection;
