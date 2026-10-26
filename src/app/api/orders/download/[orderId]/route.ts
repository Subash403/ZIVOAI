import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyReceiptToken, getAdminSession, getCustomerSession } from '@/lib/auth';
import { publicOrderLookupWhere, resolvePublicOrderId } from '@/lib/order-lookup';
import {
  isR2Configured,
  generatePrivatePresignedDownloadUrl,
  getPrivateAssetBuffer,
  privateAssetExists,
} from '@/lib/storage';

function safeDownloadFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[\r\n]/g, '')
    .replace(/[\\/\"\u0000-\u001f\u007f]/g, '_')
    .trim();
  return cleaned || 'download.zip';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId: rawOrderId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const orderId = rawOrderId ? resolvePublicOrderId(rawOrderId) : '';

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch order and project details.
    // Order IDs are stored as `ORD-<timestamp>-<lowercase hex>` — do not uppercase
    // the lookup key or Prisma will miss the unique `orderId` and return 404.
    const order = await prisma.order.findFirst({
      where: publicOrderLookupWhere(orderId),
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

    if (!order.project.downloadFileUrl || !(await privateAssetExists(order.project.downloadFileUrl))) {
      console.error('Paid order has no available private deliverable:', {
        orderId: order.orderId,
        projectId: order.projectId,
      });
      return NextResponse.json(
        { error: 'The purchased project deliverable is not available yet. Please contact support.' },
        { status: 503 }
      );
    }

    const fileName = safeDownloadFileName(order.project.downloadFileName || `${order.project.slug}-source-code.zip`);

    // 7. Cloudflare R2 Presigned Download Delivery
    if (order.project.downloadFileUrl && isR2Configured()) {
      const presignedUrl = await generatePrivatePresignedDownloadUrl(
        order.project.downloadFileUrl,
        fileName,
        3600 // 1 hour expiration
      );

      if (presignedUrl) {
        if (!isAdmin) {
          const reserved = await prisma.order.updateMany({
            where: { id: order.id, paymentStatus: 'PAID', downloadCount: { lt: order.downloadLimit } },
            data: { downloadCount: { increment: 1 }, deliveryStatus: 'DELIVERED', deliveredAt: order.deliveredAt || new Date() },
          });
          if (reserved.count !== 1) {
            return NextResponse.json({ error: 'Download limit exceeded or order is no longer eligible.' }, { status: 429 });
          }
        }
        return NextResponse.redirect(presignedUrl, 302);
      }
      console.error('Private R2 presigning failed; refusing application-level buffering.', {
        orderId: order.orderId,
        projectId: order.projectId,
      });
      return NextResponse.json({ error: 'The download service is temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('Private storage is not configured in production.', { orderId: order.orderId, projectId: order.projectId });
      return NextResponse.json({ error: 'The download service is temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    // Local filesystem fallback is intentionally development-only.
    const fileBuffer = await getPrivateAssetBuffer(order.project.downloadFileUrl);
    if (!fileBuffer) {
      console.error('Private deliverable disappeared during download:', {
        orderId: order.orderId,
        projectId: order.projectId,
      });
      return NextResponse.json(
        { error: 'The purchased project deliverable is not available yet. Please contact support.' },
        { status: 503 }
      );
    }

    if (!isAdmin) {
      const reserved = await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: 'PAID', downloadCount: { lt: order.downloadLimit } },
        data: { downloadCount: { increment: 1 }, deliveryStatus: 'DELIVERED', deliveredAt: order.deliveredAt || new Date() },
      });
      if (reserved.count !== 1) {
        return NextResponse.json({ error: 'Download limit exceeded or order is no longer eligible.' }, { status: 429 });
      }
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Download delivery error:', error);
    return NextResponse.json({ error: 'Internal server error processing download.' }, { status: 500 });
  }
}
