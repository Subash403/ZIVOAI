import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { recordAdminAuditLog, safeErrorResponse } from '@/lib/security';

const ALLOWED_BULK_ACTIONS = ['publish', 'unpublish', 'available', 'unavailable'] as const;

export async function POST(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await request.json();
    const action = body?.action as (typeof ALLOWED_BULK_ACTIONS)[number];
    const projectIds: string[] = Array.isArray(body?.projectIds)
      ? body.projectIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0).slice(0, 100)
      : [];

    if (!ALLOWED_BULK_ACTIONS.includes(action) || projectIds.length === 0) {
      return NextResponse.json(
        { error: 'Provide a valid bulk action (publish, unpublish, available, unavailable) and at least one project ID.' },
        { status: 400 }
      );
    }

    const data =
      action === 'publish'
        ? { published: true }
        : action === 'unpublish'
        ? { published: false }
        : action === 'available'
        ? { available: true }
        : { available: false };

    const result = await prisma.project.updateMany({
      where: { id: { in: projectIds } },
      data,
    });

    await recordAdminAuditLog({
      actor: session,
      action: `PROJECT_BULK_${action.toUpperCase()}`,
      resourceType: 'Project',
      metadata: { count: result.count, projectIds },
      request,
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      action,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to apply bulk project action', 500, 'admin:projects:bulk');
  }
}
