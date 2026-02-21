# Foursquare Business Seeding Script

This script seeds businesses from the Foursquare API into your database, automatically tagging them with the correct `interest_id` and `sub_interest_id` based on your subcategory configuration.

## Setup

1. **Install tsx** (if not already installed):
   ```bash
   npm install -D tsx
   ```

2. **Set up environment variables** in your `.env` file (all secrets are stored here):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   FSQ_API_KEY=your_foursquare_api_key
   OPENAI_API_KEY=your_openai_api_key  # Optional but recommended for GPT enrichment
   ```

   **Note:** The script automatically loads all variables from your `.env` file using `dotenv/config`.

3. **Get a Foursquare API key**:
   - Go to https://developer.foursquare.com/
   - Create an account and get your API key

## Usage

Run the seeding script:
```bash
npm run seed:fsq
```

Or directly with tsx:
```bash
npx tsx scripts/seed-foursquare-businesses.ts
```

## How It Works

1. **Config-Based Mapping**: The script uses `SUBCATEGORY_CONFIGS` to map:
   - Your subcategory labels (e.g., "Coffee shops")
   - Foursquare search queries (e.g., "coffee")
   - Your interest IDs (e.g., "food-drink")
   - Your sub-interest IDs (e.g., "cafes")

2. **Automatic Tagging**: Each business is automatically tagged with:
   - `interest_id`: The parent interest (e.g., "food-drink")
   - `sub_interest_id`: The specific subcategory (e.g., "cafes")
   - `source`: "foursquare"
   - `source_id`: The Foursquare place ID

3. **Data Collection**: For each place, the script:
   - Searches Foursquare for places matching the query
   - Fetches detailed information (hours, contact info, price)
   - Gets the primary photo URL
   - Upserts into your database

## Customizing Subcategories

Edit `SUBCATEGORY_CONFIGS` in `scripts/seed-foursquare-businesses.ts`:

```typescript
{
  label: 'Your Category Label',
  query: 'foursquare-search-query',
  interestId: 'your-interest-slug',      // e.g., 'food-drink'
  subInterestId: 'your-sub-interest-slug', // e.g., 'cafes'
}
```

## Current Subcategories

The script includes mappings for:
- **Food & Drink**: Coffee shops, Restaurants, Bars, Fast Food, Fine Dining
- **Beauty & Wellness**: Gyms, Spas, Hair Salons, Nail Salons, Wellness Centers
- **Professional Services**: Plumbers, Electricians, Legal Services
- **Entertainment**: Nightlife, Cinemas, Comedy Clubs
- **Arts & Culture**: Museums, Art Galleries, Theaters
- **Family & Pets**: Veterinarians, Pet Services
- **Shopping**: Fashion, Electronics, Books

## GPT Data Enrichment

The script uses GPT-5.1 (when `OPENAI_API_KEY` is provided) to enrich business data:

### What GPT Does:
- ✅ **Address Inference**: Fills missing addresses based on business name + location
- ✅ **Category Refinement**: Improves broad Foursquare categories (e.g., "Café, Coffee Shop" → "Coffee Shop")
- ✅ **Location Cleaning**: Converts messy locations ("Cape Town Ward 115" → "Woodstock, Cape Town")
- ✅ **Neighbourhood Tagging**: Infers Cape Town suburbs/areas (CBD, Gardens, Sea Point, Observatory, etc.)
- ✅ **Name Expansion**: Clarifies acronyms and abbreviations
- ✅ **Description Generation**: Creates authentic South African-style descriptions

### What GPT Doesn't Do:
- ❌ Exact addresses (only "most likely" when missing)
- ❌ Phone numbers
- ❌ Opening hours
- ❌ Legal/regulated attributes

### Safety:
- GPT only fills missing data or cleans messy data
- Returns `null` if unsure (never guesses)
- Falls back gracefully if GPT is unavailable
- Uses low temperature (0.2-0.3) for consistent results

## Notes

- The script searches within a 25km radius of Cape Town
- Rate limiting: Small delays between requests to avoid Foursquare API limits
- Idempotent: Uses `source='foursquare'` + `source_id` for upserts (won't create duplicates)
- Photos: Only sets `image_url` if a Foursquare photo is available (doesn't touch `uploaded_image`)
- GPT enrichment: Optional but recommended for best data quality

