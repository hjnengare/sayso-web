/**
 * Image Processing Service
 * Handles image normalization, resizing, and storage in Supabase
 */

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fixed aspect ratios
export const ASPECT_RATIOS = {
  square: 1, // 1:1 (Instagram)
  landscape: 16 / 9, // 16:9
  portrait: 9 / 16, // 9:16
  standard: 4 / 3, // 4:3
} as const;

// Derivative sizes to generate
export const IMAGE_SIZES = {
  thumb: 150,
  small: 320,
  medium: 480,
  large: 720,
  xlarge: 1080,
} as const;

export type AspectRatio = keyof typeof ASPECT_RATIOS;
export type ImageSize = keyof typeof IMAGE_SIZES;

interface ProcessedImage {
  size: ImageSize;
  width: number;
  height: number;
  url: string;
  path: string;
}

interface ProcessImageOptions {
  file: Buffer | File;
  bucket: string;
  path: string;
  aspectRatio?: AspectRatio;
  quality?: number;
  generateThumb?: boolean;
}

export class ImageProcessingService {
  /**
   * Normalize image to fixed aspect ratio
   */
  static async normalizeAspectRatio(
    buffer: Buffer,
    aspectRatio: AspectRatio = 'square'
  ): Promise<Buffer> {
    const targetRatio = ASPECT_RATIOS[aspectRatio];
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata');
    }

    const currentRatio = metadata.width / metadata.height;
    
    let width = metadata.width;
    let height = metadata.height;

    // Calculate dimensions to fit aspect ratio
    if (currentRatio > targetRatio) {
      // Image is wider than target - fit to height
      height = metadata.height;
      width = Math.round(height * targetRatio);
    } else {
      // Image is taller than target - fit to width
      width = metadata.width;
      height = Math.round(width / targetRatio);
    }

    // Resize and center crop
    return sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .toBuffer();
  }

  /**
   * Generate derivative sizes from normalized image
   */
  static async generateDerivatives(
    normalizedBuffer: Buffer,
    sizes: ImageSize[] = ['thumb', 'small', 'medium', 'large', 'xlarge']
  ): Promise<Map<ImageSize, Buffer>> {
    const derivatives = new Map<ImageSize, Buffer>();
    const metadata = await sharp(normalizedBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata');
    }

    const aspectRatio = metadata.width / metadata.height;

    for (const size of sizes) {
      const targetWidth = IMAGE_SIZES[size];
      const targetHeight = Math.round(targetWidth / aspectRatio);

      const resized = await sharp(normalizedBuffer)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 90 })
        .toBuffer();

      derivatives.set(size, resized);
    }

    return derivatives;
  }

  /**
   * Upload processed image to Supabase Storage
   */
  static async uploadToStorage(
    buffer: Buffer,
    bucket: string,
    path: string,
    contentType: string = 'image/webp'
  ): Promise<string> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  }

  /**
   * Process and store image with all derivatives
   */
  static async processImage(options: ProcessImageOptions): Promise<{
    original: ProcessedImage;
    derivatives: ProcessedImage[];
    urls: Record<ImageSize, string>;
  }> {
    const {
      file,
      bucket,
      path,
      aspectRatio = 'square',
      quality = 90,
      generateThumb = true,
    } = options;

    // Convert File to Buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    // Normalize aspect ratio
    const normalizedBuffer = await this.normalizeAspectRatio(buffer, aspectRatio);
    const metadata = await sharp(normalizedBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata after normalization');
    }

    // Generate derivatives
    const sizes: ImageSize[] = generateThumb
      ? ['thumb', 'small', 'medium', 'large', 'xlarge']
      : ['small', 'medium', 'large', 'xlarge'];
    
    const derivatives = await this.generateDerivatives(normalizedBuffer, sizes);

    // Upload original normalized image
    const originalPath = `${path}/original.webp`;
    const originalUrl = await this.uploadToStorage(
      normalizedBuffer,
      bucket,
      originalPath
    );

    // Upload derivatives
    const derivativeUrls: Record<ImageSize, string> = {} as Record<ImageSize, string>;
    const processedDerivatives: ProcessedImage[] = [];

    for (const [size, derivativeBuffer] of derivatives.entries()) {
      const sizePath = `${path}/${size}.webp`;
      const sizeUrl = await this.uploadToStorage(
        derivativeBuffer,
        bucket,
        sizePath
      );

      const width = IMAGE_SIZES[size];
      const height = Math.round(width / (metadata.width / metadata.height));

      derivativeUrls[size] = sizeUrl;
      processedDerivatives.push({
        size,
        width,
        height,
        url: sizeUrl,
        path: sizePath,
      });
    }

    return {
      original: {
        size: 'xlarge',
        width: metadata.width,
        height: metadata.height,
        url: originalUrl,
        path: originalPath,
      },
      derivatives: processedDerivatives,
      urls: derivativeUrls,
    };
  }

  /**
   * Get optimized image URL with auto format and width
   */
  static getOptimizedUrl(
    baseUrl: string,
    width: number,
    format: 'webp' | 'avif' | 'auto' = 'auto'
  ): string {
    // If using Supabase Storage, add transform parameters
    if (baseUrl.includes('supabase.co/storage')) {
      // Supabase Storage doesn't support transform params directly
      // We'll use the pre-generated sizes instead
      return baseUrl;
    }

    // For other CDNs, add query parameters
    const url = new URL(baseUrl);
    url.searchParams.set('width', width.toString());
    if (format !== 'auto') {
      url.searchParams.set('format', format);
    } else {
      url.searchParams.set('auto', 'format');
    }
    return url.toString();
  }
}

