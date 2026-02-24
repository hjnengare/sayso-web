// Types and interfaces for AddBusiness components

export interface Subcategory {
    id: string;
    label: string;
    interest_id: string;
}

export interface BusinessFormData {
    name: string;
    description: string;
    mainCategory: string;
    category: string;
    businessType: "physical" | "service-area" | "online-only" | "";
    isChain: boolean;
    location: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    priceRange: string;
    lat: string;
    lng: string;
    hours: {
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
        sunday: string;
    };
}

export interface PriceRangeOption {
    value: string;
    label: string;
}

// Helper function to get user-friendly field labels
export const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
        name: 'business name',
        mainCategory: 'main category',
        category: 'subcategory',
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

// CSS animations for form sections
export const animations = `
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

// Price range options
export const priceRanges: PriceRangeOption[] = [
    { value: "$", label: "Budget Friendly" },
    { value: "$$", label: "Moderate" },
    { value: "$$$", label: "Upscale" },
    { value: "$$$$", label: "Luxury" },
];

// Days configuration for business hours
export const daysOfWeek = [
    { key: "monday", label: "Mon" },
    { key: "tuesday", label: "Tue" },
    { key: "wednesday", label: "Wed" },
    { key: "thursday", label: "Thu" },
    { key: "friday", label: "Fri" },
    { key: "saturday", label: "Sat" },
    { key: "sunday", label: "Sun" },
] as const;
