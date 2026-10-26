import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createReceiptToken } from '../src/lib/auth';
import { publicOrderLookupWhere, resolvePublicOrderId } from '../src/lib/order-lookup';

function accountDownloadHref(orderId: string, receiptToken: string) {
  return `/api/orders/download/${encodeURIComponent(orderId)}?token=${encodeURIComponent(receiptToken)}`;
}

test('Account page layout clears the fixed navbar', () => {
  const accountPage = fs.readFileSync(path.join(process.cwd(), 'src/app/account/page.tsx'), 'utf8');
  const navbar = fs.readFileSync(path.join(process.cwd(), 'src/components/Navbar.tsx'), 'utf8');
  assert.match(navbar, /fixed top-0/);
  assert.match(navbar, /h-16/);
  assert.match(navbar, /xl:h-20/);
  assert.match(accountPage, /pt-28/, 'Account content must include top padding for the fixed navbar');
  assert.doesNotMatch(
    accountPage,
    /zivo-page mx-auto max-w-7xl space-y-8 px-4 py-10/,
    'Account hero must not use py-10, which sits under the h-16/xl:h-20 navbar'
  );
});

test('Download lookup preserves mixed-case production order IDs from the account API', () => {
  const publicOrderId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  assert.match(publicOrderId, /[a-f]/, 'Production order IDs include lowercase hex');
  assert.notEqual(publicOrderId, publicOrderId.toUpperCase());

  const receiptToken = createReceiptToken(publicOrderId);
  const href = accountDownloadHref(publicOrderId, receiptToken);
  const url = new URL(href, 'https://example.test');
  const pathOrderId = decodeURIComponent(url.pathname.split('/').pop() || '');

  assert.equal(pathOrderId, publicOrderId);
  assert.equal(resolvePublicOrderId(pathOrderId), publicOrderId);
  assert.equal(resolvePublicOrderId(encodeURIComponent(publicOrderId)), publicOrderId);
  assert.deepEqual(publicOrderLookupWhere(pathOrderId), {
    OR: [{ orderId: publicOrderId }, { id: publicOrderId }],
  });

  const buggyLookupKey = pathOrderId.toUpperCase();
  assert.notEqual(
    buggyLookupKey,
    publicOrderId,
    'Uppercasing the account-page orderId cannot match the stored unique key'
  );
  assert.equal(createReceiptToken(buggyLookupKey) === receiptToken, false);

  const downloadRoute = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/orders/download/[orderId]/route.ts'),
    'utf8'
  );
  assert.doesNotMatch(
    downloadRoute,
    /orderId\.toUpperCase\(\)/,
    'Download API must look up the stored orderId, not an uppercased copy'
  );
  assert.match(downloadRoute, /publicOrderLookupWhere\(orderId\)/);
  assert.match(downloadRoute, /verifyReceiptToken\(order\.orderId, token\)/);
  assert.match(downloadRoute, /paymentStatus !== 'PAID'/);
  assert.match(downloadRoute, /downloadTokenExpiry/);
  assert.match(downloadRoute, /downloadLimit/);
  assert.match(downloadRoute, /generatePrivatePresignedDownloadUrl/);
});
