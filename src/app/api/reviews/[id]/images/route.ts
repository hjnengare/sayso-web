import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Vercel serverless request body limit: 4.5MB. Total request size (all images + form fields) must stay under this.
// See: https://vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE
const VERCEL_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Strict limits: 2 images max, 2MB each = 4MB total (close to 4.5MB limit with form overhead)
const MAX_IMAGES = 2;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB per image

/**
 * PUT /api/reviews/[id]/images
 * Update review images (add, replace, or remove).
 *
 * For larger uploads, consider client-side uploads: upload from the browser directly to
 * Supabase Storage (or Vercel Blob), then call this API with only the resulting paths/URLs
 * so the request body stays small and never hits the 4.5MB function payload limit.
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    // Reject oversized requests before reading body (avoids platform 413 and returns a clear JSON message)
    const contentLength = req.headers.get('Content-Length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!Number.isNaN(size) && size > VERCEL_BODY_LIMIT_BYTES) {
        return NextResponse.json(
          {
            error: `Request too large. Total upload must be under ${Math.round(VERCEL_BODY_LIMIT_BYTES / 1024 / 1024)}MB. Use fewer or smaller images (max ${MAX_IMAGES} images, ${MAX_IMAGE_SIZE / 1024 / 1024}MB each).`,
          },
          { status: 413 }
        );
      }
    }

    const { id } = await params;
    const supabase = await getServerSupabase();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to update review images' },
        { status: 401 }
      );
    }

    // Check if review exists and user owns it
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, business_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update images for your own reviews' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const action = formData.get('action')?.toString() || 'replace'; // 'add', 'replace', or 'remove'
    const imageFiles = formData
      .getAll('images')
      .filter((file): file is File => file instanceof File && file.size > 0);
    const imageIdsToRemove = formData
      .getAll('remove_image_ids')
      .map(id => id.toString())
      .filter(Boolean);

    // Get current review images
    const { data: currentImages } = await supabase
      .from('review_images')
      .select('id, storage_path')
      .eq('review_id', id);

    const currentImageCount = currentImages?.length || 0;

    // Handle image removal
    if (imageIdsToRemove.length > 0) {
      // Get storage paths for images to remove
      const imagesToRemove = currentImages?.filter(img => imageIdsToRemove.includes(img.id)) || [];

      // Delete from storage
      for (const image of imagesToRemove) {
        if (image.storage_path) {
          const { error: deleteError } = await supabase.storage
            .from('review_images')
            .remove([image.storage_path]);

          if (deleteError) {
            console.error('Error deleting review image from storage:', deleteError);
          }
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('review_images')
        .delete()
        .in('id', imageIdsToRemove);

      if (deleteError) {
        console.error('Error deleting review images:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove images', details: deleteError.message },
          { status: 500 }
        );
      }
    }

    // Handle image addition/replacement
    if (imageFiles.length > 0) {
      // Validate image count
      const remainingImages = currentImageCount - imageIdsToRemove.length;
      const newImageCount = action === 'replace' ? imageFiles.length : remainingImages + imageFiles.length;

      if (newImageCount > MAX_IMAGES) {
        return NextResponse.json(
          { error: `Cannot exceed ${MAX_IMAGES} images per review` },
          { status: 400 }
        );
      }

      // Validate each image
      for (const file of imageFiles) {
        // Validate file type
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: `Invalid image type: ${file.type}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
            { status: 400 }
          );
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE) {
          return NextResponse.json(
            { error: `Image ${file.name} exceeds maximum size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
            { status: 400 }
          );
        }
      }

      // If replacing, remove all existing images first
      if (action === 'replace' && currentImages && currentImages.length > 0) {
        const allImageIds = currentImages.map(img => img.id);
        const allStoragePaths = currentImages
          .map(img => img.storage_path)
          .filter(Boolean) as string[];

        // Delete from storage
        if (allStoragePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('review_images')
            .remove(allStoragePaths);

          if (storageError) {
            console.error('Error deleting old images from storage:', storageError);
          }
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from('review_images')
          .delete()
          .in('id', allImageIds);

        if (deleteError) {
          console.error('Error deleting old review images:', deleteError);
        }
      }

      // Upload new images
      const uploadedImages = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}-${i}.${fileExt}`;
        const filePath = `reviews/${fileName}`;

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('review_images')
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading review image:', uploadError);
          // Clean up any successfully uploaded images
          for (const uploaded of uploadedImages) {
            await supabase.storage.from('review_images').remove([uploaded.storage_path]);
          }
          return NextResponse.json(
            { error: 'Failed to upload image', details: uploadError.message },
            { status: 500 }
          );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('review_images')
          .getPublicUrl(filePath);

        // Insert image record
        const { data: imageRecord, error: insertError } = await supabase
          .from('review_images')
          .insert({
            review_id: id,
            image_url: urlData.publicUrl,
            storage_path: filePath,
            alt_text: file.name,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating review image record:', insertError);
          // Clean up uploaded file
          await supabase.storage.from('review_images').remove([filePath]);
          // Clean up any successfully uploaded images
          for (const uploaded of uploadedImages) {
            await supabase.storage.from('review_images').remove([uploaded.storage_path]);
          }
          return NextResponse.json(
            { error: 'Failed to save image record', details: insertError.message },
            { status: 500 }
          );
        }

        uploadedImages.push({
          id: imageRecord.id,
          image_url: imageRecord.image_url,
          storage_path: filePath,
        });
      }
    }

    // Fetch updated review with images
    const { data: updatedReview, error: fetchError } = await supabase
      .from('reviews')
      .select(`
        *,
        review_images (
          id,
          image_url,
          alt_text,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated review:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated review', details: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review images updated successfully',
      review: updatedReview,
    });

  } catch (error) {
    console.error('Error in update review images API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

