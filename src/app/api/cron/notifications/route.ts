import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { processDueOrderNotifications } from '@/lib/payment-fulfillment';
import { safeErrorResponse } from '@/lib/security';

function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: Request) {
  try {
    const cronAuthorized = isAuthorizedCronRequest(request);
    const adminSession = cronAuthorized ? null : await getAdminSession(request);
    if (!cronAuthorized && (!adminSession || adminSession.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized worker trigger' }, { status: 401 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin;
    const summary = await processDueOrderNotifications(origin, 25);

    return NextResponse.json({
      success: true,
      ...summary,
      ranAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to process scheduled notifications', 500, 'cron:notifications');
  }
}
