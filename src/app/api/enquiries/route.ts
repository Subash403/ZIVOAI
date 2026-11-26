import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession, getAuthSession } from '@/lib/auth';
import { syncEnquiryToGoogleSheets } from '@/lib/google-sheets';
import { sendLeadConfirmationNotification } from '@/lib/notifications';
import { validateEnquiryInput } from '@/lib/validation';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/security';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rl = checkRateLimit(clientIp, {
      keyPrefix: 'enquiries:create',
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
      cooldownMs: 5 * 60 * 1000,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl, 'Too many enquiry submissions. Please wait before submitting again.');
    }

    const body = await request.json();

    const validation = validateEnquiryInput(body);
    if (!validation.isValid || !validation.sanitized) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Optional user session link
    const customerSession = await getAuthSession();
    const userId = customerSession?.userId || null;

    const {
      year,
      projectId,
      projectName,
      domain,
      technology,
      projectType,
      deadline,
      callbackTime,
    } = body;

    const {
      studentName: trimmedName,
      college: trimmedCollege,
      department: trimmedDept,
      phone: trimmedPhone,
      whatsapp: trimmedWhatsapp,
      email: trimmedEmail,
      requirements: trimmedRequirements,
    } = validation.sanitized;

    // Auto-generate Lead ID
    const count = await prisma.enquiry.count();
    const leadId = `LD-${1000 + count + 1}`;

    const defaultCustomerMessage =
      'Your custom project request has been received. Our team will review your requirements and update your project progress here.';

    // 1. Save Enquiry to Database first
    const enquiry = await prisma.enquiry.create({
      data: {
        leadId,
        studentName: trimmedName,
        college: trimmedCollege,
        department: trimmedDept,
        year: year ? String(year).trim() : null,
        phone: trimmedPhone,
        whatsapp: trimmedWhatsapp,
        email: trimmedEmail,
        projectId: projectId ? String(projectId) : null,
        projectName: projectName ? String(projectName).trim() : null,
        domain: domain ? String(domain).trim() : null,
        technology: technology ? String(technology).trim() : null,
        projectType: projectType ? String(projectType).trim() : null,
        deadline: deadline ? String(deadline).trim() : null,
        requirements: trimmedRequirements,
        callbackTime: callbackTime ? String(callbackTime).trim() : null,
        status: 'NEW',
        currentStage: 'Request Received',
        customerProgressMessage: defaultCustomerMessage,
        userId,
        googleSheetSyncStatus: 'PENDING',
      },
    });

    // 2. Create initial development timeline entry
    await prisma.customProjectTimeline.create({
      data: {
        enquiryId: enquiry.id,
        stage: 'Request Received',
        statusMessage: defaultCustomerMessage,
        adminNote: 'Custom project enquiry created via website submission',
      },
    });

    // 2.5 Send real lead confirmation email (ZAI-032)
    const emailResult = await sendLeadConfirmationNotification({
      leadId: enquiry.leadId,
      studentName: enquiry.studentName,
      email: enquiry.email,
      projectName: enquiry.projectName || enquiry.domain,
      phone: enquiry.phone,
    });

    // 3. Attempt Google Sheet synchronization asynchronously
    const submissionDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    syncEnquiryToGoogleSheets({
      submissionDate,
      leadId: enquiry.leadId,
      studentName: enquiry.studentName,
      college: enquiry.college,
      department: enquiry.department,
      year: enquiry.year,
      phone: enquiry.phone,
      whatsapp: enquiry.whatsapp,
      email: enquiry.email,
      projectId: enquiry.projectId,
      projectName: enquiry.projectName,
      domain: enquiry.domain,
      technology: enquiry.technology,
      projectType: enquiry.projectType,
      deadline: enquiry.deadline,
      requirements: enquiry.requirements,
      callbackTime: enquiry.callbackTime,
      status: enquiry.status,
    })
      .then(async (result) => {
        if (result.success) {
          await prisma.enquiry.update({
            where: { id: enquiry.id },
            data: { googleSheetSyncStatus: 'SYNCED', googleSheetSyncError: null },
          });
        } else {
          await prisma.enquiry.update({
            where: { id: enquiry.id },
            data: { googleSheetSyncStatus: 'FAILED', googleSheetSyncError: result.error || 'Unknown sync error' },
          });
        }
      })
      .catch(async (err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : 'Unknown sync failure';
        await prisma.enquiry.update({
          where: { id: enquiry.id },
          data: { googleSheetSyncStatus: 'FAILED', googleSheetSyncError: errorMsg },
        });
      });

    return NextResponse.json(
      {
        success: true,
        message: 'Your custom project request has been received. Our team will review your requirements and update your project progress here.',
        leadId: enquiry.leadId,
        currentStage: enquiry.currentStage,
        emailConfirmationStatus: emailResult.status,
        trackUrl: '/account',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return safeErrorResponse(
      error,
      'Could not submit your request. Please try again or contact us directly on WhatsApp.',
      500,
      'enquiries:POST'
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const archivedParam = searchParams.get('archived') || 'false';
    const assignedTo = searchParams.get('assignedTo')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10) || 25));

    const whereClause: Prisma.EnquiryWhereInput = {};

    if (archivedParam === 'false') {
      whereClause.archived = false;
    } else if (archivedParam === 'true') {
      whereClause.archived = true;
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (assignedTo && assignedTo !== 'ALL') {
      whereClause.assignedTo = assignedTo;
    }

    if (search) {
      whereClause.OR = [
        { leadId: { contains: search } },
        { studentName: { contains: search } },
        { college: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { projectName: { contains: search } },
      ];
    }

    const [enquiries, totalCount] = await Promise.all([
      prisma.enquiry.findMany({
        where: whereClause,
        include: {
          timeline: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.enquiry.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      enquiries,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch enquiries', 500, 'enquiries:GET');
  }
}

