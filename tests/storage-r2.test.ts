import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isR2Configured,
  getPublicBucketName,
  getPrivateBucketName,
  getPublicBaseUrl,
  uploadPublicAsset,
  deletePublicAsset,
  uploadPrivateAsset,
  generatePrivatePresignedDownloadUrl,
  getPrivateAssetBuffer,
} from '../src/lib/storage';

test('Cloudflare R2 & Storage Architecture', async (t) => {
  await t.test('Storage configuration inspection & defaults', () => {
    // When R2 env vars are omitted in local dev, isR2Configured returns false
    const configured = isR2Configured();
    assert.equal(typeof configured, 'boolean');

    // Default bucket names
    assert.equal(getPublicBucketName(), process.env.R2_BUCKET_PUBLIC || 'zivo-public-assets');
    assert.equal(getPrivateBucketName(), process.env.R2_BUCKET_PRIVATE || 'zivo-private-files');
  });

  await t.test('Public asset upload (Local fallback & R2 path resolution)', async () => {
    const dummyBuffer = Buffer.from('fake-image-bytes-for-test');
    const result = await uploadPublicAsset({
      buffer: dummyBuffer,
      originalName: 'test-cover.png',
      mimeType: 'image/png',
      folder: 'projects',
    });

    assert.ok(result.url);
    assert.ok(result.key);
    assert.equal(result.sizeBytes, dummyBuffer.length);
    assert.equal(result.mimeType, 'image/png');
    assert.ok(['local', 'r2'].includes(result.storage));

    if (result.storage === 'local') {
      assert.ok(result.url.startsWith('/uploads/projects/'));
    }

    // Clean up created asset
    const deleted = await deletePublicAsset(result.url);
    assert.equal(deleted, true);
  });

  await t.test('Private deliverable upload with sanitized unique keys', async () => {
    const zipBuffer = Buffer.from('PK\x03\x04fake-zip-binary-content');
    const result = await uploadPrivateAsset({
      buffer: zipBuffer,
      originalName: 'my-source-code (final).zip',
      mimeType: 'application/zip',
      folder: 'deliverables',
    });

    assert.ok(result.key);
    assert.ok(!result.key.includes(' '));
    assert.ok(!result.key.includes('('));
    assert.ok(result.fileName.endsWith('.zip'));
    assert.equal(result.sizeBytes, zipBuffer.length);
    assert.ok(['local', 'r2'].includes(result.storage));
  });

  await t.test('Presigned URL generator returns null in local fallback or valid URL with R2 credentials', async () => {
    const presigned = await generatePrivatePresignedDownloadUrl(
      'deliverables/test-project-123.zip',
      'test-project-123.zip',
      3600
    );

    if (isR2Configured()) {
      assert.ok(presigned);
      assert.ok(presigned?.startsWith('https://'));
    } else {
      // In local fallback mode without R2 keys, returns null so streaming fallback is used
      assert.equal(presigned, null);
    }
  });

  await t.test('R2 credentials and secrets are NEVER exposed in public URLs', () => {
    const publicUrl = getPublicBaseUrl();
    assert.ok(!publicUrl.includes(process.env.R2_SECRET_ACCESS_KEY || 'SECRET_KEY_NOT_SET'));
    assert.ok(!publicUrl.includes(process.env.R2_ACCESS_KEY_ID || 'ACCESS_KEY_NOT_SET'));
  });

  await t.test('Private object buffering is disabled in production', async () => {
    const environment = process.env as Record<string, string | undefined>;
    const previousNodeEnv = environment.NODE_ENV;
    environment.NODE_ENV = 'production';
    try {
      assert.equal(await getPrivateAssetBuffer('deliverables/production-guard-test.zip'), null);
    } finally {
      if (previousNodeEnv === undefined) delete environment.NODE_ENV;
      else environment.NODE_ENV = previousNodeEnv;
    }
  });
});
