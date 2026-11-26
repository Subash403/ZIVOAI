import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  fetchAndValidateCapturedPaymentForOrder,
  fetchAndValidateRazorpayPayment,
  verifyRazorpayWebhookSignature,
} from '@/lib/razorpay';
import { fulfillVerifiedOrder } from '@/lib/payment-fulfillment';
import { releaseStockReservation } from '@/lib/stock-reservation';

interface RazorpayWebhookEvent {
  id?: string;
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    order?: { entity?: { id?: string } };
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } };
  };
}

export function getWebhookPaymentReference(event: RazorpayWebhookEvent): {
  orderId?: string;
  paymentId?: string;
  refundId?: string;
} {
  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;
  const refundEntity = event.payload?.refund?.entity;
  return {
    orderId: paymentEntity?.order_id || orderEntity?.id,
    paymentId: paymentEntity?.id || refundEntity?.payment_id,
    ...(refundEntity?.id ? { refundId: refundEntity.id } : {}),
  };
}

export async function recordFailedPayment(razorpayOrderId: string, razorpayPaymentId?: string) {
  const matching = await prisma.order.findMany({
    where: { razorpayOrderId, paymentStatus: 'CREATED' },
    select: { orderId: true },
  });

  const result = await prisma.order.updateMany({
    where: { razorpayOrderId, paymentStatus: 'CREATED' },
    data: { paymentStatus: 'FAILED', ...(razorpayPaymentId ? { razorpayPaymentId } : {}) },
  });

  for (const row of matching) {
    await releaseStockReservation(row.orderId, 'RELEASED');
  }

  return result;
}

async function claimWebhookEvent(
  eventKey: string,
  eventType: string,
  reference: ReturnType<typeof getWebhookPaymentReference>,
  payloadHash: string
) {
  const now = new Date();
  const stale = new Date(now.getTime() - 5 * 60 * 1000);
  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        eventKey,
        eventType,
        razorpayOrderId: reference.orderId,
        razorpayPaymentId: reference.paymentId,
        payloadHash,
        status: 'PROCESSING',
        attemptCount: 1,
        lockedAt: now,
      },
    });
    return true;
  } catch {
    const existing = await prisma.paymentWebhookEvent.findUnique({ where: { eventKey } });
    if (!existing || existing.status === 'PROCESSED' || existing.status === 'UNMATCHED') return false;
    if (existing.status === 'PROCESSING' && existing.lockedAt && existing.lockedAt > stale) return false;
    const claimed = await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventKey,
        status: { in: ['FAILED', 'PROCESSING'] },
        OR: [{ status: 'FAILED' }, { lockedAt: { lt: stale } }],
      },
      data: { status: 'PROCESSING', lockedAt: now, attemptCount: { increment: 1 }, lastError: null },
    });
    return claimed.count === 1;
  }
}

async function finishWebhookEvent(eventKey: string, status: 'PROCESSED' | 'UNMATCHED' | 'FAILED', error?: string) {
  await prisma.paymentWebhookEvent.updateMany({
    where: { eventKey, status: 'PROCESSING' },
    data: {
      status,
      lockedAt: null,
      processedAt: status === 'PROCESSED' ? new Date() : null,
      lastError: error?.slice(0, 500),
    },
  });
}

export async function POST(request: Request) {
  let eventKey = '';
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    if (!verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(rawBody) as RazorpayWebhookEvent;
    } catch {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const eventType = event.event || 'unknown';
    const reference = getWebhookPaymentReference(event);
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    eventKey = event.id || payloadHash;
    if (!(await claimWebhookEvent(eventKey, eventType, reference, payloadHash))) {
      return NextResponse.json({ success: true, message: 'Webhook already being processed or completed' });
    }

    if (eventType === 'payment.failed') {
      if (!reference.orderId) {
        await finishWebhookEvent(eventKey, 'UNMATCHED', 'Payment failure did not contain a Razorpay order ID');
        return NextResponse.json({ success: true, message: 'Unmatched payment failure recorded' });
      }
      const result = await recordFailedPayment(reference.orderId, reference.paymentId);
      if (result.count === 0) {
        const order = await prisma.order.findFirst({ where: { razorpayOrderId: reference.orderId } });
        if (!order) {
          await finishWebhookEvent(eventKey, 'UNMATCHED', 'Razorpay order was not found');
          return NextResponse.json({ success: true, message: 'Unmatched payment failure recorded' });
        }
      }
      await finishWebhookEvent(eventKey, 'PROCESSED');
      return NextResponse.json({ success: true, message: 'Payment failure recorded' });
    }

    // ZAI-015: Reconcile Razorpay refund webhooks cleanly and revoke download access
    if (eventType === 'refund.processed' || eventType === 'refund.created') {
      const refundEntity = event.payload?.refund?.entity;
      const paymentId = reference.paymentId;
      if (!paymentId) {
        await finishWebhookEvent(eventKey, 'UNMATCHED', 'Refund event missing payment ID');
        return NextResponse.json({ success: true, message: 'Unmatched refund event recorded' });
      }

      const order = await prisma.order.findFirst({ where: { razorpayPaymentId: paymentId } });
      if (!order) {
        await finishWebhookEvent(eventKey, 'UNMATCHED', 'No order matches refunded payment ID');
        return NextResponse.json({ success: true, message: 'Unmatched refund event recorded' });
      }

      const refundStatus = eventType === 'refund.processed' ? 'PROCESSED' : 'PROCESSING';
      const refundAmount = refundEntity?.amount ? Number(refundEntity.amount) / 100 : order.amount;

      await prisma.$transaction(async (tx) => {
        if (refundEntity?.id) {
          await tx.refund.upsert({
            where: { razorpayRefundId: refundEntity.id },
            create: {
              orderId: order.orderId,
              razorpayRefundId: refundEntity.id,
              amount: refundAmount,
              currency: order.currency,
              status: refundStatus,
              reason: 'Reconciled via Razorpay webhook',
              requestedBy: 'razorpay-webhook',
              revokeAccess: true,
              processedAt: refundStatus === 'PROCESSED' ? new Date() : null,
            },
            update: {
              status: refundStatus,
              processedAt: refundStatus === 'PROCESSED' ? new Date() : undefined,
            },
          });
        }

        if (refundStatus === 'PROCESSED') {
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'REFUNDED',
              deliveryStatus: 'CANCELLED',
              reconciliationStatus: 'RESOLVED',
              downloadToken: null,
              downloadTokenExpiry: null,
              receiptTokenVersion: { increment: 1 },
            },
          });
        }
      });

      await finishWebhookEvent(eventKey, 'PROCESSED');
      return NextResponse.json({ success: true, message: 'Refund webhook reconciled' });
    }

    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      await finishWebhookEvent(eventKey, 'UNMATCHED', 'Unsupported webhook event type');
      return NextResponse.json({ success: true, message: 'Webhook recorded as unsupported' });
    }

    if (!reference.orderId) {
      await finishWebhookEvent(eventKey, 'UNMATCHED', 'Payment event did not contain a Razorpay order ID');
      return NextResponse.json({ success: true, message: 'Unmatched payment event recorded' });
    }

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: reference.orderId },
      include: { project: true },
    });
    if (!order) {
      await finishWebhookEvent(eventKey, 'UNMATCHED', 'Razorpay order was not found');
      return NextResponse.json({ success: true, message: 'Unmatched payment event recorded' });
    }

    const payment = reference.paymentId
      ? await fetchAndValidateRazorpayPayment({
          paymentId: reference.paymentId,
          expectedOrderId: order.razorpayOrderId!,
          expectedAmount: order.amount,
          expectedCurrency: order.currency,
        })
      : await fetchAndValidateCapturedPaymentForOrder({
          orderId: order.razorpayOrderId!,
          expectedAmount: order.amount,
          expectedCurrency: order.currency,
        });
    if (!payment?.id) {
      await finishWebhookEvent(eventKey, 'FAILED', 'Provider payment could not be validated as captured');
      return NextResponse.json({ error: 'Captured payment could not be verified' }, { status: 502 });
    }

    const updatedOrder = await fulfillVerifiedOrder({
      internalOrderId: order.orderId,
      razorpayPaymentId: payment.id,
      origin: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin,
    });
    await finishWebhookEvent(eventKey, 'PROCESSED');
    return NextResponse.json({
      success: true,
      message: updatedOrder.paymentStatus === 'PAID' ? 'Order fulfilled via webhook' : 'Webhook processed',
    });
  } catch (error: unknown) {
    if (eventKey) {
      await finishWebhookEvent(
        eventKey,
        'FAILED',
        error instanceof Error ? error.message : 'Webhook processing error'
      ).catch(() => {});
    }
    console.error('Webhook processing error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
