import { NextRequest, NextResponse } from 'next/server';
import { ImageProcessingService, AspectRatio } from '@/app/lib/services/imageProcessingService';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/images/process
 * Process and store image with normalized aspect ratio and derivatives
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'event-images';
    const path = formData.get('path') as string;
    const aspectRatio = (formData.get('aspectRatio') as AspectRatio) || 'square';
    const quality = parseInt(formData.get('quality') as string) || 90;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!path) {
      return NextResponse.json(
        { error: 'No path provided' },
        { status: 400 }
      );
    }

    // Process image
    const result = await ImageProcessingService.processImage({
      file,
      bucket,
      path,
      aspectRatio,
      quality,
      generateThumb: true,
    });

    return NextResponse.json({
      success: true,
      original: result.original,
      derivatives: result.derivatives,
      urls: result.urls,
    });
  } catch (error: any) {
    console.error('[Image Processing API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process image', message: error.message },
      { status: 500 }
    );
  }
}

