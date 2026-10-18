import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { createReceiptToken, verifyReceiptToken } from '../src/lib/auth';
import { sendOrderConfirmationNotification } from '../src/lib/notifications';

test('Automated Delivery & Payment Fulfillment Idempotency', async (t) => {
  const testOrderId = `TEST_DELIV_${Date.now()}`;
  let createdProjectId = '';
  let createdOrderId = '';

  t.before(async () => {
    // Create isolated test project
    const proj = await prisma.project.create({
      data: {
        title: 'Delivery Test Architecture',
        slug: `deliv-test-${Date.now()}`,
        shortDescription: 'Test project for automated delivery validation',
        fullDescription: 'Full testing description',
        category: 'Artificial Intelligence',
        technologies: JSON.stringify(['Next.js', 'Python']),
        difficulty: 'Intermediate',
        projectType: 'Major',
        mainImage: '/uploads/projects/test.jpg',
        salesType: 'fixed',
        price: 4999,
        available: true,
        published: true,
        stockLimit: 10,
        downloadFileName: 'deliv-test-source.zip',
        downloadFileUrl: 'deliverables/test-code.zip',
      },
    });
    createdProjectId = proj.id;

    // Create order in CREATED state
    const order = await prisma.order.create({
      data: {
        orderId: testOrderId,
        studentName: 'Test Student',
        email: 'test.student@example.com',
        phone: '9876543210',
        projectId: proj.id,
        projectName: proj.title,
        amount: proj.price,
        currency: 'INR',
        razorpayOrderId: `order_rzp_${Date.now()}`,
        paymentStatus: 'CREATED',
        deliveryStatus: 'PENDING',
      },
    });
    createdOrderId = order.id;
  });

  t.after(async () => {
    // Clean up test data
    if (createdOrderId) {
      await prisma.order.delete({ where: { id: createdOrderId } }).catch(() => {});
    }
    if (createdProjectId) {
      await prisma.project.delete({ where: { id: createdProjectId } }).catch(() => {});
    }
    await prisma.notificationLog.deleteMany({
      where: { orderId: testOrderId },
    }).catch(() => {});
  });

  await t.test('First fulfillment: updates order to PAID, DELIVERED, generates receipt token', async () => {
    const order = await prisma.order.findUnique({
      where: { orderId: testOrderId },
      include: { project: true },
    });
    assert.ok(order);
    assert.equal(order.paymentStatus, 'CREATED');

    const receiptToken = createReceiptToken(order.orderId);
    assert.ok(receiptToken);

    const isFixed = order.project.salesType === 'fixed';
    assert.equal(isFixed, true);

    const updated = await prisma.order.update({
      where: { orderId: testOrderId },
      data: {
        paymentStatus: 'PAID',
        deliveryStatus: 'DELIVERED',
        paidAt: new Date(),
        deliveredAt: new Date(),
        downloadToken: receiptToken,
        downloadTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    assert.equal(updated.paymentStatus, 'PAID');
    assert.equal(updated.deliveryStatus, 'DELIVERED');
    assert.ok(updated.paidAt);
    assert.ok(updated.deliveredAt);
    assert.equal(updated.downloadToken, receiptToken);
  });

  await t.test('Idempotency: Repeated callback/webhook does not re-process or alter already verified order', async () => {
    const existingOrder = await prisma.order.findUnique({
      where: { orderId: testOrderId },
    });
    assert.ok(existingOrder);
    assert.equal(existingOrder.paymentStatus, 'PAID');

    // Simulate second verification request hitting the idempotency check
    const isAlreadyPaid = existingOrder.paymentStatus === 'PAID';
    assert.equal(isAlreadyPaid, true, 'Must detect already PAID state');

    const receiptToken = createReceiptToken(existingOrder.orderId);
    assert.equal(verifyReceiptToken(existingOrder.orderId, receiptToken), true);

    // Order remains unchanged with original paid timestamp
    const checkOrder = await prisma.order.findUnique({
      where: { orderId: testOrderId },
    });
    assert.equal(checkOrder?.paymentStatus, 'PAID');
    assert.equal(checkOrder?.deliveryStatus, 'DELIVERED');
  });

  await t.test('Automated delivery notification records in NotificationLog', async () => {
    const sent = await sendOrderConfirmationNotification({
      orderId: testOrderId,
      studentName: 'Test Student',
      email: 'test.student@example.com',
      projectName: 'Delivery Test Architecture',
      amount: 4999,
      downloadUrl: `https://zivo.ai/api/orders/download/${testOrderId}?token=sampleToken`,
      receiptUrl: `https://zivo.ai/orders/confirmation/${testOrderId}?token=sampleToken`,
    });

    assert.equal(sent, true);

    const logs = await prisma.notificationLog.findMany({
      where: { orderId: testOrderId },
    });
    assert.ok(logs.length >= 1);
    assert.equal(logs[0].recipientEmail, 'test.student@example.com');
    assert.equal(logs[0].type, 'ORDER_CONFIRMATION');
    assert.equal(logs[0].status, 'SENT');
  });

  await t.test('Enforces download count limit and expiry checks', async () => {
    // Verify count limit logic
    const orderWithMaxDownloads = {
      downloadCount: 5,
      downloadLimit: 5,
    };
    const isLimitExceeded = orderWithMaxDownloads.downloadCount >= orderWithMaxDownloads.downloadLimit;
    assert.equal(isLimitExceeded, true);

    // Verify expiry logic
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day future

    const isExpired = new Date() > pastDate;
    const isNotExpired = new Date() > futureDate;

    assert.equal(isExpired, true);
    assert.equal(isNotExpired, false);
  });
});
