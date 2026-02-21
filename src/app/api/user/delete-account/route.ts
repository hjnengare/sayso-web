import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase/server";

export async function DELETE(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First, delete user's avatar from storage
    try {
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);
      
      if (files && files.length > 0) {
        const pathsToDelete = files.map(file => `${user.id}/${file.name}`);
        await supabase.storage
          .from('avatars')
          .remove(pathsToDelete);
      }
    } catch (storageError) {
      console.error('Error deleting avatar files:', storageError);
      // Continue with account deletion even if storage deletion fails
    }

    // Delete all review images from storage (bucket: review_images) so no orphaned files remain
    try {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id);

      if (reviews && reviews.length > 0) {
        const reviewIds = reviews.map((r) => r.id);
        const { data: images } = await supabase
          .from('review_images')
          .select('storage_path')
          .in('review_id', reviewIds);

        const storagePaths = (images ?? [])
          .map((img) => img?.storage_path)
          .filter((path): path is string => Boolean(path));

        if (storagePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('review_images')
            .remove(storagePaths);

          if (storageError) {
            console.error('Error deleting review images from storage (continuing with account deletion):', storageError);
          } else {
            console.log(`Deleted ${storagePaths.length} review image file(s) for user ${user.id}`);
          }
        }
      }
    } catch (storageError) {
      console.error('Error deleting review images:', storageError);
      // Continue with account deletion even if storage deletion fails
    }

    // Delete event review images from storage
    try {
      const { data: eventReviews } = await supabase
        .from('event_reviews')
        .select('id')
        .eq('user_id', user.id);

      if (eventReviews && eventReviews.length > 0) {
        const eventReviewIds = eventReviews.map((r) => r.id);
        const { data: eventImages } = await supabase
          .from('event_review_images')
          .select('storage_path')
          .in('review_id', eventReviewIds);

        const storagePaths = (eventImages ?? [])
          .map((img) => img?.storage_path)
          .filter((path): path is string => Boolean(path));

        if (storagePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('review_images')
            .remove(storagePaths);
          if (storageError) {
            console.error('Error deleting event review images from storage (continuing):', storageError);
          }
        }
      }
    } catch (storageError) {
      console.error('Error deleting event review images:', storageError);
    }

    // Delete special review images from storage
    try {
      const { data: specialReviews } = await supabase
        .from('special_reviews')
        .select('id')
        .eq('user_id', user.id);

      if (specialReviews && specialReviews.length > 0) {
        const specialReviewIds = specialReviews.map((r) => r.id);
        const { data: specialImages } = await supabase
          .from('special_review_images')
          .select('storage_path')
          .in('review_id', specialReviewIds);

        const storagePaths = (specialImages ?? [])
          .map((img) => img?.storage_path)
          .filter((path): path is string => Boolean(path));

        if (storagePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('review_images')
            .remove(storagePaths);
          if (storageError) {
            console.error('Error deleting special review images from storage (continuing):', storageError);
          }
        }
      }
    } catch (storageError) {
      console.error('Error deleting special review images:', storageError);
    }

    // Delete business images from storage
    // Note: Businesses will be cascade deleted when user is deleted,
    // but we need to clean up storage files first
    try {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id);

      if (businesses && businesses.length > 0) {
        const businessIds = businesses.map(b => b.id);
        
        // Fetch business images from business_images table
        const { data: businessImages } = await supabase
          .from('business_images')
          .select('url')
          .in('business_id', businessIds);

        const allImageUrls: string[] = [];
        if (businessImages) {
          allImageUrls.push(...businessImages.map(img => img.url).filter(Boolean));
        }

        if (allImageUrls.length > 0) {
          const { extractStoragePaths } = await import('../../../lib/utils/storagePathExtraction');
          const storagePaths = extractStoragePaths(allImageUrls);

          if (storagePaths.length > 0) {
            const { STORAGE_BUCKETS } = await import('@/app/lib/utils/storageBucketConfig');
            const { error: storageError } = await supabase.storage
              .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
              .remove(storagePaths);

            if (storageError) {
              console.warn('Error deleting business images from storage (continuing with account deletion):', storageError);
              // Continue with account deletion even if storage deletion fails
            } else {
              console.log(`Deleted ${storagePaths.length} business image files for user ${user.id}`);
            }
          }
        }
      }
    } catch (storageError) {
      console.error('Error deleting business images:', storageError);
      // Continue with account deletion even if storage deletion fails
    }

    // Delete the user from auth.users
    // This will cascade delete all related data in profiles, user_interests, reviews, businesses, etc.
    // Note: Businesses owned by the user will be cascade deleted along with their images, stats, etc.
    const { error } = await supabase.rpc('delete_user_account', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error deleting account:', error);
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
