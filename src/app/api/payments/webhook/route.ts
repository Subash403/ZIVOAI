import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  fetchAndValidateCapturedPaymentForOrder,
  fetchAndValidateRazorpayPayment,
  verifyRazorpayWebhookSignature,
} from '@/lib/razorpay';
import { fulfillVerifiedOrder } from '@/lib/payment-fulfillment';

interface RazorpayWebhookEvent {
  id?: string;
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    order?: { entity?: { id?: string } };
  };
}

export function getWebhookPaymentReference(event: RazorpayWebhookEvent): {
  orderId?: string;
  paymentId?: string;
} {
  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;
  return { orderId: paymentEntity?.order_id || orderEntity?.id, paymentId: paymentEntity?.id };
}

export async function recordFailedPayment(razorpayOrderId: string, razorpayPaymentId?: string) {
  return prisma.order.updateMany({
    where: { razorpayOrderId, paymentStatus: 'CREATED' },
    data: { paymentStatus: 'FAILED', ...(razorpayPaymentId ? { razorpayPaymentId } : {}) },
  });
}

async function claimWebhookEvent(eventKey: string, eventType: string, reference: ReturnType<typeof getWebhookPaymentReference>, payloadHash: string) {
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
      where: { eventKey, status: { in: ['FAILED', 'PROCESSING'] }, OR: [{ status: 'FAILED' }, { lockedAt: { lt: stale } }] },
      data: { status: 'PROCESSING', lockedAt: now, attemptCount: { increment: 1 }, lastError: null },
    });
    return claimed.count === 1;
  }
}

async function finishWebhookEvent(eventKey: string, status: 'PROCESSED' | 'UNMATCHED' | 'FAILED', error?: string) {
  await prisma.paymentWebhookEvent.updateMany({
    where: { eventKey, status: 'PROCESSING' },
    data: { status, lockedAt: null, processedAt: status === 'PROCESSED' ? new Date() : null, lastError: error?.slice(0, 500) },
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

    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      await finishWebhookEvent(eventKey, 'UNMATCHED', 'Unsupported webhook event type');
      return NextResponse.json({ success: true, message: 'Webhook recorded as unsupported' });
    }

    if (!reference.orderId) {
      await finishWebhookEvent(eventKey, 'UNMATCHED', 'Payment event did not contain a Razorpay order ID');
      return NextResponse.json({ success: true, message: 'Unmatched payment event recorded' });
    }

    const order = await prisma.order.findFirst({ where: { razorpayOrderId: reference.orderId }, include: { project: true } });
    if (!order) {
      await finishWebhookEvent(eventKey, 'UNMATCHED', 'Razorpay order was not found');
      return NextResponse.json({ success: true, message: 'Unmatched payment event recorded' });
    }

    const payment = reference.paymentId
      ? await fetchAndValidateRazorpayPayment({ paymentId: reference.paymentId, expectedOrderId: order.razorpayOrderId!, expectedAmount: order.amount, expectedCurrency: order.currency })
      : await fetchAndValidateCapturedPaymentForOrder({ orderId: order.razorpayOrderId!, expectedAmount: order.amount, expectedCurrency: order.currency });
    if (!payment?.id) {
      await finishWebhookEvent(eventKey, 'FAILED', 'Provider payment could not be validated as captured');
      return NextResponse.json({ error: 'Captured payment could not be verified' }, { status: 502 });
    }

    const updatedOrder = await fulfillVerifiedOrder({
      internalOrderId: order.orderId,
      razorpayPaymentId: payment.id,
      origin: process.env.NEXTAUTH_URL || new URL(request.url).origin,
    });
    await finishWebhookEvent(eventKey, 'PROCESSED');
    return NextResponse.json({ success: true, message: updatedOrder.paymentStatus === 'PAID' ? 'Order fulfilled via webhook' : 'Webhook processed' });
  } catch (error: unknown) {
    if (eventKey) await finishWebhookEvent(eventKey, 'FAILED', error instanceof Error ? error.message : 'Webhook processing error').catch(() => {});
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
