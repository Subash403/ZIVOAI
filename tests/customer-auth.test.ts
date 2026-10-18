import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {
  signAuthToken,
  verifyAuthToken,
  CUSTOMER_TOKEN_COOKIE_NAME,
  ADMIN_TOKEN_COOKIE_NAME,
} from '../src/lib/auth';

test('Customer Authentication & Role Verification', async (t) => {
  await t.test('signAuthToken generates verifiable CUSTOMER token', () => {
    const payload = {
      userId: 'cust_abc_123',
      email: 'student@college.edu',
      name: 'Rohan Sharma',
      role: 'CUSTOMER' as const,
    };

    const token = signAuthToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const verified = verifyAuthToken(token);
    assert.ok(verified !== null);
    assert.equal(verified?.userId, payload.userId);
    assert.equal(verified?.email, payload.email);
    assert.equal(verified?.role, 'CUSTOMER');
    assert.equal(verified?.name, 'Rohan Sharma');
  });

  await t.test('signAuthToken correctly signs ADMIN role', () => {
    const payload = {
      userId: 'adm_xyz_999',
      email: 'lead@marketplace.com',
      name: 'Admin User',
      role: 'ADMIN' as const,
    };

    const token = signAuthToken(payload);
    const verified = verifyAuthToken(token);
    assert.ok(verified !== null);
    assert.equal(verified?.role, 'ADMIN');
  });

  await t.test('verifyAuthToken rejects modified role or payload', () => {
    const payload = {
      userId: 'cust_abc_123',
      email: 'student@college.edu',
      role: 'CUSTOMER' as const,
    };

    const token = signAuthToken(payload);
    const parts = token.split('.');
    assert.equal(parts.length, 3);

    // Tamper with payload segment
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...payload, role: 'ADMIN' })
    ).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const verified = verifyAuthToken(tamperedToken);
    assert.equal(verified, null, 'Tampered token signature must fail verification');
  });

  await t.test('Cookie naming conventions distinguish admin and customer sessions', () => {
    assert.equal(CUSTOMER_TOKEN_COOKIE_NAME, 'customer_session_token');
    assert.equal(ADMIN_TOKEN_COOKIE_NAME, 'admin_session_token');
    assert.notEqual(CUSTOMER_TOKEN_COOKIE_NAME, ADMIN_TOKEN_COOKIE_NAME);
  });

  await t.test('bcrypt hashes passwords securely and matches correctly', async () => {
    const plain = 'StudentPassword@2026';
    const hash = await bcrypt.hash(plain, 10);

    assert.notEqual(plain, hash);
    const isMatch = await bcrypt.compare(plain, hash);
    assert.equal(isMatch, true);

    const isWrong = await bcrypt.compare('WrongPassword', hash);
    assert.equal(isWrong, false);
  });

  await t.test('Proxy middleware configuration strictly covers admin, account, and checkout routes', async () => {
    const { config } = await import('../src/proxy');
    assert.ok(Array.isArray(config.matcher));
    assert.ok(config.matcher.includes('/admin/:path*'), 'Must protect /admin routes');
    assert.ok(config.matcher.includes('/account/:path*'), 'Must protect /account routes');
    assert.ok(config.matcher.includes('/checkout/:path*'), 'Must protect /checkout routes');
  });
});
