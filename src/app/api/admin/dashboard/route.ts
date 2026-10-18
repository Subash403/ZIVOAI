import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAdminSession();
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
      paidOrdersAggregate,
      totalCustomers,
      recentOrders,
      recentEnquiries,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { available: true } }),
      prisma.project.count({ where: { available: true, featured: true } }),
      prisma.project.count({ where: { available: false } }),
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: 'NEW' } }),
      prisma.order.count(),
      prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.enquiry.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const revenue = paidOrdersAggregate._sum.amount || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalProjects,
        availableProjects,
        featuredProjects,
        unavailableProjects,
        totalEnquiries,
        newEnquiries,
        totalOrders,
        paidOrders,
        totalCustomers,
        revenue,
      },
      recentOrders,
      recentEnquiries,
    });
  } catch (error: unknown) {
    console.error('Error loading dashboard metrics:', error);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
}

