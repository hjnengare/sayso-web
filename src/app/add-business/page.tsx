"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { PageLoader } from "../components/Loader";
import Header from "../components/Header/Header";
import dynamic from "next/dynamic";
import { authStyles } from "../components/Auth/Shared/authStyles";
import { Urbanist } from "next/font/google";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

// Import extracted components
import {
    BasicInfoSection,
    LocationSection,
    ContactSection,
    BusinessImagesSection,
    BusinessHoursSection,
    BusinessFormData,
    Subcategory,
    animations,
    getFieldLabel,
} from "./components";

const urbanist = Urbanist({
    weight: ["400", "600", "700", "800"],
    subsets: ["latin"],
    display: "swap",
});

const Footer = dynamic(() => import("../components/Footer/Footer"), {
    loading: () => null,
    ssr: false,
});

export default function AddBusinessPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { user, isLoading: authLoading } = useAuth();

    // Form state
    const [formData, setFormData] = useState<BusinessFormData>({
        name: "",
        description: "",
        category: "",
        businessType: "",
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
    const [isGeocoding, setIsGeocoding] = useState(false);

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
                const fetched = Array.isArray(data.subcategories) ? data.subcategories : [];
                const hasMisc = fetched.some((s: any) => (s?.id || '').toString().toLowerCase() === 'miscellaneous' || (s?.label || '').toLowerCase() === 'miscellaneous');
                const miscOption = {
                    id: 'miscellaneous',
                    label: 'Miscellaneous',
                    interest_id: 'miscellaneous',
                };
                setSubcategories(hasMisc ? fetched : [...fetched, miscOption]);
            } catch (error) {
                console.error('Error loading subcategories:', error);
                showToast('Failed to load categories', 'sage', 3000);
            } finally {
                setLoadingCategories(false);
            }
        };

        loadSubcategories();
    }, [showToast]);

    // Geocode address to get coordinates
    const handleGeocodeAddress = async () => {
        const fullAddress = formData.address || formData.location || '';
        if (!fullAddress.trim()) {
            showToast('Please enter an address first', 'sage', 3000);
            return;
        }

        setIsGeocoding(true);
        try {
            const response = await fetch(`/api/geocode?address=${encodeURIComponent(fullAddress)}`);
            const data = await response.json();

            if (data.success && data.lat && data.lng) {
                setFormData(prev => ({
                    ...prev,
                    lat: data.lat.toString(),
                    lng: data.lng.toString(),
                }));
                showToast('Coordinates found!', 'success', 2000);
            } else {
                showToast(data.error || 'Could not find coordinates for this address', 'sage', 3000);
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            showToast('Failed to get coordinates. Try using the map picker instead.', 'sage', 3000);
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleClearCoordinates = () => {
        setFormData(prev => ({ ...prev, lat: '', lng: '' }));
        showToast('Coordinates cleared', 'sage', 2000);
    };

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
                    error = "Please enter your business name";
                } else if (value.trim().length < 2) {
                    error = "Business name is too short. Please enter at least 2 characters";
                } else if (value.trim().length > 100) {
                    error = "Business name is too long. Please keep it under 100 characters";
                }
                break;
            case "category":
                if (!value) {
                    error = "Please select a category for your business";
                }
                break;
            case "location":
                // Location is required only for physical and service-area businesses
                if (formData.businessType !== 'online-only' && !value.trim()) {
                    if (formData.businessType === 'service-area') {
                        error = "Please enter the service area where your business operates";
                    } else {
                        error = "Please enter the location of your business (e.g., Cape Town, South Africa)";
                    }
                } else if (value && value.trim().length < 2) {
                    error = "Location is too short. Please enter a complete location (e.g., City, Country)";
                }
                break;
            case "email":
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = "Please enter a valid email address (e.g., contact@yourbusiness.com)";
                }
                break;
            case "website":
                if (value && !/^https?:\/\/.+\..+/.test(value)) {
                    error = "Please enter a complete website URL starting with http:// or https:// (e.g., https://www.yourbusiness.com)";
                }
                break;
            case "phone":
                if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
                    error = "Please enter a valid phone number (e.g., +27 21 123 4567 or (021) 123-4567)";
                }
                break;
            case "lat":
                if (value && (isNaN(Number(value)) || Number(value) < -90 || Number(value) > 90)) {
                    error = "Invalid latitude. Please enter a number between -90 and 90, or use the map to select your location";
                }
                break;
            case "lng":
                if (value && (isNaN(Number(value)) || Number(value) < -180 || Number(value) > 180)) {
                    error = "Invalid longitude. Please enter a number between -180 and 180, or use the map to select your location";
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
        // Lat/lng are optional - only validate if provided
        if (formData.lat && formData.lat.trim() && !validateField("lat", formData.lat)) {
            isValid = false;
        }
        if (formData.lng && formData.lng.trim() && !validateField("lng", formData.lng)) {
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
            // Count errors and provide helpful message
            const errorCount = Object.keys(errors).length;
            const errorFields = Object.keys(errors);

            if (errorCount === 1) {
                const fieldName = errorFields[0];
                const fieldLabel = getFieldLabel(fieldName);
                showToast(`Please fix the error in ${fieldLabel}`, 'sage', 4000);
            } else if (errorCount > 1) {
                showToast(`Please fix ${errorCount} errors in the form before submitting`, 'sage', 4000);
            } else {
                showToast('Please check the form and fix any errors before submitting', 'sage', 4000);
            }

            // Scroll to first error field
            const firstErrorField = errorFields[0];
            if (firstErrorField) {
                const errorElement = document.querySelector(`[name="${firstErrorField}"], [id="${firstErrorField}"]`);
                if (errorElement) {
                    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    (errorElement as HTMLElement).focus();
                }
            }
            return;
        }

        setIsSubmitting(true);

        // Announce submission start to screen readers
        const announcement = document.getElementById('form-announcements');
        if (announcement) {
            announcement.textContent = 'Submitting your business details. Please wait...';
        }

        try {
            // Build hours object - only include days with values
            const hoursObj: Record<string, string> = {};
            Object.entries(formData.hours).forEach(([day, hours]) => {
                if (hours && hours.trim()) {
                    hoursObj[day] = hours.trim();
                }
            });
            const hours = Object.keys(hoursObj).length > 0 ? hoursObj : null;

            // Create FormData (following review image pattern - server-side upload)
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name.trim());
            if (formData.description) formDataToSend.append('description', formData.description.trim());
            formDataToSend.append('category', formData.category);
            if (formData.businessType) formDataToSend.append('businessType', formData.businessType);
            formDataToSend.append('isChain', String(formData.isChain || false));
            if (formData.location) formDataToSend.append('location', formData.location.trim());
            if (formData.address) formDataToSend.append('address', formData.address.trim());
            if (formData.phone) formDataToSend.append('phone', formData.phone.trim());
            if (formData.email) formDataToSend.append('email', formData.email.trim());
            if (formData.website) formDataToSend.append('website', formData.website.trim());
            formDataToSend.append('priceRange', formData.priceRange || '$$');
            if (hours) formDataToSend.append('hours', JSON.stringify(hours));
            if (formData.lat) formDataToSend.append('lat', String(formData.lat));
            if (formData.lng) formDataToSend.append('lng', String(formData.lng));

            // Append image files (server-side will handle upload)
            images.forEach((image) => {
                formDataToSend.append('images', image);
            });

            setUploadingImages(images.length > 0);

            const response = await fetch('/api/businesses', {
                method: 'POST',
                body: formDataToSend,
            });

            const data = await response.json();

            if (!response.ok) {
                let errorMessage = 'We couldn\'t create your business listing. Please try again.';

                if (data.error) {
                    errorMessage = data.error;

                    if (data.code === 'MISSING_REQUIRED_FIELDS' && data.missingFields) {
                        const fields = data.missingFields.join(', ');
                        errorMessage = `Please provide ${fields.toLowerCase()}. These fields are required to create a business listing.`;
                    } else if (data.code === 'UNAUTHORIZED') {
                        errorMessage = 'You need to be logged in to create a business listing. Please sign in and try again.';
                    } else if (data.code === 'DUPLICATE_BUSINESS') {
                        errorMessage = 'A business with this name already exists in our system. Please try a different name or check if this business is already listed.';
                    } else if (data.code === 'INVALID_CATEGORY') {
                        errorMessage = 'There was an issue with the business category. Please select a valid category and try again.';
                    } else if (data.code === 'INVALID_HOURS_FORMAT') {
                        errorMessage = 'There was an issue processing your business hours. Please check the format and try again.';
                    }
                }

                throw new Error(errorMessage);
            }

            if (!data.business || !data.business.id) {
                console.error('[Add Business] Business ID missing from API response:', data);
                throw new Error('Your business was created, but we couldn\'t retrieve its ID. Please check your business listings or contact support if this persists.');
            }

            const businessId = data.business.id;
            console.log(`[Add Business] Business created successfully with ID: ${businessId}`);

            if (data.uploadWarnings && data.uploadWarnings.length > 0) {
                console.warn('[Add Business] Image upload warnings:', data.uploadWarnings);
                showToast('Business created successfully, but some images had issues. You can add images later from the edit page.', 'sage', 5000);
            } else if (data.images && data.images.length > 0) {
                console.log(`[Add Business] Successfully uploaded ${data.images.length} images server-side`);
            }

            if (announcement) {
                announcement.textContent = 'Business created successfully! Redirecting...';
            }

            showToast('Your business has been created successfully! Redirecting to your business page...', 'success', 4000);

            setTimeout(() => {
                router.push(`/business/${businessId}`);
            }, 1000);
        } catch (error: unknown) {
            console.error('Error creating business:', error);

            let errorMessage = 'We couldn\'t create your business listing. Please check your information and try again.';

            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
                errorMessage = 'Unable to connect to our servers. Please check your internet connection and try again.';
            }

            showToast(errorMessage, 'error', 6000);
        } finally {
            setIsSubmitting(false);
            setUploadingImages(false);
        }
    };

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
                                            <Link href="/for-businesses" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                for businesses
                                            </Link>
                                        </li>
                                        <li className="flex items-center">
                                            <ChevronRight size={16} className="text-charcoal/60" />
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
                                    <motion.div
                                        className="text-center mb-8"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    >
                                        <div className="inline-block relative mb-2">
                                            <WavyTypedTitle
                                                text="Create Business Profile"
                                                as="h1"
                                                className={`${urbanist.className} text-2xl sm:text-3xl font-semibold mb-2 text-center leading-[1.2] tracking-tight text-charcoal`}
                                                typingSpeedMs={40}
                                                startDelayMs={300}
                                                waveVariant="subtle"
                                                loopWave={false}
                                                triggerOnTypingComplete={true}
                                                enableScrollTrigger={false}
                                                style={{
                                                    fontFamily: urbanist.style.fontFamily,
                                                }}
                                            />
                                        </div>
                                        <motion.p
                                            className="text-sm sm:text-base text-charcoal/70 font-urbanist max-w-md mx-auto"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3, duration: 0.4 }}
                                        >
                                            Connect with customers and grow your presence
                                        </motion.p>
                                    </motion.div>

                                    {/* Screen reader announcements */}
                                    <div
                                        id="form-announcements"
                                        className="sr-only"
                                        role="status"
                                        aria-live="polite"
                                        aria-atomic="true"
                                    />

                                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                                        {/* Basic Information Section */}
                                        <BasicInfoSection
                                            formData={formData}
                                            errors={errors}
                                            touched={touched}
                                            subcategories={subcategories}
                                            loadingCategories={loadingCategories}
                                            onInputChange={handleInputChange}
                                            onBlur={handleBlur}
                                        />

                                        {/* Location Information Section */}
                                        <LocationSection
                                            formData={formData}
                                            errors={errors}
                                            touched={touched}
                                            isGeocoding={isGeocoding}
                                            onInputChange={handleInputChange}
                                            onBlur={handleBlur}
                                            onGeocodeAddress={handleGeocodeAddress}
                                            onClearCoordinates={handleClearCoordinates}
                                        />

                                        {/* Contact Information Section */}
                                        <ContactSection
                                            formData={formData}
                                            errors={errors}
                                            touched={touched}
                                            onInputChange={handleInputChange}
                                            onBlur={handleBlur}
                                        />

                                        {/* Business Images Section */}
                                        <BusinessImagesSection
                                            imagePreviews={imagePreviews}
                                            uploadingImages={uploadingImages}
                                            onImageUpload={handleImageUpload}
                                            onRemoveImage={removeImage}
                                        />

                                        {/* Business Hours Section */}
                                        <BusinessHoursSection
                                            formData={formData}
                                            onHoursChange={handleHoursChange}
                                        />

                                        {/* Submit Button */}
                                        <motion.div
                                            className="flex flex-col sm:flex-row gap-4 justify-end pt-4"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: 0.4 }}
                                        >
                                            <Link
                                                href="/for-businesses"
                                                className="px-6 py-3 rounded-full border-2 border-charcoal/20 text-charcoal font-urbanist font-600 hover:bg-charcoal/5 transition-all duration-200 text-center"
                                            >
                                                Cancel
                                            </Link>
                                            <motion.button
                                                type="submit"
                                                disabled={isSubmitting}
                                                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                                                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-6 rounded-full hover:from-coral/90 hover:to-coral transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <AnimatePresence mode="wait">
                                                    {isSubmitting ? (
                                                        <motion.div
                                                            key="loading"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <motion.div className="flex items-center gap-1">
                                                                {[0, 1, 2, 3].map((i) => (
                                                                    <motion.div
                                                                        key={i}
                                                                        className="w-2 h-2 bg-white rounded-full"
                                                                        animate={{
                                                                            y: [0, -6, 0],
                                                                            opacity: [0.6, 1, 0.6],
                                                                        }}
                                                                        transition={{
                                                                            duration: 0.6,
                                                                            repeat: Infinity,
                                                                            delay: i * 0.1,
                                                                            ease: "easeInOut",
                                                                        }}
                                                                    />
                                                                ))}
                                                            </motion.div>
                                                            <span>Creating...</span>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="default"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <span>Create Business Profile</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.button>
                                        </motion.div>
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
