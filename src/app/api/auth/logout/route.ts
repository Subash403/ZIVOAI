import { NextResponse } from 'next/server';
import { clearSessionCookie, getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  let allDevices = false;
  try {
    const body = await request.json().catch(() => null);
    allDevices = Boolean(body && typeof body === 'object' && body.allDevices === true);
  } catch {
    allDevices = false;
  }

  if (allDevices) {
    const session = await getAuthSession(request);
    if (session?.userId) {
      await prisma.user
        .update({
          where: { id: session.userId },
          data: { tokenVersion: { increment: 1 } },
        })
        .catch(() => {});
    }
  }

  const response = NextResponse.json({
    success: true,
    message: allDevices ? 'Signed out from all sessions.' : 'Logged out successfully',
  });
  clearSessionCookie(response, 'ALL');
  return response;
}
