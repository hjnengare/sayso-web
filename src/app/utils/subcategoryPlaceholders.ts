/**
 * Canonical taxonomy-driven placeholder images for businesses.
 *
 * Rules:
 * - 52 canonical subcategory slugs (source of truth from api/subcategories).
 * - 1:1 mapping: each slug maps to exactly one image under public/businessImagePlaceholders.
 * - No aliases, no fuzzy matching, no token parsing.
 * - Missing slug → dev warning + global default.
 */

const P = "/businessImagePlaceholders";

/** Canonical subcategory slugs (matches api/subcategories FALLBACK_SUBCATEGORIES) */
export const CANONICAL_SUBCATEGORY_SLUGS = [
  "restaurants",
  "cafes",
  "bars",
  "fast-food",
  "fine-dining",
  "gyms",
  "spas",
  "salons",
  "wellness",
  "nail-salons",
  "education-learning",
  "transport-travel",
  "finance-insurance",
  "plumbers",
  "electricians",
  "legal-services",
  "accommodation",
  "transport",
  "travel-services",
  "hiking",
  "cycling",
  "water-sports",
  "camping",
  "events-festivals",
  "sports-recreation",
  "nightlife",
  "comedy-clubs",
  "cinemas",
  "museums",
  "galleries",
  "theaters",
  "concerts",
  "family-activities",
  "pet-services",
  "childcare",
  "veterinarians",
  "fashion",
  "electronics",
  "home-decor",
  "books",
  "miscellaneous",
] as const;

export type CanonicalSubcategorySlug = (typeof CANONICAL_SUBCATEGORY_SLUGS)[number];

/**
 * Canonical slug → display label (matches api/subcategories FALLBACK_SUBCATEGORIES).
 * Used by placeholder map and type-safe paths.
 */
export const SUBCATEGORY_SLUG_TO_LABEL: Record<CanonicalSubcategorySlug, string> = {
  restaurants: "Restaurants",
  cafes: "Cafés & Coffee",
  bars: "Bars & Pubs",
  "fast-food": "Fast Food",
  "fine-dining": "Fine Dining",
  gyms: "Gyms & Fitness",
  spas: "Spas",
  salons: "Hair Salons",
  wellness: "Wellness Centers",
  "nail-salons": "Nail Salons",
  "education-learning": "Education & Learning",
  "transport-travel": "Transport & Travel",
  "finance-insurance": "Finance & Insurance",
  plumbers: "Plumbers",
  electricians: "Electricians",
  "legal-services": "Legal Services",
  accommodation: "Accommodation",
  transport: "Transport",
  "travel-services": "Travel Services",
  hiking: "Hiking",
  cycling: "Cycling",
  "water-sports": "Water Sports",
  camping: "Camping",
  "events-festivals": "Events & Festivals",
  "sports-recreation": "Sports & Recreation",
  nightlife: "Nightlife",
  "comedy-clubs": "Comedy Clubs",
  cinemas: "Cinemas",
  museums: "Museums",
  galleries: "Art Galleries",
  theaters: "Theatres",
  concerts: "Concerts",
  "family-activities": "Family Activities",
  "pet-services": "Pet Services",
  childcare: "Childcare",
  veterinarians: "Veterinarians",
  fashion: "Fashion & Clothing",
  electronics: "Electronics",
  "home-decor": "Home Décor",
  books: "Books & Stationery",
  miscellaneous: "Miscellaneous",
};

/** Canonical label (normalized) -> canonical slug. */
const SUBCATEGORY_LABEL_TO_SLUG: Record<string, CanonicalSubcategorySlug> = Object.fromEntries(
  (Object.entries(SUBCATEGORY_SLUG_TO_LABEL) as Array<[CanonicalSubcategorySlug, string]>).map(
    ([slug, label]) => [label.trim().toLowerCase(), slug],
  ),
) as Record<string, CanonicalSubcategorySlug>;

/** Alias slug (seen in DB) -> canonical slug (used for placeholder resolution). */
const SUBCATEGORY_ALIAS_TO_CANONICAL: Record<string, CanonicalSubcategorySlug> = {
  restaurant: "restaurants",
  cafe: "cafes",
  bar: "bars",
  salon: "salons",
  gym: "gyms",
  spa: "spas",
  museum: "museums",
  gallery: "galleries",
  theater: "theaters",
  theatre: "theaters",
  theatres: "theaters",
  concert: "concerts",
  cinema: "cinemas",
  bookstore: "books",
  // Legacy Travel slugs mapped to new canonical set
  airport: "transport",
  airports: "transport",
  "train-station": "transport",
  "train-stations": "transport",
  "bus-station": "transport",
  "bus-stations": "transport",
  "car-rental": "transport",
  "car-rental-businesses": "transport",
  "campervan-rental": "transport",
  "campervan-rentals": "transport",
  "shuttle-service": "transport",
  "shuttle-services": "transport",
  "chauffeur-service": "transport",
  "chauffeur-services": "transport",
  "travel-service": "travel-services",
  "travel-services": "travel-services",
  "tour-guide": "travel-services",
  "tour-guides": "travel-services",
  "travel-agency": "travel-services",
  "travel-agencies": "travel-services",
  "luggage-shop": "travel-services",
  "luggage-shops": "travel-services",
  "travel-insurance-provider": "travel-services",
  "travel-insurance-providers": "travel-services",
};

/**
 * Complete canonical mapping: every known sub_interest_id slug → display label.
 * Source of truth for UI so DB diversity shows correctly (no "Miscellaneous" leak).
 * Add new slugs here when new data appears; dev warning will catch unmapped slugs.
 */
export const SUBCATEGORY_LABELS: Record<string, string> = {
  ...SUBCATEGORY_SLUG_TO_LABEL,
  // Singular/alias variants seen in DB
  restaurant: "Restaurants",
  cafe: "Cafés & Coffee",
  bar: "Bars & Pubs",
  salon: "Hair Salons",
  gym: "Gyms & Fitness",
  spa: "Spas",
  museum: "Museums",
  gallery: "Art Galleries",
  theater: "Theatres",
  theatres: "Theatres",
  concert: "Concerts",
  cinema: "Cinemas",
  bookstore: "Books & Stationery",
  // Legacy Travel slugs map to the closest new subcategory label
  airport: "Transport",
  airports: "Transport",
  "train-station": "Transport",
  "train-stations": "Transport",
  "bus-station": "Transport",
  "bus-stations": "Transport",
  "car-rental": "Transport",
  "car-rental-businesses": "Transport",
  "campervan-rental": "Transport",
  "campervan-rentals": "Transport",
  "shuttle-service": "Transport",
  "shuttle-services": "Transport",
  "chauffeur-service": "Transport",
  "chauffeur-services": "Transport",
  "travel-service": "Travel Services",
  "travel-services": "Travel Services",
  "tour-guide": "Travel Services",
  "tour-guides": "Travel Services",
  "travel-agency": "Travel Services",
  "travel-agencies": "Travel Services",
  "luggage-shop": "Travel Services",
  "luggage-shops": "Travel Services",
  "travel-insurance-provider": "Travel Services",
  "travel-insurance-providers": "Travel Services",
};

/**
 * Interest id → display label. Use only when sub_interest_id is absent (sub_interest_id is source of truth).
 */
export const INTEREST_LABELS: Record<string, string> = {
  "food-drink": "Food & Drink",
  "beauty-wellness": "Beauty & Wellness",
  "professional-services": "Professional Services",
  travel: "Travel",
  "outdoors-adventure": "Outdoors & Adventure",
  "experiences-entertainment": "Entertainment & Experiences",
  "arts-culture": "Arts & Culture",
  "family-pets": "Family & Pets",
  "shopping-lifestyle": "Shopping & Lifestyle",
  miscellaneous: "Miscellaneous",
};

/** Interest id (or label) -> representative canonical subcategory slug (used for placeholders when subcategory is missing). */
const INTEREST_TO_DEFAULT_SUBCATEGORY: Record<string, CanonicalSubcategorySlug> = {
  "food-drink": "restaurants",
  "beauty-wellness": "salons",
  "professional-services": "finance-insurance",
  travel: "accommodation",
  "outdoors-adventure": "hiking",
  "experiences-entertainment": "events-festivals",
  "arts-culture": "museums",
  "family-pets": "family-activities",
  "shopping-lifestyle": "fashion",
  miscellaneous: "miscellaneous",
};

const INTEREST_LABEL_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(INTEREST_LABELS).map(([id, label]) => [label.trim().toLowerCase(), id]),
);

/**
 * Returns the display label for a subcategory slug. Use for all business cards/APIs.
 * Prefer sub_interest_id when present: label = sub_interest_id ? getSubcategoryLabel(sub_interest_id) : mapInterest(interest_id).
 * Unknown slug → "Miscellaneous"; in dev, logs [CATEGORY MISSING] so you can add the slug.
 */
export function getSubcategoryLabel(slug: string | undefined | null): string {
  if (slug == null || typeof slug !== "string") return "Miscellaneous";
  const key = slug.trim().toLowerCase();
  if (!key) return "Miscellaneous";

  const label = SUBCATEGORY_LABELS[key];
  if (label) return label;

  if (process.env.NODE_ENV === "development") {
    console.warn("[CATEGORY MISSING]", key);
  }
  return "Miscellaneous";
}

/**
 * Display category for a business.
 * Priority: category_label (if present) else sub_interest_id → interest_id → category → map to label.
 */
export function getDisplayCategoryForBusiness(business: {
  sub_interest_id?: string | null;
  interest_id?: string | null;
  category?: string | null;
  category_label?: string | null;
}): string {
  if (business?.category_label != null && typeof business.category_label === "string") {
    const label = business.category_label.trim();
    if (label) return label;
  }
  const sub = business.sub_interest_id?.trim().toLowerCase();
  if (sub) return getSubcategoryLabel(sub);
  const interest = business.interest_id?.trim().toLowerCase();
  if (interest) return INTEREST_LABELS[interest] ?? getSubcategoryLabel(interest) ?? "Miscellaneous";
  return getSubcategoryLabel(business.category) ?? "Miscellaneous";
}

/** Placeholder slug priority: sub_interest_id → category (canonical slug) → interest_id → fallback. */
const PLACEHOLDER_SLUG_KEYS = [
  "primary_subcategory_slug",
  "sub_interest_id",
  "subInterestId",
  "sub_interest_slug",
  "category",
  "primary_category_slug",
  "interest_id",
  "interestId",
] as const;

export type BusinessLikeForCategory = {
  sub_interest_id?: string | null;
  subInterestId?: string | null;
  sub_interest_slug?: string | null;
  interest_id?: string | null;
  interestId?: string | null;
  /** Canonical slug (one of 52). */
  category?: string | null;
  /** Display label from DB; use when present to avoid "Miscellaneous" leakage. */
  category_label?: string | null;
  subInterestLabel?: string | null;
  /** After 20260210: primary taxonomy columns (DB uses these). */
  primary_subcategory_slug?: string | null;
  primary_category_slug?: string | null;
  primary_subcategory_label?: string | null;
};

/**
 * Get the category slug for placeholder resolution and taxonomy.
 * Priority: sub_interest_id → category (canonical slug) → interest_id.
 */
export function getCategorySlugFromBusiness(
  business: BusinessLikeForCategory | undefined | null
): string {
  if (!business) return "";
  for (const key of PLACEHOLDER_SLUG_KEYS) {
    const value = (business as Record<string, unknown>)[key];
    if (value != null && typeof value === "string") {
      const s = value.trim();
      if (s) return s.toLowerCase();
    }
  }
  return "";
}

/**
 * Get display label for a business.
 * Priority: category_label (if present) else map slug → label using canonical mapping.
 * No fuzzy matching or token parsing; "Miscellaneous" only when slug is actually miscellaneous.
 */
export function getCategoryLabelFromBusiness(
  business: BusinessLikeForCategory | undefined | null
): string {
  const labelFromBusiness =
    business?.primary_subcategory_label ??
    business?.category_label ??
    business?.subInterestLabel;
  if (labelFromBusiness != null && typeof labelFromBusiness === "string") {
    const label = labelFromBusiness.trim();
    if (label) return label;
  }
  const slug = getCategorySlugFromBusiness(business);
  if (!slug) return "Miscellaneous";
  const fromSubcategory = SUBCATEGORY_LABELS[slug];
  if (fromSubcategory) return fromSubcategory;
  const fromInterest = INTEREST_LABELS[slug];
  if (fromInterest) return fromInterest;
  return getSubcategoryLabel(slug);
}

/**
 * Deterministic 1:1 mapping: canonical slug → placeholder image path.
 * File names align with public/businessImagePlaceholders folder structure.
 * All paths use URL-safe names (hyphens, no spaces or special characters).
 */
export const SUBCATEGORY_PLACEHOLDER_MAP: Record<CanonicalSubcategorySlug, string> = {
  // Food & Drink
  restaurants: `${P}/food-drink/restaurants.jpg`,
  cafes: `${P}/food-drink/cafes-coffee.jpg`,
  bars: `${P}/food-drink/bars-pubs.jpg`,
  "fast-food": `${P}/food-drink/fast-food.jpg`,
  "fine-dining": `${P}/food-drink/fine-dining.jpg`,

  // Beauty & Wellness
  gyms: `${P}/beauty-wellness/gyms-fitness.jpg`,
  spas: `${P}/beauty-wellness/spas.jpg`,
  salons: `${P}/beauty-wellness/hair-salons.jpg`,
  wellness: `${P}/beauty-wellness/wellness-centers.jpg`,
  "nail-salons": `${P}/beauty-wellness/nail-salons.jpg`,

  // Professional Services
  "education-learning": `${P}/professional-services/education-learning.jpg`,
  "transport-travel": `${P}/travel/travel.jpg`,
  "finance-insurance": `${P}/professional-services/finance-insurance.jpg`,
  plumbers: `${P}/professional-services/plumbers.jpg`,
  electricians: `${P}/professional-services/electricians.jpg`,
  "legal-services": `${P}/professional-services/legal-services.jpg`,

  // Travel
  accommodation: `${P}/travel/travel.jpg`,
  transport: `${P}/travel/travel.jpg`,
  "travel-services": `${P}/travel/travel.jpg`,

  // Outdoors & Adventure
  hiking: `${P}/outdoors-adventure/hiking.jpg`,
  cycling: `${P}/outdoors-adventure/cycling.jpg`,
  "water-sports": `${P}/outdoors-adventure/water-sports.jpg`,
  camping: `${P}/outdoors-adventure/camping.jpg`,

  // Entertainment & Experiences
  "events-festivals": `${P}/entertainment-experiences/events-festivals.jpg`,
  "sports-recreation": `${P}/entertainment-experiences/sports-recreation.jpg`,
  nightlife: `${P}/entertainment-experiences/nightlife.jpg`,
  "comedy-clubs": `${P}/entertainment-experiences/comedy-clubs.jpg`,
  cinemas: `${P}/entertainment-experiences/cinemas.jpg`,

  // Arts & Culture
  museums: `${P}/arts-culture/museums.jpg`,
  galleries: `${P}/arts-culture/art-galleries.jpg`,
  theaters: `${P}/arts-culture/theatres.jpg`,
  concerts: `${P}/arts-culture/concerts.jpg`,

  // Family & Pets
  "family-activities": `${P}/family-pets/family-activities.jpg`,
  "pet-services": `${P}/family-pets/pet-services.jpg`,
  childcare: `${P}/family-pets/childcare.jpg`,
  veterinarians: `${P}/family-pets/veterinarians.jpg`,

  // Shopping & Lifestyle
  fashion: `${P}/shopping-lifestyle/fashion-clothing.jpg`,
  electronics: `${P}/shopping-lifestyle/electronics.jpg`,
  "home-decor": `${P}/shopping-lifestyle/home-decor.jpg`,
  books: `${P}/shopping-lifestyle/books-media.jpg`,

  // Miscellaneous
  miscellaneous: `${P}/miscellaneous/miscellaneous.jpeg`,
};

/** Global fallback — same file as miscellaneous slug. */
export const DEFAULT_PLACEHOLDER = `${P}/miscellaneous/miscellaneous.jpeg`;

const slugSet = new Set<string>(CANONICAL_SUBCATEGORY_SLUGS);

function normalizeToCanonicalSubcategorySlug(
  raw: string | undefined | null
): CanonicalSubcategorySlug | null {
  if (raw == null || typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;

  // 1) Canonical slug.
  if (slugSet.has(key)) return key as CanonicalSubcategorySlug;

  // 2) Alias slug (e.g. "museum" -> "museums").
  const aliased = SUBCATEGORY_ALIAS_TO_CANONICAL[key];
  if (aliased) return aliased;

  // 3) Canonical label (e.g. "Museums" -> "museums").
  const fromLabel = SUBCATEGORY_LABEL_TO_SLUG[key];
  if (fromLabel) return fromLabel;

  // 4) Interest id (or label) -> representative canonical subcategory slug.
  const fromInterestId = INTEREST_TO_DEFAULT_SUBCATEGORY[key];
  if (fromInterestId) return fromInterestId;
  const interestIdFromLabel = INTEREST_LABEL_TO_ID[key];
  if (interestIdFromLabel) {
    return INTEREST_TO_DEFAULT_SUBCATEGORY[interestIdFromLabel] ?? null;
  }

  return null;
}

export function isCanonicalSlug(slug: string | undefined | null): slug is CanonicalSubcategorySlug {
  return normalizeToCanonicalSubcategorySlug(slug) != null;
}

/**
 * Returns the placeholder image path for a canonical subcategory slug.
 * If the slug is not in the taxonomy, logs a dev warning and returns the global default.
 */
export function getSubcategoryPlaceholder(slug: string | undefined | null): string {
  const canonical = normalizeToCanonicalSubcategorySlug(slug);
  if (!canonical) return DEFAULT_PLACEHOLDER;

  const path = SUBCATEGORY_PLACEHOLDER_MAP[canonical];
  if (path) return path;

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[subcategoryPlaceholders] No placeholder for slug:",
      JSON.stringify(slug),
      "- using default. Ensure slug is one of CANONICAL_SUBCATEGORY_SLUGS."
    );
  }
  return DEFAULT_PLACEHOLDER;
}

/**
 * Returns the placeholder for the first candidate that is a canonical slug.
 * No fuzzy matching, no token parsing. Use when you have multiple possible slugs (e.g. subInterestId, category).
 */
export function getSubcategoryPlaceholderFromCandidates(
  candidates: ReadonlyArray<string | undefined | null>
): string {
  for (const c of candidates) {
    const canonical = normalizeToCanonicalSubcategorySlug(c);
    if (canonical) return SUBCATEGORY_PLACEHOLDER_MAP[canonical];
  }
  return DEFAULT_PLACEHOLDER;
}

/**
 * Detects whether a URL is a placeholder (businessImagePlaceholders or legacy PNG).
 */
export function isPlaceholderImage(imageUrl: string | undefined | null): boolean {
  if (!imageUrl || typeof imageUrl !== "string") return false;
  return (
    imageUrl.includes("/businessImagePlaceholders/") ||
    imageUrl.includes("/png/") ||
    imageUrl.endsWith(".png")
  );
}
