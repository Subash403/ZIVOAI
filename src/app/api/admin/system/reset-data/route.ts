import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getAdminSession, comparePassword } from '@/lib/auth';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Administrator privileges required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { confirmPhrase, adminPassword, includeProjects } = body;

    // 1. Validate confirmation phrase
    if (confirmPhrase !== 'DELETE ALL DATA') {
      return NextResponse.json(
        { error: 'Confirmation phrase mismatch. You must type "DELETE ALL DATA" exactly.' },
        { status: 400 }
      );
    }

    // 2. Fresh re-authentication of the admin password
    if (!adminPassword || typeof adminPassword !== 'string') {
      return NextResponse.json(
        { error: 'Administrator password confirmation is required for this irreversible action.' },
        { status: 400 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!adminUser || adminUser.role !== 'ADMIN' || !adminUser.password) {
      return NextResponse.json(
        { error: 'Administrator verification failed.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await comparePassword(adminPassword, adminUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Incorrect administrator password. Data reset cancelled.' },
        { status: 401 }
      );
    }

    // 3. Create verified pre-deletion snapshot backup
    const backupDir = path.join(process.cwd(), 'storage', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFilename = `zivo-backup-reset-${Date.now()}.json`;
    const backupPath = path.join(backupDir, backupFilename);

    const [
      customersToBackup,
      ordersToBackup,
      enquiriesToBackup,
      projectsToBackup,
    ] = await Promise.all([
      prisma.user.findMany({ where: { role: 'CUSTOMER' } }),
      prisma.order.findMany({ include: { refunds: true, downloadLogs: true } }),
      prisma.enquiry.findMany({ include: { timeline: true } }),
      includeProjects ? prisma.project.findMany({}) : Promise.resolve([]),
    ]);

    const backupSnapshot = {
      createdAt: new Date().toISOString(),
      initiatedBy: adminUser.email,
      includeProjects: Boolean(includeProjects),
      customers: customersToBackup,
      orders: ordersToBackup,
      enquiries: enquiriesToBackup,
      projects: projectsToBackup,
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupSnapshot, null, 2), 'utf8');

    // 4. Execute atomic transactional reset of approved application data
    const resetResult = await prisma.$transaction(async (tx) => {
      // Step A: Order-dependent records
      const deletedDownloadLogs = await tx.downloadLog.deleteMany({});
      const deletedRefunds = await tx.refund.deleteMany({});
      await tx.orderNotification.deleteMany({});
      await tx.stockReservation.deleteMany({});
      const deletedOrders = await tx.order.deleteMany({});

      // Step B: Enquiry-dependent records
      await tx.customProjectTimeline.deleteMany({});
      const deletedEnquiries = await tx.enquiry.deleteMany({});

      // Step C: Wishlist & Customers
      const deletedWishlists = await tx.wishlistItem.deleteMany({});
      const deletedCustomers = await tx.user.deleteMany({
        where: { role: 'CUSTOMER' },
      });

      // Step D: Catalog projects (only if explicitly approved/included)
      let deletedProjectsCount = 0;
      if (includeProjects) {
        const deletedProjects = await tx.project.deleteMany({});
        deletedProjectsCount = deletedProjects.count;
      }

      // Step E: Notification logs & webhook events
      const deletedNotifications = await tx.notificationLog.deleteMany({});
      await tx.paymentWebhookEvent.deleteMany({});

      // Step F: Audit trail entry (strictly preserved in AdminAuditLog)
      await tx.adminAuditLog.create({
        data: {
          actorUserId: adminUser.id,
          actorEmail: adminUser.email,
          action: 'SYSTEM_DATA_RESET',
          resourceType: 'SYSTEM',
          resourceId: 'RESET_ALL_DATA',
          ipAddress: getClientIp(request),
          metadata: JSON.stringify({
            backupFilename,
            deletedOrders: deletedOrders.count,
            deletedCustomers: deletedCustomers.count,
            deletedEnquiries: deletedEnquiries.count,
            deletedProjects: deletedProjectsCount,
            deletedNotifications: deletedNotifications.count,
            includeProjects: Boolean(includeProjects),
          }),
        },
      });

      return {
        deletedOrders: deletedOrders.count,
        deletedCustomers: deletedCustomers.count,
        deletedEnquiries: deletedEnquiries.count,
        deletedProjects: deletedProjectsCount,
        deletedNotifications: deletedNotifications.count,
        deletedRefunds: deletedRefunds.count,
        deletedDownloadLogs: deletedDownloadLogs.count,
        deletedWishlists: deletedWishlists.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Controlled data reset completed successfully. A verified backup was archived before deletion.',
      backupFilename,
      summary: resetResult,
    });
  } catch (error: unknown) {
    console.error('Error executing admin data reset:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during data reset.' },
      { status: 500 }
    );
  }
}
