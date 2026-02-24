"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { PageLoader } from "../../components/Loader";
import { usePreviousPageBreadcrumb } from "../../hooks/usePreviousPageBreadcrumb";
import dynamic from "next/dynamic";
import { authStyles } from "../../components/Auth/Shared/authStyles";
import { Urbanist } from "next/font/google";

// Import extracted components
import {
    BasicInfoSection,
    DUPLICATE_NAME_ERROR,
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


export default function AddBusinessPage() {
    const router = useRouter();
    const { previousHref, previousLabel } = usePreviousPageBreadcrumb({
        fallbackHref: "/my-businesses",
        fallbackLabel: "My Businesses",
    });
    const { showToast } = useToast();
    const { user, isLoading: authLoading } = useAuth();
    const ownershipPricingNotice =
        "Please note: Business ownership on Sayso is currently free. However, within the coming months, business accounts may be subject to a subscription or ownership fee (pricing to be announced). We will communicate all details in advance.";
    const iconChipClass =
        "inline-flex items-center justify-center rounded-full bg-off-white/80 text-charcoal/85 transition-colors duration-200 hover:bg-off-white/90";

    // Form state
    const [formData, setFormData] = useState<BusinessFormData>({
        name: "",
        description: "",
        mainCategory: "",
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
    const [nameDuplicateCheck, setNameDuplicateCheck] = useState<{ checking: boolean; available: boolean | null }>({ checking: false, available: null });
    const nameDuplicateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestNameCheckRef = useRef(0);
    const [, setIsGeocoding] = useState(false);
    const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "searching" | "found" | "not_found" | "error">("idle");
    const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastAttemptedLocationRef = useRef("");
    const lastResolvedLocationRef = useRef("");
    const latestGeocodeRequestRef = useRef(0);

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

    // Debounced duplicate name check (non-chain only)
    useEffect(() => {
        const name = formData.name?.trim() ?? '';
        const isChain = !!formData.isChain;

        if (isChain || name.length < 2) {
            setNameDuplicateCheck({ checking: false, available: null });
            setErrors(prev => {
                const next = { ...prev };
                if (next.name === DUPLICATE_NAME_ERROR) delete next.name;
                return next;
            });
            return;
        }

        if (nameDuplicateDebounceRef.current) {
            clearTimeout(nameDuplicateDebounceRef.current);
        }

        nameDuplicateDebounceRef.current = setTimeout(async () => {
            const requestId = ++latestNameCheckRef.current;
            setNameDuplicateCheck({ checking: true, available: null });
            try {
                const res = await fetch(
                    `/api/businesses/check-name?name=${encodeURIComponent(name)}&isChain=${isChain}`
                );
                const data = await res.json().catch(() => ({}));
                if (requestId !== latestNameCheckRef.current) return;
                const available = data.available === true;
                setNameDuplicateCheck({ checking: false, available });
                setErrors(prev => {
                    const next = { ...prev };
                    if (available) {
                        if (next.name === DUPLICATE_NAME_ERROR) delete next.name;
                    } else {
                        next.name = DUPLICATE_NAME_ERROR;
                    }
                    return next;
                });
            } catch {
                if (requestId === latestNameCheckRef.current) {
                    setNameDuplicateCheck({ checking: false, available: null });
                }
            }
        }, 500);

        return () => {
            if (nameDuplicateDebounceRef.current) {
                clearTimeout(nameDuplicateDebounceRef.current);
                nameDuplicateDebounceRef.current = null;
            }
        };
    }, [formData.name, formData.isChain]);

    const normalizeGeocodeInput = useCallback((value: string) => {
        return value
            .trim()
            .replace(/\s+/g, " ")
            .replace(/\s*,\s*/g, ", ")
            .replace(/,+/g, ",")
            .replace(/\s*,\s*/g, ", ")
            .replace(/,\s*,+/g, ", ")
            .replace(/^,\s*|\s*,$/g, "");
    }, []);

    const geocodeInput = useMemo(() => {
        const source = formData.address || formData.location || "";
        return normalizeGeocodeInput(source);
    }, [formData.address, formData.location, normalizeGeocodeInput]);

    const runGeocode = useCallback(async (options?: { force?: boolean }) => {
        const query = geocodeInput;
        if (!query) {
            setIsGeocoding(false);
            setGeocodeStatus("idle");
            return false;
        }

        if (!options?.force && query === lastAttemptedLocationRef.current) {
            return false;
        }

        if (!options?.force && query === lastResolvedLocationRef.current) {
            return false;
        }

        lastAttemptedLocationRef.current = query;
        const requestId = ++latestGeocodeRequestRef.current;

        setIsGeocoding(true);
        setGeocodeStatus("searching");

        try {
            const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`, {
                cache: "no-store",
            });
            const data = await response.json().catch(() => null);

            if (requestId !== latestGeocodeRequestRef.current) {
                return false;
            }

            if (
                response.ok &&
                data?.success &&
                typeof data.lat === "number" &&
                typeof data.lng === "number"
            ) {
                setFormData(prev => ({
                    ...prev,
                    lat: data.lat.toString(),
                    lng: data.lng.toString(),
                }));
                lastResolvedLocationRef.current = query;
                setGeocodeStatus("found");
                return true;
            }

            setGeocodeStatus(response.status === 404 ? "not_found" : "error");
            return false;
        } catch (error) {
            console.error("Geocoding error:", error);
            if (requestId === latestGeocodeRequestRef.current) {
                setGeocodeStatus("error");
            }
            return false;
        } finally {
            if (requestId === latestGeocodeRequestRef.current) {
                setIsGeocoding(false);
            }
        }
    }, [geocodeInput]);

    useEffect(() => {
        if (geocodeDebounceRef.current) {
            clearTimeout(geocodeDebounceRef.current);
            geocodeDebounceRef.current = null;
        }

        if (!geocodeInput) {
            setIsGeocoding(false);
            setGeocodeStatus("idle");
            lastAttemptedLocationRef.current = "";
            lastResolvedLocationRef.current = "";
            if (formData.lat || formData.lng) {
                setFormData(prev => ({ ...prev, lat: "", lng: "" }));
            }
            return;
        }

        if (
            lastResolvedLocationRef.current &&
            lastResolvedLocationRef.current !== geocodeInput &&
            (formData.lat || formData.lng)
        ) {
            setFormData(prev => ({ ...prev, lat: "", lng: "" }));
            setGeocodeStatus("idle");
        }

        geocodeDebounceRef.current = setTimeout(() => {
            void runGeocode();
        }, 900);

        return () => {
            if (geocodeDebounceRef.current) {
                clearTimeout(geocodeDebounceRef.current);
                geocodeDebounceRef.current = null;
            }
        };
    }, [formData.lat, formData.lng, geocodeInput, runGeocode]);

    const handleLocationBlurGeocode = useCallback(() => {
        void runGeocode({ force: true });
    }, [runGeocode]);

    const handleClearCoordinates = () => {
        setFormData(prev => ({ ...prev, lat: '', lng: '' }));
        lastResolvedLocationRef.current = "";
        setGeocodeStatus("idle");
        showToast('Coordinates cleared', 'sage', 2000);
    };

    const handleLocationSelect = useCallback(
        (loc: { lat: number; lng: number; address: string; location: string }) => {
            setFormData(prev => ({
                ...prev,
                lat: String(loc.lat),
                lng: String(loc.lng),
                address: loc.address || prev.address,
                location: loc.location || loc.address || prev.location,
            }));
            const resolved = normalizeGeocodeInput(loc.address || loc.location || "");
            if (resolved) lastResolvedLocationRef.current = resolved;
            setGeocodeStatus("found");
        },
        [normalizeGeocodeInput]
    );

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => {
            if (field === "mainCategory") {
                return {
                    ...prev,
                    mainCategory: String(value),
                    category: "",
                };
            }

            return {
                ...prev,
                [field]: value
            };
        });

        // Reset duplicate check when name or isChain changes
        if (field === "name" || field === "isChain") {
            setNameDuplicateCheck({ checking: false, available: null });
            if (nameDuplicateDebounceRef.current) {
                clearTimeout(nameDuplicateDebounceRef.current);
                nameDuplicateDebounceRef.current = null;
            }
        }

        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            if (field === "mainCategory") {
                delete newErrors.category;
            }
            return newErrors;
        });
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
            case "mainCategory":
                if (!value) {
                    error = "Please select a main category for your business";
                }
                break;
            case "category":
                if (!value) {
                    error = "Please select a subcategory for your business";
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
        if (nameDuplicateCheck.available === false) return false;
        if (nameDuplicateCheck.checking) return false;

        const fieldsToValidate = ["name", "mainCategory", "category"];

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
            const normalizeCategoryValue = (value: string) => value.trim().toLowerCase();
            const normalizedMainCategory = normalizeCategoryValue(formData.mainCategory);
            const normalizedSubcategoryInput = normalizeCategoryValue(formData.category);
            const normalizedSubcategory =
                subcategories.find(
                    (subcategory) =>
                        normalizeCategoryValue(subcategory.id) === normalizedSubcategoryInput ||
                        normalizeCategoryValue(subcategory.label) === normalizedSubcategoryInput
                )?.id ?? normalizedSubcategoryInput;

            formDataToSend.append('name', formData.name.trim());
            if (formData.description) formDataToSend.append('description', formData.description.trim());
            formDataToSend.append('mainCategory', normalizedMainCategory);
            // Keep legacy category key for backward compatibility and pass explicit subcategory.
            formDataToSend.append('category', normalizedSubcategory);
            formDataToSend.append('subcategory', normalizedSubcategory);
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
                const isDuplicateError = data.error === 'BUSINESS_ALREADY_EXISTS' || data.code === 'BUSINESS_ALREADY_EXISTS' || data.code === 'DUPLICATE_BUSINESS';

                if (data.error && !isDuplicateError) {
                    errorMessage = typeof data.message === 'string' ? data.message : data.error;
                }
                if (data.code === 'MISSING_REQUIRED_FIELDS' && data.missingFields) {
                    const fields = data.missingFields.join(', ');
                    errorMessage = `Please provide ${fields.toLowerCase()}. These fields are required to create a business listing.`;
                } else if (data.code === 'UNAUTHORIZED') {
                    errorMessage = 'You need to be logged in to create a business listing. Please sign in and try again.';
                } else if (isDuplicateError) {
                    errorMessage = typeof data.message === 'string' ? data.message : 'A business with this name already exists.';
                    setNameDuplicateCheck({ checking: false, available: false });
                    setErrors((prev) => ({ ...prev, name: DUPLICATE_NAME_ERROR }));
                    setTouched((prev) => ({ ...prev, name: true }));
                } else if (data.code === 'INVALID_CATEGORY') {
                    errorMessage = 'There was an issue with the business category. Please select a valid category and try again.';
                } else if (data.code === 'INVALID_HOURS_FORMAT') {
                    errorMessage = 'There was an issue processing your business hours. Please check the format and try again.';
                }

                throw new Error(errorMessage);
            }

            if (!data.business || !data.business.id) {
                console.error('[Add Business] Business ID missing from API response:', data);
                throw new Error('Your business was created, but we couldn\'t retrieve its ID. Please check your business listings or contact support if this persists.');
            }

            const businessId = data.business.id;
            console.log(`[Add Business] Business created successfully with ID: ${businessId}`);

            // Note: business_owners entry is already created by the API
            // No need to insert again here

            if (data.uploadWarnings && data.uploadWarnings.length > 0) {
                console.warn('[Add Business] Image upload warnings:', data.uploadWarnings);
                showToast('Business created successfully, but some images had issues. You can add images later from the edit page.', 'sage', 5000);
            } else if (data.images && data.images.length > 0) {
                console.log(`[Add Business] Successfully uploaded ${data.images.length} images server-side`);
            }

            if (announcement) {
                announcement.textContent = 'Business submitted for review. Redirecting...';
            }

            showToast("Your business has been submitted for review. You'll be notified once approved.", 'success', 5000);
            setTimeout(() => {
                router.push('/my-businesses');
                router.refresh();
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

                <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                    <div className="">
                        <section className="relative overflow-hidden">
                            {/* Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
                            
                            <div className="container mx-auto max-w-[1300px] px-4 sm:px-6 relative z-10">
                                {/* Breadcrumb Navigation */}
                                <nav className="pb-1" aria-label="Breadcrumb">
                                    <ol className="flex items-center gap-2 text-sm sm:text-base">
                                        <li>
                                            <Link href={previousHref} className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                {previousLabel}
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
                                    <m.div
                                        className="text-center mb-8"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    >
                                        <div className="inline-block relative mb-2">
                                            <h1
                                                className={`${urbanist.className} text-2xl sm:text-3xl font-semibold mb-2 text-center leading-[1.2] tracking-tight text-charcoal`}
                                                style={{ fontFamily: urbanist.style.fontFamily }}
                                            >
                                                Create Business Profile
                                            </h1>
                                        </div>
                                        <m.p
                                            className="text-sm sm:text-base text-charcoal/70 font-urbanist max-w-md mx-auto"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3, duration: 0.4 }}
                                        >
                                            Connect with customers and grow your presence
                                        </m.p>
                                    </m.div>

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
                                            nameDuplicateCheck={nameDuplicateCheck}
                                        />

                                        {/* Location Information Section */}
                                        <LocationSection
                                            formData={formData}
                                            errors={errors}
                                            touched={touched}
                                            geocodeStatus={geocodeStatus}
                                            onInputChange={handleInputChange}
                                            onBlur={handleBlur}
                                            onLocationBlur={handleLocationBlurGeocode}
                                            onClearCoordinates={handleClearCoordinates}
                                            onLocationSelect={handleLocationSelect}
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

                                        {/* Ownership Pricing Disclaimer */}
                                        <m.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="rounded-[12px] border border-coral/20 bg-gradient-to-r from-coral/10 via-coral/5 to-white/90 p-4 sm:p-5 shadow-sm"
                                            role="note"
                                            aria-label="Business ownership pricing notice"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`${iconChipClass} mt-0.5 h-8 w-8 shrink-0`}>
                                                    <AlertCircle className="h-4 w-4" />
                                                </span>
                                                <div>
                                                    <p
                                                        className="text-sm sm:text-base font-semibold text-charcoal"
                                                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                                    >
                                                        Business Ownership Notice
                                                    </p>
                                                    <p
                                                        className="mt-1 text-sm sm:text-base leading-relaxed text-charcoal/80"
                                                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                                    >
                                                        {ownershipPricingNotice}
                                                    </p>
                                                </div>
                                            </div>
                                        </m.div>

                                        {/* Submit Button */}
                                        <m.div
                                            className="flex flex-col sm:flex-row gap-4 justify-end pt-4"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: 0.4 }}
                                        >
                                            <Link
                                                href="/claim-business"
                                                className="px-6 py-3 rounded-full border-2 border-charcoal/20 text-charcoal font-urbanist font-600 hover:bg-charcoal/5 transition-all duration-200 text-center"
                                            >
                                                Cancel
                                            </Link>
                                            <m.button
                                                type="submit"
                                                disabled={isSubmitting || nameDuplicateCheck.checking || nameDuplicateCheck.available === false}
                                                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                                                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-6 rounded-full hover:from-coral/90 hover:to-coral transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <AnimatePresence mode="wait">
                                                    {isSubmitting ? (
                                                        <m.div
                                                            key="loading"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <m.div className="flex items-center gap-1">
                                                                {[0, 1, 2, 3].map((i) => (
                                                                    <m.div
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
                                                            </m.div>
                                                            <span>Creating...</span>
                                                        </m.div>
                                                    ) : (
                                                        <m.div
                                                            key="default"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <span>Create Business Profile</span>
                                                        </m.div>
                                                    )}
                                                </AnimatePresence>
                                            </m.button>
                                        </m.div>
                                    </form>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

            </div>
        </>
    );
}
