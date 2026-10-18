import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
              { college: { contains: search } },
              { department: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        college: true,
        department: true,
        year: true,
        googleId: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        orders: {
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
          select: {
            id: true,
            leadId: true,
            currentStage: true,
            createdAt: true,
          },
        },
      },
    });

    const customers = users.map((u) => {
      const paidOrders = u.orders.filter((o) => o.paymentStatus === 'PAID');
      const totalSpent = paidOrders.reduce((sum, o) => sum + o.amount, 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
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
      totalCount: customers.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customer accounts' }, { status: 500 });
  }
}
