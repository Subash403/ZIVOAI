import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder, getRazorpayKeyId } from '@/lib/razorpay';
import crypto from 'crypto';
import { getCustomerSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
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

    // 4. Server-Side Price & Availability Security Verification
    if (!projectId) {
      return NextResponse.json({ error: 'Missing Project ID' }, { status: 400 });
    }

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

    if (project.stockLimit !== null && project.stockLimit !== undefined && project.stockLimit <= 0) {
      return NextResponse.json(
        { error: 'This project has reached its purchase/order limit.' },
        { status: 400 }
      );
    }

    if (project.salesType !== 'fixed' || project.price <= 0) {
      return NextResponse.json(
        { error: 'This project is call-based. Please request a call to discuss custom pricing.' },
        { status: 400 }
      );
    }

    // Require authenticated user session for checkout
    const session = await getCustomerSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Please sign in or create an account to proceed with checkout.' },
        { status: 401 }
      );
    }
    const userId = session.userId;

    // Actual verified price from database
    const serverVerifiedPrice = project.price;

    // 5. Generate unique Order ID
    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // 6. Create Razorpay order using server-side database price
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

    // 7. Save Order to Database with CREATED paymentStatus and PENDING deliveryStatus
    const dbOrder = await prisma.order.create({
      data: {
        orderId,
        studentName,
        email,
        phone: formattedPhone,
        college: college ? college.trim() : null,
        department: department ? department.trim() : null,
        year: year ? year.trim() : null,
        projectId: project.id,
        projectName: project.title,
        amount: serverVerifiedPrice,
        currency: 'INR',
        razorpayOrderId,
        paymentStatus: 'CREATED',
        deliveryStatus: 'PENDING',
        userId,
      },
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
    console.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Payment service is temporarily unavailable. Please try again shortly.' },
      { status: 502 }
    );
  }
}
