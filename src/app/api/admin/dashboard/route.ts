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
      totalProjects,
      availableProjects,
      featuredProjects,
      unavailableProjects,
      totalEnquiries,
      newEnquiries,
      totalOrders,
      paidOrders,
      refundedOrders,
      reconciliationOrders,
      paidOrdersAggregate,
      refundedOrdersAggregate,
      processedRefundsAggregate,
      failedNotifications,
      failedWebhooks,
      totalCustomers,
      recentOrders,
      recentEnquiries,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { available: true, published: true } }),
      prisma.project.count({ where: { available: true, published: true, featured: true } }),
      prisma.project.count({ where: { OR: [{ available: false }, { published: false }] } }),
      prisma.enquiry.count({ where: { archived: false } }),
      prisma.enquiry.count({ where: { status: 'NEW', archived: false } }),
      prisma.order.count(),
      prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      prisma.order.count({ where: { paymentStatus: 'REFUNDED' } }),
      prisma.order.count({
        where: {
          OR: [
            { paymentStatus: 'RECONCILIATION_REQUIRED' },
            { reconciliationStatus: { in: ['STOCK_CONFLICT', 'ASSET_MISSING'] } },
          ],
        },
      }),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.order.aggregate({
        where: { paymentStatus: 'REFUNDED' },
        _sum: { amount: true },
      }),
      prisma.refund.aggregate({
        where: { status: 'PROCESSED' },
        _sum: { amount: true },
      }),
      prisma.orderNotification.count({ where: { status: 'FAILED' } }),
      prisma.paymentWebhookEvent.count({ where: { status: 'FAILED' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderId: true,
          studentName: true,
          amount: true,
          projectName: true,
          paymentStatus: true,
          deliveryStatus: true,
          reconciliationStatus: true,
          createdAt: true,
        },
      }),
      prisma.enquiry.findMany({
        where: { archived: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          leadId: true,
          studentName: true,
          projectName: true,
          college: true,
          status: true,
          currentStage: true,
          createdAt: true,
        },
      }),
      prisma.adminAuditLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          actorEmail: true,
          action: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
        },
      }),
    ]);

    // ZAI-085: Clearly distinguish Gross Paid Sales, Refunded Total, and Net Paid Sales (pre-gateway-fee)
    const grossPaidSales = paidOrdersAggregate._sum.amount || 0;
    const refundedAmount = Math.max(
      refundedOrdersAggregate._sum.amount || 0,
      processedRefundsAggregate._sum.amount || 0
    );
    const netSalesBeforeFees = Math.max(0, grossPaidSales - refundedAmount);
    const envReport = validateEnvironment();

    return NextResponse.json({
      success: true,
      refreshedAt: new Date().toISOString(),
      stats: {
        totalProjects,
        availableProjects,
        featuredProjects,
        unavailableProjects,
        totalEnquiries,
        newEnquiries,
        totalOrders,
        paidOrders,
        refundedOrders,
        reconciliationOrders,
        totalCustomers,
        revenue: grossPaidSales, // Backward-compatible alias
        grossPaidSales,
        refundedAmount,
        netSalesBeforeFees,
        failedNotifications,
        failedWebhooks,
      },
      health: {
        readyForProduction: envReport.readyForProduction,
        razorpayMode: envReport.razorpayMode,
        missingEnvCount: envReport.missingRequired.length,
        warnings: envReport.warnings,
      },
      recentOrders,
      recentEnquiries,
      recentAuditLogs,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to load dashboard metrics', 500, 'admin:dashboard');
  }
}
