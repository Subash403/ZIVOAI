import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrivatePresignedUpload,
  createPrivateUploadFinalizationToken,
  getR2Client,
  MAX_PRIVATE_DELIVERABLE_SIZE_BYTES,
  validatePrivateDeliverableUpload,
  verifyPrivatePresignedUpload,
  verifyPrivateUploadFinalizationToken,
} from '../src/lib/storage';
import { POST as legacyUpload } from '../src/app/api/admin/projects/upload/route';
import { POST as initiateUpload } from '../src/app/api/admin/projects/upload/initiate/route';
import { POST as finalizeUpload } from '../src/app/api/admin/projects/upload/finalize/route';

const validUpload = {
  key: 'deliverables/1234_test-project.zip',
  fileName: 'test-project.zip',
  contentType: 'application/zip',
  sizeBytes: 1234,
};

test('private deliverable validation rejects invalid types and oversized requests', () => {
  assert.match(
    validatePrivateDeliverableUpload({ ...validUpload, fileName: 'payload.exe' }) || '',
    /unsupported/i
  );
  assert.match(
    validatePrivateDeliverableUpload({ ...validUpload, sizeBytes: MAX_PRIVATE_DELIVERABLE_SIZE_BYTES + 1 }) || '',
    /between/i
  );
  assert.match(
    validatePrivateDeliverableUpload({ ...validUpload, contentType: 'text/plain' }) || '',
    /declared file type/i
  );
});

test('private upload endpoints reject unauthenticated requests and retired multipart bodies', async () => {
  assert.equal((await initiateUpload(new Request('https://example.test/api/admin/projects/upload/initiate', { method: 'POST', body: JSON.stringify(validUpload) }))).status, 401);
  assert.equal((await finalizeUpload(new Request('https://example.test/api/admin/projects/upload/finalize', { method: 'POST', body: JSON.stringify(validUpload) }))).status, 401);
  assert.equal((await legacyUpload(new Request('https://example.test/api/admin/projects/upload', { method: 'POST' }))).status, 410);
});

test('private upload proof expires and missing R2 objects do not finalize', async () => {
  const token = createPrivateUploadFinalizationToken(validUpload);
  assert.equal(verifyPrivateUploadFinalizationToken(token, validUpload), true);
  const currentTime = Date.now;
  try {
    Date.now = () => currentTime() + 16 * 60 * 1000;
    assert.equal(verifyPrivateUploadFinalizationToken(token, validUpload), false);
  } finally {
    Date.now = currentTime;
  }
  assert.equal(await verifyPrivatePresignedUpload(validUpload), false);
});

test('presigned uploads are short-lived and successful object checks require exact metadata', async () => {
  const environment = process.env as Record<string, string | undefined>;
  const previous = {
    account: environment.R2_ACCOUNT_ID,
    access: environment.R2_ACCESS_KEY_ID,
    secret: environment.R2_SECRET_ACCESS_KEY,
  };
  environment.R2_ACCOUNT_ID = 'test-account';
  environment.R2_ACCESS_KEY_ID = 'test-access-key';
  environment.R2_SECRET_ACCESS_KEY = 'test-secret-key';
  const client = getR2Client() as unknown as { send: (command: unknown) => Promise<unknown> };
  const originalSend = client.send;
  try {
    const upload = await createPrivatePresignedUpload({
      fileName: validUpload.fileName,
      contentType: validUpload.contentType,
      sizeBytes: validUpload.sizeBytes,
    });
    assert.match(upload.uploadUrl, /X-Amz-Expires=600/);

    client.send = async () => ({
      ContentLength: validUpload.sizeBytes,
      ContentType: validUpload.contentType,
      Metadata: { 'original-name': validUpload.fileName, 'upload-kind': 'private-deliverable' },
    });
    assert.equal(await verifyPrivatePresignedUpload(validUpload), true);

    client.send = async () => ({ ContentLength: validUpload.sizeBytes - 1, ContentType: validUpload.contentType, Metadata: {} });
    assert.equal(await verifyPrivatePresignedUpload(validUpload), false);
  } finally {
    client.send = originalSend;
    if (previous.account === undefined) delete environment.R2_ACCOUNT_ID;
    else environment.R2_ACCOUNT_ID = previous.account;
    if (previous.access === undefined) delete environment.R2_ACCESS_KEY_ID;
    else environment.R2_ACCESS_KEY_ID = previous.access;
    if (previous.secret === undefined) delete environment.R2_SECRET_ACCESS_KEY;
    else environment.R2_SECRET_ACCESS_KEY = previous.secret;
  }
});
