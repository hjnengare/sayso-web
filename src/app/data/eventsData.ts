export type Event = {
  id: string;
  title: string;
  type: "event" | "special";
  image?: string | null;
  alt?: string;
  icon?: string; // SVG icon identifier
  location: string;
  rating?: number | null;
  startDate: string; // Running date (formatted)
  endDate?: string; // Optional end date for multi-day events (formatted)
  price?: string | null;
  description?: string;
  bookingUrl?: string;
  bookingContact?: string;
  source?: string; // e.g., ticketmaster, internal
  ticketmasterAttractionId?: string | null; // Ticketmaster attraction ID for event series grouping
  ticketmaster_url?: string;
  venueId?: string | null; // Venue ID for consolidation
  venueName?: string;
  venueAddress?: string;
  city?: string;
  country?: string;
  url?: string;
  purchaseUrl?: string;
  segment?: string;
  genre?: string;
  subGenre?: string;
  href?: string;
  // Date metadata to support consolidation/sorting
  startDateISO?: string; // Raw ISO start date if available
  endDateISO?: string;   // Raw ISO end date if available
  occurrences?: Array<{ startDate: string; endDate?: string; bookingUrl?: string }>; // All occurrences for detail view
  allDates?: string[]; // All individual dates for this event series (ISO strings)
  canonicalKey?: string; // Stable key used for consolidation
  // Business ownership fields
  businessId?: string; // Links event to business
  businessName?: string; // For context in listings
  createdBy?: string; // User ID who created the event
  createdAt?: string; // ISO timestamp
  isBusinessOwned?: boolean; // Flag to distinguish business-owned from static events
};

export const EVENTS_AND_SPECIALS: Event[] = [
  {
    id: "event-1",
    title: "Sip & Paint Class",
    type: "event",
    image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=200&fit=crop&crop=center",
    alt: "Sip and paint class with wine and art supplies",
    icon: "paint-brush-outline",
    location: "Cavendish Square",
    rating: 4.9,
    startDate: "Dec 15",
    endDate: "Dec 22",
    description: "Creative evening with wine and painting",
    href: "/events/1",
  },
  {
    id: "special-1",
    title: "2 for 1 Pizza Night",
    type: "special",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=200&fit=crop&crop=center",
    alt: "Delicious pizza night special offer",
    icon: "pizza-outline",
    location: "Tony's Milk Caramel",
    rating: 5.0,
    startDate: "Every Tue",
    description: "Every Tuesday night special",
    href: "/specials/1",
  },
  {
    id: "event-2",
    title: "Free Blowdry",
    type: "event",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
    alt: "Professional hair salon interior with modern styling stations",
    icon: "cut-outline",
    location: "Cavendish Hairdresser",
    rating: 4.8,
    startDate: "Dec 18",
    endDate: "Dec 31",
    price: "Free",
    description: "Complimentary blowdry with any service",
    href: "/events/2",
  },
  {
    id: "event-3",
    title: "Rihanna Cover Night",
    type: "event",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop&crop=center",
    alt: "Live concert performance with stage lights",
    icon: "musical-notes-outline",
    location: "DHL Stadium",
    rating: 4.4,
    startDate: "Dec 20",
    price: "£45",
    description: "Live tribute performance",
    href: "/events/3",
  },
  {
    id: "special-2",
    title: "Happy Hour",
    type: "special",
    image: "https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    alt: "Elegant cocktail bar interior with modern lighting and bar stools",
    icon: "wine-outline",
    location: "The Rooftop Bar",
    rating: 4.6,
    startDate: "Daily 5-7pm",
    price: "50% Off",
    description: "Half price drinks 5-7pm daily",
    href: "/specials/2",
  },
  {
    id: "event-4",
    title: "Yoga in the Park",
    type: "event",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop&crop=center",
    alt: "Outdoor yoga session in a peaceful park setting",
    icon: "body-outline",
    location: "Hyde Park",
    rating: 4.7,
    startDate: "Weekends",
    price: "£10",
    description: "Morning outdoor yoga session",
    href: "/events/4",
  },
];
