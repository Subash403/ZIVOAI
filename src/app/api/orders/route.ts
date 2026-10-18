import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const whereClause: Prisma.OrderWhereInput = {};

    if (status && status !== 'ALL') {
      whereClause.paymentStatus = status;
    }

    if (search) {
      whereClause.OR = [
        { orderId: { contains: search } },
        { studentName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { projectName: { contains: search } },
        { razorpayOrderId: { contains: search } },
        { razorpayPaymentId: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

