import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { filterPublicSettings, validateSettingPayload } from '@/lib/settings';
import { recordAdminAuditLog } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession(request);
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
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const settings = validateSettingPayload(await request.json());

    const existingRows = await prisma.setting.findMany({
      where: { key: { in: Object.keys(settings) } },
    });
    const previousMap: Record<string, string> = {};
    for (const row of existingRows) {
      previousMap[row.key] = row.value;
    }

    const changedKeys = Object.entries(settings)
      .filter(([k, v]) => previousMap[k] !== v)
      .map(([k]) => k);

    const upsertOperations = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await prisma.$transaction(upsertOperations);

    if (changedKeys.length > 0) {
      await recordAdminAuditLog({
        actor: session,
        action: 'SETTINGS_UPDATE',
        resourceType: 'Setting',
        metadata: {
          changedKeys,
          previousValues: Object.fromEntries(changedKeys.map((k) => [k, previousMap[k] ?? null])),
        },
        request,
      });
    }

    return NextResponse.json({
      success: true,
      changedKeys,
      message: `Settings saved successfully (${changedKeys.length} field(s) updated).`,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update settings';
    console.error('Error updating settings:', error);
    const isClientError =
      error instanceof Error &&
      (error.message.startsWith('Invalid') ||
        error.message.startsWith('Unsupported') ||
        error.message.includes('exceeds'));
    return NextResponse.json(
      { error: errorMsg },
      { status: isClientError ? 400 : 500 }
    );
  }
}

