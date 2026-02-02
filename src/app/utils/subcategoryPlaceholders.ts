/**
 * Canonical taxonomy-driven placeholder images for businesses.
 *
 * Rules:
 * - 39 canonical subcategory slugs (source of truth from api/subcategories).
 * - 1:1 mapping: each slug maps to exactly one image under public/businessImagePlaceholders.
 * - No aliases, no fuzzy matching, no token parsing.
 * - Missing slug → dev warning + global default.
 */

const P = "/businessImagePlaceholders";

/** All 39 canonical subcategory slugs (matches api/subcategories FALLBACK_SUBCATEGORIES) */
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
 * Use this everywhere so sub_interest_id always shows the correct label — no "Miscellaneous" leak.
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
  theaters: "Theaters",
  concerts: "Concerts",
  "family-activities": "Family Activities",
  "pet-services": "Pet Services",
  childcare: "Childcare",
  veterinarians: "Veterinarians",
  fashion: "Fashion & Clothing",
  electronics: "Electronics",
  "home-decor": "Home Decor",
  books: "Books & Media",
  miscellaneous: "Miscellaneous",
};

/**
 * Returns the display label for a subcategory slug. Use for all business cards/APIs.
 * Unknown slug → "Miscellaneous" (no leak of raw slug).
 */
export function getSubcategoryLabel(slug: string | undefined | null): string {
  if (slug == null || typeof slug !== "string") return "Miscellaneous";
  const key = slug.trim().toLowerCase();
  return SUBCATEGORY_SLUG_TO_LABEL[key as CanonicalSubcategorySlug] ?? "Miscellaneous";
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
  "transport-travel": `${P}/professional-services/transport-travel.jpg`,
  "finance-insurance": `${P}/professional-services/finance-insurance.jpg`,
  plumbers: `${P}/professional-services/plumbers.jpg`,
  electricians: `${P}/professional-services/electricians.jpg`,
  "legal-services": `${P}/professional-services/legal-services.jpg`,

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

export function isCanonicalSlug(slug: string | undefined | null): slug is CanonicalSubcategorySlug {
  if (slug == null || typeof slug !== "string") return false;
  return slugSet.has(slug.trim());
}

/**
 * Returns the placeholder image path for a canonical subcategory slug.
 * If the slug is not in the taxonomy, logs a dev warning and returns the global default.
 */
export function getSubcategoryPlaceholder(slug: string | undefined | null): string {
  if (slug == null || typeof slug !== "string") {
    return DEFAULT_PLACEHOLDER;
  }
  const trimmed = slug.trim();
  if (!trimmed) return DEFAULT_PLACEHOLDER;

  const path = SUBCATEGORY_PLACEHOLDER_MAP[trimmed as CanonicalSubcategorySlug];
  if (path) return path;

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[subcategoryPlaceholders] No placeholder for slug:",
      JSON.stringify(trimmed),
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
    if (c != null && typeof c === "string" && slugSet.has(c.trim())) {
      return SUBCATEGORY_PLACEHOLDER_MAP[c.trim() as CanonicalSubcategorySlug];
    }
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
