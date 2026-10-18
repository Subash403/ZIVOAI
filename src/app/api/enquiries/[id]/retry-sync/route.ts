import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { syncEnquiryToGoogleSheets } from '@/lib/google-sheets';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const enquiry = await prisma.enquiry.findUnique({ where: { id } });

    if (!enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    const submissionDate = new Date(enquiry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const result = await syncEnquiryToGoogleSheets({
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
      adminNotes: enquiry.adminNotes,
    });

    if (result.success) {
      const updated = await prisma.enquiry.update({
        where: { id },
        data: { googleSheetSyncStatus: 'SYNCED', googleSheetSyncError: null },
      });
      return NextResponse.json({ success: true, message: 'Google Sheets sync successful!', enquiry: updated });
    } else {
      const updated = await prisma.enquiry.update({
        where: { id },
        data: { googleSheetSyncStatus: 'FAILED', googleSheetSyncError: result.error },
      });
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to sync with Google Sheets', enquiry: updated },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error during sync';
    console.error('Error retrying Google Sheets sync:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

