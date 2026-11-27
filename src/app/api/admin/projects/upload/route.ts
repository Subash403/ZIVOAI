import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: 'This upload endpoint no longer accepts file bodies. Start a direct upload first.' },
    { status: 410 }
  );
}

export async function PUT(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Direct local upload is disabled in production. Cloudflare R2 storage is required.' },
        { status: 403 }
      );
    }

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

    if (!request.body) {
      return NextResponse.json({ error: 'Empty file body' }, { status: 400 });
    }

    // Stream directly to disk for low memory consumption and high performance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeStream = Readable.fromWeb(request.body as any);
    const fileWriteStream = fs.createWriteStream(targetFilePath);
    await pipeline(nodeStream, fileWriteStream);

    const stats = fs.statSync(targetFilePath);
    return NextResponse.json({ success: true, key, size: stats.size });
  } catch (error) {
    console.error('Local private upload failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to process deliverable upload.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
