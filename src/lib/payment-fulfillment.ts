import { prisma } from '@/lib/prisma';
import { createTimedReceiptToken } from '@/lib/auth';
import { dispatchOrderConfirmationEmail } from '@/lib/notifications';
import { privateAssetExists } from '@/lib/storage';
import { expireStaleReservations, releaseStockReservation } from '@/lib/stock-reservation';

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
  // Preflight check for private deliverable existence before marking ready (ZAI-020)
  const preflightOrder = await prisma.order.findUnique({
    where: { orderId: internalOrderId },
    include: { project: true },
  });

  if (!preflightOrder) {
    throw new Error('Order record not found');
  }

  const isFixed = preflightOrder.project.salesType === 'fixed';
  const assetExists =
    isFixed && preflightOrder.project.downloadFileUrl
      ? await privateAssetExists(preflightOrder.project.downloadFileUrl)
      : false;

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
        await tx.orderNotification.upsert({
          where: { orderId: order.orderId },
          create: { orderId: order.orderId },
          update: {},
        });
        return { order, transitioned: false };
      }

      const now = new Date();
      const timedToken = createTimedReceiptToken(order.orderId, {
        expiresInMs: DOWNLOAD_TOKEN_LIFETIME_MS,
        version: order.receiptTokenVersion,
      });

      // ZAI-014 & ZAI-020: Separate ASSET_READY from DELIVERED (customer actually downloaded).
      // If a deliverable path is configured but missing in storage -> FAILED + ASSET_MISSING alert.
      // If no deliverable path has been attached yet -> PENDING + ASSET_MISSING alert.
      const hasConfiguredAssetPath = Boolean(order.project.downloadFileUrl);
      const nextDeliveryStatus = !isFixed
        ? 'PENDING'
        : assetExists
        ? 'ASSET_READY'
        : hasConfiguredAssetPath
        ? 'FAILED'
        : 'PENDING';
      const nextReconciliationStatus = isFixed && !assetExists ? 'ASSET_MISSING' : 'NONE';
      const missingAssetNote =
        isFixed && !assetExists
          ? 'ALERT: Payment captured, but the project deliverable file is missing from private storage. Upload asset and retry delivery.'
          : undefined;

      const updated = await tx.order.updateMany({
        where: {
          id: order.id,
          paymentStatus: { in: ['CREATED', 'FAILED', 'RECONCILIATION_REQUIRED'] },
        },
        data: {
          ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
          ...(razorpaySignature ? { razorpaySignature } : {}),
          paymentStatus: 'PAID',
          deliveryStatus: nextDeliveryStatus,
          reconciliationStatus: nextReconciliationStatus,
          paidAt: now,
          ...(missingAssetNote ? { adminNotes: missingAssetNote } : {}),
          ...(userId ? { userId } : {}),
          downloadToken: timedToken,
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
        await tx.stockReservation.updateMany({
          where: { orderId: order.orderId, status: 'ACTIVE' },
          data: { status: 'CONSUMED' },
        });
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
      // ZAI-010: Captured payment with failed stock allocation enters explicit RECONCILIATION_REQUIRED state
      await releaseStockReservation(internalOrderId, 'RELEASED');
      await prisma.order.updateMany({
        where: { orderId: internalOrderId, paymentStatus: { in: ['CREATED', 'FAILED'] } },
        data: {
          paymentStatus: 'RECONCILIATION_REQUIRED',
          deliveryStatus: 'FAILED',
          reconciliationStatus: 'STOCK_CONFLICT',
          adminNotes:
            'CRITICAL RECONCILIATION REQUIRED: Razorpay payment was captured, but stock allocation failed (0 units left). Initiate refund or allocate stock manually.',
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
  downloadToken: string | null;
  receiptTokenVersion: number;
  deliveryStatus: string;
  project: { salesType: string; downloadFileUrl: string | null };
};

export async function processOrderNotification(orderId: string, origin: string): Promise<boolean> {
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

  const order = (await prisma.order.findUnique({
    where: { orderId },
    include: { project: true },
  })) as NotificationOrder | null;
  if (!order) return false;

  const isFixed = order.project.salesType === 'fixed';
  // ZAI-020: Verify private asset exists before sending download-ready link
  const assetAvailable =
    isFixed && order.project.downloadFileUrl
      ? await privateAssetExists(order.project.downloadFileUrl)
      : false;

  const receiptToken =
    order.downloadToken ||
    createTimedReceiptToken(order.orderId, {
      expiresInMs: DOWNLOAD_TOKEN_LIFETIME_MS,
      version: order.receiptTokenVersion,
    });

  try {
    const dispatchResult = await dispatchOrderConfirmationEmail({
      orderId: order.orderId,
      studentName: order.studentName,
      email: order.email,
      projectName: order.projectName,
      amount: order.amount,
      assetAvailable,
      downloadUrl:
        isFixed && assetAvailable
          ? `${origin}/api/orders/download/${encodeURIComponent(order.orderId)}?token=${encodeURIComponent(receiptToken)}`
          : undefined,
      receiptUrl: `${origin}/orders/confirmation/${encodeURIComponent(order.orderId)}?token=${encodeURIComponent(receiptToken)}`,
      dashboardUrl: `${origin}/account`,
    });

    if (!dispatchResult.ok) {
      throw new Error(dispatchResult.error || 'Notification provider rejected the message');
    }

    // ZAI-024: Distinguish SENT vs SIMULATED in outbox truthfully
    const nextOutboxStatus = dispatchResult.status === 'SENT' ? 'SENT' : 'SIMULATED';

    await prisma.orderNotification.updateMany({
      where: { orderId, status: 'PROCESSING' },
      data: {
        status: nextOutboxStatus,
        lockedAt: null,
        lastError: null,
        nextAttemptAt: null,
      },
    });
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

/**
 * Processes due failed/pending order notifications and expires stale stock reservations (ZAI-026).
 */
export async function processDueOrderNotifications(origin: string, limit = 25) {
  const now = new Date();
  const staleLock = new Date(now.getTime() - NOTIFICATION_LOCK_TIMEOUT_MS);

  const expiredReservations = await expireStaleReservations();

  const due = await prisma.orderNotification.findMany({
    where: {
      attemptCount: { lt: 10 },
      OR: [
        { status: { in: ['PENDING', 'FAILED'] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        { status: 'PROCESSING', lockedAt: { lt: staleLock } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: 'asc' },
  });

  let succeeded = 0;
  let failed = 0;
  for (const item of due) {
    const ok = await processOrderNotification(item.orderId, origin);
    if (ok) succeeded++;
    else failed++;
  }

  return {
    scanned: due.length,
    succeeded,
    failed,
    expiredReservations,
  };
}
