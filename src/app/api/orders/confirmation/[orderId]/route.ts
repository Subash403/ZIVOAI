import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession, getCustomerSession, verifyReceiptToken } from '@/lib/auth';
import { publicOrderLookupWhere, resolvePublicOrderId } from '@/lib/order-lookup';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId: rawOrderId } = await params;
    const orderId = rawOrderId ? resolvePublicOrderId(rawOrderId) : '';
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || request.headers.get('x-receipt-token') || '';

    const order = await prisma.order.findFirst({
      where: publicOrderLookupWhere(orderId),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order receipt not found' }, { status: 404 });
    }

    // Verify access: Authenticated admin OR authenticated customer owner OR valid HMAC receipt token for this order
    const adminSession = await getAdminSession();
    const isAdmin = Boolean(adminSession && adminSession.role === 'ADMIN');

    const customerSession = await getCustomerSession();
    const isOwner = Boolean(
      customerSession &&
        ((order.userId && customerSession.userId === order.userId) ||
          (customerSession.email && order.email.toLowerCase() === customerSession.email.toLowerCase()))
    );

    const hasValidToken = token ? verifyReceiptToken(order.orderId, token) : false;

    if (!isAdmin && !isOwner && !hasValidToken) {
      return NextResponse.json(
        {
          error:
            'Access denied. A valid receipt token or account authorization is required to view order details.',
        },
        { status: 403 }
      );
    }

    // Return strictly sanitized receipt data. Internal fields (adminNotes, razorpaySignature) are excluded.
    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderId,
        studentName: order.studentName,
        email: order.email,
        phone: order.phone,
        college: order.college,
        department: order.department,
        year: order.year,
        projectId: order.projectId,
        projectName: order.projectName,
        amount: order.amount,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching order receipt confirmation:', error);
    return NextResponse.json({ error: 'Failed to retrieve order confirmation' }, { status: 500 });
  }
}
