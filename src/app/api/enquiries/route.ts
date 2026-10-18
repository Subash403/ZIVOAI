import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession, getAuthSession } from '@/lib/auth';
import { syncEnquiryToGoogleSheets } from '@/lib/google-sheets';
import { validateEnquiryInput } from '@/lib/validation';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
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

    // 2. Attempt Google Sheet synchronization asynchronously
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
        trackUrl: `/orders/track?ref=${enquiry.leadId}`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error submitting enquiry:', error);
    return NextResponse.json(
      { error: 'Could not submit your request. Please try again or contact us directly on WhatsApp.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const whereClause: Prisma.EnquiryWhereInput = {};

    if (status && status !== 'ALL') {
      whereClause.status = status;
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

    const enquiries = await prisma.enquiry.findMany({
      where: whereClause,
      include: {
        timeline: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, enquiries });
  } catch (error: unknown) {
    console.error('Error fetching enquiries:', error);
    return NextResponse.json({ error: 'Failed to fetch enquiries' }, { status: 500 });
  }
}

