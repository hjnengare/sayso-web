"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { ChevronRight } from "react-feather";
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
} from "lucide-react";
import { PageLoader } from "../../../components/Loader";
import Header from "../../../components/Header/Header";
import { useRequireBusinessOwner } from "../../../hooks/useBusinessAccess";

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
    const paramId = params?.id;
    const businessId = Array.isArray(paramId) ? paramId[0] : paramId;
    const redirectTarget = businessId ? `/business/${businessId}` : "/business/login";
    const { isChecking, hasAccess } = useRequireBusinessOwner({
        businessId,
        redirectTo: redirectTarget,
    });

    // Form state
    const [formData, setFormData] = useState({
        name: "Mama's Kitchen",
        description: "Authentic Italian cuisine with a modern twist. Family-owned restaurant serving fresh pasta, wood-fired pizzas, and traditional Italian dishes.",
        category: "Restaurant",
        address: "123 Main Street, San Francisco, CA 94102",
        phone: "+1 (555) 123-4567",
        email: "info@mamaskitchen.com",
        website: "https://mamaskitchen.com",
        priceRange: "$$",
        hours: {
            monday: "11:00 AM - 10:00 PM",
            tuesday: "11:00 AM - 10:00 PM",
            wednesday: "11:00 AM - 10:00 PM",
            thursday: "11:00 AM - 10:00 PM",
            friday: "11:00 AM - 11:00 PM",
            saturday: "10:00 AM - 11:00 PM",
            sunday: "10:00 AM - 9:00 PM",
        },
        images: [
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=900&fit=crop",
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&h=900&fit=crop",
            "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&h=900&fit=crop",
        ],
        specials: [
            { id: 1, name: "2 for 1 Pizza", description: "Every day", icon: "pizza" },
            { id: 2, name: "Jazz Night", description: "Mondays", icon: "musical-notes" },
        ],
    });

    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);

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

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setUploadingImages(true);
            // Simulate upload
            setTimeout(() => {
                const newImages = Array.from(files).map(file => URL.createObjectURL(file));
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, ...newImages]
                }));
                setUploadingImages(false);
            }, 1000);
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
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
        setIsSaving(true);
        try {
            if (!businessId) {
                setIsSaving(false);
                return;
            }
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            router.push(`/business/${businessId}`);
        } catch (error) {
            console.error('Error saving business:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const categories = [
        "Restaurant", "Cafe", "Bar", "Fast Food", "Fine Dining",
        "Bakery", "Food Truck", "Catering", "Grocery", "Other"
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

    if (!businessId || isChecking) {
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
                    <div className="py-1 pt-20">
                        <section
                            className="relative"
                            style={{
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                            }}
                        >
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
                                            <Link href={`/business/${businessId}`} className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium truncate max-w-[150px] sm:max-w-none" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Business
                                            </Link>
                                        </li>
                                        <li className="flex items-center">
                                            <ChevronRight className="w-4 h-4 text-charcoal/40" />
                                        </li>
                                        <li>
                                            <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                                Edit
                                            </span>
                                        </li>
                                    </ol>
                                </nav>
                                <div className="max-w-6xl mx-auto pt-8 pb-8">
                    <div className="space-y-6">
                        {/* Basic Information Section */}
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-xl ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up animate-delay-100">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <Store className="w-4 h-4 text-sage" />
                                    </span>
                                    Basic Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">Business Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter business name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => handleInputChange('category', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                        >
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200 resize-none"
                                            placeholder="Describe your business..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information Section */}
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-xl ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up animate-delay-200">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-coral/10 to-transparent rounded-full blur-lg" />
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                        <Phone className="w-4 h-4 text-coral" />
                                    </span>
                                    Contact Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-charcoal/60" />
                                            Address
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter business address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2 flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-charcoal/60" />
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter phone number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2 flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-charcoal/60" />
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter email address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2 flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-charcoal/60" />
                                            Website
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => handleInputChange('website', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl text-sm placeholder:text-charcoal/50 font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                            placeholder="Enter website URL"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-urbanist text-sm font-600 text-charcoal mb-2 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-charcoal/60" />
                                            Price Range
                                        </label>
                                        <select
                                            value={formData.priceRange}
                                            onChange={(e) => handleInputChange('priceRange', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-xl text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
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
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-xl ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up animate-delay-300">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                        <Clock className="w-4 h-4 text-sage" />
                                    </span>
                                    Business Hours
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {days.map(day => (
                                        <div key={day.key} className="flex items-center gap-3">
                                            <label className="w-24 font-urbanist text-sm font-600 text-charcoal">{day.label}</label>
                                            <input
                                                type="text"
                                                value={formData.hours[day.key as keyof typeof formData.hours]}
                                                onChange={(e) => handleHoursChange(day.key, e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-lg text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                placeholder="e.g., 9:00 AM - 5:00 PM"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Images Section */}
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-xl ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-coral/10 to-transparent rounded-full blur-lg" />
                            <div className="relative z-10">
                                <h3 className="font-urbanist text-base font-600 text-charcoal mb-6 flex items-center gap-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-coral/20 to-coral/10">
                                        <ImageIcon className="w-4 h-4 text-coral" />
                                    </span>
                                    Business Photos
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                                    {formData.images.map((image, index) => (
                                        <div key={index} className="relative group">
                                            <div className="aspect-square rounded-lg overflow-hidden bg-white/20 border border-white/50">
                                                <Image
                                                    src={image}
                                                    alt={`Business photo ${index + 1}`}
                                                    width={200}
                                                    height={200}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 w-7 h-7 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 border border-white/30 shadow-lg"
                                                aria-label="Remove image"
                                            >
                                                <X className="w-4 h-4" strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <label className="aspect-square rounded-lg border-2 border-dashed border-charcoal/30 flex items-center justify-center cursor-pointer hover:border-sage hover:bg-sage/5 transition-all duration-200">
                                        <div className="text-center">
                                            <Upload className="w-8 h-8 text-charcoal/60 mx-auto mb-2" />
                                            <span className="font-urbanist text-sm text-charcoal/60">Add Photo</span>
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            disabled={uploadingImages}
                                        />
                                    </label>
                                </div>

                                {uploadingImages && (
                                    <div className="text-center py-4">
                                        <PageLoader size="sm" variant="wavy" color="sage"  />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Specials Section */}
                        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-xl ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-urbanist text-base font-600 text-charcoal flex items-center gap-3">
                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sage/20 to-sage/10">
                                            <Tag className="w-4 h-4 text-sage" />
                                        </span>
                                        Specials & Offers
                                    </h3>
                                    <button
                                        onClick={addSpecial}
                                        className="bg-sage hover:bg-sage/90 text-white px-4 py-2 rounded-full text-sm font-600 font-urbanist transition-all duration-300 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Special
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.specials.map((special) => (
                                        <div key={special.id} className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/50 group relative">
                                            <button
                                                onClick={() => removeSpecial(special.id)}
                                                className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 border border-white/30 shadow-lg z-10"
                                                aria-label="Remove special"
                                            >
                                                <X className="w-4 h-4" strokeWidth={2.5} />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">Name</label>
                                                    <input
                                                        type="text"
                                                        value={special.name}
                                                        onChange={(e) => updateSpecial(special.id, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-lg text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                        placeholder="Special name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block font-urbanist text-sm font-600 text-charcoal mb-2">Description</label>
                                                    <input
                                                        type="text"
                                                        value={special.description}
                                                        onChange={(e) => updateSpecial(special.id, 'description', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-lg text-sm font-urbanist text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200"
                                                        placeholder="When available"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end gap-3">
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
                                <Save className="w-4 h-4" />
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
        </>
    );
}
