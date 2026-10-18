import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { createReceiptToken, getCustomerSession } from '@/lib/auth';
import { sendOrderConfirmationNotification } from '@/lib/notifications';

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

    // Verify order ID integrity: razorpayOrderId must match the record created on backend
    if (existingOrder.razorpayOrderId && existingOrder.razorpayOrderId !== razorpayOrderId) {
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

    const receiptToken = createReceiptToken(existingOrder.orderId);

    // Idempotency: If already marked as PAID, return existing verified order and receipt token
    if (existingOrder.paymentStatus === 'PAID') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified and paid.',
        order: existingOrder,
        receiptToken,
      });
    }

    // Verify HMAC-SHA256 signature server-side using Razorpay Key Secret
    const isValid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      // Mark order as FAILED in DB
      await prisma.order.update({
        where: { orderId: internalOrderId },
        data: { paymentStatus: 'FAILED' },
      });

      return NextResponse.json(
        { error: 'Payment signature verification failed. If your account was debited, please contact support with Order ID.' },
        { status: 400 }
      );
    }

    // Check if customer is currently logged in
    const session = await getCustomerSession();
    let linkedUserId = existingOrder.userId;
    if (!linkedUserId && session) {
      linkedUserId = session.userId;
    }

    // Digital automated delivery: fixed-price projects are automatically DELIVERED
    const isFixed = existingOrder.project.salesType === 'fixed';
    const deliveryStatus = isFixed ? 'DELIVERED' : 'PENDING';
    const downloadTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Mark order as PAID & deliveryStatus in DB
    const updatedOrder = await prisma.order.update({
      where: { orderId: internalOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        paymentStatus: 'PAID',
        deliveryStatus,
        paidAt: new Date(),
        deliveredAt: isFixed ? new Date() : null,
        userId: linkedUserId,
        downloadToken: receiptToken,
        downloadTokenExpiry,
      },
    });

    // Optional stock limit adjustment
    if (existingOrder.project.stockLimit && existingOrder.project.stockLimit > 0) {
      await prisma.project.update({
        where: { id: existingOrder.projectId },
        data: { stockLimit: { decrement: 1 } },
      }).catch(() => {});
    }

    // Trigger customer notification asynchronously
    const origin = new URL(request.url).origin;
    sendOrderConfirmationNotification({
      orderId: updatedOrder.orderId,
      studentName: updatedOrder.studentName,
      email: updatedOrder.email,
      projectName: updatedOrder.projectName,
      amount: updatedOrder.amount,
      downloadUrl: isFixed ? `${origin}/api/orders/download/${updatedOrder.orderId}?token=${receiptToken}` : undefined,
      receiptUrl: `${origin}/orders/confirmation/${updatedOrder.orderId}?token=${receiptToken}`,
    }).catch((err) => console.error('Notification dispatch error:', err));

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully!',
      order: updatedOrder,
      receiptToken,
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
