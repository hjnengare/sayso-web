/**
 * Script to manually trigger the Ticketmaster events fetch cron job locally
 * 
 * Usage:
 *   node scripts/fetch-events.js
 *   node scripts/fetch-events.js --city "Cape Town" --size 50
 */

const args = process.argv.slice(2);

// Parse command line arguments
const params = new URLSearchParams();
let city = 'Cape Town';
let size = 20;
let keyword = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--city' && args[i + 1]) {
    city = args[i + 1];
    i++;
  } else if (args[i] === '--size' && args[i + 1]) {
    size = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--keyword' && args[i + 1]) {
    keyword = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Usage: node scripts/fetch-events.js [options]

Options:
  --city <city>      City to fetch events for (default: "Cape Town")
  --size <number>    Number of events to fetch (default: 20)
  --keyword <term>   Search keyword (optional)
  --help, -h         Show this help message

Examples:
  node scripts/fetch-events.js
  node scripts/fetch-events.js --city "Cape Town" --size 50
  node scripts/fetch-events.js --keyword "music" --city "Cape Town"
    `);
    process.exit(0);
  }
}

// Build URL
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const url = new URL(`${baseUrl}/api/cron/fetch-events`);
url.searchParams.set('city', city);
url.searchParams.set('size', size.toString());
if (keyword) {
  url.searchParams.set('keyword', keyword);
}

// Get cron secret if set
const cronSecret = process.env.CRON_SECRET;
const headers = {
  'Content-Type': 'application/json',
};

if (cronSecret) {
  headers['Authorization'] = `Bearer ${cronSecret}`;
}

console.log('🚀 Fetching Ticketmaster events...');
console.log(`📍 City: ${city}`);
console.log(`📊 Size: ${size}`);
if (keyword) {
  console.log(`🔍 Keyword: ${keyword}`);
}
console.log(`🔗 URL: ${url.toString()}`);
console.log('');

// Make the request
fetch(url.toString(), {
  method: 'GET',
  headers,
})
  .then(async (response) => {
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', data.error || data.message || 'Unknown error');
      if (data.details) {
        console.error('Details:', data.details);
      }
      process.exit(1);
    }

    console.log('✅ Success!');
    console.log('');
    console.log('📊 Results:');
    console.log(`   Events processed: ${data.events_processed || 0}`);
    console.log(`   Events stored: ${data.events_stored || 0}`);
    console.log(`   Inserted: ${data.inserted || 0}`);
    console.log(`   Updated: ${data.updated || 0}`);
    if (data.page) {
      console.log(`   Total available: ${data.page.totalElements || 'N/A'}`);
    }
    console.log(`   Timestamp: ${data.timestamp || new Date().toISOString()}`);
    console.log('');
    console.log('🎉 Events have been stored in the database!');
  })
  .catch((error) => {
    console.error('❌ Network error:', error.message);
    console.error('');
    console.error('💡 Make sure:');
    console.error('   1. Your Next.js dev server is running (npm run dev)');
    console.error('   2. Your .env file has TICKETMASTER_API_KEY set');
    console.error('   3. Your Supabase connection is configured');
    process.exit(1);
  });

