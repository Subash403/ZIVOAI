import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { signAuthToken, ADMIN_TOKEN_COOKIE_NAME, CUSTOMER_TOKEN_COOKIE_NAME } from '../src/lib/auth';
import { uploadPublicAsset, uploadPrivateAsset, privateAssetExists } from '../src/lib/storage';
import { DELETE } from '../src/app/api/projects/[id]/route';

test('Admin Project Deletion & Safe Retirement Lifecycle', async (t) => {
  const adminToken = signAuthToken({
    userId: 'admin-test-user',
    email: 'admin@zivo.ai',
    role: 'ADMIN',
  });

  const customerToken = signAuthToken({
    userId: 'cust-test-user',
    email: 'customer@example.com',
    role: 'CUSTOMER',
  });

  await t.test('DELETE rejects unauthenticated or customer requests with 401', async () => {
    // Unauthenticated
    const unauthReq = new Request('http://localhost:3000/api/projects/sample-id', {
      method: 'DELETE',
    });
    const unauthRes = await DELETE(unauthReq, { params: Promise.resolve({ id: 'sample-id' }) });
    assert.equal(unauthRes.status, 401);

    // Customer
    const custReq = new Request('http://localhost:3000/api/projects/sample-id', {
      method: 'DELETE',
      headers: {
        cookie: `${CUSTOMER_TOKEN_COOKIE_NAME}=${customerToken}`,
      },
    });
    const custRes = await DELETE(custReq, { params: Promise.resolve({ id: 'sample-id' }) });
    assert.equal(custRes.status, 401);
  });

  await t.test('DELETE returns 404 if project does not exist', async () => {
    const req = new Request('http://localhost:3000/api/projects/non-existent-id', {
      method: 'DELETE',
      headers: {
        cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}`,
      },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
    assert.equal(res.status, 404);
  });

  await t.test('Permanently deletes project without orders and cleans up storage assets', async () => {
    // Create real test public and private files
    const publicAsset = await uploadPublicAsset({
      buffer: Buffer.from('test-image-content'),
      originalName: 'test-deletion-cover.png',
      mimeType: 'image/png',
      folder: 'projects',
    });

    const privateAsset = await uploadPrivateAsset({
      buffer: Buffer.from('test-zip-content'),
      originalName: 'test-deletion-deliverable.zip',
      mimeType: 'application/zip',
      folder: 'deliverables',
    });

    assert.ok(await privateAssetExists(privateAsset.key));

    const project = await prisma.project.create({
      data: {
        title: 'Project Without Orders',
        slug: `no-orders-${Date.now()}`,
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'Artificial Intelligence',
        technologies: JSON.stringify(['Python']),
        difficulty: 'Beginner',
        projectType: 'Mini',
        mainImage: publicAsset.url,
        downloadFileName: privateAsset.fileName,
        downloadFileUrl: privateAsset.key,
        available: true,
        published: true,
      },
    });

    // Create a wishlist item referencing this project
    const testUser = await prisma.user.findFirst();
    if (testUser) {
      await prisma.wishlistItem.create({
        data: {
          userId: testUser.id,
          projectId: project.id,
        },
      }).catch(() => {});
    }

    const req = new Request(`http://localhost:3000/api/projects/${project.id}`, {
      method: 'DELETE',
      headers: {
        cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}`,
      },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: project.id }) });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.action, 'deleted');

    // Confirm project row is gone
    const checkDb = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(checkDb, null);

    // Confirm private asset was deleted
    const checkPrivate = await privateAssetExists(privateAsset.key);
    assert.equal(checkPrivate, false);
  });

  await t.test('Safely archives project with historical orders to protect customer downloads', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Project With Orders',
        slug: `has-orders-${Date.now()}`,
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'Cybersecurity',
        technologies: JSON.stringify(['Go']),
        difficulty: 'Intermediate',
        projectType: 'Major',
        mainImage: '/uploads/projects/protected.png',
        downloadFileName: 'protected-source.zip',
        downloadFileUrl: 'deliverables/protected.zip',
        available: true,
        published: true,
        featured: true,
      },
    });

    const orderId = `ORD-TEST-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderId,
        studentName: 'Existing Customer',
        email: 'customer@example.com',
        phone: '9876543210',
        projectId: project.id,
        projectName: project.title,
        amount: 2999,
        currency: 'INR',
        paymentStatus: 'PAID',
        deliveryStatus: 'DELIVERED',
      },
    });

    const req = new Request(`http://localhost:3000/api/projects/${project.id}`, {
      method: 'DELETE',
      headers: {
        cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}`,
      },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: project.id }) });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.action, 'archived');
    assert.ok(body.message.includes('customer order'));

    // Verify row still exists in DB so the order is NOT broken
    const updatedProject = await prisma.project.findUnique({ where: { id: project.id } });
    assert.ok(updatedProject);
    assert.equal(updatedProject?.available, false);
    assert.equal(updatedProject?.published, false);
    assert.equal(updatedProject?.featured, false);

    // Verify order is intact
    const checkOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { project: true },
    });
    assert.ok(checkOrder);
    assert.equal(checkOrder?.project.downloadFileUrl, 'deliverables/protected.zip');

    // Clean up test order and project
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.project.delete({ where: { id: project.id } });
  });
});
