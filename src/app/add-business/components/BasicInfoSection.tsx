"use client";

import React, { useMemo } from "react";
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
import CustomDropdown from "./CustomDropdown";

interface BasicInfoSectionProps {
    formData: BusinessFormData;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    subcategories: Subcategory[];
    loadingCategories: boolean;
    onInputChange: (field: string, value: string | boolean) => void;
    onBlur: (field: string) => void;
}

const INTEREST_LABELS: Record<string, string> = {
    "food-drink": "Food & Drink",
    "beauty-wellness": "Beauty & Wellness",
    "professional-services": "Professional Services",
    travel: "Travel",
    "outdoors-adventure": "Outdoors & Adventure",
    "experiences-entertainment": "Entertainment & Experiences",
    "arts-culture": "Arts & Culture",
    "family-pets": "Family & Pets",
    "shopping-lifestyle": "Shopping & Lifestyle",
    miscellaneous: "Miscellaneous",
};

const toTitleCase = (value: string) =>
    value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
    formData,
    errors,
    touched,
    subcategories,
    loadingCategories,
    onInputChange,
    onBlur,
}) => {
    const mainCategoryOptions = useMemo(() => {
        const ids = Array.from(
            new Set(
                subcategories
                    .map((subcategory) => (subcategory.interest_id || "").toLowerCase())
                    .filter((id) => id && id !== "miscellaneous")
            )
        );

        const baseOptions = ids
            .map((id) => ({
                value: id,
                label: INTEREST_LABELS[id] || toTitleCase(id),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return [...baseOptions, { value: "miscellaneous", label: "Other" }];
    }, [subcategories]);

    const subcategoryOptions = useMemo(() => {
        const selectedMain = formData.mainCategory;
        if (!selectedMain) return [];

        const isMiscMain = selectedMain === "miscellaneous";
        const filtered = subcategories.filter((subcategory) => {
            if (isMiscMain) {
                return (
                    subcategory.interest_id.toLowerCase() === "miscellaneous" ||
                    subcategory.id.toLowerCase() === "miscellaneous"
                );
            }
            return subcategory.interest_id.toLowerCase() === selectedMain;
        });

        const dedupedMap = new Map<string, { value: string; label: string }>();
        filtered.forEach((subcategory) => {
            const optionValue = subcategory.id.toLowerCase();
            if (!dedupedMap.has(optionValue)) {
                dedupedMap.set(optionValue, {
                    value: optionValue,
                    label: subcategory.label,
                });
            }
        });

        if (isMiscMain && !dedupedMap.has("miscellaneous")) {
            dedupedMap.set("miscellaneous", {
                value: "miscellaneous",
                label: "Miscellaneous",
            });
        }

        const baseOptions = Array.from(dedupedMap.values()).sort((a, b) => a.label.localeCompare(b.label));
        return [...baseOptions, { value: "other", label: "Other" }];
    }, [formData.mainCategory, subcategories]);

    const selectedMainCategoryLabel =
        mainCategoryOptions.find((option) => option.value === formData.mainCategory)?.label || "";
    const selectedSubcategoryLabel =
        subcategoryOptions.find((option) => option.value === formData.category)?.label || "";

    return (
        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden border border-white/60 backdrop-blur-xl shadow-md px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-100">
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

                    {/* Main Category */}
                    <div>
                        <label className="block text-sm font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                            Main Category <span className="text-coral">*</span>
                        </label>
                        {loadingCategories ? (
                            <div className="w-full bg-white/95 backdrop-blur-sm border border-white/60 pl-4 pr-4 py-3 sm:py-4 md:py-5 rounded-full flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-charcoal/60" />
                                <span className="text-body text-charcoal/60 font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Loading categories...</span>
                            </div>
                        ) : (
                            <>
                                <CustomDropdown
                                    id="mainCategory"
                                    name="mainCategory"
                                    value={formData.mainCategory}
                                    onChange={(value) => onInputChange('mainCategory', value)}
                                    onBlur={() => onBlur('mainCategory')}
                                    placeholder="Select a main category"
                                    options={mainCategoryOptions}
                                    searchable
                                    searchPlaceholder="Search main categories..."
                                    noOptionsText="No categories found"
                                />
                                {selectedMainCategoryLabel && (
                                    <p className="mt-2 text-xs text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                        Selected: {selectedMainCategoryLabel}
                                    </p>
                                )}
                                {formData.mainCategory === 'miscellaneous' && (
                                    <p className="mt-2 text-xs text-charcoal/80" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                        We&apos;ll list this under Miscellaneous.
                                    </p>
                                )}
                                {touched.mainCategory && errors.mainCategory && (
                                    <p id="mainCategory-error" className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                        {errors.mainCategory}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Subcategory */}
                    <div>
                        <label className="block text-sm font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                            Subcategory <span className="text-coral">*</span>
                        </label>
                        <CustomDropdown
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={(value) => onInputChange('category', value)}
                            onBlur={() => onBlur('category')}
                            placeholder={formData.mainCategory ? 'Select a subcategory' : 'Select main category first'}
                            options={subcategoryOptions}
                            disabled={!formData.mainCategory || loadingCategories}
                            searchable
                            searchPlaceholder="Search subcategories..."
                            noOptionsText={formData.mainCategory ? 'No subcategories available' : 'Select a main category first'}
                        />
                        {!formData.mainCategory && (
                            <p className="mt-2 text-xs text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                Choose a main category before selecting a subcategory.
                            </p>
                        )}
                        {selectedSubcategoryLabel && (
                            <p className="mt-2 text-xs text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                Selected: {selectedSubcategoryLabel}
                            </p>
                        )}
                        {formData.category === 'other' && formData.mainCategory && (
                            <p className="mt-2 text-xs text-charcoal/80" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                We&apos;ll keep this business discoverable under the selected main category.
                            </p>
                        )}
                        {touched.category && errors.category && (
                            <p id="category-error" className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                {errors.category}
                            </p>
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
                                        className={`flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 transition-all duration-200 ${
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
                                        className={`flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 transition-all duration-200 ${
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
                                        className={`flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 transition-all duration-200 ${
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
                                    <label className="flex items-center gap-3 p-3 rounded-[12px] bg-white/60 border border-charcoal/10 cursor-pointer hover:bg-white/80 transition-all duration-200">
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
                            className="w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-[12px] resize-none border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg"
                            placeholder="Describe your business..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicInfoSection;
