import { NextResponse } from "next/server";

// Fallback subcategories data - matches the interest IDs from interests page
const FALLBACK_SUBCATEGORIES = [
  // Food & Drink
  { id: "restaurants", label: "Restaurants", interest_id: "food-drink" },
  { id: "cafes", label: "Cafés & Coffee", interest_id: "food-drink" },
  { id: "bars", label: "Bars & Pubs", interest_id: "food-drink" },
  { id: "fast-food", label: "Fast Food", interest_id: "food-drink" },
  { id: "fine-dining", label: "Fine Dining", interest_id: "food-drink" },

  // Beauty & Wellness
  { id: "gyms", label: "Gyms & Fitness", interest_id: "beauty-wellness" },
  { id: "spas", label: "Spas", interest_id: "beauty-wellness" },
  { id: "salons", label: "Hair Salons", interest_id: "beauty-wellness" },
  { id: "wellness", label: "Wellness Centers", interest_id: "beauty-wellness" },
  { id: "nail-salons", label: "Nail Salons", interest_id: "beauty-wellness" },

  // Professional Services
  { id: "education-learning", label: "Education & Learning", interest_id: "professional-services" },
  { id: "transport-travel", label: "Transport & Travel", interest_id: "professional-services" },
  { id: "finance-insurance", label: "Finance & Insurance", interest_id: "professional-services" },
  { id: "plumbers", label: "Plumbers", interest_id: "professional-services" },
  { id: "electricians", label: "Electricians", interest_id: "professional-services" },
  { id: "legal-services", label: "Legal Services", interest_id: "professional-services" },

  // Outdoors & Adventure
  { id: "hiking", label: "Hiking", interest_id: "outdoors-adventure" },
  { id: "cycling", label: "Cycling", interest_id: "outdoors-adventure" },
  { id: "water-sports", label: "Water Sports", interest_id: "outdoors-adventure" },
  { id: "camping", label: "Camping", interest_id: "outdoors-adventure" },

  // Entertainment & Experiences
  { id: "events-festivals", label: "Events & Festivals", interest_id: "experiences-entertainment" },
  { id: "sports-recreation", label: "Sports & Recreation", interest_id: "experiences-entertainment" },
  { id: "nightlife", label: "Nightlife", interest_id: "experiences-entertainment" },
  { id: "comedy-clubs", label: "Comedy Clubs", interest_id: "experiences-entertainment" },
  { id: "cinemas", label: "Cinemas", interest_id: "experiences-entertainment" },

  // Arts & Culture
  { id: "museums", label: "Museums", interest_id: "arts-culture" },
  { id: "galleries", label: "Art Galleries", interest_id: "arts-culture" },
  { id: "theaters", label: "Theaters", interest_id: "arts-culture" },
  { id: "concerts", label: "Concerts", interest_id: "arts-culture" },

  // Family & Pets
  { id: "family-activities", label: "Family Activities", interest_id: "family-pets" },
  { id: "pet-services", label: "Pet Services", interest_id: "family-pets" },
  { id: "childcare", label: "Childcare", interest_id: "family-pets" },
  { id: "veterinarians", label: "Veterinarians", interest_id: "family-pets" },

  // Shopping & Lifestyle
  { id: "fashion", label: "Fashion & Clothing", interest_id: "shopping-lifestyle" },
  { id: "electronics", label: "Electronics", interest_id: "shopping-lifestyle" },
  { id: "home-decor", label: "Home Decor", interest_id: "shopping-lifestyle" },
  { id: "books", label: "Books & Media", interest_id: "shopping-lifestyle" },

  // Other
  { id: "miscellaneous", label: "Miscellaneous", interest_id: "miscellaneous" }
];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const idsParam = url.searchParams.get("interests");
    const ids = idsParam
      ? idsParam.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    // Filter by interest IDs if provided
    let subcategories = FALLBACK_SUBCATEGORIES;
    if (ids.length > 0) {
      subcategories = FALLBACK_SUBCATEGORIES.filter(sub =>
        ids.includes(sub.interest_id)
      );
    }

    return NextResponse.json({ subcategories });

  } catch (error) {
    console.error("Subcategories API error:", error);
    return NextResponse.json({
      error: "Failed to load subcategories",
      subcategories: []
    }, { status: 500 });
  }
}
