"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, ChevronDown } from "react-feather";
import { createPortal } from "react-dom";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import {
    Store,
    Save,
    MapPin,
    Phone,
    Mail,
    Globe,
    DollarSign,
    Loader2,
    Clock,
    ImageIcon,
    Upload,
    X,
    Building2,
    Truck,
    Monitor,
    UserCheck,
    Plus,
    Link as LinkIcon,
} from "lucide-react";
import Image from "next/image";
import { PageLoader } from "../components/Loader";
import Header from "../components/Header/Header";
import dynamic from "next/dynamic";
import { getBrowserSupabase } from "../lib/supabase/client";
import { authStyles } from "../components/Auth/Shared/authStyles";
import { Fontdiner_Swanky } from "next/font/google";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});

const Footer = dynamic(() => import("../components/Footer/Footer"), {
    loading: () => null,
    ssr: false,
});

// CSS animations
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.95) translateY(-8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;

interface Subcategory {
    id: string;
    label: string;
    interest_id: string;
}

export default function AddBusinessPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { user, isLoading: authLoading } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "",
        businessType: "" as "physical" | "service-area" | "online-only" | "",
        intent: "" as "owner" | "adding-place" | "",
        isChain: false,
        location: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        priceRange: "$$",
        lat: "",
        lng: "",
        hours: {
            monday: "",
            tuesday: "",
            wednesday: "",
            thursday: "",
            friday: "",
            saturday: "",
            sunday: "",
        },
    });

    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isCategoryModalClosing, setIsCategoryModalClosing] = useState(false);
    const categoryButtonRef = useRef<HTMLButtonElement>(null);
    const categoryModalRef = useRef<HTMLDivElement>(null);
    const [categoryModalPos, setCategoryModalPos] = useState<{left: number; top: number} | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/login?redirect=/add-business`);
        }
    }, [user, authLoading, router]);

    // Load subcategories
    useEffect(() => {
        const loadSubcategories = async () => {
            try {
                setLoadingCategories(true);
                const response = await fetch('/api/subcategories');
                if (!response.ok) {
                    throw new Error('Failed to load categories');
                }
                const data = await response.json();
                setSubcategories(data.subcategories || []);
            } catch (error) {
                console.error('Error loading subcategories:', error);
                showToast('Failed to load categories', 'sage', 3000);
            } finally {
                setLoadingCategories(false);
            }
        };

        loadSubcategories();
    }, [showToast]);

    // Category modal handlers
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

        // Lock body scroll
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            // Restore body scroll
            document.body.style.overflow = originalStyle;
        };
    }, [isCategoryModalOpen]);

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleHoursChange = (day: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            hours: {
                ...prev.hours,
                [day]: value
            }
        }));
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newFiles: File[] = [];
        const newPreviews: string[] = [];

        Array.from(files).forEach((file) => {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                showToast(`${file.name} is not an image file`, 'sage', 3000);
                return;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                showToast(`${file.name} is too large. Maximum size is 5MB`, 'sage', 3000);
                return;
            }

            // Check total image limit (10 images max)
            if (images.length + newFiles.length >= 10) {
                showToast('Maximum 10 images allowed', 'sage', 3000);
                return;
            }

            newFiles.push(file);
            newPreviews.push(URL.createObjectURL(file));
        });

        if (newFiles.length > 0) {
            setImages(prev => [...prev, ...newFiles]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }

        // Reset input
        if (event.target) {
            event.target.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        // Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(imagePreviews[index]);
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({
            ...prev,
            [field]: true
        }));
        // Skip validation for hours field (it's an object, not a string)
        if (field !== 'hours') {
            const value = formData[field as keyof typeof formData];
            if (typeof value === 'string') {
                validateField(field, value);
            }
        }
    };

    const validateField = (field: string, value: string) => {
        let error = "";

        switch (field) {
            case "name":
                if (!value.trim()) {
                    error = "Business name is required";
                } else if (value.trim().length < 2) {
                    error = "Business name must be at least 2 characters";
                } else if (value.trim().length > 100) {
                    error = "Business name must be less than 100 characters";
                }
                break;
            case "category":
                if (!value) {
                    error = "Category is required";
                }
                break;
            case "location":
                // Location is required only for physical and service-area businesses
                if (formData.businessType !== 'online-only' && !value.trim()) {
                    error = formData.businessType === 'service-area' ? "Service area is required" : "Location is required";
                } else if (value && value.trim().length < 2) {
                    error = "Location must be at least 2 characters";
                }
                break;
            case "email":
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = "Please enter a valid email address";
                }
                break;
            case "website":
                if (value && !/^https?:\/\/.+\..+/.test(value)) {
                    error = "Please enter a valid website URL (e.g., https://example.com)";
                }
                break;
            case "phone":
                if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
                    error = "Please enter a valid phone number";
                }
                break;
            case "lat":
                if (value && (isNaN(Number(value)) || Number(value) < -90 || Number(value) > 90)) {
                    error = "Latitude must be between -90 and 90";
                }
                break;
            case "lng":
                if (value && (isNaN(Number(value)) || Number(value) < -180 || Number(value) > 180)) {
                    error = "Longitude must be between -180 and 180";
                }
                break;
        }

        if (error) {
            setErrors(prev => ({
                ...prev,
                [field]: error
            }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        return !error;
    };

    const validateForm = () => {
        const fieldsToValidate = ["name", "category"];
        
        // Location is required only for physical and service-area businesses
        if (formData.businessType !== 'online-only') {
            fieldsToValidate.push("location");
        }
        
        let isValid = true;

        fieldsToValidate.forEach(field => {
            const value = formData[field as keyof typeof formData];
            if (!validateField(field, value as string)) {
                isValid = false;
            }
        });

        // Validate optional fields if they have values
        if (formData.email && !validateField("email", formData.email)) {
            isValid = false;
        }
        if (formData.website && !validateField("website", formData.website)) {
            isValid = false;
        }
        if (formData.phone && !validateField("phone", formData.phone)) {
            isValid = false;
        }
        if (formData.lat && !validateField("lat", formData.lat)) {
            isValid = false;
        }
        if (formData.lng && !validateField("lng", formData.lng)) {
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all fields as touched
        Object.keys(formData).forEach(field => {
            setTouched(prev => ({
                ...prev,
                [field]: true
            }));
        });

        if (!validateForm()) {
            showToast('Please fix the errors in the form', 'sage', 3000);
            return;
        }

        setIsSubmitting(true);

        try {
            // Build hours object - only include days with values
            const hoursObj: Record<string, string> = {};
            Object.entries(formData.hours).forEach(([day, hours]) => {
                if (hours && hours.trim()) {
                    hoursObj[day] = hours.trim();
                }
            });
            const hours = Object.keys(hoursObj).length > 0 ? hoursObj : null;

            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                category: formData.category,
                businessType: formData.businessType || null,
                intent: formData.intent || null,
                isChain: formData.isChain || false,
                location: formData.location.trim() || null,
                address: formData.address.trim() || null,
                phone: formData.phone.trim() || null,
                email: formData.email.trim() || null,
                website: formData.website.trim() || null,
                priceRange: formData.priceRange,
                hours: hours,
                lat: formData.lat ? parseFloat(formData.lat) : null,
                lng: formData.lng ? parseFloat(formData.lng) : null,
            };

            const response = await fetch('/api/businesses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create business');
            }

            const businessId = data.business.id;

            // Upload images if any were selected
            if (images.length > 0) {
                setUploadingImages(true);
                try {
                    const supabase = getBrowserSupabase();
                    const uploadedUrls: string[] = [];

                    for (let i = 0; i < images.length; i++) {
                        const image = images[i];
                        const fileExt = image.name.split('.').pop() || 'jpg';
                        const timestamp = Date.now();
                        const fileName = `${businessId}_${i}_${timestamp}.${fileExt}`;
                        const filePath = `${businessId}/${fileName}`;

                        // Upload to Supabase Storage
                        const { error: uploadError } = await supabase.storage
                            .from('business-images')
                            .upload(filePath, image, {
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('Error uploading image:', uploadError);
                            continue;
                        }

                        // Get public URL
                        const { data: { publicUrl } } = supabase.storage
                            .from('business-images')
                            .getPublicUrl(filePath);

                        uploadedUrls.push(publicUrl);
                    }

                    // Update business with uploaded images
                    if (uploadedUrls.length > 0) {
                        // Set first image as uploaded_image (primary image)
                        // Note: The API may need to be updated to accept uploaded_image field
                        const updateResponse = await fetch(`/api/businesses/${businessId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                uploaded_image: uploadedUrls[0],
                            }),
                        });

                        if (!updateResponse.ok) {
                            // Try direct Supabase update as fallback
                            try {
                                const supabase = getBrowserSupabase();
                                const { error: directUpdateError } = await supabase
                                    .from('businesses')
                                    .update({ uploaded_image: uploadedUrls[0] })
                                    .eq('id', businessId);

                                if (directUpdateError) {
                                    console.warn('Failed to update business with image URL:', directUpdateError);
                                }
                            } catch (fallbackError) {
                                console.warn('Failed to update business with image URL, but business was created');
                            }
                        }
                    }
                } catch (imageError: any) {
                    console.error('Error uploading images:', imageError);
                    // Don't fail the whole operation if image upload fails
                    showToast('Business created, but some images failed to upload', 'sage', 4000);
                } finally {
                    setUploadingImages(false);
                }
            }

            showToast('Business created successfully!', 'success', 3000);

            // Redirect based on intent
            setTimeout(() => {
                if (formData.intent === 'owner') {
                    // Owner goes to dashboard
                    router.push(`/owners/businesses/${businessId}`);
                } else {
                    // Non-owner goes to public business page
                    router.push(`/business/${businessId}`);
                }
            }, 1000);
        } catch (error: any) {
            console.error('Error creating business:', error);
            showToast(error.message || 'Failed to create business. Please try again.', 'sage', 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const priceRanges = [
        { value: "$", label: "$ - Budget Friendly" },
        { value: "$$", label: "$$ - Moderate" },
        { value: "$$$", label: "$$$ - Upscale" },
        { value: "$$$$", label: "$$$$ - Fine Dining/Luxury" },
    ];

    // Show loader while checking auth
    if (authLoading) {
        return <PageLoader size="lg" variant="wavy" color="sage" />;
    }

    // Show message if not authenticated (will redirect)
    if (!user) {
        return null;
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: authStyles }} />
            <style dangerouslySetInnerHTML={{ __html: animations }} />
            <div
                className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
                style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                }}
            >
                <Header
                    showSearch={false}
                    variant="white"
                    backgroundClassName="bg-navbar-bg"
                    topPosition="top-0"
                    reducedPadding={true}
                    whiteText={true}
                />

                <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                    <div className="pt-20 sm:pt-24 pb-28">
                        <section className="relative">
                            <div className="container mx-auto max-w-[1300px] px-4 sm:px-6 relative z-10">
                                {/* Breadcrumb Navigation */}
                                <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
                                    <ol className="flex items-center gap-2 text-sm sm:text-base">
                                        <li>
                                            <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Home
                                            </Link>
                                        </li>
                                        <li className="flex items-center">
                                            <ChevronRight className="w-4 h-4 text-charcoal/40" />
                                        </li>
                                        <li>
                                            <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Add Business
                                            </span>
                                        </li>
                                    </ol>
                                </nav>

                                <div className="max-w-4xl mx-auto pt-8 pb-8">
                                    {/* Page Header */}
                                    <div className="text-center mb-8 animate-fade-in-up">
                                        <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-sage/20">
                                            <Store className="w-8 h-8 text-sage" />
                                        </div>
                                        <div className="inline-block relative mb-2">
                                            <WavyTypedTitle
                                                text="Add Your Business"
                                                as="h1"
                                                className={`${swanky.className} text-2xl sm:text-3xl font-semibold mb-2 text-center leading-[1.2] tracking-tight text-charcoal`}
                                                typingSpeedMs={40}
                                                startDelayMs={300}
                                                waveVariant="subtle"
                                                loopWave={false}
                                                triggerOnTypingComplete={true}
                                                enableScrollTrigger={false}
                                                style={{ 
                                                    fontFamily: swanky.style.fontFamily,
                                                }}
                                            />
                                        </div>
                                        <p className="text-sm sm:text-base text-charcoal/70 font-urbanist max-w-md mx-auto">
                                            Create your business profile to connect with customers and manage your listing
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Basic Information Section */}
                                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-100">
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-semibold text-white mb-6 flex items-center gap-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                                        <Store className="w-4 h-4 text-coral" />
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
                                                            value={formData.name}
                                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                                            onBlur={() => handleBlur('name')}
                                                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                            className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                                                errors.name
                                                                    ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                    : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                            }`}
                                                            placeholder="Enter business name"
                                                        />
                                                        {touched.name && errors.name && (
                                                            <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{errors.name}</p>
                                                        )}
                                                    </div>

                                                    {/* Category */}
                                                    <div>
                                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
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
                                                                    onBlur={() => handleBlur('category')}
                                                                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                                    className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full flex items-center justify-between ${
                                                                        errors.category
                                                                            ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                            : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                                    }`}
                                                                >
                                                                    <span className={formData.category ? 'text-charcoal' : 'text-charcoal/50'}>
                                                                        {formData.category || 'Select a category'}
                                                                    </span>
                                                                    <ChevronDown className={`w-5 h-5 text-charcoal/60 transition-transform duration-300 ${isCategoryModalOpen ? 'rotate-180' : ''}`} />
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
                                                                                            handleInputChange('category', subcategory.label);
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
                                                        <div className="space-y-4 pt-2 border-t border-white/20">
                                                            <div>
                                                                <label className="block text-sm font-semibold text-white mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                    What kind of business is this?
                                                                </label>
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleInputChange('businessType', 'physical')}
                                                                        className={`flex flex-col items-center gap-2 p-4 rounded-[20px] border-2 transition-all duration-200 ${
                                                                            formData.businessType === 'physical'
                                                                                ? 'bg-gradient-to-br from-sage/20 to-sage/10 border-sage text-white'
                                                                                : 'bg-white/10 border-white/30 text-white/80 hover:border-white/50 hover:bg-white/15'
                                                                        }`}
                                                                    >
                                                                        <Building2 className="w-6 h-6" />
                                                                        <span className="text-sm font-semibold text-center">Physical Location</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleInputChange('businessType', 'service-area')}
                                                                        className={`flex flex-col items-center gap-2 p-4 rounded-[20px] border-2 transition-all duration-200 ${
                                                                            formData.businessType === 'service-area'
                                                                                ? 'bg-gradient-to-br from-sage/20 to-sage/10 border-sage text-white'
                                                                                : 'bg-white/10 border-white/30 text-white/80 hover:border-white/50 hover:bg-white/15'
                                                                        }`}
                                                                    >
                                                                        <Truck className="w-6 h-6" />
                                                                        <span className="text-sm font-semibold text-center">Service-Area</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleInputChange('businessType', 'online-only')}
                                                                        className={`flex flex-col items-center gap-2 p-4 rounded-[20px] border-2 transition-all duration-200 ${
                                                                            formData.businessType === 'online-only'
                                                                                ? 'bg-gradient-to-br from-sage/20 to-sage/10 border-sage text-white'
                                                                                : 'bg-white/10 border-white/30 text-white/80 hover:border-white/50 hover:bg-white/15'
                                                                        }`}
                                                                    >
                                                                        <Monitor className="w-6 h-6" />
                                                                        <span className="text-sm font-semibold text-center">Online-Only</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {formData.businessType && (
                                                                <>
                                                                    <div>
                                                                        <label className="block text-sm font-semibold text-white mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                            Intent
                                                                        </label>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleInputChange('intent', 'owner')}
                                                                                className={`flex items-center gap-3 p-4 rounded-[20px] border-2 transition-all duration-200 ${
                                                                                    formData.intent === 'owner'
                                                                                        ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-white'
                                                                                        : 'bg-white/10 border-white/30 text-white/80 hover:border-white/50 hover:bg-white/15'
                                                                                }`}
                                                                            >
                                                                                <UserCheck className="w-5 h-5" />
                                                                                <span className="text-sm font-semibold">I own/manage it</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleInputChange('intent', 'adding-place')}
                                                                                className={`flex items-center gap-3 p-4 rounded-[20px] border-2 transition-all duration-200 ${
                                                                                    formData.intent === 'adding-place'
                                                                                        ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-white'
                                                                                        : 'bg-white/10 border-white/30 text-white/80 hover:border-white/50 hover:bg-white/15'
                                                                                }`}
                                                                            >
                                                                                <Plus className="w-5 h-5" />
                                                                                <span className="text-sm font-semibold">I'm just adding a place</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <label className="flex items-center gap-3 p-3 rounded-[20px] bg-white/10 border border-white/30 cursor-pointer hover:bg-white/15 transition-all duration-200">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={formData.isChain}
                                                                                onChange={(e) => handleInputChange('isChain', e.target.checked)}
                                                                                className="w-5 h-5 rounded border-white/40 bg-white/20 text-coral focus:ring-coral/30 focus:ring-offset-0"
                                                                            />
                                                                            <LinkIcon className="w-5 h-5 text-white/80" />
                                                                            <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                                Part of a chain
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Description */}
                                                    <div>
                                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                            Description
                                                        </label>
                                                        <textarea
                                                            value={formData.description}
                                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                                            rows={4}
                                                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                            className="w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-[20px] resize-none border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg"
                                                            placeholder="Describe your business..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Location Information Section */}
                                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-200">
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-semibold text-white mb-6 flex items-center gap-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                                        <MapPin className="w-4 h-4 text-coral" />
                                                    </span>
                                                    Location Information
                                                </h3>

                                                <div className="space-y-6">
                                                    {/* Location */}
                                                    {formData.businessType !== 'online-only' && (
                                                        <div>
                                                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                {formData.businessType === 'service-area' ? 'Service Area (City/Area)' : 'Location (City/Area)'} <span className="text-coral">*</span>
                                                            </label>
                                                        <input
                                                            type="text"
                                                            value={formData.location}
                                                            onChange={(e) => handleInputChange('location', e.target.value)}
                                                            onBlur={() => handleBlur('location')}
                                                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                            className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                                                errors.location
                                                                    ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                    : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                            }`}
                                                            placeholder="e.g., Cape Town, V&A Waterfront"
                                                        />
                                                            {touched.location && errors.location && (
                                                                <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{errors.location}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Address - Only show for physical location */}
                                                    {formData.businessType === 'physical' && (
                                                        <div>
                                                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                Full Address
                                                            </label>
                                                        <input
                                                            type="text"
                                                            value={formData.address}
                                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                                className="w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg"
                                                                placeholder="Street address, building number, etc."
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Coordinates (Optional) - Only show for physical location */}
                                                    {formData.businessType === 'physical' && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                Latitude (Optional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.lat}
                                                                onChange={(e) => handleInputChange('lat', e.target.value)}
                                                                onBlur={() => handleBlur('lat')}
                                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                                className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                                                    errors.lat
                                                                        ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                        : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                                }`}
                                                                placeholder="e.g., -33.9249"
                                                            />
                                                            {touched.lat && errors.lat && (
                                                                <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{errors.lat}</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                Longitude (Optional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.lng}
                                                                onChange={(e) => handleInputChange('lng', e.target.value)}
                                                                onBlur={() => handleBlur('lng')}
                                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                                className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                                                    errors.lng
                                                                        ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                        : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                                }`}
                                                                placeholder="e.g., 18.4241"
                                                            />
                                                            {touched.lng && errors.lng && (
                                                                <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{errors.lng}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Information Section */}
                                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-300">
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-semibold text-white mb-6 flex items-center gap-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                                        <Phone className="w-4 h-4 text-coral" />
                                                    </span>
                                                    Contact Information
                                                </h3>

                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {/* Phone */}
                                                        <div>
                                                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                Phone Number
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                value={formData.phone}
                                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                                onBlur={() => handleBlur('phone')}
                                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                                className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                                                    errors.phone
                                                                        ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                        : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                                }`}
                                                                placeholder="+27 21 123 4567"
                                                            />
                                                            {touched.phone && errors.phone && (
                                                                <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{errors.phone}</p>
                                                            )}
                                                        </div>

                                                        {/* Email */}
                                                        <div>
                                                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                Email Address
                                                            </label>
                                                            <input
                                                                type="email"
                                                                value={formData.email}
                                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                                onBlur={() => handleBlur('email')}
                                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                                className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                                                    errors.email
                                                                        ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                        : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                                }`}
                                                                placeholder="business@example.com"
                                                            />
                                                            {touched.email && errors.email && (
                                                                <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{errors.email}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Website */}
                                                    <div>
                                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                            Website
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={formData.website}
                                                            onChange={(e) => handleInputChange('website', e.target.value)}
                                                            onBlur={() => handleBlur('website')}
                                                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                            className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                                                errors.website
                                                                    ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                    : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                            }`}
                                                            placeholder="https://www.example.com"
                                                        />
                                                        {touched.website && errors.website && (
                                                            <p className="mt-2 text-sm text-navbar-bg font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{errors.website}</p>
                                                        )}
                                                    </div>

                                                    {/* Price Range */}
                                                    <div>
                                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                            Price Range
                                                        </label>
                                                        <select
                                                            value={formData.priceRange}
                                                            onChange={(e) => handleInputChange('priceRange', e.target.value)}
                                                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                            className="w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg"
                                                        >
                                                            {priceRanges.map(range => (
                                                                <option key={range.value} value={range.value}>
                                                                    {range.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Business Images Section */}
                                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up">
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-semibold text-white mb-6 flex items-center gap-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                                        <ImageIcon className="w-4 h-4 text-coral" />
                                                    </span>
                                                    Business Photos (Optional)
                                                </h3>

                                                <div className="space-y-4">
                                                    {/* Image Grid */}
                                                    {imagePreviews.length > 0 && (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {imagePreviews.map((preview, index) => (
                                                                <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-white/20 border border-white/50">
                                                                    <Image
                                                                        src={preview}
                                                                        alt={`Business photo ${index + 1}`}
                                                                        width={200}
                                                                        height={200}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeImage(index)}
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
                                                        <div className="w-full min-h-[120px] border-2 border-dashed border-white/30 rounded-lg flex flex-col items-center justify-center gap-3 p-6 cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all duration-200">
                                                            <Upload className="w-8 h-8 text-white/60" />
                                                            <div className="text-center">
                                                                <span className="text-sm font-semibold text-white block mb-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                    {imagePreviews.length === 0 ? 'Add Photos' : 'Add More Photos'}
                                                                </span>
                                                                <span className="text-xs text-white/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                                    {imagePreviews.length}/10 images • Max 5MB each
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                            className="hidden"
                                                            disabled={uploadingImages || imagePreviews.length >= 10}
                                                        />
                                                    </label>

                                                    {uploadingImages && (
                                                        <div className="flex items-center justify-center gap-2 py-4">
                                                            <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                                                            <span className="text-sm text-white/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Uploading images...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Business Hours Section */}
                                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up">
                                            <div className="relative z-10">
                                                <h3 className="font-urbanist text-base font-semibold text-white mb-6 flex items-center gap-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                                        <Clock className="w-4 h-4 text-coral" />
                                                    </span>
                                                    Business Hours (Optional)
                                                </h3>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {[
                                                        { key: "monday", label: "Monday" },
                                                        { key: "tuesday", label: "Tuesday" },
                                                        { key: "wednesday", label: "Wednesday" },
                                                        { key: "thursday", label: "Thursday" },
                                                        { key: "friday", label: "Friday" },
                                                        { key: "saturday", label: "Saturday" },
                                                        { key: "sunday", label: "Sunday" },
                                                    ].map(day => (
                                                        <div key={day.key} className="flex items-center gap-3">
                                                            <label className="w-24 text-sm font-semibold text-white flex-shrink-0" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                {day.label}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.hours[day.key as keyof typeof formData.hours]}
                                                                onChange={(e) => handleHoursChange(day.key, e.target.value)}
                                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                                className="flex-1 bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg"
                                                                placeholder="e.g., 9:00 AM - 5:00 PM"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
                                            <Link
                                                href="/for-businesses"
                                                className="px-6 py-3 rounded-full border-2 border-charcoal/20 text-charcoal font-urbanist font-600 hover:bg-charcoal/5 transition-all duration-200 text-center"
                                            >
                                                Cancel
                                            </Link>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Creating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        <span>Create Business</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <Footer />
            </div>
        </>
    );
}

