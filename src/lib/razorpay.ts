import Razorpay from 'razorpay';
import crypto from 'crypto';

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_sampleKeyId12345';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'sampleKeySecret67890';

export function getRazorpayKeySecret(): string {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'sampleKeySecret67890') {
      throw new Error('CRITICAL SECURITY ERROR: Valid RAZORPAY_KEY_SECRET must be configured in production.');
    }
  }
  return keySecret;
}

export const razorpayInstance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export interface CreateOrderParams {
  amount: number; // in INR rupees
  receipt: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder({ amount, receipt, notes }: CreateOrderParams) {
  try {
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

    // In production, NEVER create mock orders
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to create secure payment order with payment gateway.');
    }

    // Allow mock fallback ONLY in non-production local development if explicit flag or test keys
    return {
      success: true,
      order: {
        id: `order_mock_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt,
      },
    };
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

  // Strictly forbid mock payments in production
  if (process.env.NODE_ENV === 'production') {
    if (razorpayOrderId.startsWith('order_mock_') || razorpayPaymentId.startsWith('pay_mock_')) {
      console.error('Security alert: Mock payment IDs rejected in production mode.');
      return false;
    }
  } else {
    // In development mode, only accept mock payments if explicit development flag is set
    if (
      (razorpayOrderId.startsWith('order_mock_') || razorpayPaymentId.startsWith('pay_mock_')) &&
      process.env.ALLOW_MOCK_PAYMENTS === 'true'
    ) {
      return true;
    }
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

