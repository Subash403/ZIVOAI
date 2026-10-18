import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession, getAuthSession } from '@/lib/auth';
import { sendCustomProjectProgressNotification } from '@/lib/notifications';
import { CUSTOM_PROJECT_STAGES } from '@/types';

const ALLOWED_ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const VALID_STAGES = [...CUSTOM_PROJECT_STAGES, 'On Hold', 'Cancelled'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminSession = await getAdminSession();
    const customerSession = await getAuthSession();

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        timeline: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    // Check authorization: Admin or owner of the enquiry
    const isAdmin = adminSession && adminSession.role === 'ADMIN';
    const isOwner =
      customerSession &&
      (enquiry.userId === customerSession.userId ||
        enquiry.email.toLowerCase() === customerSession.email.toLowerCase());

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized to view this enquiry' }, { status: 403 });
    }

    // If not admin, sanitize timeline so internal adminNote is private
    const sanitizedTimeline = enquiry.timeline.map((t) => ({
      id: t.id,
      stage: t.stage,
      statusMessage: t.statusMessage,
      estimatedDate: t.estimatedDate,
      createdAt: t.createdAt,
      ...(isAdmin ? { adminNote: t.adminNote } : {}),
    }));

    return NextResponse.json({
      success: true,
      enquiry: {
        ...enquiry,
        timeline: sanitizedTimeline,
        adminNotes: isAdmin ? enquiry.adminNotes : undefined,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch enquiry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      status,
      adminNotes,
      currentStage,
      customerProgressMessage,
      estimatedCompletionDate,
      newAdminNote,
      confirmDelivered,
    } = body;

    const existing = await prisma.enquiry.findUnique({
      where: { id },
      include: { timeline: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    // Status validation
    if (status && !ALLOWED_ENQUIRY_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALLOWED_ENQUIRY_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Stage validation
    if (currentStage && !VALID_STAGES.includes(currentStage)) {
      return NextResponse.json(
        { error: `Invalid development stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    // Enforce delivery confirmation rule: "Do not mark a project Delivered until the admin confirms delivery."
    if (currentStage === 'Delivered' && existing.currentStage !== 'Delivered' && !confirmDelivered) {
      return NextResponse.json(
        {
          error:
            'Confirmation required: Please explicitly check the delivery confirmation box before marking this project as Delivered.',
        },
        { status: 400 }
      );
    }

    const nextStage = currentStage || existing.currentStage;
    const nextCustomerMessage =
      customerProgressMessage !== undefined ? customerProgressMessage : existing.customerProgressMessage;
    const nextEstimatedDate =
      estimatedCompletionDate !== undefined ? estimatedCompletionDate : existing.estimatedCompletionDate;

    // Update enquiry record
    await prisma.enquiry.update({
      where: { id },
      data: {
        status: status || existing.status,
        currentStage: nextStage,
        customerProgressMessage: nextCustomerMessage,
        estimatedCompletionDate: nextEstimatedDate,
        adminNotes:
          adminNotes !== undefined
            ? typeof adminNotes === 'string'
              ? adminNotes
              : null
            : existing.adminNotes,
      },
      include: {
        timeline: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If stage changed or custom progress message updated, record a new timeline milestone
    const stageChanged = currentStage && currentStage !== existing.currentStage;
    const messageChanged =
      customerProgressMessage && customerProgressMessage !== existing.customerProgressMessage;

    if (stageChanged || messageChanged || newAdminNote) {
      await prisma.customProjectTimeline.create({
        data: {
          enquiryId: id,
          stage: nextStage,
          statusMessage: nextCustomerMessage,
          adminNote: newAdminNote ? String(newAdminNote).trim() : null,
          estimatedDate: nextEstimatedDate,
        },
      });

      // Notify customer via email if stage changed or new message provided
      if (existing.email && (stageChanged || messageChanged)) {
        await sendCustomProjectProgressNotification({
          leadId: existing.leadId,
          studentName: existing.studentName,
          email: existing.email,
          stage: nextStage,
          customerMessage: nextCustomerMessage || `Your project is now in the ${nextStage} stage.`,
          estimatedCompletionDate: nextEstimatedDate,
        });
      }
    }

    // Re-fetch updated enquiry with latest timeline
    const refreshed = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        timeline: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({ success: true, enquiry: refreshed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update enquiry';
    console.error('Error updating enquiry:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

