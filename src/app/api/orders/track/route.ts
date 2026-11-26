import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createTimedReceiptToken,
  getAdminSession,
  getAuthSession,
  hashSensitiveToken,
} from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rate-limit';
import { sendTrackingOtpNotification } from '@/lib/notifications';
import { safeErrorResponse } from '@/lib/security';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const TRACK_RECEIPT_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes short-lived access

function generateNumericOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return String(num);
}

function timingSafeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies mailbox ownership via OTP for unauthenticated guest tracking requests (ZAI-001).
 * Never issues a receipt token from orderId + email alone.
 */
async function handleGuestOtpChallenge(lookupId: string, recipientEmail: string, suppliedOtp?: string) {
  const normalizedEmail = recipientEmail.toLowerCase().trim();

  if (!suppliedOtp) {
    const otp = generateNumericOtp();
    const otpHash = hashSensitiveToken(`${lookupId}:${normalizedEmail}:${otp}`);
    await prisma.orderTrackingOtp.create({
      data: {
        lookupId,
        email: normalizedEmail,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    const mailResult = await sendTrackingOtpNotification({
      lookupId,
      email: normalizedEmail,
      otp,
      expiresMinutes: 10,
    });

    return NextResponse.json(
      {
        success: false,
        requiresVerification: true,
        verificationSent: mailResult.ok,
        message:
          'To protect your order, a 6-digit verification code has been sent to the email on file. Enter the code below or sign in to your Customer Dashboard.',
      },
      { status: 202 }
    );
  }

  const trimmedOtp = String(suppliedOtp).trim();
  const latestOtp = await prisma.orderTrackingOtp.findFirst({
    where: {
      lookupId,
      email: normalizedEmail,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestOtp) {
    return NextResponse.json(
      { error: 'No active verification code found. Please request a new verification code.' },
      { status: 403 }
    );
  }

  if (new Date() > latestOtp.expiresAt) {
    return NextResponse.json(
      { error: 'This verification code has expired. Please request a new code.' },
      { status: 410 }
    );
  }

  if (latestOtp.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Maximum verification attempts exceeded. Please request a new code later.' },
      { status: 429 }
    );
  }

  const candidateHash = hashSensitiveToken(`${lookupId}:${normalizedEmail}:${trimmedOtp}`);
  if (!timingSafeHexEqual(latestOtp.otpHash, candidateHash)) {
    const updated = await prisma.orderTrackingOtp.update({
      where: { id: latestOtp.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - updated.attempts);
    return NextResponse.json(
      {
        error:
          remaining > 0
            ? `Invalid verification code. ${remaining} attempt(s) remaining.`
            : 'Maximum verification attempts exceeded. Please request a new code.',
      },
      { status: remaining > 0 ? 403 : 429 }
    );
  }

  await prisma.orderTrackingOtp.update({
    where: { id: latestOtp.id },
    data: { consumedAt: new Date() },
  });

  return null; // Verified!
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const ipLimit = checkRateLimit(clientIp, {
      keyPrefix: 'orders:track:ip',
      windowMs: 10 * 60 * 1000,
      maxRequests: 25,
      cooldownMs: 5 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitExceededResponse(
        ipLimit,
        'Too many order tracking requests from this network. Please wait before trying again.'
      );
    }

    const body = await request.json();
    const { orderId, email, otp } = body || {};

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID or Custom Project Reference is required.' },
        { status: 400 }
      );
    }

    const rawId = String(orderId).trim();
    const queryId = rawId.toUpperCase();
    const orderLimit = checkRateLimit(`${clientIp}:${queryId}`, {
      keyPrefix: 'orders:track:ref',
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
      cooldownMs: 3 * 60 * 1000,
    });
    if (!orderLimit.allowed) {
      return rateLimitExceededResponse(orderLimit, 'Too many lookup attempts for this reference. Please wait.');
    }

    const adminSession = await getAdminSession(request);
    const isAdmin = Boolean(adminSession && adminSession.role === 'ADMIN');
    const session = await getAuthSession(request);
    const queryEmail = email ? String(email).trim().toLowerCase() : session?.email?.toLowerCase();

    // 1. Check fixed-price order
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
      const isAuthenticatedOwner = Boolean(
        session &&
          ((order.userId && session.userId === order.userId) ||
            (session.email && session.email.toLowerCase() === order.email.toLowerCase()))
      );
      const emailMatches = Boolean(queryEmail && order.email.toLowerCase() === queryEmail);

      if (!isAdmin && !isAuthenticatedOwner) {
        if (!emailMatches) {
          return NextResponse.json(
            { error: 'Please sign in to your account or enter the exact email address used during purchase.' },
            { status: 403 }
          );
        }
        // ZAI-001: Require mailbox OTP verification before releasing protected receipt token/details
        const otpChallengeResponse = await handleGuestOtpChallenge(
          order.orderId,
          order.email,
          typeof otp === 'string' ? otp : undefined
        );
        if (otpChallengeResponse) {
          return otpChallengeResponse;
        }
      }

      // Authenticated owners are directed to /account without leaking unnecessary tokens.
      // OTP-verified guests receive a short-lived (15 min) version-bound timed receipt token.
      const guestToken =
        !isAuthenticatedOwner && !isAdmin
          ? createTimedReceiptToken(order.orderId, {
              expiresInMs: TRACK_RECEIPT_TOKEN_TTL_MS,
              version: order.receiptTokenVersion,
            })
          : undefined;

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
        ...(guestToken ? { receiptToken: guestToken } : {}),
        redirectUrl: guestToken
          ? `/orders/confirmation/${order.orderId}?token=${encodeURIComponent(guestToken)}`
          : '/account',
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
      const isAuthenticatedOwner = Boolean(
        session &&
          ((enquiry.userId && session.userId === enquiry.userId) ||
            (session.email && session.email.toLowerCase() === enquiry.email.toLowerCase()))
      );
      const emailMatches = Boolean(queryEmail && enquiry.email.toLowerCase() === queryEmail);

      if (!isAdmin && !isAuthenticatedOwner) {
        if (!emailMatches) {
          return NextResponse.json(
            { error: 'Please sign in or enter the exact email address used during request submission.' },
            { status: 403 }
          );
        }
        const otpChallengeResponse = await handleGuestOtpChallenge(
          enquiry.leadId,
          enquiry.email,
          typeof otp === 'string' ? otp : undefined
        );
        if (otpChallengeResponse) {
          return otpChallengeResponse;
        }
      }

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
    return safeErrorResponse(error, 'Failed to look up order or custom project', 500, 'orders:track');
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST /api/orders/track or sign in to /account to view your orders securely.' },
    { status: 405 }
  );
}
