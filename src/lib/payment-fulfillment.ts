import { prisma } from '@/lib/prisma';
import { createReceiptToken } from '@/lib/auth';
import { sendOrderConfirmationNotification } from '@/lib/notifications';

const DOWNLOAD_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const NOTIFICATION_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export interface FulfillVerifiedOrderParams {
  internalOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  userId?: string;
  origin: string;
}

export async function fulfillVerifiedOrder({
  internalOrderId,
  razorpayPaymentId,
  razorpaySignature,
  userId,
  origin,
}: FulfillVerifiedOrderParams) {
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderId: internalOrderId },
      include: { project: true },
    });

    if (!order) throw new Error('Order record not found');
    if (order.paymentStatus === 'CANCELLED' || order.paymentStatus === 'REFUNDED') {
      throw new Error('Order is no longer valid for payment processing.');
    }
    if (order.paymentStatus === 'PAID') {
      await tx.orderNotification.upsert({ where: { orderId: order.orderId }, create: { orderId: order.orderId }, update: {} });
      return { order, transitioned: false };
    }

    const isFixed = order.project.salesType === 'fixed';
    const now = new Date();
    const receiptToken = createReceiptToken(order.orderId);
    const updated = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: { in: ['CREATED', 'FAILED'] },
      },
      data: {
        ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
        ...(razorpaySignature ? { razorpaySignature } : {}),
        paymentStatus: 'PAID',
        deliveryStatus: isFixed ? 'DELIVERED' : 'PENDING',
        paidAt: now,
        deliveredAt: isFixed ? now : null,
        ...(userId ? { userId } : {}),
        downloadToken: receiptToken,
        downloadTokenExpiry: new Date(now.getTime() + DOWNLOAD_TOKEN_LIFETIME_MS),
      },
    });

    if (updated.count === 0) {
      const current = await tx.order.findUnique({ where: { id: order.id }, include: { project: true } });
      if (!current) throw new Error('Order record not found');
      if (current.paymentStatus === 'PAID') return { order: current, transitioned: false };
      if (current.paymentStatus === 'CANCELLED' || current.paymentStatus === 'REFUNDED') {
        throw new Error('Order is no longer valid for payment processing.');
      }
      throw new Error('Order could not be transitioned to paid safely.');
    }

    if (order.project.stockLimit !== null && order.project.stockLimit !== undefined) {
      const stock = await tx.project.updateMany({
        where: { id: order.projectId, stockLimit: { gt: 0 } },
        data: { stockLimit: { decrement: 1 } },
      });
      if (stock.count !== 1) {
        throw new Error('Project stock is no longer available; payment requires reconciliation.');
      }
    }

    await tx.orderNotification.upsert({
      where: { orderId: order.orderId },
      create: { orderId: order.orderId },
      update: {},
    });

    const fulfilledOrder = await tx.order.findUnique({ where: { id: order.id }, include: { project: true } });
    if (!fulfilledOrder) throw new Error('Order record not found after fulfillment');
    return { order: fulfilledOrder, transitioned: true };
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Project stock is no longer available')) {
      await prisma.order.updateMany({
        where: { orderId: internalOrderId, paymentStatus: { in: ['CREATED', 'FAILED'] } },
        data: {
          deliveryStatus: 'FAILED',
          adminNotes: 'Payment was captured but stock allocation failed; refund or reconciliation is required.',
          ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
        },
      });
    }
    throw error;
  }

  await processOrderNotification(result.order.orderId, origin);
  return result.order;
}

type NotificationOrder = {
  id: string;
  orderId: string;
  studentName: string;
  email: string;
  projectName: string;
  amount: number;
  project: { salesType: string };
};

export async function processOrderNotification(orderId: string, origin: string) {
  const now = new Date();
  const staleLock = new Date(now.getTime() - NOTIFICATION_LOCK_TIMEOUT_MS);
  const outbox = await prisma.orderNotification.findUnique({ where: { orderId } });
  if (!outbox) return false;

  const claim = await prisma.orderNotification.updateMany({
    where: {
      orderId,
      OR: [
        { status: { in: ['PENDING', 'FAILED'] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        { status: 'PROCESSING', lockedAt: { lt: staleLock } },
      ],
    },
    data: { status: 'PROCESSING', lockedAt: now, attemptCount: { increment: 1 } },
  });
  if (claim.count !== 1) return false;

  const order = await prisma.order.findUnique({ where: { orderId }, include: { project: true } }) as NotificationOrder | null;
  if (!order) return false;

  const receiptToken = createReceiptToken(order.orderId);
  try {
    const sent = await sendOrderConfirmationNotification({
      orderId: order.orderId,
      studentName: order.studentName,
      email: order.email,
      projectName: order.projectName,
      amount: order.amount,
      downloadUrl:
        order.project.salesType === 'fixed'
          ? `${origin}/api/orders/download/${order.orderId}?token=${receiptToken}`
          : undefined,
      receiptUrl: `${origin}/orders/confirmation/${order.orderId}?token=${receiptToken}`,
    });
    if (!sent) throw new Error('Notification provider rejected the message');
    await prisma.orderNotification.updateMany({ where: { orderId, status: 'PROCESSING' }, data: { status: 'SENT', lockedAt: null, lastError: null, nextAttemptAt: null } });
    return true;
  } catch (error: unknown) {
    const attempt = outbox.attemptCount + 1;
    const delay = Math.min(60 * 60 * 1000, 2 ** Math.min(attempt, 10) * 1000);
    await prisma.orderNotification.updateMany({
      where: { orderId, status: 'PROCESSING' },
      data: {
        status: 'FAILED',
        lockedAt: null,
        nextAttemptAt: new Date(Date.now() + delay),
        lastError: error instanceof Error ? error.message.slice(0, 500) : 'Notification failed',
      },
    });
    return false;
  }
}
