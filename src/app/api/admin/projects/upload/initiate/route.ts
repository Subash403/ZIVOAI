import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { createPrivatePresignedUpload, validatePrivateDeliverableUpload } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await request.json();
    const upload = {
      fileName: typeof body.fileName === 'string' ? body.fileName : '',
      contentType: typeof body.contentType === 'string' ? body.contentType : '',
      sizeBytes: Number(body.sizeBytes),
    };
    const validationError = validatePrivateDeliverableUpload(upload);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const result = await createPrivatePresignedUpload(upload);
    return NextResponse.json({ success: true, ...result, sizeBytes: upload.sizeBytes, contentType: upload.contentType });
  } catch (error) {
    console.error('Private upload initialization failed:', error);
    return NextResponse.json({ error: 'Private upload service is temporarily unavailable.' }, { status: 503 });
  }
}
