import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiptToken, verifyReceiptToken } from '../src/lib/auth';

test('Order Confirmation Receipt Tokens & Authorization', async (t) => {
  const orderId = 'ORD-10001';

  await t.test('createReceiptToken generates valid HMAC receipt token', () => {
    const token = createReceiptToken(orderId);
    assert.ok(typeof token === 'string' && token.length === 64);
    assert.ok(/^[0-9a-f]{64}$/.test(token), 'Token should be a 64-char hex string');
  });

  await t.test('verifyReceiptToken validates genuine receipt token', () => {
    const token = createReceiptToken(orderId);
    const isValid = verifyReceiptToken(orderId, token);
    assert.equal(isValid, true);
  });

  await t.test('verifyReceiptToken rejects token from a different order ID', () => {
    const tokenForOrder1 = createReceiptToken('ORD-10001');
    const isValidForOrder2 = verifyReceiptToken('ORD-10002', tokenForOrder1);
    assert.equal(isValidForOrder2, false);
  });

  await t.test('verifyReceiptToken rejects tampered or forged tokens', () => {
    const token = createReceiptToken(orderId);
    const tampered = token.slice(0, -2) + 'aa';
    assert.equal(verifyReceiptToken(orderId, tampered), false);
    assert.equal(verifyReceiptToken(orderId, 'forged-token-value'), false);
    assert.equal(verifyReceiptToken(orderId, ''), false);
  });
});
