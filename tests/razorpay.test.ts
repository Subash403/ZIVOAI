import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyRazorpaySignature } from '../src/lib/razorpay';

test('Razorpay Payment Verification Security', async (t) => {
  const secret = process.env.RAZORPAY_KEY_SECRET || 'sampleKeySecret67890';
  const orderId = 'order_test_998877';
  const paymentId = 'pay_test_112233';

  // Compute genuine HMAC signature
  const genuineSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  await t.test('verifyRazorpaySignature validates authentic HMAC signature', () => {
    const isValid = verifyRazorpaySignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: genuineSignature,
    });
    assert.equal(isValid, true);
  });

  await t.test('verifyRazorpaySignature rejects forged or incorrect signature', () => {
    const forgedSignature = crypto
      .createHmac('sha256', 'wrong_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = verifyRazorpaySignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: forgedSignature,
    });
    assert.equal(isValid, false);
  });

  await t.test('verifyRazorpaySignature rejects tampered order or payment id', () => {
    const isTamperedOrderValid = verifyRazorpaySignature({
      razorpayOrderId: 'order_test_different',
      razorpayPaymentId: paymentId,
      razorpaySignature: genuineSignature,
    });
    assert.equal(isTamperedOrderValid, false);

    const isTamperedPaymentValid = verifyRazorpaySignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: 'pay_test_different',
      razorpaySignature: genuineSignature,
    });
    assert.equal(isTamperedPaymentValid, false);
  });

  await t.test('verifyRazorpaySignature strictly rejects mock payments in production', () => {
    const prevEnv = process.env.NODE_ENV;
    const envObj = process.env as Record<string, string | undefined>;
    try {
      envObj.NODE_ENV = 'production';
      const isValid = verifyRazorpaySignature({
        razorpayOrderId: 'order_mock_12345678',
        razorpayPaymentId: 'pay_mock_12345678',
        razorpaySignature: 'mock_signature_bypass',
      });
      assert.equal(isValid, false, 'Mock payments must always be rejected in production');
    } finally {
      envObj.NODE_ENV = prevEnv;
    }
  });

  await t.test('verifyRazorpaySignature rejects empty or malformed inputs', () => {
    assert.equal(
      verifyRazorpaySignature({
        razorpayOrderId: '',
        razorpayPaymentId: paymentId,
        razorpaySignature: genuineSignature,
      }),
      false
    );
    assert.equal(
      verifyRazorpaySignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: '',
        razorpaySignature: genuineSignature,
      }),
      false
    );
    assert.equal(
      verifyRazorpaySignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: '',
      }),
      false
    );
  });
});
