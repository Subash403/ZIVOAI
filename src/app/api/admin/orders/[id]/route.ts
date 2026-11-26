import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { recordAdminAuditLog, safeErrorResponse } from '@/lib/security';

const ALLOWED_DELIVERY_STATUSES = ['PENDING', 'ASSET_READY', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED'];

export async function PUT(
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
    const { deliveryStatus, adminNotes, reconciliationStatus, resetDownloadLimit } = body;

    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: Prisma.OrderUpdateInput = {};
    if (deliveryStatus) {
      if (!ALLOWED_DELIVERY_STATUSES.includes(deliveryStatus)) {
        return NextResponse.json(
          { error: `Invalid delivery status. Must be one of: ${ALLOWED_DELIVERY_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'DELIVERED') {
        updateData.deliveredAt = existingOrder.deliveredAt || new Date();
      }
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = typeof adminNotes === 'string' ? adminNotes.slice(0, 2000) : null;
    }
    if (reconciliationStatus && ['NONE', 'STOCK_CONFLICT', 'ASSET_MISSING', 'REFUND_PENDING', 'RESOLVED'].includes(reconciliationStatus)) {
      updateData.reconciliationStatus = reconciliationStatus;
    }
    if (resetDownloadLimit === true) {
      updateData.downloadLimit = existingOrder.downloadLimit + 3;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    await recordAdminAuditLog({
      actor: session,
      action: 'ORDER_UPDATE',
      resourceType: 'Order',
      resourceId: updatedOrder.orderId,
      metadata: {
        previousDeliveryStatus: existingOrder.deliveryStatus,
        nextDeliveryStatus: updatedOrder.deliveryStatus,
        reconciliationStatus: updatedOrder.reconciliationStatus,
        resetDownloadLimit: Boolean(resetDownloadLimit),
      },
      request,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to update order', 500, 'admin:orders:PUT');
  }
}
