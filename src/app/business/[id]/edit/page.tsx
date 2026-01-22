"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import React, { useMemo, useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { useToast } from "../../../contexts/ToastContext";
import {
    Store,
    Save,
    Upload,
    X,
    Plus,
    MapPin,
    Phone,
    Mail,
    Globe,
    Clock,
    DollarSign,
    Tag,
    ImageIcon,
    Edit3,
    Trash2,
} from "lucide-react";
import { PageLoader } from "../../../components/Loader";
import Header from "../../../components/Header/Header";
import { useRequireBusinessOwner } from "../../../hooks/useBusinessAccess";
import { getBrowserSupabase } from "../../../lib/supabase/client";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import EventsForm from "../../../components/BusinessEdit/EventsForm";

// CSS animations to match business profile page
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInFromTop {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-slide-in-top {
    animation: slideInFromTop 0.5s ease-out forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;

export default function BusinessEditPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const paramId = params?.id;
    const businessId = Array.isArray(paramId) ? paramId[0] : paramId;
    const redirectTarget = businessId ? `/business/${businessId}` : "/login";
    
    const { isChecking, hasAccess } = useRequireBusinessOwner({
        businessId,
        redirectTo: redirectTarget,
    });

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        priceRange: "$",
        hours: {
            monday: "",
            tuesday: "",
            wednesday: "",
            thursday: "",
            friday: "",
            saturday: "",
            sunday: "",
        },
        images: [] as string[],
        specials: [] as Array<{ id: number; name: string; description: string; icon: string }>,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [deletingImageIndex, setDeletingImageIndex] = useState<number | null>(null);
    const [reorderingImage, setReorderingImage] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Fetch business data
    useEffect(() => {
        const fetchBusiness = async () => {
            if (!businessId || isChecking) return;

            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch(`/api/businesses/${businessId}`, {
                    cache: 'no-store',
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Business not found');
                    } else {
                        setError('Failed to load business');
                    }
                    setIsLoading(false);
                    return;
                }

                const data = await response.json();
                
                // Populate form with business data
                setFormData({
                    name: data.name || "",
                    description: data.description || "",
                    category: data.category || "",
                    address: data.address || "",
                    phone: data.phone || "",
                    email: data.email || "",
                    website: data.website || "",
                    priceRange: data.price_range || "$",
                    hours: data.hours || {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: "",
                    },
                    images: data.uploaded_images || data.images || [], // Use uploaded_images array
                    specials: [], // Specials would need separate API endpoint
                });
            } catch (err: any) {
                console.error('Error fetching business:', err);
                setError('Failed to load business');
                showToast('Failed to load business data', 'sage', 4000);
            } finally {
                setIsLoading(false);
            }
        };

        if (hasAccess && !isChecking) {
            fetchBusiness();
        }
    }, [businessId, hasAccess, isChecking, showToast]);

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
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

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !businessId) return;

        // Check image limit before uploading (max 10 images per business)
        const MAX_IMAGES = 10;
        const currentCount = formData.images.length;
        const newCount = files.length;
        
        if (currentCount >= MAX_IMAGES) {
            showToast(`Maximum image limit reached (${MAX_IMAGES} images). Please delete some images before adding new ones.`, 'error', 5000);
            event.target.value = '';
            return;
        }
        
        if (currentCount + newCount > MAX_IMAGES) {
            const remainingSlots = MAX_IMAGES - currentCount;
            showToast(`You can only add ${remainingSlots} more image(s). Maximum limit is ${MAX_IMAGES} images per business.`, 'sage', 5000);
            event.target.value = '';
            return;
        }

        setUploadingImages(true);
        try {
            // Validate image files
            const { validateImageFiles, getFirstValidationError } = await import('@/lib/utils/imageValidation');
            const validationResults = validateImageFiles(Array.from(files));
            const invalidFiles = validationResults.filter(r => !r.valid);
            
            if (invalidFiles.length > 0) {
                const firstError = getFirstValidationError(Array.from(files));
                if (firstError) {
                    showToast(firstError, 'error', 6000);
                } else {
                    showToast('Some image files are invalid. Please upload only JPG, PNG, WebP, or GIF images under 5MB each.', 'error', 6000);
                }
                setUploadingImages(false);
                event.target.value = '';
                return;
            }

            const supabase = getBrowserSupabase();
            const uploadedUrls: string[] = [];
            const { STORAGE_BUCKETS } = await import('../../../lib/utils/storageBucketConfig');

            // Upload each file (respecting the limit)
            const filesToUpload = Array.from(files).slice(0, MAX_IMAGES - currentCount);
            const uploadErrors: string[] = [];
            
            for (let i = 0; i < filesToUpload.length; i++) {
                const file = filesToUpload[i];
                try {
                    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                    // Path pattern: {business_id}/{timestamp}_{index}.{ext} (matching API pattern)
                    const timestamp = Date.now();
                    const filePath = `${businessId}/${timestamp}_${i}.${fileExt}`;

                    // Upload to Supabase Storage
                    const { error: uploadError } = await supabase.storage
                        .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
                        .upload(filePath, file, {
                            contentType: file.type,
                            upsert: false, // Don't overwrite existing files
                        });

                    if (uploadError) {
                        // Handle specific error cases
                        if (uploadError.message.includes('already exists')) {
                            uploadErrors.push(`Image ${i + 1} already exists`);
                            continue;
                        }
                        console.error('[Edit Business] Error uploading image:', uploadError);
                        uploadErrors.push(`Failed to upload image ${i + 1}: ${uploadError.message}`);
                        continue;
                    }

                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
                        .getPublicUrl(filePath);

                    if (publicUrl) {
                        uploadedUrls.push(publicUrl);
                    } else {
                        uploadErrors.push(`Failed to get URL for image ${i + 1}`);
                    }
                } catch (fileError: any) {
                    console.error(`[Edit Business] Error processing image ${i + 1}:`, fileError);
                    uploadErrors.push(`Error processing image ${i + 1}: ${fileError.message || 'Unknown error'}`);
                }
            }

            // Show warnings if some uploads failed
            if (uploadErrors.length > 0 && uploadedUrls.length === 0) {
                showToast(`Failed to upload images: ${uploadErrors[0]}`, 'error', 6000);
                setUploadingImages(false);
                event.target.value = '';
                return;
            } else if (uploadErrors.length > 0) {
                showToast(`Some images failed to upload (${uploadErrors.length} error(s))`, 'sage', 5000);
            }

            if (uploadedUrls.length > 0) {
                // Add images via API
                const response = await fetch(`/api/businesses/${businessId}/images`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        images: uploadedUrls.map(url => ({ url }))
                    }),
                });

                if (!response.ok) {
                    const contentType = response.headers.get("content-type") || "";
                    const rawText = await response.text(); // ✅ read once
                    
                    let errorData: any = null;
                    
                    if (contentType.includes("application/json")) {
                        try {
                            errorData = rawText ? JSON.parse(rawText) : null;
                        } catch (e) {
                            errorData = { parseError: String(e), rawText };
                        }
                    } else {
                        errorData = { rawText };
                    }
                    
                    console.error("[Edit Business] API error response:", {
                        status: response.status,
                        statusText: response.statusText,
                        contentType,
                        errorData,
                        rawText,
                    });
                    
                    const message =
                        errorData?.error ||
                        errorData?.details ||
                        errorData?.message ||
                        `Server error (${response.status}): ${response.statusText}`;
                    
                    throw new Error(message);
                }

                // Update local state
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, ...uploadedUrls]
                }));

                showToast(`Successfully uploaded ${uploadedUrls.length} image(s)!`, 'success', 3000);
                
                // Notify other components
                const { notifyBusinessUpdated } = await import('../../../lib/utils/businessUpdateEvents');
                notifyBusinessUpdated(businessId);
            }
        } catch (error: any) {
            console.error('Error uploading images:', error);
            showToast(error.message || 'Failed to upload images', 'error', 5000);
        } finally {
            setUploadingImages(false);
            // Reset file input
            event.target.value = '';
        }
    };

    const removeImage = async (index: number) => {
        if (!businessId || index < 0 || index >= formData.images.length) return;

        const imageUrl = formData.images[index];
        if (!imageUrl) return;

        setDeletingImageIndex(index);
        try {
            // Encode the image URL for the API
            const encodedUrl = encodeURIComponent(imageUrl);
            
            const response = await fetch(`/api/businesses/${businessId}/images/${encodedUrl}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete image');
            }

            const result = await response.json();
            
            // Update local state
            setFormData(prev => ({
                ...prev,
                images: prev.images.filter((_, i) => i !== index)
            }));

            showToast(result.message || 'Image deleted successfully', 'success', 3000);
            
            // Notify other components
            const { notifyBusinessUpdated } = await import('../../../lib/utils/businessUpdateEvents');
            notifyBusinessUpdated(businessId);
        } catch (error: any) {
            console.error('Error deleting image:', error);
            showToast(error.message || 'Failed to delete image', 'error', 5000);
        } finally {
            setDeletingImageIndex(null);
        }
    };

    const setAsPrimary = async (index: number) => {
        if (!businessId || index < 0 || index >= formData.images.length || index === 0) return;

        setReorderingImage(index);
        try {
            // Reorder images: move selected image to first position
            const newImages = [...formData.images];
            const [movedImage] = newImages.splice(index, 1);
            newImages.unshift(movedImage);

            // Update uploaded_images array directly via Supabase
            const supabase = getBrowserSupabase();
            const { error: updateError } = await supabase
                .from('businesses')
                .update({ uploaded_images: newImages })
                .eq('id', businessId);

            if (updateError) {
                throw new Error(updateError.message || 'Failed to reorder images');
            }

            // Update local state
            setFormData(prev => ({
                ...prev,
                images: newImages
            }));

            showToast('Primary image updated successfully!', 'success', 3000);
            
            // Notify other components
            const { notifyBusinessUpdated } = await import('../../../lib/utils/businessUpdateEvents');
            notifyBusinessUpdated(businessId);
        } catch (error: any) {
            console.error('Error reordering images:', error);
            showToast(error.message || 'Failed to set primary image', 'error', 5000);
        } finally {
            setReorderingImage(null);
        }
    };

    const addSpecial = () => {
        const newSpecial = {
            id: Date.now(),
            name: "",
            description: "",
            icon: "star"
        };
        setFormData(prev => ({
            ...prev,
            specials: [...prev.specials, newSpecial]
        }));
    };

    const updateSpecial = (id: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            specials: prev.specials.map(special => 
                special.id === id ? { ...special, [field]: value } : special
            )
        }));
    };

    const removeSpecial = (id: number) => {
        setFormData(prev => ({
            ...prev,
            specials: prev.specials.filter(special => special.id !== id)
        }));
    };

    const handleSave = async () => {
        if (!businessId) {
            showToast('Business ID is required', 'sage', 3000);
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`/api/businesses/${businessId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    category: formData.category,
                    address: formData.address,
                    phone: formData.phone,
                    email: formData.email,
                    website: formData.website,
                    priceRange: formData.priceRange,
                    hours: formData.hours,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save business');
            }

            const result = await response.json();
            showToast('Business updated successfully!', 'success', 2000);
            
            // Notify other components about the update
            const { notifyBusinessUpdated } = await import('../../../lib/utils/businessUpdateEvents');
            notifyBusinessUpdated(businessId);
            
            // Invalidate Next.js router cache and redirect
            router.refresh(); // Invalidate all cached data
            
            // Redirect to business page after short delay
            setTimeout(() => {
                router.push(`/business/${businessId}`);
            }, 500);
        } catch (error: any) {
            console.error('Error saving business:', error);
            showToast(error.message || 'Failed to save business', 'sage', 4000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteDialogOpen(true);
        setDeleteError(null);
    };

    const handleConfirmDelete = async () => {
        try {
            // ✅ Always prefer the route param id (source of truth)
            const businessIdToDelete =
                (typeof paramId === "string" ? paramId : undefined) ||
                businessId;

            if (!businessIdToDelete) {
                throw new Error("Missing business id");
            }

            setIsDeleting(true);
            setDeleteError(null);

            // Log the ID we're about to delete for debugging
            console.log('[Delete] Attempting to delete business:', {
                paramId,
                businessId,
                businessIdToDelete,
            });

            const response = await fetch(`/api/businesses/${businessIdToDelete}`, {
                method: 'DELETE',
                headers: { "Content-Type": "application/json" },
            });

            // ✅ Attempt to read JSON, even on errors
            let payload: any = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                // ✅ If it's already gone / not visible, treat it as a soft-success for UX
                if (response.status === 404) {
                    showToast('This business no longer exists or you don\'t have access.', 'sage', 4000);
                    // Redirect to profile since business is gone
                    setIsDeleteDialogOpen(false);
                    setTimeout(() => {
                        router.replace('/profile');
                    }, 1500);
                    return;
                }

                // Handle 403 Forbidden (no permission)
                if (response.status === 403) {
                    throw new Error('You do not have permission to delete this business');
                }

                // Handle 401 Unauthorized
                if (response.status === 401) {
                    throw new Error('You must be logged in to delete this business');
                }

                // Handle 400 Bad Request
                if (response.status === 400) {
                    throw new Error(payload?.error || 'Invalid business ID');
                }

                // Handle 500 Server Error with details
                if (response.status === 500) {
                    const details = payload?.details || 'Server error occurred';
                    throw new Error(`Failed to delete business: ${details}`);
                }

                throw new Error(payload?.error || `Failed to delete business (HTTP ${response.status})`);
            }

            // ✅ Success
            showToast('Business deleted successfully', 'success', 3000);
            
            // Notify other components about the deletion
            const { notifyBusinessDeleted } = await import('../../../lib/utils/businessUpdateEvents');
            notifyBusinessDeleted(businessIdToDelete);
            
            // Close dialog and redirect to profile after deletion
            setIsDeleteDialogOpen(false);
            setTimeout(() => {
                router.replace('/profile');
            }, 1000);
        } catch (error: any) {
            console.error('Error deleting business:', error);
            setDeleteError(error.message || 'Failed to delete business');
            showToast(error.message || 'Failed to delete business', 'error', 5000);
        } finally {
            setIsDeleting(false);
        }
    };

    const categories = [
        "Restaurant", "Cafe", "Bar", "Fast Food", "Fine Dining",
        "Bakery", "Food Truck", "Catering", "Grocery", "Other", "Miscellaneous"
    ];

    const priceRanges = ["$", "$$", "$$$", "$$$$"];

    const days = [
        { key: "monday", label: "Monday" },
        { key: "tuesday", label: "Tuesday" },
        { key: "wednesday", label: "Wednesday" },
        { key: "thursday", label: "Thursday" },
        { key: "friday", label: "Friday" },
        { key: "saturday", label: "Saturday" },
        { key: "sunday", label: "Sunday" },
    ];

    if (!businessId || isChecking || isLoading) {
        return <PageLoader size="lg" variant="wavy" color="sage"  />;
    }

    if (!hasAccess) {
        return (
            <div className="min-h-dvh bg-off-white flex items-center justify-center px-6 text-center">
                <div className="space-y-4 max-w-sm">
                    <h2 className="text-xl font-semibold text-charcoal font-urbanist">Access denied</h2>
                    <p className="text-sm text-charcoal/70 font-urbanist">
                        You must be a verified owner of this business to edit its profile.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href={`/business/${businessId}`}
                            className="px-5 py-2.5 rounded-full bg-sage text-white font-urbanist font-600 hover:bg-sage/90 transition-all duration-200"
                        >
                            View Business
                        </Link>
                        <Link
                          href="/claim-business"
                            className="px-5 py-2.5 rounded-full border border-sage/40 text-charcoal font-urbanist font-600 hover:bg-sage/10 transition-all duration-200"
                        >
                            Claim Ownership
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-dvh bg-off-white flex items-center justify-center px-6 text-center">
                <div className="space-y-4 max-w-sm">
                    <h2 className="text-xl font-semibold text-charcoal font-urbanist">Error</h2>
                    <p className="text-sm text-charcoal/70 font-urbanist">{error}</p>
                    <Link
                        href={`/business/${businessId}`}
                        className="px-5 py-2.5 rounded-full bg-sage text-white font-urbanist font-600 hover:bg-sage/90 transition-all duration-200"
                    >
                        Back to Business
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: animations }} />
            {/* Google Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            {/* SF Pro Font Setup */}
            <style jsx global>{`
                .font-urbanist {
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
                        "SF Pro Display", "Helvetica Neue", Helvetica, Arial, system-ui,
                        sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
                }
            `}</style>
            <div
                className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
                style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                }}
            >
                {/* Main Header */}
                <Header
                  showSearch={false}
                  variant="white"
                  backgroundClassName="bg-navbar-bg"
                  topPosition="top-0"
                  reducedPadding={true}
                  whiteText={true}
                />

                <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
                    <div className="pt-20 sm:pt-24">
                        <section
                            className="relative"
                            style={{
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                            }}
                        >
                            <div className="container mx-auto max-w-[1300px] px-4 sm:px-6 relative z-10">
                                {/* Breadcrumb Navigation */}
                                <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
                                    <ol className="flex items-center gap-2 text-sm sm:text-base flex-nowrap overflow-x-auto scrollbar-hide">
                                        <li className="flex-shrink-0">
                                            <Link href={`/business/${businessId}`} className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium whitespace-nowrap truncate max-w-[150px] sm:max-w-none" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Business
                                            </Link>
                                        </li>
                                        <li className="flex items-center flex-shrink-0">
                                            <ChevronRight className="w-4 h-4 text-navbar-bg" />
                                        </li>
                                        <li className="min-w-0 flex-1">
                                            <span className="text-charcoal font-semibold truncate block" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Edit
                                            </span>
                                        </li>
                                    </ol>
                                </nav>
                                <div className="max-w-6xl mx-auto pt-8 pb-8">
                    <div className="space-y-6">
                        {/* Basic Information Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/50 backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-100">
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <Store className="w-4 h-4 text-navbar-bg" />
                                    </span>
                                    Basic Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Business Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter business name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => handleInputChange('category', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                        >
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-[20px] text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200 resize-none"
                                            placeholder="Describe your business..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Images Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/50 backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-200">
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <ImageIcon className="w-4 h-4 text-navbar-bg" />
                                    </span>
                                    Business Photos
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                                    {formData.images.map((image, index) => (
                                        <div key={index} className="relative group">
                                            <div className="aspect-square rounded-sm overflow-hidden bg-white/20 border border-white/50 relative">
                                                {deletingImageIndex === index ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-charcoal/20">
                                                        <PageLoader size="sm" variant="wavy" color="sage" />
                                                    </div>
                                                ) : (
                                                    <Image
                                                        src={image}
                                                        alt={`Business photo ${index + 1}`}
                                                        width={200}
                                                        height={200}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                                {index === 0 && (
                                                    <div className="absolute top-2 left-2 bg-sage text-white text-xs px-2 py-1 rounded-full font-semibold">
                                                        Primary
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-sm flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                {index !== 0 && (
                                                    <button
                                                        onClick={() => setAsPrimary(index)}
                                                        disabled={reorderingImage === index}
                                                        className="bg-sage hover:bg-sage/90 text-white px-3 py-1.5 rounded-sm text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        aria-label="Set as primary image"
                                                    >
                                                        {reorderingImage === index ? (
                                                            <>
                                                                <PageLoader size="xs" variant="wavy" color="white" />
                                                                <span>Setting...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Edit3 className="w-3 h-3 text-navbar-bg" />
                                                                <span>Set Primary</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeImage(index)}
                                                    disabled={deletingImageIndex === index}
                                                    className="bg-gradient-to-br from-charcoal to-charcoal/90 hover:from-charcoal/90 hover:to-charcoal/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                    aria-label="Remove image"
                                                >
                                                    {deletingImageIndex === index ? (
                                                        <>
                                                            <PageLoader size="xs" variant="wavy" color="white" />
                                                            <span>Deleting...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X className="w-3 h-3 text-navbar-bg" strokeWidth={2.5} />
                                                            <span>Delete</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {formData.images.length < 10 && (
                                        <label className="aspect-square rounded-sm border-2 border-dashed border-charcoal/30 flex items-center justify-center cursor-pointer hover:border-sage hover:bg-sage/5 transition-all duration-200">
                                            <div className="text-center">
                                                <Upload className="w-8 h-8 text-navbar-bg mx-auto mb-2" />
                                                <span className="font-urbanist text-sm text-charcoal/60">Add Photo</span>
                                                <span className="font-urbanist text-xs text-charcoal/60 block mt-1">
                                                    {10 - formData.images.length} remaining
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                disabled={uploadingImages || formData.images.length >= 10}
                                            />
                                        </label>
                                    )}
                                </div>

                                {uploadingImages && (
                                    <div className="text-center py-4">
                                        <PageLoader size="sm" variant="wavy" color="sage"  />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Information Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/50 backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-300">
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <Phone className="w-4 h-4 text-navbar-bg" />
                                    </span>
                                    Contact Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <MapPin className="w-4 h-4 text-navbar-bg" />
                                            Address
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter business address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <Phone className="w-4 h-4 text-navbar-bg" />
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter phone number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <Mail className="w-4 h-4 text-navbar-bg" />
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter email address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <Globe className="w-4 h-4 text-navbar-bg" />
                                            Website
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => handleInputChange('website', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm placeholder:text-charcoal/70 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter website URL"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
                                            <DollarSign className="w-4 h-4 text-navbar-bg" />
                                            Price Range
                                        </label>
                                        <select
                                            value={formData.priceRange}
                                            onChange={(e) => handleInputChange('priceRange', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                        >
                                            {priceRanges.map(range => (
                                                <option key={range} value={range}>{range}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Business Hours Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/50 backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up">
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <Clock className="w-4 h-4 text-navbar-bg" />
                                    </span>
                                    Business Hours
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {days.map(day => (
                                        <div key={day.key} className="flex items-center gap-3">
                                            <label className="w-24 text-sm font-semibold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>{day.label}</label>
                                            <input
                                                type="text"
                                                value={formData.hours[day.key as keyof typeof formData.hours]}
                                                onChange={(e) => handleHoursChange(day.key, e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                placeholder="e.g., 9:00 AM - 5:00 PM"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Specials Section */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/50 backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-urbanist text-base font-600 text-charcoal flex items-center gap-3">
                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                            <Tag className="w-4 h-4 text-navbar-bg" />
                                        </span>
                                        Specials & Offers
                                    </h3>
                                    <button
                                        onClick={addSpecial}
                                        className="bg-sage hover:bg-sage/90 text-white px-4 py-2 rounded-full text-sm font-600 font-urbanist transition-all duration-300 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4 text-navbar-bg" />
                                        Add Special
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.specials.map((special) => (
                                        <div key={special.id} className="bg-white/40 backdrop-blur-sm rounded-full p-4 border border-white/50 group relative">
                                            <button
                                                onClick={() => removeSpecial(special.id)}
                                                className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 border border-white/30 shadow-lg z-10"
                                                aria-label="Remove special"
                                            >
                                                <X className="w-4 h-4 text-navbar-bg" strokeWidth={2.5} />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Name</label>
                                                    <input
                                                        type="text"
                                                        value={special.name}
                                                        onChange={(e) => updateSpecial(special.id, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                        placeholder="Special name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>Description</label>
                                                    <input
                                                        type="text"
                                                        value={special.description}
                                                        onChange={(e) => updateSpecial(special.id, 'description', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                        placeholder="When available"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Events & Specials Management */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/50 backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
                            <div className="relative z-10">
                                {businessId && formData.name && (
                                    <EventsForm businessId={businessId} businessName={formData.name} />
                                )}
                            </div>
                        </div>

                        {/* Danger Zone - Delete Business */}
                        <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/50 backdrop-blur-md shadow-md ring-1 ring-white/20 px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-navbar-bg/20 to-navbar-bg/10">
                                        <Trash2 className="w-5 h-5 text-navbar-bg" />
                                    </span>
                                    <h3 className="text-base font-semibold text-charcoal">
                                        Danger Zone
                                    </h3>
                                </div>
                                <div className="border-t border-coral/20 pt-4">
                                    <h4 className="text-base font-600 text-coral mb-2" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>Delete Business</h4>
                                    <p className="text-sm text-charcoal/70 mb-4" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}>
                                        Permanently delete this business and all associated data. This action cannot be undone.
                                    </p>
                                    <button
                                        onClick={handleDeleteClick}
                                        disabled={isDeleting}
                                        className="px-6 py-2 rounded-full text-sm font-600 bg-white/40 text-coral border border-coral hover:bg-coral hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}
                                    >
                                        {isDeleting ? "Deleting..." : "Delete Business"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-between items-center gap-3">
                            <Link
                                href={`/business/${businessId}`}
                                className="px-6 py-3 bg-white/40 text-charcoal rounded-full text-sm font-600 font-urbanist transition-all duration-300 hover:bg-white/60 border border-white/50"
                            >
                                Cancel
                            </Link>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-3 bg-sage hover:bg-sage/90 text-white rounded-full text-sm font-600 font-urbanist transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 text-navbar-bg" />
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Delete Business Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setDeleteError(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Business"
                message={`Are you sure you want to delete "${formData.name}"? This action cannot be undone. All business data, images, reviews, and statistics will be permanently deleted.`}
                confirmText={isDeleting ? "Deleting..." : "Delete Business"}
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
                error={deleteError}
                requireConfirmText="DELETE"
            />
        </>
    );
}
