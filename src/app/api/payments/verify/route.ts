import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAndValidateRazorpayPayment, verifyRazorpaySignature } from '@/lib/razorpay';
import { getCustomerSession } from '@/lib/auth';
import { fulfillVerifiedOrder } from '@/lib/payment-fulfillment';

interface PaymentVerifyPayload {
  internalOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function POST(request: Request) {
  try {
    const body: PaymentVerifyPayload = await request.json();
    const {
      internalOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    if (!internalOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Invalid payment payload received: missing required verification fields.' },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { orderId: internalOrderId },
      include: { project: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order record not found' }, { status: 404 });
    }

    // The provider order ID must have been created and stored by the server.
    if (!existingOrder.razorpayOrderId || existingOrder.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        { error: 'Security mismatch: razorpayOrderId does not match original order record.' },
        { status: 400 }
      );
    }

    // Guard against invalid status
    if (existingOrder.paymentStatus === 'CANCELLED' || existingOrder.paymentStatus === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Order is no longer valid for payment processing.' },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature server-side using Razorpay Key Secret
    const isValid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      await prisma.order.updateMany({
        where: { orderId: internalOrderId, paymentStatus: { in: ['CREATED', 'FAILED'] } },
        data: { paymentStatus: 'FAILED' },
      });

      return NextResponse.json(
        { error: 'Payment signature verification failed. If your account was debited, please contact support with Order ID.' },
        { status: 400 }
      );
    }

    const payment = await fetchAndValidateRazorpayPayment({
      paymentId: razorpayPaymentId,
      expectedOrderId: existingOrder.razorpayOrderId,
      expectedAmount: existingOrder.amount,
      expectedCurrency: existingOrder.currency,
    });

    if (!payment) {
      if (existingOrder.paymentStatus !== 'PAID') {
        await prisma.order.updateMany({
          where: { id: existingOrder.id, paymentStatus: { in: ['CREATED', 'FAILED'] } },
          data: { paymentStatus: 'FAILED' },
        });
      }
      return NextResponse.json(
        { error: 'Payment could not be verified against the Razorpay order, amount, currency, or capture status.' },
        { status: 400 }
      );
    }

    // Check if customer is currently logged in
    const session = await getCustomerSession();
    let linkedUserId = existingOrder.userId;
    if (!linkedUserId && session) {
      linkedUserId = session.userId;
    }

    const updatedOrder = await fulfillVerifiedOrder({
      internalOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId: linkedUserId || undefined,
      origin: new URL(request.url).origin,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully!',
      order: updatedOrder,
      receiptToken: updatedOrder.downloadToken,
    });
  } catch (error: unknown) {
    console.error('Error verifying payment signature:', error);
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
