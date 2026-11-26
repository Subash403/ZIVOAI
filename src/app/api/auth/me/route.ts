import { NextResponse } from 'next/server';
import { getAuthSession, clearSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getAuthSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      tokenVersion: true,
      avatarUrl: true,
      phone: true,
      college: true,
      department: true,
      year: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Enforce session revocation when tokenVersion has been incremented (e.g. password change or logout-all)
  if (session.tokenVersion !== undefined && session.tokenVersion !== user.tokenVersion) {
    const res = NextResponse.json({ authenticated: false, reason: 'session_revoked' }, { status: 401 });
    clearSessionCookie(res, 'ALL');
    return res;
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      college: user.college,
      department: user.department,
      year: user.year,
      createdAt: user.createdAt,
    },
  });
}
