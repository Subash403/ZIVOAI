import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const STOCK_RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class StockUnavailableError extends Error {
  constructor(message = 'This project has reached its purchase/order limit or all remaining units are currently reserved in checkout.') {
    super(message);
    this.name = 'StockUnavailableError';
  }
}

export async function expireStaleReservations(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
  projectId?: string
): Promise<number> {
  const now = new Date();
  const result = await tx.stockReservation.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: now },
      ...(projectId ? { projectId } : {}),
    },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}

/**
 * Atomically reserves 1 unit of stock for an order inside an existing transaction.
 * Prevents two concurrent buyers from both creating checkouts for the final unit (ZAI-009).
 */
export async function reserveStockInTransaction(
  tx: Prisma.TransactionClient,
  params: { orderId: string; projectId: string; ttlMs?: number }
): Promise<{ reserved: boolean; expiresAt?: Date }> {
  const project = await tx.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, stockLimit: true, available: true, published: true },
  });

  if (!project || !project.published || !project.available) {
    throw new StockUnavailableError('This project is no longer available for purchase.');
  }

  if (project.stockLimit === null || project.stockLimit === undefined) {
    return { reserved: false };
  }

  await expireStaleReservations(tx, params.projectId);

  const activeReservations = await tx.stockReservation.count({
    where: {
      projectId: params.projectId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
  });

  const remainingAvailable = project.stockLimit - activeReservations;
  if (remainingAvailable <= 0) {
    throw new StockUnavailableError();
  }

  const expiresAt = new Date(Date.now() + (params.ttlMs ?? STOCK_RESERVATION_TTL_MS));
  await tx.stockReservation.create({
    data: {
      orderId: params.orderId,
      projectId: params.projectId,
      quantity: 1,
      status: 'ACTIVE',
      expiresAt,
    },
  });

  return { reserved: true, expiresAt };
}

export async function releaseStockReservation(
  orderId: string,
  nextStatus: 'RELEASED' | 'EXPIRED' = 'RELEASED'
): Promise<void> {
  await prisma.stockReservation
    .updateMany({
      where: { orderId, status: 'ACTIVE' },
      data: { status: nextStatus },
    })
    .catch(() => {});
}
