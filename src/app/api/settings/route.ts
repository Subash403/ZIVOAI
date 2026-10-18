import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { filterPublicSettings, validateSettingPayload } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getAdminSession();
    const isAdmin = Boolean(session && session.role === 'ADMIN');

    const settingsRaw = await prisma.setting.findMany();
    const settingsObj: Record<string, string> = {};

    settingsRaw.forEach((item) => {
      settingsObj[item.key] = item.value;
    });

    const publicSettings = filterPublicSettings(settingsObj);

    if (isAdmin) {
      // Admins receive full settings including integration IDs
      return NextResponse.json({
        success: true,
        settings: {
          ...publicSettings,
          razorpayKeyId:
            settingsObj.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
          googleSheetId:
            settingsObj.googleSheetId || process.env.GOOGLE_SHEET_ID || '',
        },
      });
    }

    // Public visitors receive ONLY safe, non-sensitive site settings
    return NextResponse.json({ success: true, settings: publicSettings });
  } catch (error: unknown) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const settings = validateSettingPayload(await request.json());

    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        await tx.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Unsupported') || error.message.includes('exceeds'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
