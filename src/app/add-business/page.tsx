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
import { Urbanist } from "next/font/google";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";
import { STORAGE_BUCKETS } from "../lib/utils/storageBucketConfig";

const LocationPicker = dynamic(() => import("../components/AddBusiness/LocationPicker"), {
    ssr: false,
    loading: () => null,
});

const urbanist = Urbanist({
    weight: ["400", "600", "700", "800"],
    subsets: ["latin"],
    display: "swap",
});

const Footer = dynamic(() => import("../components/Footer/Footer"), {
    loading: () => null,
    ssr: false,
});

// Generic Custom Dropdown Component
interface CustomDropdownProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: Array<{ value: string; label: string }>;
    className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, placeholder, options, className = 'flex-1' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const displayValue = options.find(opt => opt.value === value)?.label || placeholder;

    return (
        <div ref={dropdownRef} className={`relative ${isOpen ? 'z-[9999]' : 'z-auto'} ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                className="w-full bg-off-white rounded-[20px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl pl-4 pr-10 py-3 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-navbar-bg/30 focus:border-navbar-bg transition-all duration-200 hover:shadow-[0_8px_40px_rgba(0,0,0,0.15)] cursor-pointer text-left flex items-center justify-between"
            >
                <span className={value ? 'text-charcoal' : 'text-charcoal/50'}>{displayValue}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    ref={dropdownMenuRef}
                    className="absolute z-[10000] w-full mt-2 bg-off-white rounded-[20px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl overflow-hidden max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-navbar-bg/20 scrollbar-track-transparent"
                    style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    }}
                >
                    {options.map((option, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-sm font-semibold transition-all duration-150 ${
                                option.value === value
                                    ? 'bg-gradient-to-r from-sage/10 to-sage/5 text-charcoal'
                                    : 'text-charcoal hover:bg-gradient-to-r hover:from-sage/10 hover:to-coral/5'
                            }`}
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Custom Time Dropdown Component (wrapper around CustomDropdown)
interface TimeDropdownProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}

const TimeDropdown: React.FC<TimeDropdownProps> = ({ value, onChange, placeholder }) => {
    const times = ['12:00 AM', '1:00 AM', '2:00 AM', '3:00 AM', '4:00 AM', '5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'];

    // Build time options
    const timeOptions = times.map(t => ({ value: t, label: t }));

    // Add "Closed" option if placeholder is "Closed"
    if (placeholder === 'Closed') {
        timeOptions.unshift({ value: '', label: 'Closed' });
    } else {
        // Add empty option for other cases
        timeOptions.unshift({ value: '', label: placeholder });
    }

    return <CustomDropdown value={value} onChange={onChange} placeholder={placeholder} options={timeOptions} className="flex-1" />;
};

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

// Helper function to get user-friendly field labels
const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
        name: 'business name',
        category: 'category',
        location: 'location',
        email: 'email address',
        website: 'website URL',
        phone: 'phone number',
        address: 'address',
        description: 'description',
        lat: 'latitude',
        lng: 'longitude',
    };
    return labels[fieldName] || fieldName;
};

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
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
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

    // Handle location selection from map picker
    const handleLocationSelect = (lat: number, lng: number, formattedAddress?: string) => {
        setFormData(prev => ({
            ...prev,
            lat: lat.toString(),
            lng: lng.toString(),
            // Update address if we got a formatted address from reverse geocoding
            ...(formattedAddress && !prev.address ? { address: formattedAddress } : {}),
        }));
        showToast('Location selected!', 'success', 2000);
    };

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
            if (formData.intent) formDataToSend.append('intent', formData.intent);
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
                body: formDataToSend, // FormData - no Content-Type header (browser sets it with boundary)
            });

            const data = await response.json();

            if (!response.ok) {
                // Provide user-friendly error messages based on response
                let errorMessage = 'We couldn\'t create your business listing. Please try again.';
                
                if (data.error) {
                    // Use the error message from API if available (it's already user-friendly)
                    errorMessage = data.error;
                    
                    // Handle specific error codes for additional context
                    if (data.code === 'MISSING_REQUIRED_FIELDS' && data.missingFields) {
                        // API already provides a good message, but we can enhance it
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

            // Validate business ID from API response
            if (!data.business || !data.business.id) {
                console.error('[Add Business] Business ID missing from API response:', data);
                throw new Error('Your business was created, but we couldn\'t retrieve its ID. Please check your business listings or contact support if this persists.');
            }

            const businessId = data.business.id;
            console.log(`[Add Business] Business created successfully with ID: ${businessId}`);

            // Images are handled server-side, check for any upload warnings
            if (data.uploadWarnings && data.uploadWarnings.length > 0) {
                console.warn('[Add Business] Image upload warnings:', data.uploadWarnings);
                showToast('Business created successfully, but some images had issues. You can add images later from the edit page.', 'sage', 5000);
            } else if (data.images && data.images.length > 0) {
                console.log(`[Add Business] Successfully uploaded ${data.images.length} images server-side`);
            }

            // Announce success to screen readers
            if (announcement) {
                announcement.textContent = 'Business created successfully! Redirecting...';
            }
            
            showToast('Your business has been created successfully! Redirecting to your business page...', 'success', 4000);

            // Redirect based on intent - ensure feedback is visible before redirect
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
            
            // Provide user-friendly error messages with helpful context
            let errorMessage = 'We couldn\'t create your business listing. Please check your information and try again.';
            
            if (error.message) {
                // Use the error message from API (already user-friendly)
                errorMessage = error.message;
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
                errorMessage = 'Unable to connect to our servers. Please check your internet connection and try again. If the problem persists, you may be experiencing network issues.';
            } else if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
                errorMessage = 'The request took too long to complete. This might be due to large image files. Please try again with smaller images or fewer images.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'The request was cancelled. Please try submitting again.';
            } else if (error instanceof DOMException && error.name === 'NetworkError') {
                errorMessage = 'Network error detected. Please check your internet connection and try again.';
            }
            
            showToast(errorMessage, 'error', 6000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const priceRanges = [
        { value: "$", label: "Budget Friendly" },
        { value: "$$", label: "Moderate" },
        { value: "$$$", label: "Upscale" },
        { value: "$$$$", label: "Luxury" },
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
                                            <Link href="/for-businesses" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                for businesses
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
                                        <p className="text-sm sm:text-base text-charcoal/70 font-urbanist max-w-md mx-auto">
                                            Create your business profile to connect with customers and manage your listing
                                        </p>
                                    </div>

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
                                                            name="name"
                                                            id="name"
                                                            value={formData.name}
                                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                                            onBlur={() => handleBlur('name')}
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
                                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                                            >
                                                                {errors.name}
                                                            </p>
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
                                                                                ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-white'
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
                                                                                ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-white'
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
                                                                                ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-white'
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
                                                                                className={`flex items-center gap-3 p-4 rounded-full border-2 transition-all duration-200 ${
                                                                                    formData.intent === 'owner'
                                                                                        ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral text-white'
                                                                                        : 'bg-white/10 border-white/30 text-white/80 hover:border-white/50 hover:bg-white/15'
                                                                                }`}
                                                                            >
                                                                                <UserCheck className="w-5 h-5" />
                                                                                <span className="text-sm font-semibold">I own/manage it</span>
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
                                                    <div>
                                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                            {formData.businessType === 'service-area' 
                                                                ? 'Service Area (City/Area)' 
                                                                : formData.businessType === 'online-only'
                                                                ? 'Location (Optional)'
                                                                : 'Location (City/Area)'} 
                                                            {formData.businessType !== 'online-only' && <span className="text-coral">*</span>}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="location"
                                                            id="location"
                                                            value={formData.location}
                                                            onChange={(e) => handleInputChange('location', e.target.value)}
                                                            onBlur={() => handleBlur('location')}
                                                            aria-invalid={touched.location && errors.location ? "true" : "false"}
                                                            aria-describedby={touched.location && errors.location ? "location-error" : formData.businessType === 'online-only' ? "location-helper" : undefined}
                                                            aria-required={formData.businessType !== 'online-only'}
                                                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                            className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                                                                errors.location
                                                                    ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20'
                                                                    : 'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
                                                            }`}
                                                            placeholder={formData.businessType === 'online-only' ? "e.g., Cape Town, South Africa (optional)" : "e.g., Cape Town, V&A Waterfront"}
                                                        />
                                                        {touched.location && errors.location && (
                                                            <p 
                                                                id="location-error"
                                                                className="mt-2 text-sm text-navbar-bg font-medium flex items-center gap-1.5" 
                                                                role="alert"
                                                                aria-live="polite"
                                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                                            >
                                                                {errors.location}
                                                            </p>
                                                        )}
                                                        {formData.businessType === 'online-only' && !errors.location && (
                                                            <p 
                                                                id="location-helper"
                                                                className="mt-1.5 text-xs text-white/60" 
                                                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                                            >
                                                                Optional: Add your location to help customers find you
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Address - Show for all business types */}
                                                    {formData.businessType && (
                                                        <div>
                                                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                Full Address {formData.businessType === 'online-only' && <span className="text-white/60 text-xs">(Optional)</span>}
                                                            </label>
                                                        <input
                                                            type="text"
                                                            name="address"
                                                            id="address"
                                                            value={formData.address}
                                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                                                className="w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg"
                                                                placeholder="Street address, building number, etc."
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Location Selection - Show for all business types */}
                                                    {formData.businessType && (
                                                        <div className="space-y-4">
                                                            <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                Location Coordinates (Optional)
                                                            </label>
                                                            
                                                            {/* Action Buttons */}
                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleGeocodeAddress}
                                                                    disabled={isGeocoding || (!formData.address && !formData.location)}
                                                                    className="flex-1 px-4 py-3 bg-white/95 text-charcoal rounded-full hover:bg-white border border-white/60 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                                                                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                                                >
                                                                    {isGeocoding ? (
                                                                        <>
                                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                                            Getting coordinates...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <MapPin className="w-4 h-4" />
                                                                            Get from Address
                                                                        </>
                                                                    )}
                                                                </button>
                                                                
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsLocationPickerOpen(true)}
                                                                    className="flex-1 px-4 py-3 bg-sage text-white rounded-full hover:bg-sage/90 flex items-center justify-center gap-2 transition-all"
                                                                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                                                >
                                                                    <MapPin className="w-4 h-4" />
                                                                    Pick on Map
                                                                </button>
                                                            </div>

                                                            {/* Display selected coordinates (read-only) */}
                                                            {(formData.lat || formData.lng) && (
                                                                <div className="mt-3 p-3 bg-white/20 rounded-lg border border-white/30">
                                                                    <p className="text-xs text-white/80 mb-1" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                                                        Selected Coordinates:
                                                                    </p>
                                                                    <p className="text-sm font-semibold text-white" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                                                        {formData.lat && formData.lng 
                                                                            ? `${parseFloat(formData.lat).toFixed(6)}, ${parseFloat(formData.lng).toFixed(6)}`
                                                                            : formData.lat 
                                                                            ? `Lat: ${formData.lat}` 
                                                                            : `Lng: ${formData.lng}`
                                                                        }
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData(prev => ({ ...prev, lat: '', lng: '' }));
                                                                            showToast('Coordinates cleared', 'sage', 2000);
                                                                        }}
                                                                        className="mt-2 text-xs text-white/70 hover:text-white underline"
                                                                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                                                                    >
                                                                        Clear coordinates
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <p className="text-xs text-white/60" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                                                Tip: Enter your address above and click "Get from Address", or click "Pick on Map" to select a location visually.
                                                            </p>
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
                                                        <CustomDropdown
                                                            value={formData.priceRange}
                                                            onChange={(value) => handleInputChange('priceRange', value)}
                                                            placeholder="Select price range"
                                                            options={priceRanges}
                                                            className="w-full"
                                                        />
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

                                                <div className="space-y-3">
                                                    {[
                                                        { key: "monday", label: "Monday" },
                                                        { key: "tuesday", label: "Tuesday" },
                                                        { key: "wednesday", label: "Wednesday" },
                                                        { key: "thursday", label: "Thursday" },
                                                        { key: "friday", label: "Friday" },
                                                        { key: "saturday", label: "Saturday" },
                                                        { key: "sunday", label: "Sunday" },
                                                    ].map(day => {
                                                        const currentValue = formData.hours[day.key as keyof typeof formData.hours];
                                                        const [openTime, closeTime] = currentValue ? currentValue.split(' - ') : ['', ''];

                                                        return (
                                                            <div key={day.key} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                                                <label className="w-24 text-sm font-semibold text-white flex-shrink-0" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                                                    {day.label}
                                                                </label>
                                                                <div className="flex items-center gap-2 flex-1 w-full">
                                                                    <TimeDropdown
                                                                        value={openTime}
                                                                        onChange={(value) => {
                                                                            const newValue = value && closeTime ? `${value} - ${closeTime}` : value;
                                                                            handleHoursChange(day.key, newValue);
                                                                        }}
                                                                        placeholder="Closed"
                                                                    />
                                                                    {openTime && (
                                                                        <>
                                                                            <span className="text-white text-sm font-semibold px-2">to</span>
                                                                            <TimeDropdown
                                                                                value={closeTime}
                                                                                onChange={(value) => {
                                                                                    const newValue = `${openTime} - ${value}`;
                                                                                    handleHoursChange(day.key, newValue);
                                                                                }}
                                                                                placeholder="Select"
                                                                            />
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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
                                                        <span>Create Business Profile</span>
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

            {/* Location Picker Modal */}
            {isLocationPickerOpen && (
                <LocationPicker
                    address={formData.address}
                    location={formData.location}
                    lat={formData.lat ? parseFloat(formData.lat) : null}
                    lng={formData.lng ? parseFloat(formData.lng) : null}
                    onLocationSelect={handleLocationSelect}
                    onClose={() => setIsLocationPickerOpen(false)}
                />
            )}
        </>
    );
}

