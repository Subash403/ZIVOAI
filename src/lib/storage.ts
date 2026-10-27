import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateSafeImageFileName, safeDeleteUploadedImage, getImageStorageDir } from './image-upload';
import { getJwtSecret } from './auth';

export const MAX_PRIVATE_DELIVERABLE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;
const PRIVATE_UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;
const ALLOWED_PRIVATE_DELIVERABLES: Record<string, string[]> = {
  '.zip': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  '.tar.gz': ['application/gzip', 'application/x-gzip', 'application/octet-stream'],
  '.rar': ['application/vnd.rar', 'application/x-rar-compressed', 'application/octet-stream'],
  '.7z': ['application/x-7z-compressed', 'application/octet-stream'],
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain'],
};

export interface PrivateDeliverableUpload {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export function validatePrivateDeliverableUpload({ fileName, contentType, sizeBytes }: PrivateDeliverableUpload): string | null {
  const normalizedName = fileName.trim();
  const normalizedType = contentType.trim().toLowerCase();
  const extension = Object.keys(ALLOWED_PRIVATE_DELIVERABLES).find((candidate) => normalizedName.toLowerCase().endsWith(candidate));
  if (!normalizedName || normalizedName.length > 180 || !extension) {
    return 'Unsupported deliverable file type.';
  }
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_PRIVATE_DELIVERABLE_SIZE_BYTES) {
    return `Deliverables must be between 1 byte and ${MAX_PRIVATE_DELIVERABLE_SIZE_BYTES / (1024 * 1024 * 1024)} GB.`;
  }
  if (!normalizedType || !ALLOWED_PRIVATE_DELIVERABLES[extension].includes(normalizedType)) {
    return 'The declared file type does not match an allowed deliverable format.';
  }
  return null;
}

function sanitizePrivateDeliverableName(originalName: string): string {
  return originalName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function createPrivateDeliverableKey(originalName: string): string {
  return `deliverables/${Date.now()}_${crypto.randomBytes(16).toString('hex')}_${sanitizePrivateDeliverableName(originalName)}`;
}

function createPrivateUploadTokenPayload(upload: PrivateDeliverableUpload & { key: string; expiresAt: number }) {
  return `${upload.key}\n${upload.fileName}\n${upload.contentType}\n${upload.sizeBytes}\n${upload.expiresAt}`;
}

export function createPrivateUploadFinalizationToken(upload: PrivateDeliverableUpload & { key: string }): string {
  const expiresAt = Date.now() + PRIVATE_UPLOAD_TOKEN_TTL_MS;
  const encoded = Buffer.from(JSON.stringify({ ...upload, expiresAt })).toString('base64url');
  const signature = crypto.createHmac('sha256', getJwtSecret()).update(createPrivateUploadTokenPayload({ ...upload, expiresAt })).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyPrivateUploadFinalizationToken(token: string, upload: PrivateDeliverableUpload & { key: string }): boolean {
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return false;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PrivateDeliverableUpload & { key: string; expiresAt: number };
    if (payload.expiresAt < Date.now() || payload.key !== upload.key || payload.fileName !== upload.fileName || payload.contentType !== upload.contentType || payload.sizeBytes !== upload.sizeBytes) return false;
    const expected = crypto.createHmac('sha256', getJwtSecret()).update(createPrivateUploadTokenPayload(payload)).digest('base64url');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');
    return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

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

export async function createPrivatePresignedUpload(upload: PrivateDeliverableUpload): Promise<{
  key: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  fileName: string;
}> {
  const validationError = validatePrivateDeliverableUpload(upload);
  if (validationError) throw new Error(validationError);
  if (!isR2Configured()) throw new Error('Private uploads require configured R2 storage.');

  const fileName = sanitizePrivateDeliverableName(upload.fileName);
  const key = createPrivateDeliverableKey(fileName);
  const requiredHeaders = {
    'content-type': upload.contentType,
    'x-amz-meta-original-name': fileName,
    'x-amz-meta-upload-kind': 'private-deliverable',
  };
  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: getPrivateBucketName(),
      Key: key,
      ContentType: upload.contentType,
      Metadata: { 'original-name': fileName, 'upload-kind': 'private-deliverable' },
    }),
    { expiresIn: 10 * 60 }
  );

  return { key, uploadUrl, requiredHeaders, fileName };
}

export async function verifyPrivatePresignedUpload(upload: PrivateDeliverableUpload & { key: string }): Promise<boolean> {
  const validationError = validatePrivateDeliverableUpload(upload);
  if (validationError || !isR2Configured() || !upload.key.startsWith('deliverables/')) return false;

  try {
    const result = await getR2Client().send(
      new HeadObjectCommand({ Bucket: getPrivateBucketName(), Key: upload.key })
    );
    return (
      result.ContentLength === upload.sizeBytes &&
      result.ContentType?.toLowerCase() === upload.contentType.toLowerCase() &&
      result.Metadata?.['original-name'] === sanitizePrivateDeliverableName(upload.fileName) &&
      result.Metadata?.['upload-kind'] === 'private-deliverable'
    );
  } catch (error) {
    console.warn('Private upload finalization check failed:', error);
    return false;
  }
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
  if (process.env.NODE_ENV === 'production') {
    console.error('Private asset buffering is disabled in production.', {
      keyType: key.includes('/') ? 'object-key' : 'local-key',
    });
    return null;
  }

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

export async function privateAssetExists(key: string): Promise<boolean> {
  if (!key) return false;

  if (isR2Configured() && key.includes('/')) {
    try {
      await getR2Client().send(
        new HeadObjectCommand({
          Bucket: getPrivateBucketName(),
          Key: key,
        })
      );
      return true;
    } catch (err) {
      console.error('Failed to verify private R2 deliverable:', err);
      return false;
    }
  }

  const localFileName = path.basename(key);
  return fs.existsSync(path.join(process.cwd(), 'storage', 'private-downloads', localFileName));
}

/**
 * Deletes a private deliverable from Cloudflare R2 private bucket or local filesystem.
 */
export async function deletePrivateAsset(key: string): Promise<boolean> {
  if (!key) return false;

  if (isR2Configured() && key.includes('/')) {
    try {
      const client = getR2Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: getPrivateBucketName(),
          Key: key,
        })
      );
      return true;
    } catch (err) {
      console.error('Failed to delete private R2 deliverable:', err);
      return false;
    }
  }

  try {
    const localFileName = path.basename(key);
    const localFilePath = path.join(process.cwd(), 'storage', 'private-downloads', localFileName);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to delete local private deliverable:', err);
    return false;
  }
}

