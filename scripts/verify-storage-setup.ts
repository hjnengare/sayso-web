/**
 * Storage Setup Verification Script
 * 
 * This script verifies that the required Supabase Storage buckets are set up correctly.
 * Run this script after setting up your Supabase project to ensure everything is configured.
 * 
 * Usage:
 *   npx tsx scripts/verify-storage-setup.ts
 * 
 * Or with environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL=your_url NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key npx tsx scripts/verify-storage-setup.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('\nSet these in your .env.local file or pass as environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface VerificationResult {
  bucket: string;
  exists: boolean;
  isPublic: boolean;
  hasReadPolicy: boolean;
  hasUploadPolicy: boolean;
  errors: string[];
}

async function verifyBucket(bucketName: string): Promise<VerificationResult> {
  const result: VerificationResult = {
    bucket: bucketName,
    exists: false,
    isPublic: false,
    hasReadPolicy: false,
    hasUploadPolicy: false,
    errors: [],
  };

  try {
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      result.errors.push(`Failed to list buckets: ${bucketsError.message}`);
      return result;
    }

    const bucket = buckets?.find(b => b.id === bucketName);
    
    if (!bucket) {
      result.errors.push(`Bucket "${bucketName}" does not exist. Create it in Supabase Dashboard > Storage.`);
      return result;
    }

    result.exists = true;
    result.isPublic = bucket.public === true;

    if (!result.isPublic) {
      result.errors.push(`Bucket "${bucketName}" is not public. Set it to public in Supabase Dashboard.`);
    }

    // Check RLS policies (requires admin access, so we'll just note if bucket exists and is public)
    // Policies are checked via SQL query, not via client SDK
    
  } catch (error) {
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

async function main() {
  console.log('🔍 Verifying Supabase Storage Setup...\n');
  console.log(`Supabase URL: ${SUPABASE_URL}\n`);

  const bucketsToCheck = [
    'business-images',
    'review_images',
  ];

  const results: VerificationResult[] = [];

  for (const bucketName of bucketsToCheck) {
    console.log(`Checking bucket: ${bucketName}...`);
    const result = await verifyBucket(bucketName);
    results.push(result);
    
    if (result.exists && result.isPublic && result.errors.length === 0) {
      console.log(`  ✅ ${bucketName}: OK\n`);
    } else {
      console.log(`  ❌ ${bucketName}: Issues found`);
      result.errors.forEach(error => console.log(`     - ${error}`));
      console.log();
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  const allGood = results.every(r => r.exists && r.isPublic && r.errors.length === 0);
  
  if (allGood) {
    console.log('✅ All storage buckets are properly configured!\n');
  } else {
    console.log('⚠️  Some buckets need configuration. See errors above.\n');
    console.log('📚 Setup Guide: docs/01_setup/BUSINESS_IMAGES_STORAGE_SETUP.md\n');
  }

  // Additional checks
  console.log('📝 Additional Setup Steps:');
  console.log('   1. Run RLS policies migration:');
  console.log('      src/app/lib/migrations/002_business/008_business-images-storage.sql');
  console.log('   2. Verify policies in Supabase Dashboard > Storage > Policies');
  console.log('   3. Test image upload via /add-business page\n');
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

