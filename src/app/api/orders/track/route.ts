import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createReceiptToken, getAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { orderId, email } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID or Custom Project Reference is required.' },
        { status: 400 }
      );
    }

    const session = await getAuthSession(request);
    const rawId = String(orderId).trim();
    const queryId = rawId.toUpperCase();
    const queryEmail = email ? String(email).trim().toLowerCase() : session?.email?.toLowerCase();

    // 1. Check fixed-price order first
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderId: rawId },
          { orderId: queryId },
          { orderId: rawId.toLowerCase() },
          { id: rawId },
        ],
      },
      include: {
        project: {
          select: {
            title: true,
            slug: true,
            mainImage: true,
          },
        },
      },
    });

    if (order) {
      const isAuthorized =
        (queryEmail && order.email.toLowerCase() === queryEmail) ||
        (session && (session.userId === order.userId || session.email.toLowerCase() === order.email.toLowerCase()));

      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'Please enter the email address used during purchase to track this order.' },
          { status: 403 }
        );
      }

      const receiptToken = createReceiptToken(order.orderId);

      return NextResponse.json({
        success: true,
        type: 'FIXED_ORDER',
        orderId: order.orderId,
        projectName: order.projectName,
        studentName: order.studentName,
        email: order.email,
        amount: order.amount,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        receiptToken,
        redirectUrl: `/orders/confirmation/${order.orderId}?token=${receiptToken}`,
      });
    }

    // 2. Check Custom Project Enquiry
    const enquiry = await prisma.enquiry.findFirst({
      where: {
        OR: [
          { leadId: rawId },
          { leadId: queryId },
          { leadId: queryId.replace(/^ORD-/, 'LD-') },
          { id: rawId },
          { id: queryId },
        ],
      },
      include: {
        timeline: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (enquiry) {
      const isAuthorized =
        (queryEmail && enquiry.email.toLowerCase() === queryEmail) ||
        (session && (session.userId === enquiry.userId || session.email.toLowerCase() === enquiry.email.toLowerCase()));

      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'Please enter the email address used during request submission to track this project.' },
          { status: 403 }
        );
      }

      // Sanitize timeline to exclude internal admin notes
      const sanitizedTimeline = enquiry.timeline.map((t) => ({
        id: t.id,
        stage: t.stage,
        statusMessage: t.statusMessage,
        estimatedDate: t.estimatedDate,
        createdAt: t.createdAt,
      }));

      return NextResponse.json({
        success: true,
        type: 'CUSTOM_PROJECT',
        customProject: {
          id: enquiry.id,
          leadId: enquiry.leadId,
          studentName: enquiry.studentName,
          email: enquiry.email,
          phone: enquiry.phone,
          whatsapp: enquiry.whatsapp,
          projectName: enquiry.projectName || enquiry.domain || 'Custom Project Development',
          domain: enquiry.domain,
          technology: enquiry.technology,
          requirements: enquiry.requirements,
          status: enquiry.status,
          currentStage: enquiry.currentStage || 'Request Received',
          customerProgressMessage:
            enquiry.customerProgressMessage ||
            'Your custom project request has been received. Our team will review your requirements and update your project progress here.',
          estimatedCompletionDate: enquiry.estimatedCompletionDate,
          createdAt: enquiry.createdAt,
          updatedAt: enquiry.updatedAt,
          timeline: sanitizedTimeline,
        },
      });
    }

    return NextResponse.json(
      { error: 'No order or custom project request found matching this reference ID.' },
      { status: 404 }
    );
  } catch (error: unknown) {
    console.error('Track order error:', error);
    return NextResponse.json({ error: 'Failed to look up order or custom project' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref') || searchParams.get('orderId');
  const email = searchParams.get('email');

  if (!ref) {
    return NextResponse.json({ error: 'Reference ID is required' }, { status: 400 });
  }

  // Reuse POST logic
  return POST(
    new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: ref, email }),
    })
  );
}
