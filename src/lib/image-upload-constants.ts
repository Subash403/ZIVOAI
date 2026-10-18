export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Pure client/server validation of image file attributes (size, extension, MIME type).
 * Safe for browser bundling (no Node.js fs dependencies).
 */
export function validateImageFile({
  name,
  size,
  type,
}: {
  name: string;
  size: number;
  type?: string;
}): ImageValidationResult {
  if (!name || size === undefined || size === null) {
    return { valid: false, error: 'No image file details provided.' };
  }

  if (size <= 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }

  if (size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMb = (size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeInMb} MB) exceeds maximum allowed 5 MB limit.`,
    };
  }

  const lastDot = name.lastIndexOf('.');
  const ext = lastDot !== -1 ? name.substring(lastDot).toLowerCase() : '';
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported image format "${ext || 'unknown'}". Allowed formats: JPG, JPEG, PNG, WebP.`,
    };
  }

  if (type) {
    const normalizedType = type.toLowerCase().trim();
    if (!ALLOWED_IMAGE_TYPES.includes(normalizedType)) {
      return {
        valid: false,
        error: `Invalid MIME type "${normalizedType}". Only standard JPEG, PNG, and WebP images are allowed.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Checks whether an image URL is a locally uploaded image managed by the platform.
 */
export function isLocalUploadedImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('/uploads/projects/');
}
