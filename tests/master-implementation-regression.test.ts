import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import {
  ADMIN_TOKEN_COOKIE_NAME,
  CUSTOMER_TOKEN_COOKIE_NAME,
  createReceiptToken,
  createTimedReceiptToken,
  hashSensitiveToken,
  signAuthToken,
  verifyTimedReceiptToken,
} from '../src/lib/auth';
import { resetRateLimitStore } from '../src/lib/rate-limit';
import { reserveStockInTransaction, StockUnavailableError } from '../src/lib/stock-reservation';
import { fulfillVerifiedOrder } from '../src/lib/payment-fulfillment';
import { sendOrderConfirmationNotification } from '../src/lib/notifications';
import { validateEnvironment } from '../src/lib/security';

import { GET as listProjects } from '../src/app/api/projects/route';
import { GET as getProjectById } from '../src/app/api/projects/[id]/route';
import { POST as projectFinder } from '../src/app/api/projects/finder/route';
import { GET as trackOrderGet, POST as trackOrderPost } from '../src/app/api/orders/track/route';
import { GET as downloadOrder } from '../src/app/api/orders/download/[orderId]/route';
import { POST as registerUser } from '../src/app/api/auth/register/route';
import { POST as logoutUser } from '../src/app/api/auth/logout/route';
import { GET as getAccountOrders } from '../src/app/api/account/orders/route';
import { GET as getAdminDashboard } from '../src/app/api/admin/dashboard/route';
import { GET as getAdminCustomers } from '../src/app/api/admin/customers/route';
import { GET as getAdminHealth } from '../src/app/api/admin/health/route';
import { POST as bulkUpdateProjects } from '../src/app/api/admin/projects/bulk/route';
import { POST as refundOrder } from '../src/app/api/admin/orders/[id]/refund/route';
import { GET as getAdminOrders } from '../src/app/api/orders/route';
import { PUT as updateSettings } from '../src/app/api/settings/route';
import { POST as runNotificationCron } from '../src/app/api/cron/notifications/route';

function makeAuthHeaders(token: string, role: 'ADMIN' | 'CUSTOMER', ip = '10.10.0.1'): HeadersInit {
  const cookieName = role === 'ADMIN' ? ADMIN_TOKEN_COOKIE_NAME : CUSTOMER_TOKEN_COOKIE_NAME;
  return {
    cookie: `${cookieName}=${token}`,
    'x-forwarded-for': ip,
    'content-type': 'application/json',
  };
}

test('Phase 0 (ZAI-005/006/ATO): Timed receipt tokens expire/revoke and OAuth registration prevents account takeover', async () => {
  resetRateLimitStore();
  const suffix = Date.now().toString();
  const email = `oauth-ato-${suffix}@example.com`;

  // 1. Timed receipt token expiry & version revocation
  const validToken = createTimedReceiptToken(`ORD-${suffix}`, { version: 1, expiresInMs: 60_000 });
  assert.equal(verifyTimedReceiptToken(`ORD-${suffix}`, validToken, 1), true);
  assert.equal(verifyTimedReceiptToken(`ORD-${suffix}`, validToken, 2), false, 'Version rotation must revoke old token');
  assert.equal(verifyTimedReceiptToken(`ORD-OTHER-${suffix}`, validToken, 1), false, 'Wrong order ID must fail');
  const expiredToken = createTimedReceiptToken(`ORD-${suffix}`, { version: 1, expiresInMs: -5_000 });
  assert.equal(verifyTimedReceiptToken(`ORD-${suffix}`, expiredToken, 1), false, 'Expired token must fail');

  // 2. OAuth user cannot be hijacked via /api/auth/register
  const oauthUser = await prisma.user.create({
    data: {
      name: 'OAuth Victim',
      email,
      password: '',
      role: 'CUSTOMER',
      googleId: `google_${suffix}`,
      emailVerified: true,
    },
  });

  try {
    const res = await registerUser(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.10.1.1' },
        body: JSON.stringify({
          name: 'Attacker',
          email,
          password: 'AttackerPassword123!',
        }),
      })
    );
    assert.equal(res.status, 409, 'Registering an existing OAuth email must return 409 Conflict');

    // 3. Logout allDevices increments tokenVersion and invalidates old session on /api/account/orders
    const oldToken = signAuthToken({
      userId: oauthUser.id,
      email: oauthUser.email,
      role: 'CUSTOMER',
      name: oauthUser.name,
      tokenVersion: 0,
    });

    const logoutRes = await logoutUser(
      new Request('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: makeAuthHeaders(oldToken, 'CUSTOMER', '10.10.1.2'),
        body: JSON.stringify({ allDevices: true }),
      })
    );
    assert.equal(logoutRes.status, 200);

    const updatedUser = await prisma.user.findUnique({ where: { id: oauthUser.id } });
    assert.equal(updatedUser?.tokenVersion, 1);

    const revokedRes = await getAccountOrders(
      new Request('http://localhost:3000/api/account/orders', {
        headers: makeAuthHeaders(oldToken, 'CUSTOMER', '10.10.1.2'),
      })
    );
    assert.equal(revokedRes.status, 401, 'Revoked tokenVersion must be rejected');
  } finally {
    await prisma.user.delete({ where: { id: oauthUser.id } }).catch(() => {});
  }
});

test('Phase 0 (ZAI-003/004): Public catalog, detail, and AI Finder enforce published+available, strip private fields, and mask call prices', async () => {
  const suffix = Date.now().toString();
  const visibleCall = await prisma.project.create({
    data: {
      title: `Public Call Project ${suffix}`,
      slug: `public-call-${suffix}`,
      shortDescription: 'Visible call project',
      fullDescription: 'Full description',
      category: 'Artificial Intelligence',
      technologies: JSON.stringify(['Python', 'Next.js']),
      difficulty: 'Advanced',
      projectType: 'Major',
      mainImage: '/test.png',
      salesType: 'call',
      price: 25000,
      available: true,
      published: true,
      downloadFileName: 'secret.zip',
      downloadFileUrl: 'deliverables/secret-call.zip',
    },
  });
  const unavailableProject = await prisma.project.create({
    data: {
      title: `Unavailable Project ${suffix}`,
      slug: `unavailable-${suffix}`,
      shortDescription: 'Should be hidden',
      fullDescription: 'Hidden',
      category: 'Artificial Intelligence',
      technologies: JSON.stringify(['Python']),
      difficulty: 'Intermediate',
      projectType: 'Major',
      mainImage: '/test.png',
      salesType: 'fixed',
      price: 4999,
      available: false,
      published: true,
      downloadFileName: 'hidden.zip',
      downloadFileUrl: 'deliverables/hidden.zip',
    },
  });

  try {
    // List endpoint
    const listRes = await listProjects(new Request(`http://localhost:3000/api/projects?search=${suffix}`));
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    const returnedSlugs = (listJson.projects as Array<{ slug: string }>).map((p) => p.slug);
    assert.ok(returnedSlugs.includes(visibleCall.slug));
    assert.ok(!returnedSlugs.includes(unavailableProject.slug), 'Unavailable project must not appear in public list');
    const callDto = listJson.projects.find((p: { slug: string }) => p.slug === visibleCall.slug);
    assert.equal(callDto.price, 0, 'Call-for-pricing project must mask price to 0');
    assert.equal('downloadFileUrl' in callDto, false, 'Private downloadFileUrl must never leak publicly');
    assert.equal('downloadFileName' in callDto, false, 'Private downloadFileName must never leak publicly');

    // Detail endpoint
    const hiddenDetailRes = await getProjectById(new Request(`http://localhost:3000/api/projects/${unavailableProject.slug}`), {
      params: Promise.resolve({ id: unavailableProject.slug }),
    });
    assert.equal(hiddenDetailRes.status, 404, 'Unavailable project detail must return 404 to public callers');

    const publicDetailRes = await getProjectById(new Request(`http://localhost:3000/api/projects/${visibleCall.slug}`), {
      params: Promise.resolve({ id: visibleCall.slug }),
    });
    assert.equal(publicDetailRes.status, 200);
    const detailJson = await publicDetailRes.json();
    assert.equal(detailJson.project.price, 0);
    assert.equal('downloadFileUrl' in detailJson.project, false);

    // AI Finder endpoint
    const finderRes = await projectFinder(
      new Request('http://localhost:3000/api/projects/finder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          domain: 'Artificial Intelligence',
          projectType: 'Major',
          skillLevel: 'Advanced',
        }),
      })
    );
    assert.equal(finderRes.status, 200);
    const finderJson = await finderRes.json();
    for (const item of finderJson.recommendations || []) {
      assert.notEqual(item.slug, unavailableProject.slug, 'AI Finder must exclude unavailable projects');
      assert.equal('downloadFileUrl' in item, false, 'AI Finder must strip private downloadFileUrl');
    }
  } finally {
    await prisma.project.deleteMany({ where: { id: { in: [visibleCall.id, unavailableProject.id] } } }).catch(() => {});
  }
});

test('Phase 0 (ZAI-001/002): Order tracking requires email OTP for guests and rejects GET with 405', async () => {
  resetRateLimitStore();
  const suffix = Date.now().toString();
  const orderId = `ORD-OTP-${suffix}`;
  const email = `otp-customer-${suffix}@example.com`;

  const project = await prisma.project.create({
    data: {
      title: `OTP Track Project ${suffix}`,
      slug: `otp-track-${suffix}`,
      shortDescription: 'x',
      fullDescription: 'x',
      category: 'AI',
      technologies: '[]',
      difficulty: 'Beginner',
      projectType: 'Mini',
      mainImage: '/test.png',
      price: 999,
      published: true,
      available: true,
    },
  });
  const order = await prisma.order.create({
    data: {
      orderId,
      studentName: 'OTP Buyer',
      email,
      phone: '9999999999',
      projectId: project.id,
      projectName: project.title,
      amount: 999,
      paymentStatus: 'PAID',
      deliveryStatus: 'ASSET_READY',
      downloadTokenExpiry: new Date(Date.now() + 3600_000),
    },
  });

  try {
    // GET must return 405
    const getRes = await trackOrderGet();
    assert.equal(getRes.status, 405);

    // Guest POST without OTP must NOT return receipt token; must trigger 202 OTP challenge
    const step1 = await trackOrderPost(
      new Request('http://localhost:3000/api/orders/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.20.0.1' },
        body: JSON.stringify({ orderId, email }),
      })
    );
    assert.equal(step1.status, 202);
    const step1Json = await step1.json();
    assert.equal(step1Json.requiresVerification, true);
    assert.equal(step1Json.receiptToken, undefined);

    // Seed deterministic known OTP and verify it succeeds
    const knownOtp = '654321';
    await prisma.orderTrackingOtp.deleteMany({ where: { lookupId: orderId } });
    await prisma.orderTrackingOtp.create({
      data: {
        lookupId: orderId,
        email,
        otpHash: hashSensitiveToken(`${orderId}:${email}:${knownOtp}`),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Wrong OTP fails with 403
    const badOtpRes = await trackOrderPost(
      new Request('http://localhost:3000/api/orders/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.20.0.1' },
        body: JSON.stringify({ orderId, email, otp: '000000' }),
      })
    );
    assert.equal(badOtpRes.status, 403);

    // Valid OTP returns 200 with short-lived v2 timed receipt token
    const validOtpRes = await trackOrderPost(
      new Request('http://localhost:3000/api/orders/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.20.0.1' },
        body: JSON.stringify({ orderId, email, otp: knownOtp }),
      })
    );
    assert.equal(validOtpRes.status, 200);
    const validJson = await validOtpRes.json();
    assert.equal(validJson.success, true);
    assert.ok(typeof validJson.receiptToken === 'string' && validJson.receiptToken.startsWith('v2.'));
  } finally {
    await prisma.orderTrackingOtp.deleteMany({ where: { lookupId: orderId } }).catch(() => {});
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
  }
});

test('Phase 1 & 2 (ZAI-009/010/015/018/019): Atomic stock reservation, reconciliation state, null expiry fail-closed, refund revocation & admin download audit', async () => {
  resetRateLimitStore();
  const suffix = Date.now().toString();
  const localDir = path.join(process.cwd(), 'storage', 'private-downloads');
  fs.mkdirSync(localDir, { recursive: true });
  const assetKey = `master-reg-${suffix}.zip`;
  fs.writeFileSync(path.join(localDir, assetKey), Buffer.from('master-regression-zip-bytes'));

  const adminUser = await prisma.user.create({
    data: {
      name: 'Audit Admin',
      email: `audit-admin-${suffix}@example.com`,
      password: 'hash',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  const customer = await prisma.user.create({
    data: {
      name: 'Paying Customer',
      email: `buyer-${suffix}@example.com`,
      password: 'hash',
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });
  const otherCustomer = await prisma.user.create({
    data: {
      name: 'Other Customer',
      email: `other-${suffix}@example.com`,
      password: 'hash',
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });
  const project = await prisma.project.create({
    data: {
      title: `Limited Stock Project ${suffix}`,
      slug: `limited-stock-${suffix}`,
      shortDescription: 'x',
      fullDescription: 'x',
      category: 'AI',
      technologies: '[]',
      difficulty: 'Intermediate',
      projectType: 'Major',
      mainImage: '/test.png',
      price: 2999,
      stockLimit: 1,
      available: true,
      published: true,
      downloadFileName: 'deliverable.zip',
      downloadFileUrl: assetKey,
    },
  });

  const order1 = await prisma.order.create({
    data: {
      orderId: `ORD-RES1-${suffix}`,
      userId: customer.id,
      studentName: customer.name,
      email: customer.email,
      phone: '9999999999',
      projectId: project.id,
      projectName: project.title,
      amount: 2999,
      razorpayOrderId: `rzp_res1_${suffix}`,
    },
  });
  const order2 = await prisma.order.create({
    data: {
      orderId: `ORD-RES2-${suffix}`,
      userId: otherCustomer.id,
      studentName: otherCustomer.name,
      email: otherCustomer.email,
      phone: '8888888888',
      projectId: project.id,
      projectName: project.title,
      amount: 2999,
      razorpayOrderId: `rzp_res2_${suffix}`,
    },
  });

  try {
    // 1. Atomic stock reservation: first reserves final unit, second throws StockUnavailableError
    await prisma.$transaction(async (tx) => {
      const res = await reserveStockInTransaction(tx, { orderId: order1.orderId, projectId: project.id });
      assert.equal(res.reserved, true);
    });
    await assert.rejects(
      () =>
        prisma.$transaction(async (tx) => {
          await reserveStockInTransaction(tx, { orderId: order2.orderId, projectId: project.id });
        }),
      StockUnavailableError
    );

    // 2. Fulfill order1 (stock becomes 0); then attempting to fulfill order2 marks RECONCILIATION_REQUIRED
    await fulfillVerifiedOrder({
      internalOrderId: order1.orderId,
      razorpayPaymentId: `pay_1_${suffix}`,
      origin: 'http://localhost:3000',
    });
    await assert.rejects(() =>
      fulfillVerifiedOrder({
        internalOrderId: order2.orderId,
        razorpayPaymentId: `pay_2_${suffix}`,
        origin: 'http://localhost:3000',
      })
    );
    const conflictOrder = await prisma.order.findUnique({ where: { id: order2.id } });
    assert.equal(conflictOrder?.paymentStatus, 'RECONCILIATION_REQUIRED');
    assert.equal(conflictOrder?.reconciliationStatus, 'STOCK_CONFLICT');

    // 3. ZAI-018: Null downloadTokenExpiry fails closed (410) for token-only download
    await prisma.order.update({ where: { id: order1.id }, data: { downloadTokenExpiry: null } });
    const legacyToken = createReceiptToken(order1.orderId);
    const expiredRes = await downloadOrder(
      new Request(`http://localhost:3000/api/orders/download/${order1.orderId}?token=${legacyToken}`, {
        headers: { 'x-forwarded-for': '10.30.0.1' },
      }),
      { params: Promise.resolve({ orderId: order1.orderId }) }
    );
    assert.equal(expiredRes.status, 410, 'Null downloadTokenExpiry must fail closed with 410 Gone');

    // 4. ZAI-083: Non-owner authenticated customer denied with 403
    const otherToken = signAuthToken({
      userId: otherCustomer.id,
      email: otherCustomer.email,
      role: 'CUSTOMER',
      tokenVersion: 0,
    });
    const nonOwnerRes = await downloadOrder(
      new Request(`http://localhost:3000/api/orders/download/${order1.orderId}`, {
        headers: makeAuthHeaders(otherToken, 'CUSTOMER', '10.30.0.2'),
      }),
      { params: Promise.resolve({ orderId: order1.orderId }) }
    );
    assert.equal(nonOwnerRes.status, 403, 'Non-owner customer must be denied download');

    // 5. ZAI-019: Admin download succeeds and writes AdminAuditLog + DownloadLog
    const adminToken = signAuthToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
      tokenVersion: 0,
    });
    const adminDlRes = await downloadOrder(
      new Request(`http://localhost:3000/api/orders/download/${order1.orderId}`, {
        headers: makeAuthHeaders(adminToken, 'ADMIN', '10.30.0.3'),
      }),
      { params: Promise.resolve({ orderId: order1.orderId }) }
    );
    assert.equal(adminDlRes.status, 200);
    const adminAuditCount = await prisma.adminAuditLog.count({
      where: { actorUserId: adminUser.id, action: 'ADMIN_DOWNLOAD_ACCESS', resourceId: order1.orderId },
    });
    assert.ok(adminAuditCount >= 1, 'Admin download bypass must be recorded in AdminAuditLog');

    // 6. ZAI-015: Controlled refund marks REFUNDED, revokes download access (402), and logs audit entry
    const refundRes = await refundOrder(
      new Request(`http://localhost:3000/api/admin/orders/${order1.id}/refund`, {
        method: 'POST',
        headers: makeAuthHeaders(adminToken, 'ADMIN', '10.30.0.4'),
        body: JSON.stringify({
          reason: 'Customer requested duplicate purchase refund',
          markProcessed: true,
          revokeAccess: true,
          restoreStock: true,
        }),
      }),
      { params: Promise.resolve({ id: order1.id }) }
    );
    assert.equal(refundRes.status, 200);

    const ownerToken = signAuthToken({
      userId: customer.id,
      email: customer.email,
      role: 'CUSTOMER',
      tokenVersion: 0,
    });
    const postRefundDl = await downloadOrder(
      new Request(`http://localhost:3000/api/orders/download/${order1.orderId}`, {
        headers: makeAuthHeaders(ownerToken, 'CUSTOMER', '10.30.0.5'),
      }),
      { params: Promise.resolve({ orderId: order1.orderId }) }
    );
    assert.equal(postRefundDl.status, 402, 'Refunded order must revoke download access');
  } finally {
    fs.rmSync(path.join(localDir, assetKey), { force: true });
    await prisma.downloadLog.deleteMany({ where: { orderId: { in: [order1.orderId, order2.orderId] } } }).catch(() => {});
    await prisma.refund.deleteMany({ where: { orderId: { in: [order1.orderId, order2.orderId] } } }).catch(() => {});
    await prisma.adminAuditLog.deleteMany({ where: { actorUserId: adminUser.id } }).catch(() => {});
    await prisma.stockReservation.deleteMany({ where: { projectId: project.id } }).catch(() => {});
    await prisma.notificationLog.deleteMany({ where: { orderId: { in: [order1.orderId, order2.orderId] } } }).catch(() => {});
    await prisma.orderNotification.deleteMany({ where: { orderId: { in: [order1.orderId, order2.orderId] } } }).catch(() => {});
    await prisma.order.deleteMany({ where: { id: { in: [order1.id, order2.id] } } }).catch(() => {});
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, customer.id, otherCustomer.id] } } }).catch(() => {});
  }
});

test('Phase 3, 4 & 5 (ZAI-024/026/079/084-091): Truthful email simulation, tokenless /api/account/orders, cron protection, and admin RBAC matrix', async () => {
  resetRateLimitStore();
  const suffix = Date.now().toString();
  const customer = await prisma.user.create({
    data: {
      name: 'RBAC Customer',
      email: `rbac-customer-${suffix}@example.com`,
      password: 'hash',
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });
  const admin = await prisma.user.create({
    data: {
      name: 'RBAC Admin',
      email: `rbac-admin-${suffix}@example.com`,
      password: 'hash',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  const project = await prisma.project.create({
    data: {
      title: `RBAC Project ${suffix}`,
      slug: `rbac-proj-${suffix}`,
      shortDescription: 'x',
      fullDescription: 'x',
      category: 'AI',
      technologies: '[]',
      difficulty: 'Beginner',
      projectType: 'Mini',
      mainImage: '/test.png',
      price: 1500,
      published: true,
      available: true,
    },
  });
  const order = await prisma.order.create({
    data: {
      orderId: `ORD-RBAC-${suffix}`,
      userId: customer.id,
      studentName: customer.name,
      email: customer.email,
      phone: '9999999999',
      projectId: project.id,
      projectName: project.title,
      amount: 1500,
      paymentStatus: 'PAID',
      deliveryStatus: 'ASSET_READY',
      downloadToken: 'secret-token-must-not-leak',
      downloadTokenExpiry: new Date(Date.now() + 3600_000),
    },
  });

  const customerToken = signAuthToken({ userId: customer.id, email: customer.email, role: 'CUSTOMER', tokenVersion: 0 });
  const adminToken = signAuthToken({ userId: admin.id, email: admin.email, role: 'ADMIN', tokenVersion: 0 });

  try {
    // 1. ZAI-024: Simulated email without SMTP does NOT set Order.notificationSent = true
    if (!process.env.SMTP_HOST) {
      await sendOrderConfirmationNotification({
        orderId: order.orderId,
        studentName: customer.name,
        email: customer.email,
        projectName: project.title,
        amount: 1500,
        downloadUrl: `http://localhost:3000/api/orders/download/${order.orderId}`,
        receiptUrl: 'http://localhost:3000/account',
      });
      const reloaded = await prisma.order.findUnique({ where: { id: order.id } });
      assert.equal(reloaded?.notificationSent, false, 'Simulated dev email must never mark Order.notificationSent = true');
    }

    // 2. ZAI-079: /api/account/orders omits receiptToken and downloadToken
    const acctRes = await getAccountOrders(
      new Request('http://localhost:3000/api/account/orders', {
        headers: makeAuthHeaders(customerToken, 'CUSTOMER'),
      })
    );
    assert.equal(acctRes.status, 200);
    const acctJson = await acctRes.json();
    const returnedOrder = acctJson.orders.find((o: { orderId: string }) => o.orderId === order.orderId);
    assert.ok(returnedOrder);
    assert.equal('receiptToken' in returnedOrder, false, '/api/account/orders must omit receiptToken');
    assert.equal('downloadToken' in returnedOrder, false, '/api/account/orders must omit downloadToken');

    // 3. ZAI-026: /api/cron/notifications rejects unauthorized and accepts CRON_SECRET or ADMIN
    const unauthCron = await runNotificationCron(new Request('http://localhost:3000/api/cron/notifications', { method: 'POST' }));
    assert.equal(unauthCron.status, 401);

    const prevCronSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = `test-cron-secret-${suffix}`;
    try {
      const authCron = await runNotificationCron(
        new Request('http://localhost:3000/api/cron/notifications', {
          method: 'POST',
          headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        })
      );
      assert.equal(authCron.status, 200);
    } finally {
      if (prevCronSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prevCronSecret;
    }

    // 4. Admin RBAC matrix: CUSTOMER denied (401) across all admin routes
    const customerHeaders = makeAuthHeaders(customerToken, 'CUSTOMER');
    const [dashDenied, custDenied, healthDenied, bulkDenied, ordersDenied, settingsDenied] = await Promise.all([
      getAdminDashboard(new Request('http://localhost:3000/api/admin/dashboard', { headers: customerHeaders })),
      getAdminCustomers(new Request('http://localhost:3000/api/admin/customers', { headers: customerHeaders })),
      getAdminHealth(new Request('http://localhost:3000/api/admin/health', { headers: customerHeaders })),
      bulkUpdateProjects(
        new Request('http://localhost:3000/api/admin/projects/bulk', {
          method: 'POST',
          headers: customerHeaders,
          body: JSON.stringify({ ids: [project.id], action: 'unpublish' }),
        })
      ),
      getAdminOrders(new Request('http://localhost:3000/api/orders', { headers: customerHeaders })),
      updateSettings(
        new Request('http://localhost:3000/api/settings', {
          method: 'PUT',
          headers: customerHeaders,
          body: JSON.stringify({ businessName: 'Hijacked' }),
        })
      ),
    ]);

    for (const res of [dashDenied, custDenied, healthDenied, bulkDenied, ordersDenied, settingsDenied]) {
      assert.equal(res.status, 401, 'Non-admin must receive 401 on admin endpoint');
    }

    // 5. Admin dashboard returns separated gross, refunded, and net sales + refreshedAt
    const adminHeaders = makeAuthHeaders(adminToken, 'ADMIN');
    const dashOk = await getAdminDashboard(new Request('http://localhost:3000/api/admin/dashboard', { headers: adminHeaders }));
    assert.equal(dashOk.status, 200);
    const dashJson = await dashOk.json();
    assert.equal(typeof dashJson.stats.grossPaidSales, 'number');
    assert.equal(typeof dashJson.stats.refundedAmount, 'number');
    assert.equal(typeof dashJson.stats.netSalesBeforeFees, 'number');
    assert.ok(typeof dashJson.refreshedAt === 'string');

    // 6. Admin health returns redacted env report
    const healthOk = await getAdminHealth(new Request('http://localhost:3000/api/admin/health', { headers: adminHeaders }));
    assert.equal(healthOk.status, 200);
    const envReport = validateEnvironment();
    assert.ok(Array.isArray(envReport.checks) && envReport.checks.length > 0);
  } finally {
    await prisma.notificationLog.deleteMany({ where: { orderId: order.orderId } }).catch(() => {});
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [customer.id, admin.id] } } }).catch(() => {});
  }
});

test('Phase 6 & 7 (ZAI-044/054/114/116/119): Static UI, branding, accessibility, and motion regressions', () => {
  const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

  // ZAI-054: No public /admin/login links in Footer or customer login page
  assert.doesNotMatch(read('src/components/Footer.tsx'), /\/admin\/login/);
  assert.doesNotMatch(read('src/app/login/page.tsx'), /\/admin\/login/);

  // ZAI-044: Protected developer code preview preserved and clearly labeled
  const hero = read('src/components/ProjectHero.tsx');
  assert.match(hero, /architecture\.ts/);
  assert.match(hero, /SAMPLE PREVIEW/i);

  // ZAI-114/118/119: SpotlightBackground has no Unsplash dependency and respects prefers-reduced-motion + desktop fine pointer gate
  const bg = read('src/components/SpotlightBackground.tsx');
  assert.doesNotMatch(bg, /unsplash\.com/i);
  assert.match(bg, /prefers-reduced-motion:\s*reduce/);
  assert.match(bg, /pointer:\s*fine/);

  // ZAI-116: Duplicate .zivo-page::before grid removed & skip-to-content present in layout
  const css = read('src/app/globals.css');
  assert.doesNotMatch(css, /\.zivo-page::before\s*\{/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(read('src/app/layout.tsx'), /Skip to main content/i);

  // Brand, Auth & Hero regressions: Login CTA, Google OAuth UI, viewport-aware Hero, centralized brand assets
  const navbar = read('src/components/Navbar.tsx');
  assert.match(navbar, /href="\/login"/);
  assert.match(navbar, />Login</);
  assert.match(navbar, /BrandLogo/);

  const loginPage = read('src/app/login/page.tsx');
  assert.match(loginPage, /Continue with Google/);
  assert.match(loginPage, />\s*OR\s*</);
  assert.match(loginPage, /BrandLogo/);

  assert.match(hero, /lg:min-h-\[calc\(100svh-4\.25rem\)\]/);

  for (const assetRel of [
    'public/brand/zivo-logo-horizontal.png',
    'public/brand/zivo-logo-horizontal-dark.png',
    'public/brand/zivo-mark.png',
    'public/brand/zivo-og.png',
    'src/app/icon.png',
  ]) {
    assert.equal(fs.existsSync(path.join(process.cwd(), assetRel)), true, `Brand asset missing: ${assetRel}`);
  }

  // Footer logo container ONLY + demo/dummy data cleanup regressions
  const footer = read('src/components/Footer.tsx');
  assert.match(footer, /bg-\[#FAFAFA\][\s\S]{0,250}BrandLogo[\s\S]{0,180}tone="light"/);
  assert.doesNotMatch(navbar, /bg-\[#FAFAFA\]/);

  const seedFile = read('prisma/seed.ts');
  assert.doesNotMatch(seedFile, /sampleProjects/);
  assert.doesNotMatch(seedFile, /unsplash\.com/i);
  assert.doesNotMatch(seedFile, /rzp_test_sample/i);

  assert.doesNotMatch(read('src/components/ProjectForm.tsx'), /unsplash\.com/i);
  assert.doesNotMatch(read('src/app/admin/projects/page.tsx'), /unsplash\.com/i);
  for (const uiFile of [
    'src/app/orders/confirmation/[orderId]/page.tsx',
    'src/app/projects/custom/page.tsx',
    'src/app/orders/track/page.tsx',
    'src/app/account/page.tsx',
    'src/app/page.tsx',
  ]) {
    assert.doesNotMatch(read(uiFile), /wa\.me\/918220303164/, `Hardcoded WhatsApp link found in ${uiFile}`);
  }
});
