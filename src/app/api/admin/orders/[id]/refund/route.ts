import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { recordAdminAuditLog, safeErrorResponse } from '@/lib/security';
import { releaseStockReservation } from '@/lib/stock-reservation';

/**
 * Controlled refund & reconciliation workflow (ZAI-015, ZAI-087).
 * Records refund requests/reconciliations, revokes download access by rotating
 * receiptTokenVersion & clearing expiry, optionally restores project stock,
 * and logs an immutable AdminAuditLog entry.
 *
 * Production safety: Never triggers live Razorpay financial refunds without
 * explicit owner-approved gateway execution.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const requestedAmount = body.amount !== undefined ? Number(body.amount) : undefined;
    const restoreStock = body.restoreStock === true;
    const revokeAccess = body.revokeAccess !== false;
    const markProcessed = body.markProcessed === true;
    const razorpayRefundId = typeof body.razorpayRefundId === 'string' && body.razorpayRefundId.trim()
      ? body.razorpayRefundId.trim()
      : null;

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: 'A clear refund reason (at least 5 characters) is required for financial audit compliance.' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { project: true, refunds: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!['PAID', 'RECONCILIATION_REQUIRED'].includes(order.paymentStatus)) {
      return NextResponse.json(
        { error: `Cannot initiate refund for order in payment status "${order.paymentStatus}".` },
        { status: 400 }
      );
    }

    const alreadyRefunded = order.refunds
      .filter((r) => r.status === 'PROCESSED' || r.status === 'PROCESSING')
      .reduce((sum, r) => sum + r.amount, 0);

    const amount = requestedAmount ?? Math.max(0, order.amount - alreadyRefunded);
    if (!Number.isFinite(amount) || amount <= 0 || amount > order.amount - alreadyRefunded + 0.01) {
      return NextResponse.json(
        { error: `Invalid refund amount. Maximum refundable remaining is ${Math.max(0, order.amount - alreadyRefunded)}.` },
        { status: 400 }
      );
    }

    const isFullRefund = alreadyRefunded + amount >= order.amount - 0.01;
    const refundStatus = markProcessed ? 'PROCESSED' : 'REQUESTED';

    const result = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          orderId: order.orderId,
          razorpayRefundId,
          amount,
          currency: order.currency,
          status: refundStatus,
          reason,
          requestedBy: session.email,
          restoreStock,
          revokeAccess,
          notes: typeof body.notes === 'string' ? body.notes.slice(0, 1000) : null,
          processedAt: markProcessed ? new Date() : null,
        },
      });

      const orderUpdates: Record<string, unknown> = {
        reconciliationStatus: markProcessed ? 'RESOLVED' : 'REFUND_PENDING',
      };

      if (markProcessed && isFullRefund) {
        orderUpdates.paymentStatus = 'REFUNDED';
        orderUpdates.deliveryStatus = 'CANCELLED';
      }

      if (revokeAccess) {
        orderUpdates.downloadToken = null;
        orderUpdates.downloadTokenExpiry = null;
        orderUpdates.receiptTokenVersion = { increment: 1 };
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: orderUpdates,
      });

      if (restoreStock && order.project.stockLimit !== null && order.project.stockLimit !== undefined) {
        await tx.project.update({
          where: { id: order.projectId },
          data: { stockLimit: { increment: 1 } },
        });
      }

      return { refund, updatedOrder };
    });

    await releaseStockReservation(order.orderId, 'RELEASED');

    await recordAdminAuditLog({
      actor: session,
      action: markProcessed ? 'ORDER_REFUND_PROCESSED' : 'ORDER_REFUND_REQUESTED',
      resourceType: 'Order',
      resourceId: order.orderId,
      reason,
      metadata: {
        refundId: result.refund.id,
        razorpayRefundId,
        amount,
        isFullRefund,
        restoreStock,
        revokeAccess,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      refund: result.refund,
      order: result.updatedOrder,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to process refund record', 500, 'admin:orders:refund');
  }
}
