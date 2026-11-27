import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSpreadsheetId,
  formatPrivateKey,
  resolveGoogleSheetsConfig,
  syncEnquiryToGoogleSheets,
  testGoogleSheetsConnection,
} from '../src/lib/google-sheets';
import { POST as retrySyncRoute } from '../src/app/api/admin/enquiries/[id]/retry-sync/route';
import { POST as publicRetrySyncRoute } from '../src/app/api/enquiries/[id]/retry-sync/route';
import { prisma } from '../src/lib/prisma';
import { signAdminToken, ADMIN_TOKEN_COOKIE_NAME } from '../src/lib/auth';

test('Google Sheets Configuration & Key Extraction Sanitization', async (t) => {
  await t.test('extractSpreadsheetId extracts clean ID from standard and complex URLs', () => {
    assert.equal(
      extractSpreadsheetId('15XfhBAF21seSRyDLfkPd4ulQnRafRRPMUVvXKK8iEb8'),
      '15XfhBAF21seSRyDLfkPd4ulQnRafRRPMUVvXKK8iEb8'
    );
    assert.equal(
      extractSpreadsheetId('https://docs.google.com/spreadsheets/d/15XfhBAF21seSRyDLfkPd4ulQnRafRRPMUVvXKK8iEb8/edit#gid=0'),
      '15XfhBAF21seSRyDLfkPd4ulQnRafRRPMUVvXKK8iEb8'
    );
    assert.equal(
      extractSpreadsheetId('https://docs.google.com/spreadsheets/d/sample-sheet-id_123/edit?usp=sharing'),
      'sample-sheet-id_123'
    );
  });

  await t.test('formatPrivateKey cleans wrapping quotes and normalizes line endings', () => {
    const rawWithQuotes = '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk...\\n-----END PRIVATE KEY-----\\n"';
    const formatted = formatPrivateKey(rawWithQuotes);
    assert.ok(!formatted.startsWith('"'));
    assert.ok(!formatted.endsWith('"'));
    assert.ok(formatted.includes('\n'));
    assert.ok(!formatted.includes('\\n'));

    const rawWithSingleQuotes = "'-----BEGIN PRIVATE KEY-----\\r\\nMIIEvg...\\r\\n-----END PRIVATE KEY-----\\r\\n'";
    const singleFormatted = formatPrivateKey(rawWithSingleQuotes);
    assert.ok(!singleFormatted.startsWith("'"));
    assert.ok(singleFormatted.includes('\n'));
    assert.ok(!singleFormatted.includes('\\r'));
  });

  await t.test('resolveGoogleSheetsConfig falls back to database setting when env is missing', async () => {
    const envSheet = process.env.GOOGLE_SHEET_ID;
    try {
      delete process.env.GOOGLE_SHEET_ID;
      await prisma.setting.upsert({
        where: { key: 'googleSheetId' },
        create: { key: 'googleSheetId', value: 'db-fallback-sheet-id-456' },
        update: { value: 'db-fallback-sheet-id-456' },
      });

      const config = await resolveGoogleSheetsConfig();
      assert.equal(config.spreadsheetId, 'db-fallback-sheet-id-456');
    } finally {
      if (envSheet !== undefined) process.env.GOOGLE_SHEET_ID = envSheet;
      // restore db setting to original
      await prisma.setting.upsert({
        where: { key: 'googleSheetId' },
        create: { key: 'googleSheetId', value: '15XfhBAF21seSRyDLfkPd4ulQnRafRRPMUVvXKK8iEb8' },
        update: { value: '15XfhBAF21seSRyDLfkPd4ulQnRafRRPMUVvXKK8iEb8' },
      });
    }
  });

  await t.test('syncEnquiryToGoogleSheets returns clear diagnostic error when credentials missing', async () => {
    const result = await syncEnquiryToGoogleSheets({
      submissionDate: new Date().toISOString(),
      leadId: 'LEAD-TEST-001',
      studentName: 'Test Student',
      phone: '9876543210',
      email: 'student@test.com',
      requirements: 'Test requirement',
      status: 'NEW',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('Service Account') || result.error?.includes('credentials'));
  });

  await t.test('testGoogleSheetsConnection returns actionable guidance when unconfigured', async () => {
    const result = await testGoogleSheetsConnection();
    assert.equal(result.success, false);
    assert.ok(result.message.length > 0);
  });
});

test('Google Sheets Admin Retry Sync Endpoints', async (t) => {
  const adminToken = signAdminToken({
    userId: 'admin_test_123',
    email: 'admin@zivo.ai',
    role: 'ADMIN',
  });

  await t.test('Rejects unauthenticated retry-sync requests with 401', async () => {
    const req1 = new Request('http://localhost:3000/api/admin/enquiries/fake-id/retry-sync', {
      method: 'POST',
    });
    const res1 = await retrySyncRoute(req1, { params: Promise.resolve({ id: 'fake-id' }) });
    assert.equal(res1.status, 401);

    const req2 = new Request('http://localhost:3000/api/enquiries/fake-id/retry-sync', {
      method: 'POST',
    });
    const res2 = await publicRetrySyncRoute(req2, { params: Promise.resolve({ id: 'fake-id' }) });
    assert.equal(res2.status, 401);
  });

  await t.test('Returns 404 for non-existent enquiry', async () => {
    const req = new Request('http://localhost:3000/api/admin/enquiries/non-existent-id/retry-sync', {
      method: 'POST',
      headers: { cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}` },
    });
    const res = await retrySyncRoute(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
    assert.equal(res.status, 404);
  });

  await t.test('Executes retry and records detailed error when credentials unconfigured', async () => {
    // Create a temporary enquiry to retry
    const enquiry = await prisma.enquiry.create({
      data: {
        leadId: `LEAD-RETRY-${Date.now()}`,
        studentName: 'Retry Student',
        phone: '9876543210',
        email: 'retry@student.com',
        requirements: 'AI project',
        googleSheetSyncStatus: 'PENDING',
      },
    });

    try {
      const req = new Request(`http://localhost:3000/api/admin/enquiries/${enquiry.id}/retry-sync`, {
        method: 'POST',
        headers: { cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}` },
      });
      const res = await retrySyncRoute(req, { params: Promise.resolve({ id: enquiry.id }) });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.error.includes('credentials') || body.error.includes('Service Account'));
      assert.equal(body.enquiry.googleSheetSyncStatus, 'FAILED');
      assert.ok(body.enquiry.googleSheetSyncError);
    } finally {
      await prisma.enquiry.delete({ where: { id: enquiry.id } });
    }
  });
});
