import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/auth';
import { isProjectPubliclyVisible, toPublicProjectDTO } from '@/lib/project-visibility';
import { safeErrorResponse } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const session = await getCustomerSession(request);
    if (!session) {
      return NextResponse.json({ success: true, wishlist: [] });
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: session.userId },
      include: {
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Only expose publicly visible projects through sanitized public DTO (ZAI-003, ZAI-004)
    const projects = items
      .filter((item) => isProjectPubliclyVisible(item.project))
      .map((item) => toPublicProjectDTO(item.project));

    return NextResponse.json({ success: true, wishlist: projects });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'Failed to fetch wishlist', 500, 'wishlist:GET');
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Please sign in to save items to your wishlist' }, { status: 401 });
    }

    const body = await request.json();
    const projectIds: string[] = Array.isArray(body.projectIds)
      ? body.projectIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0).slice(0, 50)
      : typeof body.projectId === 'string' && body.projectId.trim()
      ? [body.projectId.trim()]
      : [];

    if (projectIds.length === 0) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const validProjects = await prisma.project.findMany({
      where: { id: { in: projectIds }, published: true, available: true },
      select: { id: true },
    });

    for (const p of validProjects) {
      await prisma.wishlistItem.upsert({
        where: {
          userId_projectId: {
            userId: session.userId,
            projectId: p.id,
          },
        },
        create: {
          userId: session.userId,
          projectId: p.id,
        },
        update: {},
      });
    }

    return NextResponse.json({ success: true, message: 'Added to wishlist', syncedCount: validProjects.length });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'Failed to update wishlist', 500, 'wishlist:POST');
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCustomerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    await prisma.wishlistItem.deleteMany({
      where: {
        userId: session.userId,
        projectId,
      },
    });

    return NextResponse.json({ success: true, message: 'Removed from wishlist' });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'Failed to remove from wishlist', 500, 'wishlist:DELETE');
  }
}
