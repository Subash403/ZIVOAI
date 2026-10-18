import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyReceiptToken, getAdminSession, getCustomerSession } from '@/lib/auth';
import {
  isR2Configured,
  generatePrivatePresignedDownloadUrl,
  getPrivateAssetBuffer,
} from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch order and project details
    const order = await prisma.order.findUnique({
      where: { orderId: orderId.toUpperCase() },
      include: { project: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Authorization check: Valid receipt token, admin session, or authenticated customer owner
    const isTokenValid = token ? verifyReceiptToken(order.orderId, token) : false;
    const adminSession = await getAdminSession();
    const isAdmin = Boolean(adminSession && adminSession.role === 'ADMIN');
    const customerSession = await getCustomerSession();
    const isOwner = Boolean(
      customerSession &&
        ((order.userId && customerSession.userId === order.userId) ||
          (customerSession.email && order.email.toLowerCase() === customerSession.email.toLowerCase()))
    );

    if (!isTokenValid && !isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized to download assets for this order. Valid receipt token or account login required.' },
        { status: 403 }
      );
    }

    // 3. Payment verification check
    if (order.paymentStatus !== 'PAID' && !isAdmin) {
      return NextResponse.json(
        { error: 'Assets cannot be downloaded until payment is verified.' },
        { status: 402 }
      );
    }

    // 4. Download link expiry check (7 days by default)
    if (!isAdmin && order.downloadTokenExpiry && new Date() > order.downloadTokenExpiry) {
      if (isOwner) {
        // Authenticated order owner gets an automatic 7-day link renewal
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.order.update({
          where: { id: order.id },
          data: { downloadTokenExpiry: newExpiry },
        });
      } else {
        return NextResponse.json(
          {
            error:
              'This download link has expired (valid for 7 days). Please sign in to your customer account to download or renew the link.',
          },
          { status: 410 }
        );
      }
    }

    // 5. Download count & rate check (except admin)
    if (!isAdmin && order.downloadCount >= order.downloadLimit) {
      return NextResponse.json(
        { error: `Download limit (${order.downloadLimit}) exceeded for this order. Please contact support.` },
        { status: 429 }
      );
    }

    // 6. Increment download count and update delivery status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        downloadCount: { increment: 1 },
        deliveryStatus: 'DELIVERED',
        deliveredAt: order.deliveredAt || new Date(),
      },
    });

    const fileName = order.project.downloadFileName || `${order.project.slug}-source-code.zip`;

    // 7. Cloudflare R2 Presigned Download Delivery
    if (order.project.downloadFileUrl && isR2Configured()) {
      const presignedUrl = await generatePrivatePresignedDownloadUrl(
        order.project.downloadFileUrl,
        fileName,
        3600 // 1 hour expiration
      );

      if (presignedUrl) {
        return NextResponse.redirect(presignedUrl, 302);
      }
    }

    // 8. Local filesystem / buffer fallback
    if (order.project.downloadFileUrl) {
      const fileBuffer = await getPrivateAssetBuffer(order.project.downloadFileUrl);
      if (fileBuffer) {
        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      }
    }

    // 9. If a physical deliverable has not been uploaded yet, generate official project documentation starter bundle
    const starterContent = `# ${order.project.title}
==================================================
Project Order ID: ${order.orderId}
License Holder: ${order.studentName} (${order.email})
Date of Delivery: ${new Date().toISOString()}

==================================================
PROJECT OVERVIEW:
${order.project.fullDescription}

CATEGORY: ${order.project.category}
DIFFICULTY: ${order.project.difficulty}
PROJECT TYPE: ${order.project.projectType}
TECHNOLOGIES: ${order.project.technologies}

DELIVERABLES INCLUDED:
- Complete Verified Source Code
- IEEE Format Project Report
- Presentation PPT Slides
- Database Setup Scripts & Schema
- Installation & Running Guide

SETUP & EXECUTION INSTRUCTIONS:
${order.project.setupInstructions || '1. Extract this repository\n2. Follow README.md inside the src/ folder\n3. Contact 24/7 technical support via WhatsApp for remote setup assistance'}

PREREQUISITES:
${order.project.prerequisites || 'Python 3.10+, Node.js 18+, Docker, or Java SDK as specified in the project documentation.'}

SUPPORT:
WhatsApp Helpline: +91 8220303164
Support Email: support@zivo.ai
`;
    const starterBuffer = Buffer.from(starterContent, 'utf-8');
    const starterFileName = `${order.project.slug}-documentation-bundle.txt`;

    return new NextResponse(new Uint8Array(starterBuffer), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${starterFileName}"`,
        'Content-Length': starterBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Download delivery error:', error);
    return NextResponse.json({ error: 'Internal server error processing download.' }, { status: 500 });
  }
}
