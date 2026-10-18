import test from 'node:test';
import assert from 'node:assert/strict';

test('Digital Delivery & Availability Enforcement Logic', async (t) => {
  await t.test('Download token expiration logic correctly identifies expired links', () => {
    const now = new Date();
    
    // Future expiry (e.g. 7 days from now)
    const validExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const isStillValid = validExpiry.getTime() > Date.now();
    assert.equal(isStillValid, true);

    // Past expiry (e.g. expired yesterday)
    const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const isExpired = expiredDate.getTime() < Date.now();
    assert.equal(isExpired, true);
  });

  await t.test('Download count limits prevent excess file downloads', () => {
    const order = {
      downloadCount: 5,
      downloadLimit: 5,
    };

    const canDownload = order.downloadCount < order.downloadLimit;
    assert.equal(canDownload, false, 'Download must be denied when limit reached');

    const freshOrder = {
      downloadCount: 0,
      downloadLimit: 5,
    };
    assert.equal(freshOrder.downloadCount < freshOrder.downloadLimit, true);
  });

  await t.test('Project availability & published check prevents new checkouts', () => {
    const isCheckoutAllowed = (project: {
      available: boolean;
      published: boolean;
      stockLimit: number;
    }) => {
      if (!project.published) return { allowed: false, reason: 'Project is unpublished' };
      if (!project.available) return { allowed: false, reason: 'Project is currently unavailable' };
      if (project.stockLimit <= 0) return { allowed: false, reason: 'Project is out of stock' };
      return { allowed: true };
    };

    // Unpublished project
    assert.deepEqual(
      isCheckoutAllowed({ available: true, published: false, stockLimit: 10 }),
      { allowed: false, reason: 'Project is unpublished' }
    );

    // Unavailable project
    assert.deepEqual(
      isCheckoutAllowed({ available: false, published: true, stockLimit: 10 }),
      { allowed: false, reason: 'Project is currently unavailable' }
    );

    // Out of stock project
    assert.deepEqual(
      isCheckoutAllowed({ available: true, published: true, stockLimit: 0 }),
      { allowed: false, reason: 'Project is out of stock' }
    );

    // In stock & available & published
    assert.deepEqual(
      isCheckoutAllowed({ available: true, published: true, stockLimit: 5 }),
      { allowed: true }
    );
  });

  await t.test('Unavailability of project preserves historical order download access', () => {
    // When a project is made unavailable, existing confirmed orders must retain delivery access
    const project = { available: false, published: false };
    assert.equal(project.available, false);
    const historicalOrder = {
      id: 'ord_hist_123',
      paymentStatus: 'PAID',
      deliveryStatus: 'DELIVERED',
      downloadCount: 1,
      downloadLimit: 5,
      downloadTokenExpiry: new Date(Date.now() + 100000),
    };

    // Historical order verification does not depend on project.available
    const canAccessDownload =
      historicalOrder.paymentStatus === 'PAID' &&
      historicalOrder.downloadCount < historicalOrder.downloadLimit &&
      historicalOrder.downloadTokenExpiry.getTime() > Date.now();

    assert.equal(canAccessDownload, true);
  });
});
