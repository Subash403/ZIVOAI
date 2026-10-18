import test from 'node:test';
import assert from 'node:assert/strict';
import { signAdminToken, verifyAdminToken, getJwtSecret } from '../src/lib/auth';

test('JWT Authentication & Secret Enforcement', async (t) => {
  await t.test('signAdminToken creates a valid verifiable token for admin', () => {
    const payload = {
      userId: 'usr_test_123',
      email: 'admin@zivo.ai',
      role: 'ADMIN',
    };

    const token = signAdminToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const verified = verifyAdminToken(token);
    assert.ok(verified !== null);
    assert.equal(verified?.userId, payload.userId);
    assert.equal(verified?.email, payload.email);
    assert.equal(verified?.role, 'ADMIN');
  });

  await t.test('verifyAdminToken rejects tampered token', () => {
    const payload = {
      userId: 'usr_test_123',
      email: 'admin@zivo.ai',
      role: 'ADMIN',
    };

    const token = signAdminToken(payload);
    const tampered = token.slice(0, -5) + 'xxxxx';
    const verified = verifyAdminToken(tampered);
    assert.equal(verified, null);
  });

  await t.test('verifyAdminToken rejects invalid garbage token', () => {
    const verified = verifyAdminToken('invalid.jwt.token');
    assert.equal(verified, null);
  });

  await t.test('getJwtSecret rejects weak/missing secrets in production mode', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;

    const envObj = process.env as Record<string, string | undefined>;

    try {
      envObj.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      assert.throws(
        () => {
          getJwtSecret();
        },
        /CRITICAL SECURITY ERROR: JWT_SECRET/,
        'Should throw when JWT_SECRET is missing in production'
      );

      process.env.JWT_SECRET = 'short_secret';
      assert.throws(
        () => {
          getJwtSecret();
        },
        /Minimum 32 characters required/,
        'Should throw when JWT_SECRET is too short in production'
      );

      process.env.JWT_SECRET = 'a_very_secure_and_long_production_jwt_secret_key_123456';
      const sec = getJwtSecret();
      assert.equal(sec, 'a_very_secure_and_long_production_jwt_secret_key_123456');
    } finally {
      envObj.NODE_ENV = prevEnv;
      if (prevSecret) {
        process.env.JWT_SECRET = prevSecret;
      } else {
        delete process.env.JWT_SECRET;
      }
    }
  });
});
