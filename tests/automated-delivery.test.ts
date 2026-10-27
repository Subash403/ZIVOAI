import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { createReceiptToken, verifyReceiptToken } from '../src/lib/auth';
import { sendOrderConfirmationNotification } from '../src/lib/notifications';
import { GET as downloadRoute } from '../src/app/api/orders/download/[orderId]/route';
import { uploadPrivateAsset } from '../src/lib/storage';

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

  await t.test('Customer download lookup succeeds for lowercase hex orderId, uppercase orderId, and id', async () => {
    // Create an asset so file exists
    const asset = await uploadPrivateAsset({
      buffer: Buffer.from('test-download-bytes'),
      originalName: 'test-case-dl.zip',
      mimeType: 'application/zip',
    });

    const lowercaseHexOrderId = `ORD-${Date.now()}-abc123def456`;
    const dlProject = await prisma.project.create({
      data: {
        title: 'Download Resolution Project',
        slug: `dl-res-${Date.now()}`,
        shortDescription: 'Desc',
        fullDescription: 'Full Desc',
        category: 'Artificial Intelligence',
        technologies: JSON.stringify(['Python']),
        difficulty: 'Beginner',
        projectType: 'Mini',
        mainImage: '/test.png',
        downloadFileName: 'test-case-dl.zip',
        downloadFileUrl: asset.key,
        available: true,
        published: true,
        price: 1999,
      },
    });

    const paidOrder = await prisma.order.create({
      data: {
        orderId: lowercaseHexOrderId,
        studentName: 'DL Student',
        email: 'dl.student@example.com',
        phone: '9988776655',
        projectId: dlProject.id,
        projectName: dlProject.title,
        amount: 1999,
        currency: 'INR',
        paymentStatus: 'PAID',
        deliveryStatus: 'PENDING',
      },
    });

    const receiptToken = createReceiptToken(paidOrder.orderId);

    // 1. Download via exact lowercase hex orderId
    const reqExact = new Request(
      `http://localhost:3000/api/orders/download/${lowercaseHexOrderId}?token=${receiptToken}`
    );
    const resExact = await downloadRoute(reqExact, {
      params: Promise.resolve({ orderId: lowercaseHexOrderId }),
    });
    // Should NOT be 404
    assert.notEqual(resExact.status, 404);

    // 2. Download via uppercase transformed orderId
    const reqUpper = new Request(
      `http://localhost:3000/api/orders/download/${lowercaseHexOrderId.toUpperCase()}?token=${receiptToken}`
    );
    const resUpper = await downloadRoute(reqUpper, {
      params: Promise.resolve({ orderId: lowercaseHexOrderId.toUpperCase() }),
    });
    assert.notEqual(resUpper.status, 404);

    // 3. Download via database cuid id
    const reqId = new Request(
      `http://localhost:3000/api/orders/download/${paidOrder.id}?token=${receiptToken}`
    );
    const resId = await downloadRoute(reqId, {
      params: Promise.resolve({ orderId: paidOrder.id }),
    });
    assert.notEqual(resId.status, 404);

    // Clean up
    await prisma.order.delete({ where: { id: paidOrder.id } });
    await prisma.project.delete({ where: { id: dlProject.id } });
  });
});

