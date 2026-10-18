import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

const ALLOWED_DELIVERY_STATUSES = ['PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { deliveryStatus, adminNotes } = body;

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
        updateData.deliveredAt = new Date();
      }
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = typeof adminNotes === 'string' ? adminNotes : null;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update order';
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

