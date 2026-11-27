import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminSession } from '@/lib/auth';

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: 'This upload endpoint no longer accepts file bodies. Start a direct upload first.' },
    { status: 410 }
  );
}

export async function PUT(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key || !key.startsWith('deliverables/')) {
      return NextResponse.json({ error: 'Invalid upload key' }, { status: 400 });
    }

    const storageDir = path.join(process.cwd(), 'storage', 'private-downloads');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const localFileName = path.basename(key);
    const targetFilePath = path.join(storageDir, localFileName);

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(targetFilePath, buffer);

    return NextResponse.json({ success: true, key, size: buffer.length });
  } catch (error) {
    console.error('Local private upload failed:', error);
    return NextResponse.json({ error: 'Failed to process deliverable upload.' }, { status: 500 });
  }
}
