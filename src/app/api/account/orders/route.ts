import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { safeErrorResponse } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, emailVerified: true, tokenVersion: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.tokenVersion !== undefined && session.tokenVersion !== user.tokenVersion) {
      return NextResponse.json({ error: 'Session revoked. Please sign in again.' }, { status: 401 });
    }

    const normalizedEmail = user.email.toLowerCase();

    // ZAI-080: Always prioritize explicit userId ownership.
    // Legacy unlinked records (userId: null) are only associated when email matches the verified identity,
    // and NEVER pull records owned by another userId.
    const ownerFilter = user.emailVerified
      ? {
          OR: [
            { userId: user.id },
            { userId: null, email: normalizedEmail },
          ],
        }
      : {
          OR: [
            { userId: user.id },
            { userId: null, email: normalizedEmail },
          ],
        };

    const [orders, customProjects] = await Promise.all([
      prisma.order.findMany({
        where: ownerFilter,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              slug: true,
              mainImage: true,
              salesType: true,
              includedMaterials: true,
            },
          },
          refunds: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              status: true,
              reason: true,
              processedAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.enquiry.findMany({
        where: {
          ...ownerFilter,
          archived: false,
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
      }),
    ]);

    // ZAI-079: Strictly omit receiptToken and downloadToken from account dashboard JSON.
    // Authenticated owner downloads authorize via session cookie on /api/orders/download/[orderId].
    const sanitizedOrders = orders.map((order) => {
      let includedMaterials: string[] = [];
      try {
        const parsed = JSON.parse(order.project?.includedMaterials || '[]');
        if (Array.isArray(parsed)) includedMaterials = parsed;
      } catch {
        includedMaterials = [];
      }

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
        reconciliationStatus: order.reconciliationStatus,
        paymentRefLast4: order.razorpayPaymentId ? order.razorpayPaymentId.slice(-4) : null,
        paidAt: order.paidAt,
        deliveredAt: order.deliveredAt,
        downloadCount: order.downloadCount,
        downloadLimit: order.downloadLimit,
        downloadsRemaining: Math.max(0, order.downloadLimit - order.downloadCount),
        downloadTokenExpiry: order.downloadTokenExpiry,
        createdAt: order.createdAt,
        refunds: order.refunds,
        project: order.project
          ? {
              id: order.project.id,
              title: order.project.title,
              slug: order.project.slug,
              mainImage: order.project.mainImage,
              salesType: order.project.salesType,
              includedMaterials,
            }
          : null,
      };
    });

    // Sanitize custom enquiries to guarantee private adminNotes are NEVER returned
    const sanitizedCustomProjects = customProjects.map((cp) => ({
      id: cp.id,
      leadId: cp.leadId,
      studentName: cp.studentName,
      email: cp.email,
      phone: cp.phone,
      whatsapp: cp.whatsapp,
      projectName: cp.projectName,
      domain: cp.domain,
      technology: cp.technology,
      requirements: cp.requirements,
      status: cp.status,
      currentStage: cp.currentStage,
      customerProgressMessage: cp.customerProgressMessage,
      estimatedCompletionDate: cp.estimatedCompletionDate,
      createdAt: cp.createdAt,
      updatedAt: cp.updatedAt,
      timeline: cp.timeline,
    }));

    return NextResponse.json({
      success: true,
      orders: sanitizedOrders,
      customProjects: sanitizedCustomProjects,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch customer orders', 500, 'account:orders');
  }
}
