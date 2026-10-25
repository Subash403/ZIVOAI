import Razorpay from 'razorpay';
import crypto from 'crypto';

const configuredKeyId = process.env.RAZORPAY_KEY_ID || '';
const configuredKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

function getConfiguredRazorpayCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  if (!keyId || !keySecret || !/^rzp_(test|live)_/.test(keyId)) {
    throw new Error('Razorpay server credentials are not configured correctly.');
  }

  return { keyId, keySecret };
}

export function getRazorpayKeyId(): string {
  return getConfiguredRazorpayCredentials().keyId;
}

export function getRazorpayKeySecret(): string {
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keySecret) {
    throw new Error('Razorpay server credentials are not configured correctly.');
  }
  return keySecret;
}

export const razorpayInstance = new Razorpay({
  key_id: configuredKeyId || 'rzp_test_unconfigured',
  key_secret: configuredKeySecret,
});

export interface CreateOrderParams {
  amount: number; // in INR rupees
  receipt: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder({ amount, receipt, notes }: CreateOrderParams) {
  try {
    getRazorpayKeyId();
    getRazorpayKeySecret();
    // Razorpay expects amount in smallest currency unit (paise for INR, i.e. amount * 100)
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: receipt,
      notes: notes || {},
    };

    const order = await razorpayInstance.orders.create(options);
    return { success: true, order };
  } catch (error: unknown) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Razorpay order creation failed.');
  }
}

export function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  if (razorpayOrderId.startsWith('order_mock_') || razorpayPaymentId.startsWith('pay_mock_')) {
    console.error('Security alert: Mock payment IDs rejected.');
    return false;
  }

  try {
    const activeSecret = getRazorpayKeySecret();
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', activeSecret)
      .update(text)
      .digest('hex');

    const generatedBuffer = Buffer.from(generatedSignature, 'utf8');
    const signatureBuffer = Buffer.from(razorpaySignature, 'utf8');

    if (generatedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(generatedBuffer, signatureBuffer);
  } catch (error) {
    console.error('Error verifying Razorpay signature:', error);
    return false;
  }
}

export interface RazorpayPaymentDetails {
  id?: string;
  order_id?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  captured?: boolean | number | string;
}

export function validateRazorpayPayment({
  payment,
  expectedOrderId,
  expectedAmount,
  expectedCurrency,
}: {
  payment: RazorpayPaymentDetails;
  expectedOrderId: string;
  expectedAmount: number;
  expectedCurrency: string;
}): boolean {
  const amount = Number(payment.amount);
  return Boolean(
    payment.order_id === expectedOrderId &&
      Number.isFinite(amount) &&
      amount === Math.round(expectedAmount * 100) &&
      payment.currency?.toUpperCase() === expectedCurrency.toUpperCase() &&
      payment.status === 'captured' &&
      (payment.captured === true || payment.captured === 1 || payment.captured === '1')
  );
}

export function isRazorpayPaymentPendingCapture({
  payment,
  expectedOrderId,
  expectedAmount,
  expectedCurrency,
}: {
  payment: RazorpayPaymentDetails;
  expectedOrderId: string;
  expectedAmount: number;
  expectedCurrency: string;
}): boolean {
  const amount = Number(payment.amount);
  return Boolean(
    payment.order_id === expectedOrderId &&
      Number.isFinite(amount) &&
      amount === Math.round(expectedAmount * 100) &&
      payment.currency?.toUpperCase() === expectedCurrency.toUpperCase() &&
      payment.status === 'authorized' &&
      (payment.captured === false || payment.captured === 0 || payment.captured === '0')
  );
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPaymentDetails | null> {
  try {
    const payment = (await razorpayInstance.payments.fetch(paymentId)) as RazorpayPaymentDetails;
    return payment.id === paymentId ? payment : null;
  } catch (error) {
    console.error('Failed to fetch Razorpay payment for verification:', error);
    return null;
  }
}

export async function fetchAndValidateRazorpayPayment({
  paymentId,
  expectedOrderId,
  expectedAmount,
  expectedCurrency,
}: {
  paymentId: string;
  expectedOrderId: string;
  expectedAmount: number;
  expectedCurrency: string;
}): Promise<RazorpayPaymentDetails | null> {
  const payment = await fetchRazorpayPayment(paymentId);
  return payment && validateRazorpayPayment({ payment, expectedOrderId, expectedAmount, expectedCurrency }) ? payment : null;
}

export async function fetchAndValidateCapturedPaymentForOrder({
  orderId,
  expectedAmount,
  expectedCurrency,
}: {
  orderId: string;
  expectedAmount: number;
  expectedCurrency: string;
}): Promise<RazorpayPaymentDetails | null> {
  try {
    const response = await razorpayInstance.orders.fetchPayments(orderId);
    const payment = response.items.find((candidate) =>
      validateRazorpayPayment({
        payment: candidate,
        expectedOrderId: orderId,
        expectedAmount,
        expectedCurrency,
      })
    );
    return payment ? (payment as RazorpayPaymentDetails) : null;
  } catch (error) {
    console.error('Failed to fetch captured Razorpay payments for verification:', error);
    return null;
  }
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  if (!rawBody || !signature || !webhookSecret) return false;

  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');

  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
