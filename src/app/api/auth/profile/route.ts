import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession, comparePassword, hashPassword } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
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

    const updateData: {
      name?: string;
      phone?: string;
      college?: string;
      department?: string;
      year?: string;
      password?: string;
    } = {};

    if (name && typeof name === 'string') updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null as unknown as string;
    if (college !== undefined) updateData.college = college ? String(college).trim() : null as unknown as string;
    if (department !== undefined) updateData.department = department ? String(department).trim() : null as unknown as string;
    if (year !== undefined) updateData.year = year ? String(year).trim() : null as unknown as string;

    // Handle password change
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      // If user had a password previously, verify current password
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
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        college: true,
        department: true,
        year: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updated,
    });
  } catch (err: unknown) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
