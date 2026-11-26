import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { safeErrorResponse } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const reconciliationOnly = searchParams.get('reconciliation') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10) || 25));

    const whereClause: Prisma.OrderWhereInput = {};

    if (status && status !== 'ALL') {
      whereClause.paymentStatus = status;
    }

    if (reconciliationOnly) {
      whereClause.OR = [
        { paymentStatus: 'RECONCILIATION_REQUIRED' },
        { reconciliationStatus: { in: ['STOCK_CONFLICT', 'ASSET_MISSING'] } },
      ];
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        const parsedFrom = new Date(dateFrom);
        if (!Number.isNaN(parsedFrom.getTime())) {
          whereClause.createdAt.gte = parsedFrom;
        }
      }
      if (dateTo) {
        const parsedTo = new Date(dateTo);
        if (!Number.isNaN(parsedTo.getTime())) {
          parsedTo.setHours(23, 59, 59, 999);
          whereClause.createdAt.lte = parsedTo;
        }
      }
    }

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { orderId: { contains: search } },
            { studentName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { projectName: { contains: search } },
            { razorpayOrderId: { contains: search } },
            { razorpayPaymentId: { contains: search } },
          ],
        },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          notification: {
            select: {
              status: true,
              attemptCount: true,
              lastError: true,
              updatedAt: true,
            },
          },
          refunds: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              razorpayRefundId: true,
              amount: true,
              status: true,
              reason: true,
              processedAt: true,
              createdAt: true,
            },
          },
          _count: {
            select: { downloadLogs: true },
          },
        },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch orders', 500, 'orders:GET');
  }
}
