import { NextRequest, NextResponse } from "next/server";
import { withUser } from '@/app/api/_lib/withAuth';
import { getServiceSupabase } from '@/app/lib/admin';
import { extractStoragePaths } from '@/app/lib/utils/storagePathExtraction';
import { STORAGE_BUCKETS } from '@/app/lib/utils/storageBucketConfig';

const CLAIMS_BUCKET = 'business-verification';

function uniquePaths(paths: Array<string | null | undefined>): string[] {
  return [...new Set(paths.filter((path): path is string => Boolean(path)))];
}

async function removeFromBucket(
  bucket: string,
  paths: string[],
  context: string,
) {
  if (paths.length === 0) return;
  const service = getServiceSupabase();
  const { error } = await service.storage.from(bucket).remove(paths);
  if (error) {
    console.error(`Error deleting ${context} from storage (continuing with account deletion):`, error);
    return;
  }
  console.log(`Deleted ${paths.length} ${context} file(s) from ${bucket}`);
}

export const DELETE = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    const service = getServiceSupabase();

    try {
      const { data: files } = await service.storage.from('avatars').list(user.id);
      if (files && files.length > 0) {
        const pathsToDelete = uniquePaths(files.map((file) => `${user.id}/${file.name}`));
        await removeFromBucket('avatars', pathsToDelete, 'avatar');
      }
    } catch (storageError) {
      console.error('Error deleting avatar files:', storageError);
    }

    try {
      const { data: reviews } = await service
        .from('reviews')
        .select('id')
        .eq('user_id', user.id);

      if (reviews && reviews.length > 0) {
        const reviewIds = reviews.map((r) => r.id);
        const { data: images } = await service
          .from('review_images')
          .select('storage_path')
          .in('review_id', reviewIds);

        const storagePaths = uniquePaths((images ?? []).map((img) => img?.storage_path));

        if (storagePaths.length > 0) {
          await removeFromBucket(STORAGE_BUCKETS.REVIEW_IMAGES, storagePaths, 'review image');
        }
      }
    } catch (storageError) {
      console.error('Error deleting review images:', storageError);
    }

    try {
      const { data: eventReviews } = await service
        .from('event_reviews')
        .select('id')
        .eq('user_id', user.id);

      if (eventReviews && eventReviews.length > 0) {
        const eventReviewIds = eventReviews.map((r) => r.id);
        const { data: eventImages } = await service
          .from('event_review_images')
          .select('storage_path')
          .in('review_id', eventReviewIds);

        const storagePaths = uniquePaths((eventImages ?? []).map((img) => img?.storage_path));

        if (storagePaths.length > 0) {
          await removeFromBucket(STORAGE_BUCKETS.REVIEW_IMAGES, storagePaths, 'event review image');
        }
      }
    } catch (storageError) {
      console.error('Error deleting event review images:', storageError);
    }

    try {
      const { data: specialReviews } = await service
        .from('special_reviews')
        .select('id')
        .eq('user_id', user.id);

      if (specialReviews && specialReviews.length > 0) {
        const specialReviewIds = specialReviews.map((r) => r.id);
        const { data: specialImages } = await service
          .from('special_review_images')
          .select('storage_path')
          .in('review_id', specialReviewIds);

        const storagePaths = uniquePaths((specialImages ?? []).map((img) => img?.storage_path));

        if (storagePaths.length > 0) {
          await removeFromBucket(STORAGE_BUCKETS.REVIEW_IMAGES, storagePaths, 'special review image');
        }
      }
    } catch (storageError) {
      console.error('Error deleting special review images:', storageError);
    }

    try {
      const { data: businesses } = await service
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id);

      if (businesses && businesses.length > 0) {
        const businessIds = businesses.map(b => b.id);
        const { data: businessImages } = await service
          .from('business_images')
          .select('url')
          .in('business_id', businessIds);

        const imageUrls = uniquePaths((businessImages ?? []).map((img) => img?.url));
        if (imageUrls.length > 0) {
          const storagePaths = uniquePaths(extractStoragePaths(imageUrls));
          await removeFromBucket(STORAGE_BUCKETS.BUSINESS_IMAGES, storagePaths, 'business image');
        }
      }
    } catch (storageError) {
      console.error('Error deleting business images:', storageError);
    }

    try {
      const { data: claims } = await service
        .from('business_claims')
        .select('id')
        .eq('claimant_user_id', user.id);

      if (claims && claims.length > 0) {
        const claimIds = claims.map((claim) => claim.id);

        const [{ data: docsV2 }, { data: docsV1 }] = await Promise.all([
          service
            .from('business_claim_documents')
            .select('storage_path')
            .in('claim_id', claimIds),
          service
            .from('claim_documents')
            .select('storage_path')
            .in('claim_id', claimIds),
        ]);

        const claimDocPaths = uniquePaths([
          ...(docsV2 ?? []).map((doc) => doc?.storage_path),
          ...(docsV1 ?? []).map((doc) => doc?.storage_path),
        ]);

        await removeFromBucket(CLAIMS_BUCKET, claimDocPaths, 'claim document');
      }
    } catch (storageError) {
      console.error('Error deleting claim documents:', storageError);
    }

    const { error } = await supabase.rpc('delete_user_account', { p_user_id: user.id });

    if (error) {
      console.error('Error deleting account:', error);
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
});
