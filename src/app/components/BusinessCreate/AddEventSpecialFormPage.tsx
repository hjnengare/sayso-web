"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  CalendarDays,
  Clock3,
  MapPin,
  Store,
  Sparkles,
  Image as ImageIcon,
  DollarSign,
  Link2,
  MessageCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { Urbanist } from "next/font/google";
import { useAuth } from "@/app/contexts/AuthContext";
import { useToast } from "@/app/contexts/ToastContext";
import { PageLoader } from "@/app/components/Loader";
import { usePreviousPageBreadcrumb } from "@/app/hooks/usePreviousPageBreadcrumb";
import { authStyles } from "@/app/components/Auth/Shared/authStyles";
import { animations } from "@/app/add-business/components/types";
import { BusinessOwnershipService } from "@/app/lib/services/businessOwnershipService";
import { ImageUploadService } from "@/app/lib/services/imageUploadService";

const urbanist = Urbanist({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

type ContentType = "event" | "special";

interface AddEventSpecialFormPageProps {
  type: ContentType;
}

interface OwnedBusinessOption {
  id: string;
  name: string;
  location: string;
}

interface FormState {
  businessId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  icon: string;
  image: string;
  price: string;
  ctaSource: string;
  ctaLabel: string;
  ctaUrl: string;
  whatsappNumber: string;
  whatsappPrefillTemplate: string;
}

const CTA_SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "quicket", label: "Quicket" },
  { value: "webtickets", label: "Webtickets" },
  { value: "other", label: "Other" },
] as const;

const COPY: Record<
  ContentType,
  {
    pageTitle: string;
    heroTitle: string;
    heroSubtitle: string;
    submitLabel: string;
    successLabel: string;
    emptyBusinessesCopy: string;
  }
> = {
  event: {
    pageTitle: "Add Event",
    heroTitle: "Create Event",
    heroSubtitle: "Publish a business-linked event or a community-hosted event",
    submitLabel: "Publish Event",
    successLabel: "Event published successfully",
    emptyBusinessesCopy: "No linked businesses found. You can still publish a community-hosted event.",
  },
  special: {
    pageTitle: "Add Special",
    heroTitle: "Create Special",
    heroSubtitle: "Publish a new special offer for your business audience",
    submitLabel: "Publish Special",
    successLabel: "Special published successfully",
    emptyBusinessesCopy: "You need at least one business before you can publish a special.",
  },
};

const fontStyle = {
  fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
};

const sectionClassName =
  "relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden border-none backdrop-blur-xl shadow-md px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12";

const inputClassName =
  "w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg";

const textareaClassName =
  "w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-[12px] border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg resize-none";

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AddEventSpecialFormPage({ type }: AddEventSpecialFormPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const copy = COPY[type];
  const targetRoute = useMemo(() => (type === "event" ? "/add-event" : "/add-special"), [type]);
  const backRoute = type === "event" ? "/events-specials" : "/my-businesses";
  const { previousHref, previousLabel } = usePreviousPageBreadcrumb({
    fallbackHref: backRoute,
    fallbackLabel: type === "event" ? "Events & Specials" : "My Businesses",
  });

  const [businesses, setBusinesses] = useState<OwnedBusinessOption[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    businessId: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    icon: type === "event" ? "calendar" : "sparkles",
    image: "",
    price: "",
    ctaSource: "",
    ctaLabel: "",
    ctaUrl: "",
    whatsappNumber: "",
    whatsappPrefillTemplate: "",
  });
  const isEventForm = type === "event";
  const isSpecialForm = type === "special";
  const canCreateSpecialByRole =
    user?.profile?.role === "business_owner" ||
    user?.profile?.role === "both" ||
    user?.profile?.account_role === "business_owner";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(targetRoute)}`);
    }
  }, [authLoading, user, router, targetRoute]);

  useEffect(() => {
    if (!user?.id) return;

    let isActive = true;
    const loadBusinesses = async () => {
      setIsLoadingBusinesses(true);
      try {
        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
        if (!isActive) return;

        const options = ownedBusinesses.map((business) => ({
          id: business.id,
          name: business.name,
          location: business.location ?? "",
        }));

        setBusinesses(options);
        if (options.length === 1) {
          setFormData((prev) => ({
            ...prev,
            businessId: prev.businessId || options[0].id,
            location: prev.location || options[0].location || "",
          }));
        }
      } catch (error) {
        console.error("[AddEventSpecialFormPage] Failed to load businesses:", error);
        showToast("Unable to load your businesses. Please try again.", "error", 3500);
      } finally {
        if (isActive) setIsLoadingBusinesses(false);
      }
    };

    void loadBusinesses();
    return () => {
      isActive = false;
    };
  }, [user?.id, showToast]);

  const setFieldValue = (field: keyof FormState, value: string) => {
    if (field === "businessId") {
      const selected = businesses.find((business) => business.id === value);
      setFormData((prev) => ({
        ...prev,
        businessId: value,
        location: prev.location || selected?.location || "",
      }));
    } else if (field === "ctaSource") {
      setFormData((prev) => ({
        ...prev,
        ctaSource: value,
        ...(value === "whatsapp" ? null : { whatsappNumber: "", whatsappPrefillTemplate: "" }),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateField = (field: keyof FormState, value: string): boolean => {
    let message = "";

    if (field === "businessId" && isSpecialForm && !value) message = "Please select a business.";
    if (field === "title" && !value.trim()) message = "Please add a title.";
    if (field === "startDate" && !value) message = "Please choose a start date and time.";
    if (field === "location" && !value.trim()) message = "Please add a location.";

    if (field === "endDate" && value && formData.startDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(value).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        message = "End date cannot be before the start date.";
      }
    }

    if (field === "image" && value.trim() && !isValidHttpUrl(value.trim())) {
      message = "Use a valid image URL starting with http:// or https://";
    }

    if (field === "price" && value.trim()) {
      const numericPrice = Number(value);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        message = "Price must be a valid non-negative number.";
      }
    }

    if (field === "ctaLabel" && value.trim() && value.trim().length > 140) {
      message = "CTA label must be 140 characters or less.";
    }

    if (field === "ctaUrl" && value.trim() && !isValidHttpUrl(value.trim())) {
      message = "Use a valid CTA URL starting with http:// or https://";
    }

    if (field === "whatsappNumber") {
      const normalized = value.replace(/[^\d]/g, "");
      if (formData.ctaSource === "whatsapp" && normalized.length === 0) {
        message = "WhatsApp number is required for WhatsApp booking.";
      } else if (normalized.length > 0 && (normalized.length < 7 || normalized.length > 15)) {
        message = "Use a valid WhatsApp number with 7 to 15 digits.";
      }
    }

    if (field === "whatsappPrefillTemplate" && value.trim().length > 2000) {
      message = "Prefilled message must be 2000 characters or less.";
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });

    return !message;
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const uploadImageFile = async (file: File) => {
    if (!user?.id) return;

    const validation = ImageUploadService.validateImage(file);
    if (!validation.isValid) {
      showToast(validation.error || "Invalid image file.", "error", 3500);
      return;
    }

    setIsUploadingImage(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = extension.replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `${user.id}/${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${safeExt}`;

      const result = await ImageUploadService.uploadImage(file, "events_and_specials", path);
      if (result.error || !result.url) {
        throw new Error(result.error || "Failed to upload image");
      }

      setFieldValue("image", result.url);
      setTouched((prev) => ({ ...prev, image: true }));
      validateField("image", result.url);
      showToast("Image uploaded successfully.", "success", 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image.";
      showToast(message, "error", 4000);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
    event.target.value = "";
  };

  const handleImageDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingImage(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
  };

  const validateForm = () => {
    const requiredFields: Array<keyof FormState> = isSpecialForm
      ? ["businessId", "title", "startDate", "location"]
      : ["title", "startDate", "location"];
    const optionalFields: Array<keyof FormState> = [
      "endDate",
      "image",
      "price",
      "ctaSource",
      "ctaLabel",
      "ctaUrl",
      "whatsappNumber",
      "whatsappPrefillTemplate",
    ];
    return [...requiredFields, ...optionalFields].every((field) => validateField(field, formData[field]));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setTouched({
      businessId: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      location: true,
      icon: true,
      image: true,
      price: true,
      ctaSource: true,
      ctaLabel: true,
      ctaUrl: true,
      whatsappNumber: true,
      whatsappPrefillTemplate: true,
    });

    if (!validateForm()) {
      showToast("Please fix the highlighted fields before publishing.", "error", 3500);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/events-and-specials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          type,
          businessId: formData.businessId || null,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          location: formData.location.trim(),
          description: formData.description.trim() || null,
          icon: formData.icon.trim() || null,
          image: formData.image.trim() || null,
          price: formData.price.trim() ? Number(formData.price) : null,
          ctaSource: formData.ctaSource || null,
          ctaLabel: formData.ctaLabel.trim() || null,
          ctaUrl: formData.ctaUrl.trim() || null,
          whatsappNumber: formData.whatsappNumber.replace(/[^\d]/g, "") || null,
          whatsappPrefillTemplate: formData.whatsappPrefillTemplate.trim() || null,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof result?.error === "string" ? result.error : "We could not publish this listing.";
        throw new Error(message);
      }

      showToast(copy.successLabel, "success", 3000);
      setTimeout(() => {
        router.push(formData.businessId ? "/my-businesses" : "/events-specials");
        router.refresh();
      }, 650);
    } catch (error) {
      console.error("[AddEventSpecialFormPage] Submit failed:", error);
      const message = error instanceof Error ? error.message : "Failed to publish. Please try again.";
      showToast(message, "error", 4200);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <PageLoader size="lg" variant="wavy" color="sage" />;
  if (!user) return null;
  if (isSpecialForm && !canCreateSpecialByRole) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: authStyles }} />
        <style dangerouslySetInnerHTML={{ __html: animations }} />
        <div className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
          
          <div className="mx-auto max-w-[920px] px-4 pt-16 pb-16 relative z-10">
            <div className="rounded-[12px] border border-coral/20 bg-coral/5 p-6">
              <h1 className="text-2xl font-semibold text-charcoal mb-3" style={fontStyle}>Special creation is restricted</h1>
              <p className="text-charcoal/80 mb-5" style={fontStyle}>
                Only verified business owners can create specials.
              </p>
              <Link href="/claim-business" className="inline-flex rounded-full bg-card-bg px-5 py-2.5 text-sm font-semibold text-white hover:bg-card-bg/90 transition-colors duration-200">
                Verify Business Access
              </Link>
            </div>
          </div>

        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <style dangerouslySetInnerHTML={{ __html: animations }} />
      <div
        className="min-h-dvh bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative overflow-hidden font-urbanist"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
      >
         {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
            
        <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
          <section className="relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />
            
            <div className="container mx-auto max-w-[1300px] px-4 sm:px-6 relative z-10">
              <nav className="pb-1" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm sm:text-base">
                  <li>
                    <Link href={previousHref} className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={fontStyle}>
                      {previousLabel}
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight size={16} className="text-charcoal/60" />
                  </li>
                  <li>
                    <span className="text-charcoal font-semibold" style={fontStyle}>{copy.pageTitle}</span>
                  </li>
                </ol>
              </nav>

              <div className="max-w-4xl mx-auto pt-8 pb-8">
                <m.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}>
                  <h1 className={`${urbanist.className} text-2xl sm:text-3xl font-semibold mb-2 text-center leading-[1.2] tracking-tight text-charcoal`} style={{ fontFamily: urbanist.style.fontFamily }}>
                    {copy.heroTitle}
                  </h1>
                  <p className="text-sm sm:text-base text-charcoal/70 max-w-md mx-auto" style={fontStyle}>{copy.heroSubtitle}</p>
                </m.div>

                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  <div className={`${sectionClassName} animate-fade-in-up animate-delay-100`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none" />
                    <div className="relative z-10">
                      <h3 className="font-urbanist text-base font-semibold text-charcoal mb-6 flex items-center gap-3" style={fontStyle}>
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-navbar-bg/20 to-navbar-bg/10">
                          <Store className="w-5 h-5 text-navbar-bg" />
                        </span>
                        Publishing Context
                      </h3>

                      {isLoadingBusinesses ? (
                        <p className="text-sm text-charcoal/70" style={fontStyle}>Loading your businesses...</p>
                      ) : businesses.length === 0 ? (
                        <div className="rounded-[12px] border border-coral/20 bg-coral/5 px-4 py-4">
                          <p className="text-sm sm:text-base text-charcoal/80" style={fontStyle}>{copy.emptyBusinessesCopy}</p>
                          {isSpecialForm ? (
                            <Link href="/add-business" className="inline-flex mt-4 rounded-full bg-card-bg px-5 py-2.5 text-sm font-semibold text-white hover:bg-card-bg/90 transition-colors duration-200">
                              Add New Business
                            </Link>
                          ) : (
                            <p className="mt-3 text-xs text-charcoal/70" style={fontStyle}>
                              This event will be marked as community-hosted.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>
                              Business {isSpecialForm ? <span className="text-coral">*</span> : <span className="text-charcoal/50">(optional)</span>}
                            </label>
                            <select value={formData.businessId} onChange={(e) => setFieldValue("businessId", e.target.value)} onBlur={() => handleBlur("businessId")} className={`${inputClassName} pr-10`} style={fontStyle}>
                              {isEventForm ? <option value="">Community-hosted event (no business)</option> : <option value="">Select a business</option>}
                              {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                            </select>
                            {touched.businessId && errors.businessId ? <p className="mt-2 text-sm text-coral font-medium">{errors.businessId}</p> : null}
                            {!errors.businessId && isEventForm ? (
                              <p className="mt-2 text-xs text-charcoal/65" style={fontStyle}>
                                {formData.businessId ? "This event will be shown as business-linked." : "This event will be shown as community-hosted."}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Listing Type</label>
                            <div className="rounded-full border-none bg-white/95 px-4 py-3 sm:py-4 md:py-5 text-sm font-semibold text-charcoal flex items-center gap-2">
                              {type === "event" ? <CalendarDays className="w-4 h-4 text-navbar-bg" /> : <Sparkles className="w-4 h-4 text-navbar-bg" />}
                              <span>{type === "event" ? "Event" : "Special"}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Icon keyword (optional)</label>
                            <input type="text" value={formData.icon} onChange={(e) => setFieldValue("icon", e.target.value)} className={inputClassName} placeholder="calendar, music, sparkles" style={fontStyle} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(isEventForm || businesses.length > 0) ? (
                    <div className={`${sectionClassName} animate-fade-in-up animate-delay-200`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none" />
                      <div className="relative z-10 space-y-6">
                        <h3 className="font-urbanist text-base font-semibold text-charcoal flex items-center gap-3" style={fontStyle}>
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-navbar-bg/20 to-navbar-bg/10">
                            <CalendarDays className="w-5 h-5 text-navbar-bg" />
                          </span>
                          Listing Details
                        </h3>

                        <div>
                          <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Title <span className="text-coral">*</span></label>
                          <input type="text" value={formData.title} onChange={(e) => setFieldValue("title", e.target.value)} onBlur={() => handleBlur("title")} className={inputClassName} placeholder={type === "event" ? "Friday Networking Session" : "2-for-1 Brunch Special"} style={fontStyle} />
                          {touched.title && errors.title ? <p className="mt-2 text-sm text-coral font-medium">{errors.title}</p> : null}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Description</label>
                          <textarea value={formData.description} onChange={(e) => setFieldValue("description", e.target.value)} rows={5} className={textareaClassName} placeholder="Share key details and what visitors should expect." style={fontStyle} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Start date and time <span className="text-coral">*</span></label>
                            <div className="relative">
                              <Clock3 className="w-4 h-4 text-charcoal/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input type="datetime-local" value={formData.startDate} onChange={(e) => setFieldValue("startDate", e.target.value)} onBlur={() => handleBlur("startDate")} className={`${inputClassName} pl-10`} />
                            </div>
                            {touched.startDate && errors.startDate ? <p className="mt-2 text-sm text-coral font-medium">{errors.startDate}</p> : null}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>End date and time (optional)</label>
                            <div className="relative">
                              <Clock3 className="w-4 h-4 text-charcoal/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input type="datetime-local" value={formData.endDate} onChange={(e) => setFieldValue("endDate", e.target.value)} onBlur={() => handleBlur("endDate")} className={`${inputClassName} pl-10`} />
                            </div>
                            {touched.endDate && errors.endDate ? <p className="mt-2 text-sm text-coral font-medium">{errors.endDate}</p> : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Location <span className="text-coral">*</span></label>
                            <div className="relative">
                              <MapPin className="w-4 h-4 text-charcoal/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input type="text" value={formData.location} onChange={(e) => setFieldValue("location", e.target.value)} onBlur={() => handleBlur("location")} className={`${inputClassName} pl-10`} placeholder="City, venue, or branch location" style={fontStyle} />
                            </div>
                            {touched.location && errors.location ? <p className="mt-2 text-sm text-coral font-medium">{errors.location}</p> : null}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Price (optional)</label>
                            <div className="relative">
                              <DollarSign className="w-4 h-4 text-charcoal/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFieldValue("price", e.target.value)} onBlur={() => handleBlur("price")} className={`${inputClassName} pl-10`} placeholder="0.00" style={fontStyle} />
                            </div>
                            {touched.price && errors.price ? <p className="mt-2 text-sm text-coral font-medium">{errors.price}</p> : null}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Image URL (optional)</label>
                          <div className="space-y-3">
                            <label
                              className={`flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed px-4 py-6 text-center transition-colors duration-200 cursor-pointer ${
                                isDraggingImage ? "border-sage bg-card-bg/10" : "border-white/70 bg-white/70 hover:border-sage/40"
                              } ${isUploadingImage ? "opacity-75 cursor-not-allowed" : ""}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (!isUploadingImage) setIsDraggingImage(true);
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                setIsDraggingImage(false);
                              }}
                              onDrop={handleImageDrop}
                            >
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                                onChange={handleImageInputChange}
                                disabled={isUploadingImage}
                              />
                              <UploadCloud className="w-6 h-6 text-navbar-bg mb-2" />
                              <p className="text-sm font-semibold text-charcoal" style={fontStyle}>
                                {isUploadingImage ? "Uploading image..." : "Drop image here or click to upload"}
                              </p>
                              <p className="text-xs text-charcoal/60 mt-1" style={fontStyle}>
                                JPEG, PNG, or WebP. Max 5MB.
                              </p>
                            </label>

                            <div className="relative">
                              <ImageIcon className="w-4 h-4 text-charcoal/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input type="url" value={formData.image} onChange={(e) => setFieldValue("image", e.target.value)} onBlur={() => handleBlur("image")} className={`${inputClassName} pl-10`} placeholder="https://example.com/cover.jpg" style={fontStyle} />
                              {formData.image ? (
                                <button
                                  type="button"
                                  onClick={() => setFieldValue("image", "")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                                  aria-label="Clear image"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>

                            {formData.image ? (
                              <div className="rounded-[12px] overflow-hidden border-none bg-white/80 p-2">
                                <img src={formData.image} alt="Event or special preview" className="w-full h-40 object-cover rounded-[8px]" />
                              </div>
                            ) : null}
                          </div>
                          {touched.image && errors.image ? <p className="mt-2 text-sm text-coral font-medium">{errors.image}</p> : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {(isEventForm || businesses.length > 0) ? (
                    <div className={`${sectionClassName} animate-fade-in-up animate-delay-300`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none" />
                      <div className="relative z-10 space-y-6">
                        <h3 className="font-urbanist text-base font-semibold text-charcoal flex items-center gap-3" style={fontStyle}>
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-navbar-bg/20 to-navbar-bg/10">
                            <Link2 className="w-5 h-5 text-navbar-bg" />
                          </span>
                          Booking / Link (Optional)
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Booking method</label>
                            <select
                              value={formData.ctaSource}
                              onChange={(e) => {
                                setFieldValue("ctaSource", e.target.value);
                                if (e.target.value !== "whatsapp" && (errors.whatsappNumber || errors.whatsappPrefillTemplate)) {
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.whatsappNumber;
                                    delete next.whatsappPrefillTemplate;
                                    return next;
                                  });
                                }
                              }}
                              onBlur={() => handleBlur("ctaSource")}
                              className={`${inputClassName} pr-10`}
                              style={fontStyle}
                            >
                              <option value="">Select method</option>
                              {CTA_SOURCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>CTA Label (optional)</label>
                            <input
                              type="text"
                              value={formData.ctaLabel}
                              onChange={(e) => setFieldValue("ctaLabel", e.target.value)}
                              onBlur={() => handleBlur("ctaLabel")}
                              className={inputClassName}
                              placeholder={type === "event" ? "Book Now" : "Claim This Special"}
                              style={fontStyle}
                            />
                            {touched.ctaLabel && errors.ctaLabel ? <p className="mt-2 text-sm text-coral font-medium">{errors.ctaLabel}</p> : null}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>CTA URL (optional)</label>
                          <div className="relative">
                            <Link2 className="w-4 h-4 text-charcoal/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="url"
                              value={formData.ctaUrl}
                              onChange={(e) => setFieldValue("ctaUrl", e.target.value)}
                              onBlur={() => handleBlur("ctaUrl")}
                              className={`${inputClassName} pl-10`}
                              placeholder="https://example.com/book"
                              style={fontStyle}
                            />
                          </div>
                          {touched.ctaUrl && errors.ctaUrl ? <p className="mt-2 text-sm text-coral font-medium">{errors.ctaUrl}</p> : null}
                        </div>

                        {formData.ctaSource === "whatsapp" ? (
                          <div className="space-y-4 rounded-[12px] border border-sage/20 bg-card-bg/5 p-4">
                            <div>
                              <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>
                                WhatsApp Number <span className="text-coral">*</span>
                              </label>
                              <div className="relative">
                                <MessageCircle className="w-4 h-4 text-charcoal/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formData.whatsappNumber}
                                  onChange={(e) => setFieldValue("whatsappNumber", e.target.value)}
                                  onBlur={() => handleBlur("whatsappNumber")}
                                  className={`${inputClassName} pl-10`}
                                  placeholder="27721234567"
                                  style={fontStyle}
                                />
                              </div>
                              <p className="mt-2 text-xs text-charcoal/65" style={fontStyle}>
                                Use international format without + (example: 27721234567).
                              </p>
                              {touched.whatsappNumber && errors.whatsappNumber ? <p className="mt-2 text-sm text-coral font-medium">{errors.whatsappNumber}</p> : null}
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-charcoal mb-2" style={fontStyle}>Prefilled message (optional)</label>
                              <textarea
                                value={formData.whatsappPrefillTemplate}
                                onChange={(e) => setFieldValue("whatsappPrefillTemplate", e.target.value)}
                                onBlur={() => handleBlur("whatsappPrefillTemplate")}
                                rows={4}
                                className={textareaClassName}
                                placeholder={"Hi! I'd like to book for {title} on {start_date}.\nHere's the Sayso link: {public_url}"}
                                style={fontStyle}
                              />
                              <p className="mt-2 text-xs text-charcoal/65" style={fontStyle}>
                                Supported variables: {"{title}, {start_date}, {end_date}, {public_url}, {qty}"}.
                              </p>
                              {touched.whatsappPrefillTemplate && errors.whatsappPrefillTemplate ? <p className="mt-2 text-sm text-coral font-medium">{errors.whatsappPrefillTemplate}</p> : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {(isEventForm || businesses.length > 0) ? (
                    <m.div className="flex flex-col sm:flex-row gap-4 justify-end pt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
                      <Link href={backRoute} className="px-6 py-3 rounded-full border-2 border-charcoal/20 text-charcoal font-urbanist font-600 hover:bg-charcoal/5 transition-all duration-200 text-center">
                        Cancel
                      </Link>
                      <m.button type="submit" disabled={isSubmitting} whileHover={{ scale: isSubmitting ? 1 : 1.02 }} whileTap={{ scale: isSubmitting ? 1 : 0.98 }} style={fontStyle} className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-6 rounded-full hover:from-coral/90 hover:to-coral transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg">
                        <AnimatePresence mode="wait">
                          {isSubmitting ? (
                            <m.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-2">
                              <m.div className="flex items-center gap-1">
                                {[0, 1, 2, 3].map((dot) => (
                                  <m.div key={dot} className="w-2 h-2 bg-white rounded-full" animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.6, repeat: Infinity, delay: dot * 0.1, ease: "easeInOut" }} />
                                ))}
                              </m.div>
                              <span>Publishing...</span>
                            </m.div>
                          ) : (
                            <m.div key="default" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                              <span>{copy.submitLabel}</span>
                            </m.div>
                          )}
                        </AnimatePresence>
                      </m.button>
                    </m.div>
                  ) : null}
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
