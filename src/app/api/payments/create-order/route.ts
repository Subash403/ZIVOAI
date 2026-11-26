import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder, getRazorpayKeyId } from '@/lib/razorpay';
import crypto from 'crypto';
import { getCustomerSession } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rate-limit';
import {
  releaseStockReservation,
  reserveStockInTransaction,
  StockUnavailableError,
} from '@/lib/stock-reservation';
import { safeErrorResponse } from '@/lib/security';

export async function POST(request: Request) {
  let createdOrderId: string | null = null;
  try {
    const clientIp = getClientIp(request);
    const ipLimit = checkRateLimit(clientIp, {
      keyPrefix: 'payments:create-order:ip',
      windowMs: 10 * 60 * 1000,
      maxRequests: 20,
      cooldownMs: 3 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitExceededResponse(ipLimit, 'Too many checkout attempts. Please wait a moment and try again.');
    }

    const body = await request.json();
    const { projectId, college, department, year } = body;
    let { studentName, email, phone } = body;

    // 1. Mandatory Input Sanitization
    studentName = (studentName || '').trim();
    email = (email || '').trim().toLowerCase();
    phone = (phone || '').trim().replace(/[\s\-\(\)]/g, '');

    if (!studentName) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }

    // 2. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 120) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // 3. WhatsApp Phone Validation
    let formattedPhone = phone;
    if (/^\d{10}$/.test(phone)) {
      formattedPhone = `+91${phone}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${phone}`;
    }

    const digitsOnly = formattedPhone.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 10 || digitsOnly.length > 15) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit WhatsApp number.' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Missing Project ID' }, { status: 400 });
    }

    // Require authenticated user session for checkout
    const session = await getCustomerSession(request);
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Please sign in or create an account to proceed with checkout.' },
        { status: 401 }
      );
    }
    const userId = session.userId;

    // Validate project & atomically reserve stock before calling Razorpay (ZAI-009)
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!project.published) {
      return NextResponse.json(
        { error: 'This project is currently unpublished and not available for purchase.' },
        { status: 400 }
      );
    }
    if (!project.available) {
      return NextResponse.json(
        { error: 'This project is currently marked as unavailable.' },
        { status: 400 }
      );
    }
    if (project.salesType !== 'fixed' || project.price <= 0) {
      return NextResponse.json(
        { error: 'This project is call-based. Please request a call to discuss custom pricing.' },
        { status: 400 }
      );
    }

    const serverVerifiedPrice = project.price;
    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const dbOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderId,
          studentName,
          email,
          phone: formattedPhone,
          college: college ? String(college).trim() : null,
          department: department ? String(department).trim() : null,
          year: year ? String(year).trim() : null,
          projectId: project.id,
          projectName: project.title,
          amount: serverVerifiedPrice,
          currency: 'INR',
          paymentStatus: 'CREATED',
          deliveryStatus: 'PENDING',
          userId,
        },
      });

      await reserveStockInTransaction(tx, {
        orderId: created.orderId,
        projectId: project.id,
      });

      return created;
    });

    createdOrderId = dbOrder.orderId;

    // Create Razorpay order using server-side verified price
    const razorpayResult = await createRazorpayOrder({
      amount: serverVerifiedPrice,
      receipt: orderId,
      notes: {
        projectId: project.id,
        projectName: project.title,
        studentEmail: email,
        studentWhatsApp: formattedPhone,
      },
    });

    const razorpayOrderId = razorpayResult.order.id;

    await prisma.order.update({
      where: { id: dbOrder.id },
      data: { razorpayOrderId },
    });

    return NextResponse.json({
      success: true,
      internalOrderId: dbOrder.orderId,
      dbOrderId: dbOrder.id,
      razorpayOrderId,
      amount: serverVerifiedPrice,
      currency: 'INR',
      keyId: getRazorpayKeyId(),
      projectName: project.title,
      studentName,
      email,
      phone: formattedPhone,
    });
  } catch (error: unknown) {
    if (createdOrderId) {
      await releaseStockReservation(createdOrderId, 'RELEASED');
      await prisma.order
        .updateMany({
          where: { orderId: createdOrderId, paymentStatus: 'CREATED' },
          data: { paymentStatus: 'FAILED', adminNotes: 'Razorpay order initialization failed; reservation released.' },
        })
        .catch(() => {});
    }

    if (error instanceof StockUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return safeErrorResponse(
      error,
      'Payment service is temporarily unavailable. Please try again shortly.',
      502,
      'payments:create-order'
    );
  }
}
