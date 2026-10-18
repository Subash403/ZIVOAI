import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import {
  razorpayInstance,
  validateRazorpayPayment,
  verifyRazorpayWebhookSignature,
} from '../src/lib/razorpay';
import { fulfillVerifiedOrder } from '../src/lib/payment-fulfillment';
import { getWebhookPaymentReference, recordFailedPayment } from '../src/app/api/payments/webhook/route';
import { POST as verifyPayment } from '../src/app/api/payments/verify/route';
import { POST as paymentWebhook } from '../src/app/api/payments/webhook/route';
import { GET as downloadOrder } from '../src/app/api/orders/download/[orderId]/route';
import { createReceiptToken } from '../src/lib/auth';
import { processOrderNotification } from '../src/lib/payment-fulfillment';

test('Razorpay payment validation rejects mismatched order, amount, currency, and capture state', () => {
  const validPayment = {
    id: 'pay_test_security',
    order_id: 'order_test_security',
    amount: 499900,
    currency: 'INR',
    status: 'captured',
    captured: true,
  };

  assert.equal(
    validateRazorpayPayment({
      payment: validPayment,
      expectedOrderId: 'order_test_security',
      expectedAmount: 4999,
      expectedCurrency: 'INR',
    }),
    true
  );
  assert.equal(
    validateRazorpayPayment({
      payment: { ...validPayment, captured: 1 },
      expectedOrderId: 'order_test_security',
      expectedAmount: 4999,
      expectedCurrency: 'INR',
    }),
    true
  );

  for (const change of [
    { order_id: 'order_other' },
    { amount: 499901 },
    { currency: 'USD' },
    { status: 'authorized' },
    { captured: false },
  ]) {
    assert.equal(
      validateRazorpayPayment({
        payment: { ...validPayment, ...change },
        expectedOrderId: 'order_test_security',
        expectedAmount: 4999,
        expectedCurrency: 'INR',
      }),
      false
    );
  }
});

test('Razorpay webhook signatures are verified with timing-safe comparison', () => {
  const body = JSON.stringify({ event: 'payment.captured' });
  const secret = 'webhook-test-secret';
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true);
  assert.equal(verifyRazorpayWebhookSignature(body, `${signature.slice(0, -1)}0`, secret), false);
  assert.equal(verifyRazorpayWebhookSignature(body, signature, 'wrong-secret'), false);
});

test('Webhook reference extraction supports payment and order payload shapes', () => {
  assert.deepEqual(
    getWebhookPaymentReference({ payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } } }),
    { orderId: 'order_1', paymentId: 'pay_1' }
  );
  assert.deepEqual(
    getWebhookPaymentReference({ payload: { order: { entity: { id: 'order_2' } } } }),
    { orderId: 'order_2', paymentId: undefined }
  );
});

test('Fulfillment is idempotent across repeated requests', async () => {
  const suffix = Date.now().toString();
  const orderId = `TEST_SECURITY_${suffix}`;
  let projectId = '';
  let dbOrderId = '';
  let failedOrderId = '';

  try {
    const project = await prisma.project.create({
      data: {
        title: 'Security Test Project',
        slug: `security-test-${suffix}`,
        shortDescription: 'Security test',
        fullDescription: 'Security test project',
        category: 'Testing',
        technologies: '[]',
        difficulty: 'Intermediate',
        projectType: 'Mini',
        mainImage: '/test.png',
        price: 4999,
        stockLimit: 2,
        downloadFileName: 'security-test.zip',
        downloadFileUrl: 'missing/security-test.zip',
      },
    });
    projectId = project.id;

    const order = await prisma.order.create({
      data: {
        orderId,
        studentName: 'Security Test',
        email: 'security-test@example.com',
        phone: '+919999999999',
        projectId,
        projectName: project.title,
        amount: project.price,
        currency: 'INR',
        razorpayOrderId: `order_security_${suffix}`,
      },
    });
    dbOrderId = order.id;

    await fulfillVerifiedOrder({
      internalOrderId: orderId,
      razorpayPaymentId: `pay_security_${suffix}`,
      origin: 'https://example.test',
    });
    await fulfillVerifiedOrder({
      internalOrderId: orderId,
      razorpayPaymentId: `pay_security_duplicate_${suffix}`,
      origin: 'https://example.test',
    });

    const finalOrder = await prisma.order.findUnique({ where: { id: dbOrderId } });
    const finalProject = await prisma.project.findUnique({ where: { id: projectId } });
    const notifications = await prisma.notificationLog.count({ where: { orderId } });
    const downloadResponse = await downloadOrder(
      new Request(`https://example.test/api/orders/download/${orderId}?token=${createReceiptToken(orderId)}`),
      { params: Promise.resolve({ orderId }) }
    );

    assert.equal(finalOrder?.paymentStatus, 'PAID');
    assert.equal(finalProject?.stockLimit, 1);
    assert.equal(notifications, 1);
    assert.equal(downloadResponse.status, 503);
    assert.match((await downloadResponse.json()).error, /deliverable is not available/i);

    const failedOrder = await prisma.order.create({
      data: {
        orderId: `${orderId}_FAILED`,
        studentName: 'Security Test',
        email: 'security-test@example.com',
        phone: '+919999999999',
        projectId,
        projectName: project.title,
        amount: project.price,
        currency: 'INR',
        razorpayOrderId: `order_security_failed_${suffix}`,
      },
    });
    failedOrderId = failedOrder.id;
    await recordFailedPayment(failedOrder.razorpayOrderId!, `pay_failed_${suffix}`);
    await recordFailedPayment(failedOrder.razorpayOrderId!, `pay_failed_duplicate_${suffix}`);
    const finalFailedOrder = await prisma.order.findUnique({ where: { id: failedOrderId } });
    assert.equal(finalFailedOrder?.paymentStatus, 'FAILED');
    assert.equal(finalFailedOrder?.razorpayPaymentId, `pay_failed_${suffix}`);
  } finally {
    await prisma.notificationLog.deleteMany({ where: { orderId } }).catch(() => {});
    if (failedOrderId) await prisma.order.delete({ where: { id: failedOrderId } }).catch(() => {});
    if (dbOrderId) await prisma.order.delete({ where: { id: dbOrderId } }).catch(() => {});
    if (projectId) await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
  }
});

test('Fulfillment cannot overwrite cancelled or refunded orders', async () => {
  const suffix = Date.now().toString();
  const project = await prisma.project.create({ data: { title: 'Race Project', slug: `race-${suffix}`, shortDescription: 'x', fullDescription: 'x', category: 'x', technologies: '[]', difficulty: 'x', projectType: 'x', mainImage: '/x', price: 1, stockLimit: 2 } });
  const cancelled = await prisma.order.create({ data: { orderId: `CANCELLED_${suffix}`, studentName: 'x', email: 'x@example.com', phone: '1', projectId: project.id, projectName: project.title, amount: 1, razorpayOrderId: `order_${suffix}_c` , paymentStatus: 'CANCELLED' } });
  const refunded = await prisma.order.create({ data: { orderId: `REFUNDED_${suffix}`, studentName: 'x', email: 'x@example.com', phone: '1', projectId: project.id, projectName: project.title, amount: 1, razorpayOrderId: `order_${suffix}_r` , paymentStatus: 'REFUNDED' } });
  await assert.rejects(() => fulfillVerifiedOrder({ internalOrderId: cancelled.orderId, origin: 'https://example.test' }));
  await assert.rejects(() => fulfillVerifiedOrder({ internalOrderId: refunded.orderId, origin: 'https://example.test' }));
  const final = await prisma.order.findMany({ where: { id: { in: [cancelled.id, refunded.id] } } });
  assert.deepEqual(final.map((order) => order.paymentStatus).sort(), ['CANCELLED', 'REFUNDED']);
  await prisma.order.deleteMany({ where: { id: { in: [cancelled.id, refunded.id] } } });
  await prisma.project.delete({ where: { id: project.id } });
});

test('Concurrent fulfillment allocates stock only once per available unit', async () => {
  const suffix = Date.now().toString();
  const project = await prisma.project.create({ data: { title: 'Stock Race', slug: `stock-race-${suffix}`, shortDescription: 'x', fullDescription: 'x', category: 'x', technologies: '[]', difficulty: 'x', projectType: 'x', mainImage: '/x', price: 1, stockLimit: 1 } });
  const orders = await Promise.all([1, 2].map((index) => prisma.order.create({ data: { orderId: `STOCK_${suffix}_${index}`, studentName: 'x', email: `stock${index}@example.com`, phone: '1', projectId: project.id, projectName: project.title, amount: 1, razorpayOrderId: `order_stock_${suffix}_${index}` } })));
  const results = await Promise.allSettled(orders.map((order) => fulfillVerifiedOrder({ internalOrderId: order.orderId, origin: 'https://example.test' })));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await prisma.project.findUnique({ where: { id: project.id } }))?.stockLimit, 0);
  assert.equal((await prisma.order.count({ where: { id: { in: orders.map((order) => order.id) }, paymentStatus: 'PAID' } })), 1);
  assert.equal((await prisma.order.count({ where: { id: { in: orders.map((order) => order.id) }, deliveryStatus: 'FAILED' } })), 1);
  await prisma.orderNotification.deleteMany({ where: { orderId: { in: orders.map((order) => order.orderId) } } });
  await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
  await prisma.project.delete({ where: { id: project.id } });
});

test('Payment verification route requires the stored Razorpay order and validates the provider payment', async () => {
  const suffix = Date.now().toString();
  const project = await prisma.project.create({ data: { title: 'Route Verify', slug: `route-verify-${suffix}`, shortDescription: 'x', fullDescription: 'x', category: 'x', technologies: '[]', difficulty: 'x', projectType: 'x', mainImage: '/x', price: 4999 } });
  const order = await prisma.order.create({ data: { orderId: `VERIFY_${suffix}`, studentName: 'x', email: 'verify@example.com', phone: '1', projectId: project.id, projectName: project.title, amount: 4999, razorpayOrderId: `order_verify_${suffix}` } });
  const paymentId = `pay_verify_${suffix}`;
  const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'sampleKeySecret67890').update(`${order.razorpayOrderId}|${paymentId}`).digest('hex');
  const paymentApi = razorpayInstance.payments as unknown as { fetch: (paymentId: string) => Promise<unknown> };
  const originalFetch = paymentApi.fetch;
  paymentApi.fetch = async () => ({ id: paymentId, order_id: order.razorpayOrderId, amount: 499900, currency: 'INR', status: 'captured', captured: true });
  try {
    const missingStored = await prisma.order.create({ data: { orderId: `VERIFY_MISSING_${suffix}`, studentName: 'x', email: 'verify-missing@example.com', phone: '1', projectId: project.id, projectName: project.title, amount: 4999 } });
    const missingResponse = await verifyPayment(new Request('https://example.test/api/payments/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ internalOrderId: missingStored.orderId, razorpayOrderId: 'order_client_supplied', razorpayPaymentId: paymentId, razorpaySignature: signature }) }));
    assert.equal(missingResponse.status, 400);
    await prisma.order.delete({ where: { id: missingStored.id } });
    const response = await verifyPayment(new Request('https://example.test/api/payments/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ internalOrderId: order.orderId, razorpayOrderId: order.razorpayOrderId, razorpayPaymentId: paymentId, razorpaySignature: signature }) }));
    assert.equal(response.status, 200);
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))?.paymentStatus, 'PAID');
  } finally {
    paymentApi.fetch = originalFetch;
    await prisma.orderNotification.deleteMany({ where: { orderId: order.orderId } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.project.delete({ where: { id: project.id } });
  }
});

test('Webhook route deduplicates concurrent signed payment events', async () => {
  const suffix = Date.now().toString();
  const project = await prisma.project.create({ data: { title: 'Webhook Route', slug: `webhook-route-${suffix}`, shortDescription: 'x', fullDescription: 'x', category: 'x', technologies: '[]', difficulty: 'x', projectType: 'x', mainImage: '/x', price: 99 } });
  const order = await prisma.order.create({ data: { orderId: `WEBHOOK_${suffix}`, studentName: 'x', email: 'webhook@example.com', phone: '1', projectId: project.id, projectName: project.title, amount: 99, razorpayOrderId: `order_webhook_${suffix}` } });
  const paymentId = `pay_webhook_${suffix}`;
  const body = JSON.stringify({ id: `evt_${suffix}`, event: 'payment.captured', payload: { payment: { entity: { id: paymentId, order_id: order.razorpayOrderId } } } });
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET = `webhook-secret-${suffix}`;
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const paymentApi = razorpayInstance.payments as unknown as { fetch: (paymentId: string) => Promise<unknown> };
  const originalFetch = paymentApi.fetch;
  paymentApi.fetch = async () => ({ id: paymentId, order_id: order.razorpayOrderId, amount: 9900, currency: 'INR', status: 'captured', captured: true });
  try {
    const makeRequest = () => paymentWebhook(new Request('https://example.test/api/payments/webhook', { method: 'POST', headers: { 'x-razorpay-signature': signature }, body }));
    const responses = await Promise.all([makeRequest(), makeRequest()]);
    assert.equal(responses.filter((response) => response.status === 200).length, 2);
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))?.paymentStatus, 'PAID');
    assert.equal(await prisma.paymentWebhookEvent.count({ where: { eventKey: `evt_${suffix}` } }), 1);

    const unmatchedBody = JSON.stringify({ id: `evt_unmatched_${suffix}`, event: 'payment.failed', payload: { payment: { entity: { id: `pay_unmatched_${suffix}` } } } });
    const unmatchedSignature = crypto.createHmac('sha256', secret).update(unmatchedBody).digest('hex');
    const unmatchedResponse = await paymentWebhook(new Request('https://example.test/api/payments/webhook', { method: 'POST', headers: { 'x-razorpay-signature': unmatchedSignature }, body: unmatchedBody }));
    assert.equal(unmatchedResponse.status, 200);
    assert.equal((await prisma.paymentWebhookEvent.findUnique({ where: { eventKey: `evt_unmatched_${suffix}` } }))?.status, 'UNMATCHED');
  } finally {
    paymentApi.fetch = originalFetch;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    await prisma.paymentWebhookEvent.deleteMany({ where: { eventKey: { in: [`evt_${suffix}`, `evt_unmatched_${suffix}`] } } });
    await prisma.orderNotification.deleteMany({ where: { orderId: order.orderId } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.project.delete({ where: { id: project.id } });
  }
});

test('Download limit is atomic and filenames cannot inject headers', async () => {
  const suffix = Date.now().toString();
  const localDir = path.join(process.cwd(), 'storage', 'private-downloads');
  fs.mkdirSync(localDir, { recursive: true });
  const key = `download-${suffix}.zip`;
  fs.writeFileSync(path.join(localDir, key), Buffer.from('zip'));
  const project = await prisma.project.create({ data: { title: 'Download Race', slug: `download-race-${suffix}`, shortDescription: 'x', fullDescription: 'x', category: 'x', technologies: '[]', difficulty: 'x', projectType: 'x', mainImage: '/x', price: 1, downloadFileUrl: key, downloadFileName: `evil\r\nInjected: true.zip` } });
  const order = await prisma.order.create({ data: { orderId: `DOWNLOAD_${suffix}`, studentName: 'x', email: 'download@example.com', phone: '1', projectId: project.id, projectName: project.title, amount: 1, paymentStatus: 'PAID', downloadToken: createReceiptToken(`DOWNLOAD_${suffix}`), downloadLimit: 1 } });
  try {
    const request = () => downloadOrder(new Request(`https://example.test/api/orders/download/${order.orderId}?token=${createReceiptToken(order.orderId)}`), { params: Promise.resolve({ orderId: order.orderId }) });
    const responses = await Promise.all([request(), request()]);
    assert.equal(responses.filter((response) => response.status === 200).length, 1);
    assert.equal(responses.filter((response) => response.status === 429).length, 1);
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))?.downloadCount, 1);
    assert.doesNotMatch((await responses.find((response) => response.status === 200)!.headers.get('Content-Disposition')) || '', /[\r\n]/);
  } finally {
    fs.rmSync(path.join(localDir, key), { force: true });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.project.delete({ where: { id: project.id } });
  }
});

test('Notification outbox retries a failed delivery state', async () => {
  const suffix = Date.now().toString();
  const project = await prisma.project.create({ data: { title: 'Notification Retry', slug: `notification-retry-${suffix}`, shortDescription: 'x', fullDescription: 'x', category: 'x', technologies: '[]', difficulty: 'x', projectType: 'x', mainImage: '/x', price: 1 } });
  const order = await prisma.order.create({ data: { orderId: `NOTIFY_${suffix}`, studentName: 'x', email: 'notify@example.com', phone: '1', projectId: project.id, projectName: project.title, amount: 1, paymentStatus: 'PAID' } });
  await prisma.orderNotification.create({ data: { orderId: order.orderId, status: 'FAILED', nextAttemptAt: new Date(Date.now() - 1000), attemptCount: 1 } });
  try {
    assert.equal(await processOrderNotification(order.orderId, 'https://example.test'), true);
    assert.equal((await prisma.orderNotification.findUnique({ where: { orderId: order.orderId } }))?.status, 'SENT');
  } finally {
    await prisma.notificationLog.deleteMany({ where: { orderId: order.orderId } });
    await prisma.orderNotification.delete({ where: { orderId: order.orderId } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.project.delete({ where: { id: project.id } });
  }
});
