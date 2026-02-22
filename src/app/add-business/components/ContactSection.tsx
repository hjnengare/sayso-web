"use client";

import React from "react";
import { m } from "framer-motion";
import { Phone, Coins, Sparkles, Wallet, Gem, Crown } from "lucide-react";
import { BusinessFormData } from "./types";

interface ContactSectionProps {
    formData: BusinessFormData;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    onInputChange: (field: string, value: string | boolean) => void;
    onBlur: (field: string) => void;
}

// Premium price range options with descriptions and icons
const priceRangeOptions = [
    { value: '$', label: 'R', description: 'Budget friendly', Icon: Coins },
    { value: '$$', label: 'RR', description: 'Moderate', Icon: Wallet },
    { value: '$$$', label: 'RRR', description: 'Upscale', Icon: Gem },
    { value: '$$$$', label: 'RRRR', description: 'Luxury', Icon: Crown },
];

const ContactSection: React.FC<ContactSectionProps> = ({
    formData,
    errors,
    touched,
    onInputChange,
    onBlur,
}) => {
    return (
        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden border-none backdrop-blur-xl shadow-md px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
            <div className="relative z-10">
                <h3 className="font-urbanist text-base font-semibold text-charcoal mb-6 flex items-center gap-3" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-navbar-bg/20 to-navbar-bg/10">
                        <Phone className="w-5 h-5 text-navbar-bg" />
                    </span>
                    Contact Information
                </h3>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}>
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => onInputChange('phone', e.target.value)}
                                onBlur={() => onBlur('phone')}
                                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 text-sm font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 rounded-full ${
                                    errors.phone
                                        ? 'border-coral focus:border-coral focus:ring-coral/20'
                                        : 'border-white/60 focus:ring-sage/30 focus:border-sage'
                                }`}
                                placeholder="+27 21 123 4567"
                            />
                            {touched.phone && errors.phone && (
                                <p className="mt-2 text-sm text-coral font-medium" style={{ fontFamily: 'Urbanist, sans-serif', color: 'white' }}>{errors.phone}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => onInputChange('email', e.target.value)}
                                onBlur={() => onBlur('email')}
                                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 text-sm font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 rounded-full ${
                                    errors.email
                                        ? 'border-coral focus:border-coral focus:ring-coral/20'
                                        : 'border-white/60 focus:ring-sage/30 focus:border-sage'
                                }`}
                                placeholder="business@example.com"
                            />
                            {touched.email && errors.email && (
                                <p className="mt-2 text-sm text-coral font-medium" style={{ fontFamily: 'Urbanist, sans-serif', color: 'white' }}>{errors.email}</p>
                            )}
                        </div>
                    </div>

                    {/* Website */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}>
                            Website
                        </label>
                        <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => onInputChange('website', e.target.value)}
                            onBlur={() => onBlur('website')}
                            style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                            className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 text-sm font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 rounded-full ${
                                errors.website
                                    ? 'border-coral focus:border-coral focus:ring-coral/20'
                                    : 'border-white/60 focus:ring-sage/30 focus:border-sage'
                            }`}
                            placeholder="https://www.example.com"
                        />
                        {touched.website && errors.website && (
                            <p className="mt-2 text-sm text-coral font-medium" style={{ fontFamily: 'Urbanist, sans-serif', color: 'white' }}>{errors.website}</p>
                        )}
                    </div>

                    {/* Price Range - Premium Toggle Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}>
                                <Coins className="w-4 h-4 text-coral/80" />
                                Price Range
                            </label>
                            {formData.priceRange && (
                                <m.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-xs text-charcoal/60 bg-charcoal/5 px-3 py-1 rounded-full"
                                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                                >
                                    {priceRangeOptions.find(p => p.value === formData.priceRange)?.description}
                                </m.span>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {priceRangeOptions.map((option, index) => {
                                const isSelected = formData.priceRange === option.value;
                                const Icon = option.Icon;
                                return (
                                    <m.button
                                        key={option.value}
                                        type="button"
                                        onClick={() => onInputChange('priceRange', option.value)}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className={`relative p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral'
                                                : 'bg-white/60 border-charcoal/10 hover:border-charcoal/20 hover:bg-white/80'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? 'text-coral' : 'text-charcoal/60'}`} />
                                        <span className={`text-sm sm:text-base font-bold ${isSelected ? 'text-charcoal' : 'text-charcoal/70'}`} style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                            {option.label}
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-charcoal/50 hidden sm:block" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                            {option.description}
                                        </span>
                                        {isSelected && (
                                            <m.div
                                                layoutId="price-indicator"
                                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-coral flex items-center justify-center"
                                                initial={false}
                                            >
                                                <Sparkles className="w-3 h-3 text-white" />
                                            </m.div>
                                        )}
                                    </m.button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactSection;
