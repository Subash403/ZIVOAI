import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { createReceiptToken } from '@/lib/auth';
import { sendOrderConfirmationNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!webhookSecret) {
      console.warn('Razorpay webhook secret not configured. Skipping webhook execution.');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    // Verify cryptographic signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid Razorpay webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    // Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (!razorpayOrderId) {
        return NextResponse.json({ message: 'No order ID in payment payload' }, { status: 200 });
      }

      const order = await prisma.order.findFirst({
        where: { razorpayOrderId },
        include: { project: true },
      });

      if (!order) {
        console.warn(`Webhook received for unknown Razorpay Order ID: ${razorpayOrderId}`);
        return NextResponse.json({ message: 'Order not found in database' }, { status: 200 });
      }

      // Idempotency: If already fulfilled, return 200 immediately
      if (order.paymentStatus === 'PAID') {
        return NextResponse.json({ message: 'Order already fulfilled (idempotent)' }, { status: 200 });
      }

      const receiptToken = createReceiptToken(order.orderId);
      const isFixed = order.project.salesType === 'fixed';
      const downloadTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
          paymentStatus: 'PAID',
          deliveryStatus: isFixed ? 'DELIVERED' : 'PENDING',
          paidAt: new Date(),
          deliveredAt: isFixed ? new Date() : null,
          downloadToken: receiptToken,
          downloadTokenExpiry,
        },
      });

      // Stock adjustment
      if (order.project.stockLimit && order.project.stockLimit > 0) {
        await prisma.project.update({
          where: { id: order.projectId },
          data: { stockLimit: { decrement: 1 } },
        }).catch(() => {});
      }

      // Send customer delivery email
      const origin = process.env.NEXTAUTH_URL || 'https://zivo.ai';
      sendOrderConfirmationNotification({
        orderId: updatedOrder.orderId,
        studentName: updatedOrder.studentName,
        email: updatedOrder.email,
        projectName: updatedOrder.projectName,
        amount: updatedOrder.amount,
        downloadUrl: isFixed ? `${origin}/api/orders/download/${updatedOrder.orderId}?token=${receiptToken}` : undefined,
        receiptUrl: `${origin}/orders/confirmation/${updatedOrder.orderId}?token=${receiptToken}`,
      }).catch((err) => console.error('Webhook notification dispatch error:', err));

      return NextResponse.json({ success: true, message: 'Order fulfilled via webhook' });
    }

    return NextResponse.json({ message: `Unhandled event type: ${eventType}` }, { status: 200 });
  } catch (err: unknown) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
