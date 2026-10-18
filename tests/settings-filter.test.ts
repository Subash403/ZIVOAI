import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPublicSettings, ALLOWED_SETTING_KEYS } from '../src/lib/settings';

test('Public Settings Filtering & Sensitive Data Exposure Prevention', async (t) => {
  await t.test('filterPublicSettings retains non-sensitive public configuration', () => {
    const rawDatabaseSettings: Record<string, string> = {
      businessName: 'Custom Marketplace Name',
      logoUrl: 'https://example.com/logo.png',
      phoneNumber: '+91 9999988888',
      whatsappNumber: '919999988888',
      supportEmail: 'custom@marketplace.com',
      announcementNotice: 'Special Semester Discount!',
      // Sensitive backend / private keys:
      razorpayKeyId: 'rzp_live_secretkeyid',
      googleSheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      razorpayKeySecret: 'super_secret_private_key',
      serviceAccountKey: '{"type":"service_account","private_key":"..."}',
      adminPasswordHash: '$2a$10$xyz...',
    };

    const publicSettings = filterPublicSettings(rawDatabaseSettings);

    assert.equal(publicSettings.businessName, 'Custom Marketplace Name');
    assert.equal(publicSettings.logoUrl, 'https://example.com/logo.png');
    assert.equal(publicSettings.phoneNumber, '+91 9999988888');
    assert.equal(publicSettings.whatsappNumber, '919999988888');
    assert.equal(publicSettings.supportEmail, 'custom@marketplace.com');
    assert.equal(publicSettings.announcementNotice, 'Special Semester Discount!');

    // Critical security assertion: None of the private keys or sheet IDs are present
    const publicKeys = Object.keys(publicSettings);
    assert.ok(!publicKeys.includes('googleSheetId'), 'googleSheetId must never be in public settings');
    assert.ok(!publicKeys.includes('razorpayKeyId'), 'razorpayKeyId must never be in public settings');
    assert.ok(!publicKeys.includes('razorpayKeySecret'), 'razorpayKeySecret must never be exposed');
    assert.ok(!publicKeys.includes('serviceAccountKey'), 'serviceAccountKey must never be exposed');
    assert.ok(!publicKeys.includes('adminPasswordHash'), 'adminPasswordHash must never be exposed');
  });

  await t.test('filterPublicSettings provides safe fallbacks when database has empty fields', () => {
    const publicSettings = filterPublicSettings({});

    assert.equal(publicSettings.businessName, 'Zivo AI');
    assert.equal(publicSettings.logoUrl, '/images/zivoai-logo.png');
    assert.ok(publicSettings.phoneNumber.length > 5);
    assert.ok(publicSettings.whatsappNumber.length > 5);
    assert.ok(publicSettings.supportEmail.includes('@'));
    assert.ok(publicSettings.announcementNotice.length > 0);
  });

  await t.test('ALLOWED_SETTING_KEYS strictly defines permitted admin update keys', () => {
    const keys: readonly string[] = ALLOWED_SETTING_KEYS;
    assert.ok(keys.includes('businessName'));
    assert.ok(keys.includes('googleSheetId'));
    assert.ok(!keys.includes('adminPasswordHash'));
    assert.ok(!keys.includes('secretKey'));
  });
});
