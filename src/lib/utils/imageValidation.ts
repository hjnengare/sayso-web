/**
 * Image File Validation Utility
 * 
 * Validates uploaded files to ensure they are actual images
 * with proper MIME types, sizes, and extensions.
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

const VALID_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const VALID_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/jpg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validates that a file is a valid image
 * 
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check MIME type
  if (!VALID_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type. Only ${VALID_EXTENSIONS.join(', ')} images are allowed.`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds the 5MB limit.`,
    };
  }

  // Check file extension matches MIME type
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) {
    return {
      valid: false,
      error: 'File must have an extension.',
    };
  }

  if (!VALID_EXTENSIONS.includes(ext as any)) {
    return {
      valid: false,
      error: `Invalid file extension. Only ${VALID_EXTENSIONS.join(', ')} are allowed.`,
    };
  }

  // Verify extension matches MIME type
  const allowedExts = MIME_TO_EXTENSIONS[file.type];
  if (!allowedExts || !allowedExts.includes(ext)) {
    return {
      valid: false,
      error: `File extension (.${ext}) does not match file type (${file.type}).`,
    };
  }

  // Check for empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    };
  }

  return { valid: true };
}

/**
 * Validates multiple image files
 * 
 * @param files - Array of files to validate
 * @returns Array of validation results
 */
export function validateImageFiles(files: File[]): ImageValidationResult[] {
  return files.map(file => validateImageFile(file));
}

/**
 * Checks if all files are valid
 * 
 * @param files - Array of files to validate
 * @returns true if all files are valid, false otherwise
 */
export function areAllImagesValid(files: File[]): boolean {
  return validateImageFiles(files).every(result => result.valid);
}

/**
 * Gets the first validation error from a set of files
 * 
 * @param files - Array of files to validate
 * @returns First error message, or undefined if all valid
 */
export function getFirstValidationError(files: File[]): string | undefined {
  for (const file of files) {
    const result = validateImageFile(file);
    if (!result.valid) {
      return result.error;
    }
  }
  return undefined;
}

