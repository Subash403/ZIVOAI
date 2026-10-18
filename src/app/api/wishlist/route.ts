import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getCustomerSession();
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

    const projects = items.map((item) => ({
      ...item.project,
      technologies: JSON.parse(item.project.technologies || '[]'),
      features: item.project.features ? JSON.parse(item.project.features) : [],
    }));

    return NextResponse.json({ success: true, wishlist: projects });
  } catch (err: unknown) {
    console.error('Wishlist GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Please sign in to save items to your wishlist' }, { status: 401 });
    }

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    await prisma.wishlistItem.upsert({
      where: {
        userId_projectId: {
          userId: session.userId,
          projectId,
        },
      },
      create: {
        userId: session.userId,
        projectId,
      },
      update: {},
    });

    return NextResponse.json({ success: true, message: 'Added to wishlist' });
  } catch (err: unknown) {
    console.error('Wishlist POST error:', err);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCustomerSession();
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
    console.error('Wishlist DELETE error:', err);
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}
