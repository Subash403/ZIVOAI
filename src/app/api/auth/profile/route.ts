import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession, comparePassword, hashPassword, setSessionCookie } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, college, department, year, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (session.tokenVersion !== undefined && session.tokenVersion !== user.tokenVersion) {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
    }

    const updateData: {
      name?: string;
      phone?: string | null;
      college?: string | null;
      department?: string | null;
      year?: string | null;
      password?: string;
      tokenVersion?: number;
    } = {};

    if (name && typeof name === 'string') updateData.name = name.trim().slice(0, 100);
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim().slice(0, 30) : null;
    if (college !== undefined) updateData.college = college ? String(college).trim().slice(0, 120) : null;
    if (department !== undefined) updateData.department = department ? String(department).trim().slice(0, 120) : null;
    if (year !== undefined) updateData.year = year ? String(year).trim().slice(0, 60) : null;

    let rotatedSession = false;

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long.' },
          { status: 400 }
        );
      }

      if (user.password) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: 'Current password is required to change password.' },
            { status: 400 }
          );
        }
        const isCurrentValid = await comparePassword(currentPassword, user.password);
        if (!isCurrentValid) {
          return NextResponse.json(
            { error: 'Incorrect current password.' },
            { status: 400 }
          );
        }
      }

      updateData.password = await hashPassword(newPassword);
      // Increment tokenVersion to invalidate all other active sessions on password change
      updateData.tokenVersion = user.tokenVersion + 1;
      rotatedSession = true;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        tokenVersion: true,
        phone: true,
        college: true,
        department: true,
        year: true,
        avatarUrl: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: rotatedSession
        ? 'Profile and password updated. Other sessions have been signed out.'
        : 'Profile updated successfully',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        emailVerified: updated.emailVerified,
        phone: updated.phone,
        college: updated.college,
        department: updated.department,
        year: updated.year,
        avatarUrl: updated.avatarUrl,
      },
    });

    if (rotatedSession) {
      setSessionCookie(response, {
        userId: updated.id,
        email: updated.email,
        role: (updated.role as 'ADMIN' | 'CUSTOMER') || 'CUSTOMER',
        name: updated.name,
        tokenVersion: updated.tokenVersion,
      });
    }

    return response;
  } catch (err: unknown) {
    console.error('Profile update error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
