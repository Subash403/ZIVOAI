import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { processOrderNotification } from '@/lib/payment-fulfillment';
import { recordAdminAuditLog, safeErrorResponse } from '@/lib/security';

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
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderId: id }] },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus !== 'PAID') {
      return NextResponse.json(
        { error: 'Confirmation email can only be resent for verified PAID orders.' },
        { status: 400 }
      );
    }

    // Reset outbox item so retry executes immediately and safely
    await prisma.orderNotification.upsert({
      where: { orderId: order.orderId },
      create: { orderId: order.orderId, status: 'PENDING', nextAttemptAt: null, lockedAt: null },
      update: { status: 'PENDING', nextAttemptAt: null, lockedAt: null, lastError: null },
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin;
    const ok = await processOrderNotification(order.orderId, origin);
    const outbox = await prisma.orderNotification.findUnique({ where: { orderId: order.orderId } });

    await recordAdminAuditLog({
      actor: session,
      action: 'ORDER_EMAIL_RESEND',
      resourceType: 'Order',
      resourceId: order.orderId,
      metadata: { dispatched: ok, outboxStatus: outbox?.status },
      request,
    });

    return NextResponse.json({
      success: ok,
      status: outbox?.status || (ok ? 'SENT' : 'FAILED'),
      lastError: outbox?.lastError || null,
      message:
        outbox?.status === 'SENT'
          ? 'Confirmation email dispatched via SMTP.'
          : outbox?.status === 'SIMULATED'
          ? 'Email simulated in non-production environment (SMTP not configured).'
          : outbox?.lastError || 'Email dispatch failed; check SMTP configuration.',
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to resend order email', 500, 'admin:orders:resend-email');
  }
}
