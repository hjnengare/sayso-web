# OSM (Overpass API) Business Seeding Script

This script seeds businesses from OpenStreetMap Overpass API into your database, automatically tagging them with the correct `interest_id` and `sub_interest_id` based on your subcategory configuration.

## Setup

1. **Install tsx** (if not already installed):
   ```bash
   npm install -D tsx
   ```

2. **Set up environment variables** in your `.env` file (all secrets are stored here):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key  # Optional but recommended for GPT enrichment
   ```

   **Note:** The script automatically loads all variables from your `.env` file using `dotenv/config`.

3. **No API key required!** OSM Overpass API is free and open-source - no authentication needed.

## Usage

Run the seeding script:
```bash
npm run seed:osm
```

Or directly with tsx:
```bash
npx tsx scripts/seed-osm-businesses.ts
```

## How It Works

1. **Config-Based Mapping**: The script uses `SUBCATEGORY_CONFIGS` to map:
   - Your subcategory labels (e.g., "Coffee shops")
   - OSM subcategory IDs (e.g., "cafes")
   - Your interest IDs (e.g., "food-drink")
   - Your sub-interest IDs (e.g., "cafes")

2. **Automatic Tagging**: Each business is automatically tagged with:
   - `interest_id`: The parent interest (e.g., "food-drink")
   - `sub_interest_id`: The specific subcategory (e.g., "cafes")
   - `source`: "overpass"
   - `source_id`: The OSM ID (e.g., "osm-node-123")

3. **Data Collection**: For each place, the script:
   - Fetches businesses from Overpass API for Cape Town
   - Enriches data with GPT-5.1 (if API key provided)
   - Upserts into your database

## GPT Data Enrichment

The script uses GPT-5.1 (when `OPENAI_API_KEY` is provided) to enrich business data:

### What GPT Does:
- ✅ **Address Inference**: Fills missing addresses based on business name + location
- ✅ **Category Refinement**: Improves OSM categories
- ✅ **Location Cleaning**: Converts messy locations to clean format
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

## Customizing Subcategories

Edit `SUBCATEGORY_CONFIGS` in `scripts/seed-osm-businesses.ts`:

```typescript
{
  label: 'Your Category Label',
  subcategoryId: 'osm-subcategory-id', // Must match OSM subcategory mapping
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

## Notes

- The script searches within Cape Town bounding box
- Rate limiting: 2 second delays between subcategories (OSM API is slower than Foursquare)
- Idempotent: Uses `source='overpass'` + `source_id` for upserts (won't create duplicates)
- Free & Open: OSM data is free and open-source - no API costs!
- GPT enrichment: Optional but recommended for best data quality

## Advantages of OSM over Foursquare

- ✅ **Free**: No API costs or rate limits
- ✅ **Open Source**: Community-maintained data
- ✅ **Comprehensive**: Covers many local businesses
- ✅ **No Authentication**: No API keys needed
- ⚠️ **Slower**: Overpass API can be slower than commercial APIs
- ⚠️ **Less Structured**: Data quality varies by region

