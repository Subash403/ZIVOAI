import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateSafeImageFileName, safeDeleteUploadedImage, getImageStorageDir } from './image-upload';

/**
 * Checks whether Cloudflare R2 credentials are fully configured in environment.
 */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}

/**
 * Lazily initializes and returns the S3Client configured for Cloudflare R2.
 */
let cachedClient: S3Client | null = null;
export function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedClient;
}

export function getPublicBucketName(): string {
  return process.env.R2_BUCKET_PUBLIC || 'zivo-public-assets';
}

export function getPrivateBucketName(): string {
  return process.env.R2_BUCKET_PRIVATE || 'zivo-private-files';
}

export function getPublicBaseUrl(): string {
  const customUrl = process.env.R2_PUBLIC_BASE_URL;
  if (customUrl) {
    return customUrl.replace(/\/$/, '');
  }
  return '';
}

export interface UploadPublicResult {
  url: string;
  key: string;
  sizeBytes: number;
  mimeType: string;
  storage: 'r2' | 'local';
}

export interface UploadPrivateResult {
  key: string;
  fileName: string;
  sizeBytes: number;
  storage: 'r2' | 'local';
}

/**
 * Uploads a public asset (e.g. project cover image, gallery screenshot, architecture diagram).
 * Uploads to Cloudflare R2 Public Bucket if configured, otherwise falls back to local public directory.
 */
export async function uploadPublicAsset(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
}): Promise<UploadPublicResult> {
  const { buffer, originalName, mimeType, folder = 'projects' } = params;

  if (isR2Configured()) {
    const client = getR2Client();
    const safeFileName = generateSafeImageFileName(originalName);
    const key = `${folder}/${safeFileName}`;
    const bucket = getPublicBucketName();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const baseUrl = getPublicBaseUrl();
    const url = baseUrl ? `${baseUrl}/${key}` : `https://${bucket}.r2.cloudflarestorage.com/${key}`;

    return {
      url,
      key,
      sizeBytes: buffer.length,
      mimeType,
      storage: 'r2',
    };
  }

  // Local filesystem fallback for development
  const storageDir = getImageStorageDir();
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const safeFileName = generateSafeImageFileName(originalName);
  const targetFilePath = path.join(storageDir, safeFileName);
  fs.writeFileSync(targetFilePath, buffer);

  return {
    url: `/uploads/projects/${safeFileName}`,
    key: `local/${safeFileName}`,
    sizeBytes: buffer.length,
    mimeType,
    storage: 'local',
  };
}

/**
 * Deletes a public asset from Cloudflare R2 or local disk.
 */
export async function deletePublicAsset(urlOrKey: string): Promise<boolean> {
  if (!urlOrKey) return false;

  if (isR2Configured() && !urlOrKey.startsWith('/uploads/')) {
    try {
      const client = getR2Client();
      const baseUrl = getPublicBaseUrl();
      let key = urlOrKey;

      if (baseUrl && urlOrKey.startsWith(baseUrl)) {
        key = urlOrKey.replace(`${baseUrl}/`, '');
      }

      await client.send(
        new DeleteObjectCommand({
          Bucket: getPublicBucketName(),
          Key: key,
        })
      );
      return true;
    } catch (err) {
      console.warn('R2 public deletion failed:', err);
      return false;
    }
  }

  return safeDeleteUploadedImage(urlOrKey);
}

/**
 * Uploads a private downloadable deliverable (ZIP source code, report PDF, dataset).
 * Stored strictly in Cloudflare R2 Private Bucket or storage/private-downloads.
 */
export async function uploadPrivateAsset(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
}): Promise<UploadPrivateResult> {
  const { buffer, originalName, mimeType, folder = 'deliverables' } = params;
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueKey = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${sanitizedName}`;

  if (isR2Configured()) {
    const client = getR2Client();
    const key = `${folder}/${uniqueKey}`;
    const bucket = getPrivateBucketName();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      })
    );

    return {
      key,
      fileName: sanitizedName,
      sizeBytes: buffer.length,
      storage: 'r2',
    };
  }

  // Local filesystem fallback
  const storageDir = path.join(process.cwd(), 'storage', 'private-downloads');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const targetPath = path.join(storageDir, uniqueKey);
  fs.writeFileSync(targetPath, buffer);

  return {
    key: uniqueKey,
    fileName: sanitizedName,
    sizeBytes: buffer.length,
    storage: 'local',
  };
}

/**
 * Generates an authorized, time-limited presigned URL for secure customer downloading from R2.
 * Returns null if running on local fallback storage.
 */
export async function generatePrivatePresignedDownloadUrl(
  key: string,
  downloadFileName: string,
  expiresInSeconds = 3600 // 1 hour
): Promise<string | null> {
  if (!isR2Configured()) {
    return null;
  }

  try {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: getPrivateBucketName(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${downloadFileName}"`,
    });

    const presignedUrl = await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });

    return presignedUrl;
  } catch (err) {
    console.error('Failed to generate presigned R2 download URL:', err);
    return null;
  }
}

/**
 * Reads a private asset buffer from Cloudflare R2 or local filesystem.
 */
export async function getPrivateAssetBuffer(key: string): Promise<Buffer | null> {
  if (isR2Configured() && key.includes('/')) {
    try {
      const client = getR2Client();
      const response = await client.send(
        new GetObjectCommand({
          Bucket: getPrivateBucketName(),
          Key: key,
        })
      );

      if (!response.Body) return null;
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (err) {
      console.error('Failed to read private file from R2:', err);
      return null;
    }
  }

  // Local filesystem fallback
  const localFileName = path.basename(key);
  const localFilePath = path.join(process.cwd(), 'storage', 'private-downloads', localFileName);
  if (fs.existsSync(localFilePath)) {
    return fs.readFileSync(localFilePath);
  }

  return null;
}
