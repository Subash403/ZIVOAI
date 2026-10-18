import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession, createReceiptToken } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find orders either linked by userId or matching the verified user email
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { email: session.email.toLowerCase() },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            mainImage: true,
            salesType: true,
            downloadFileName: true,
          },
        },
      },
    });

    // Find custom project enquiries linked to customer
    const customProjects = await prisma.enquiry.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { email: session.email.toLowerCase() },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        timeline: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            stage: true,
            statusMessage: true,
            estimatedDate: true,
            createdAt: true,
          },
        },
      },
    });

    const ordersWithReceiptTokens = orders.map((order) => {
      const receiptToken = createReceiptToken(order.orderId);
      return {
        id: order.id,
        orderId: order.orderId,
        studentName: order.studentName,
        email: order.email,
        phone: order.phone,
        college: order.college,
        department: order.department,
        year: order.year,
        projectName: order.projectName,
        amount: order.amount,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        paidAt: order.paidAt,
        deliveredAt: order.deliveredAt,
        downloadToken: order.downloadToken,
        downloadCount: order.downloadCount,
        downloadLimit: order.downloadLimit,
        createdAt: order.createdAt,
        receiptToken,
        project: order.project,
      };
    });

    return NextResponse.json({
      success: true,
      orders: ordersWithReceiptTokens,
      customProjects,
    });
  } catch (error: unknown) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json({ error: 'Failed to fetch customer orders' }, { status: 500 });
  }
}
