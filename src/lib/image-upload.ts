import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  isLocalUploadedImage,
} from './image-upload-constants';

export * from './image-upload-constants';

/**
 * Returns absolute filesystem path to project upload directory.
 */
export function getImageStorageDir(): string {
  return path.join(process.cwd(), 'public', 'uploads', 'projects');
}

/**
 * Generates an unguessable, collision-free, safe filename for an uploaded image.
 */
export function generateSafeImageFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const safeExt = ALLOWED_IMAGE_EXTENSIONS.includes(ext) ? ext : '.jpg';
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(6).toString('hex');
  return `proj_${timestamp}_${randomHex}${safeExt}`;
}

/**
 * Safely removes a replaced or deleted locally uploaded image file.
 * Guards against directory traversal and only deletes files inside the project upload directory.
 */
export function safeDeleteUploadedImage(fileUrl: string | null | undefined): boolean {
  if (!fileUrl || !isLocalUploadedImage(fileUrl)) {
    return false;
  }

  const fileName = path.basename(fileUrl);
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }

  const storageDir = getImageStorageDir();
  const targetFilePath = path.join(storageDir, fileName);

  try {
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath);
      return true;
    }
  } catch (err) {
    console.warn(`Failed to delete replaced image at ${targetFilePath}:`, err);
  }

  return false;
}
