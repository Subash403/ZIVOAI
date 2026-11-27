import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';
import {
  signAuthToken,
  verifyAdminToken,
  ADMIN_TOKEN_COOKIE_NAME,
  CUSTOMER_TOKEN_COOKIE_NAME,
} from '../src/lib/auth';

test('Admin Authentication Separation & Proxy Routing Guard', async (t) => {
  const customerToken = signAuthToken({
    userId: 'cust_user_1',
    email: 'customer@example.com',
    name: 'Customer Test',
    role: 'CUSTOMER',
  });

  const adminToken = signAuthToken({
    userId: 'admin_user_1',
    email: 'admin@zivo.ai',
    name: 'Super Admin',
    role: 'ADMIN',
  });

  await t.test('Unauthenticated user requesting /admin is redirected to /admin/login', () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {},
    });
    const res = proxy(req);
    assert.equal(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/admin/login?from=%2Fadmin'));
  });

  await t.test('Customer account requesting /admin is redirected to /account with restriction notice', () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `${CUSTOMER_TOKEN_COOKIE_NAME}=${customerToken}`,
      },
    });
    const res = proxy(req);
    assert.equal(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/account?notice=admin_access_restricted'));
  });

  await t.test('Customer account requesting /admin/projects is redirected to /account with restriction notice', () => {
    const req = new NextRequest('http://localhost:3000/admin/projects', {
      headers: {
        cookie: `${CUSTOMER_TOKEN_COOKIE_NAME}=${customerToken}`,
      },
    });
    const res = proxy(req);
    assert.equal(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/account?notice=admin_access_restricted'));
  });

  await t.test('Customer account visiting /admin/login is redirected away to /account', () => {
    const req = new NextRequest('http://localhost:3000/admin/login', {
      headers: {
        cookie: `${CUSTOMER_TOKEN_COOKIE_NAME}=${customerToken}`,
      },
    });
    const res = proxy(req);
    assert.equal(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/account?notice=admin_access_restricted'));
  });

  await t.test('Authenticated admin visiting /admin/login is redirected to /admin', () => {
    const req = new NextRequest('http://localhost:3000/admin/login', {
      headers: {
        cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}`,
      },
    });
    const res = proxy(req);
    assert.equal(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/admin'));
    assert.ok(!location?.includes('/admin/login'));
  });

  await t.test('Authenticated admin accessing /admin is allowed through', () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}`,
      },
    });
    const res = proxy(req);
    // NextResponse.next() produces status 200 without a redirect header
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('location'), null);
  });

  await t.test('verifyAdminToken strictly rejects CUSTOMER tokens', () => {
    const adminCheck = verifyAdminToken(customerToken);
    assert.equal(adminCheck, null, 'Customer token must return null from verifyAdminToken');

    const adminCheckValid = verifyAdminToken(adminToken);
    assert.ok(adminCheckValid !== null);
    assert.equal(adminCheckValid?.role, 'ADMIN');
  });

  await t.test('Separate cookie names prevent customer token hijacking as admin', () => {
    assert.notEqual(CUSTOMER_TOKEN_COOKIE_NAME, ADMIN_TOKEN_COOKIE_NAME);
  });
});
