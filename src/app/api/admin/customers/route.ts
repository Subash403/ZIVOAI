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
    const search = searchParams.get('search')?.trim() || '';
    const roleParam = searchParams.get('role')?.toUpperCase() || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));

    const whereClause: Prisma.UserWhereInput = {};
    if (roleParam === 'CUSTOMER' || roleParam === 'ADMIN') {
      whereClause.role = roleParam;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { college: { contains: search } },
        { department: { contains: search } },
      ];
    }

    // ZAI-089: Server-side role filtering + pagination so large customer tables remain bounded
    const [users, totalCount, totalCustomersCount, paidOrdersAggregate] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          phone: true,
          college: true,
          department: true,
          year: true,
          googleId: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          orders: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              orderId: true,
              amount: true,
              paymentStatus: true,
              deliveryStatus: true,
              createdAt: true,
            },
          },
          enquiries: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              leadId: true,
              currentStage: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const customers = users.map((u) => {
      const paidOrders = u.orders.filter((o) => o.paymentStatus === 'PAID');
      const totalSpent = paidOrders.reduce((sum, o) => sum + o.amount, 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        emailVerified: u.emailVerified,
        phone: u.phone,
        college: u.college,
        department: u.department,
        year: u.year,
        authType: u.googleId ? 'Google OAuth' : 'Email/Password',
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        totalOrdersCount: u.orders.length,
        paidOrdersCount: paidOrders.length,
        totalSpent,
        customProjectsCount: u.enquiries.length,
        recentOrders: u.orders.slice(0, 3),
        recentEnquiries: u.enquiries.slice(0, 3),
      };
    });

    return NextResponse.json({
      success: true,
      customers,
      totalCount,
      summary: {
        totalAccounts: totalCount,
        totalCustomers: totalCustomersCount,
        grossPaidSpend: paidOrdersAggregate._sum.amount || 0,
      },
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch customer accounts', 500, 'admin:customers');
  }
}
