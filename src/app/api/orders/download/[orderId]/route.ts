import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyReceiptToken,
  verifyAnyReceiptToken,
  getAdminSession,
  getCustomerSession,
} from '@/lib/auth';
import { publicOrderLookupWhere, resolvePublicOrderId } from '@/lib/order-lookup';
import {
  isR2Configured,
  generatePrivatePresignedDownloadUrl,
  getPrivateAssetBuffer,
  privateAssetExists,
} from '@/lib/storage';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rate-limit';
import { recordAdminAuditLog, safeErrorResponse } from '@/lib/security';

function safeDownloadFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[\r\n]/g, '')
    .replace(/[\\/\"\u0000-\u001f\u007f]/g, '_')
    .trim();
  return cleaned || 'download.zip';
}

async function logDownloadEvent(params: {
  orderId: string;
  actorType: 'OWNER' | 'TOKEN' | 'ADMIN';
  actorId?: string | null;
  reason?: string | null;
  status: 'LINK_ISSUED' | 'FILE_SERVED' | 'DENIED' | 'MISSING_ASSET';
  request: Request;
}) {
  await prisma.downloadLog
    .create({
      data: {
        orderId: params.orderId,
        actorType: params.actorType,
        actorId: params.actorId ?? null,
        reason: params.reason ?? null,
        status: params.status,
        ipAddress: getClientIp(params.request),
        userAgent: params.request.headers.get('user-agent')?.slice(0, 250) ?? null,
      },
    })
    .catch(() => {});
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(clientIp, {
      keyPrefix: 'orders:download:ip',
      windowMs: 5 * 60 * 1000,
      maxRequests: 40,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl, 'Too many download requests. Please try again in a moment.');
    }

    const { orderId: rawParam } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const adminReason = searchParams.get('reason')?.trim() || 'admin_support_inspection';

    const orderId = rawParam ? resolvePublicOrderId(rawParam) : '';
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Primary exact lookup preserves mixed-case order IDs (account-download test)
    let order = await prisma.order.findFirst({
      where: publicOrderLookupWhere(orderId),
      include: { project: true },
    });

    // Case-insensitive fallback if a legacy link altered the casing of the hex suffix
    if (!order) {
      const rest = orderId.length > 4 ? orderId.slice(4) : orderId;
      const fallbackVariants = Array.from(
        new Set([
          orderId.toLowerCase(),
          `ORD-${rest}`,
          `ORD-${rest.toLowerCase()}`,
          `ord-${rest.toLowerCase()}`,
        ])
      ).filter((candidate) => candidate !== orderId);

      if (fallbackVariants.length > 0) {
        order = await prisma.order.findFirst({
          where: { OR: fallbackVariants.map((val) => ({ orderId: val })) },
          include: { project: true },
        });
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Authorization check: Valid receipt token, admin session, or authenticated customer owner
    const isTokenValid = token
      ? verifyAnyReceiptToken(order.orderId, token, order.receiptTokenVersion) ||
        verifyReceiptToken(order.orderId, token)
      : false;

    const adminSession = await getAdminSession(request);
    const isAdmin = Boolean(adminSession && adminSession.role === 'ADMIN');
    const customerSession = await getCustomerSession(request);
    const isOwner = Boolean(
      customerSession &&
        ((order.userId && customerSession.userId === order.userId) ||
          (customerSession.email && order.email.toLowerCase() === customerSession.email.toLowerCase()))
    );

    const actorType: 'OWNER' | 'TOKEN' | 'ADMIN' = isOwner ? 'OWNER' : isTokenValid ? 'TOKEN' : 'ADMIN';

    if (!isTokenValid && !isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized to download assets for this order. Valid receipt token or account login required.' },
        { status: 403 }
      );
    }

    // 3. Payment verification check (ZAI-015, ZAI-083)
    if (order.paymentStatus !== 'PAID' && !isAdmin) {
      await logDownloadEvent({
        orderId: order.orderId,
        actorType,
        actorId: customerSession?.userId,
        reason: `payment_status_${order.paymentStatus}`,
        status: 'DENIED',
        request,
      });
      const message =
        order.paymentStatus === 'REFUNDED'
          ? 'Download access has been revoked because this order was refunded.'
          : 'Assets cannot be downloaded until payment is verified.';
      return NextResponse.json({ error: message }, { status: 402 });
    }

    // 4. Download token expiry check — FAIL CLOSED on null expiry for non-owner token links (ZAI-018)
    if (!isAdmin) {
      const now = new Date();
      const isNullOrExpired = !order.downloadTokenExpiry || now > order.downloadTokenExpiry;
      if (isNullOrExpired) {
        if (isOwner) {
          // Authenticated owner automatically receives a fresh 7-day download window
          const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await prisma.order.update({
            where: { id: order.id },
            data: { downloadTokenExpiry: newExpiry },
          });
        } else {
          await logDownloadEvent({
            orderId: order.orderId,
            actorType: 'TOKEN',
            reason: order.downloadTokenExpiry ? 'token_expired' : 'missing_expiry_fail_closed',
            status: 'DENIED',
            request,
          });
          return NextResponse.json(
            {
              error:
                'This download link has expired or has no active expiration window. Please sign in to your Customer Dashboard to download or renew access.',
            },
            { status: 410 }
          );
        }
      }
    }

    // 5. Audit admin bypass explicitly (ZAI-019)
    if (isAdmin && !isOwner) {
      await recordAdminAuditLog({
        actor: adminSession!,
        action: 'ADMIN_DOWNLOAD_ACCESS',
        resourceType: 'Order',
        resourceId: order.orderId,
        reason: adminReason,
        metadata: {
          paymentStatus: order.paymentStatus,
          projectId: order.projectId,
        },
        request,
      });
    }

    // 6. Verify private deliverable exists before decrementing/redirecting (ZAI-020)
    if (!order.project.downloadFileUrl || !(await privateAssetExists(order.project.downloadFileUrl))) {
      await logDownloadEvent({
        orderId: order.orderId,
        actorType,
        actorId: customerSession?.userId || adminSession?.userId,
        reason: 'missing_private_deliverable',
        status: 'MISSING_ASSET',
        request,
      });
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

    // 7. Cloudflare R2 Presigned Download Delivery (1-hour short-lived URL)
    if (order.project.downloadFileUrl && isR2Configured()) {
      const presignedUrl = await generatePrivatePresignedDownloadUrl(
        order.project.downloadFileUrl,
        fileName,
        3600
      );

      if (presignedUrl) {
        if (!isAdmin) {
          const reserved = await prisma.order.updateMany({
            where: { id: order.id, paymentStatus: 'PAID', downloadCount: { lt: order.downloadLimit } },
            data: {
              downloadCount: { increment: 1 },
              deliveryStatus: 'DELIVERED',
              deliveredAt: order.deliveredAt || new Date(),
            },
          });
          if (reserved.count !== 1) {
            await logDownloadEvent({
              orderId: order.orderId,
              actorType,
              actorId: customerSession?.userId,
              reason: 'download_limit_exceeded',
              status: 'DENIED',
              request,
            });
            return NextResponse.json(
              { error: 'Download link issuance limit exceeded or order is no longer eligible.' },
              { status: 429 }
            );
          }
        }

        await logDownloadEvent({
          orderId: order.orderId,
          actorType,
          actorId: isAdmin ? adminSession?.userId : customerSession?.userId,
          reason: isAdmin ? adminReason : undefined,
          status: 'LINK_ISSUED',
          request,
        });

        const redirectResponse = NextResponse.redirect(presignedUrl, 302);
        redirectResponse.headers.set('Cache-Control', 'no-store');
        redirectResponse.headers.set('X-Download-Link-Expires-In', '3600');
        return redirectResponse;
      }

      console.error('Private R2 presigning failed; refusing application-level buffering.', {
        orderId: order.orderId,
        projectId: order.projectId,
      });
      return NextResponse.json(
        { error: 'The download service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('Private storage is not configured in production.', {
        orderId: order.orderId,
        projectId: order.projectId,
      });
      return NextResponse.json(
        { error: 'The download service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Local filesystem fallback (development/test only)
    const fileBuffer = await getPrivateAssetBuffer(order.project.downloadFileUrl);
    if (!fileBuffer) {
      await logDownloadEvent({
        orderId: order.orderId,
        actorType,
        actorId: customerSession?.userId || adminSession?.userId,
        reason: 'deliverable_missing_on_read',
        status: 'MISSING_ASSET',
        request,
      });
      return NextResponse.json(
        { error: 'The purchased project deliverable is not available yet. Please contact support.' },
        { status: 503 }
      );
    }

    if (!isAdmin) {
      const reserved = await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: 'PAID', downloadCount: { lt: order.downloadLimit } },
        data: {
          downloadCount: { increment: 1 },
          deliveryStatus: 'DELIVERED',
          deliveredAt: order.deliveredAt || new Date(),
        },
      });
      if (reserved.count !== 1) {
        await logDownloadEvent({
          orderId: order.orderId,
          actorType,
          actorId: customerSession?.userId,
          reason: 'download_limit_exceeded',
          status: 'DENIED',
          request,
        });
        return NextResponse.json(
          { error: 'Download link issuance limit exceeded or order is no longer eligible.' },
          { status: 429 }
        );
      }
    }

    await logDownloadEvent({
      orderId: order.orderId,
      actorType,
      actorId: isAdmin ? adminSession?.userId : customerSession?.userId,
      reason: isAdmin ? adminReason : undefined,
      status: 'FILE_SERVED',
      request,
    });

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Internal server error processing download.', 500, 'orders:download');
  }
}
