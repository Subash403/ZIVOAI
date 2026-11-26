import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { safeErrorResponse, validateEnvironment } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const [
      reconciliationOrders,
      failedOutbox,
      pendingOutbox,
      failedWebhooks,
      activeReservations,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          OR: [
            { paymentStatus: 'RECONCILIATION_REQUIRED' },
            { reconciliationStatus: { in: ['STOCK_CONFLICT', 'ASSET_MISSING'] } },
          ],
        },
      }),
      prisma.orderNotification.count({ where: { status: 'FAILED' } }),
      prisma.orderNotification.count({ where: { status: 'PENDING' } }),
      prisma.paymentWebhookEvent.count({ where: { status: 'FAILED' } }),
      prisma.stockReservation.count({ where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
      prisma.adminAuditLog.findMany({
        take: 25,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const env = validateEnvironment();

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      environment: env,
      alerts: {
        reconciliationOrders,
        failedOutbox,
        pendingOutbox,
        failedWebhooks,
        activeReservations,
      },
      recentAuditLogs,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to load operational health report', 500, 'admin:health');
  }
}
