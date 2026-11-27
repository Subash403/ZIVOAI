import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { testGoogleSheetsConnection } from '@/lib/google-sheets';

export async function POST(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Administrator privileges required.' }, { status: 401 });
    }

    const result = await testGoogleSheetsConnection();
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error testing Google Sheets connection';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
