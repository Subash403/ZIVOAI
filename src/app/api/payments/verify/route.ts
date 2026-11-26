import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  fetchRazorpayPayment,
  isRazorpayPaymentPendingCapture,
  validateRazorpayPayment,
  verifyRazorpaySignature,
} from '@/lib/razorpay';
import { getCustomerSession } from '@/lib/auth';
import { fulfillVerifiedOrder } from '@/lib/payment-fulfillment';
import { releaseStockReservation } from '@/lib/stock-reservation';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/security';

interface PaymentVerifyPayload {
  internalOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(clientIp, {
      keyPrefix: 'payments:verify:ip',
      windowMs: 10 * 60 * 1000,
      maxRequests: 30,
      cooldownMs: 3 * 60 * 1000,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl, 'Too many payment verification attempts. Please wait.');
    }

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

    if (!existingOrder.razorpayOrderId || existingOrder.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        { error: 'Security mismatch: razorpayOrderId does not match original order record.' },
        { status: 400 }
      );
    }

    if (existingOrder.paymentStatus === 'CANCELLED' || existingOrder.paymentStatus === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Order is no longer valid for payment processing.' },
        { status: 400 }
      );
    }

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
      await releaseStockReservation(internalOrderId, 'RELEASED');

      return NextResponse.json(
        { error: 'Payment signature verification failed. If your account was debited, please contact support with Order ID.' },
        { status: 400 }
      );
    }

    const payment = await fetchRazorpayPayment(razorpayPaymentId);
    if (
      payment &&
      isRazorpayPaymentPendingCapture({
        payment,
        expectedOrderId: existingOrder.razorpayOrderId,
        expectedAmount: existingOrder.amount,
        expectedCurrency: existingOrder.currency,
      })
    ) {
      await prisma.order.updateMany({
        where: { id: existingOrder.id, paymentStatus: 'CREATED' },
        data: { razorpayPaymentId },
      });
      return NextResponse.json(
        { pending: true, message: 'Payment is authorized and awaiting capture. Your order will update automatically.' },
        { status: 202 }
      );
    }

    if (
      !payment ||
      !validateRazorpayPayment({
        payment,
        expectedOrderId: existingOrder.razorpayOrderId,
        expectedAmount: existingOrder.amount,
        expectedCurrency: existingOrder.currency,
      })
    ) {
      if (existingOrder.paymentStatus !== 'PAID') {
        await prisma.order.updateMany({
          where: { id: existingOrder.id, paymentStatus: { in: ['CREATED', 'FAILED'] } },
          data: { paymentStatus: 'FAILED' },
        });
        await releaseStockReservation(internalOrderId, 'RELEASED');
      }
      return NextResponse.json(
        { error: 'Payment could not be verified against the Razorpay order, amount, currency, or capture status.' },
        { status: 400 }
      );
    }

    const session = await getCustomerSession(request);
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
      order: {
        id: updatedOrder.id,
        orderId: updatedOrder.orderId,
        projectName: updatedOrder.projectName,
        amount: updatedOrder.amount,
        currency: updatedOrder.currency,
        paymentStatus: updatedOrder.paymentStatus,
        deliveryStatus: updatedOrder.deliveryStatus,
        paidAt: updatedOrder.paidAt,
      },
      receiptToken: updatedOrder.downloadToken,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Payment verification failed', 500, 'payments:verify');
  }
}
