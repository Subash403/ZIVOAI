import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  createPrivatePresignedUpload,
  validatePrivateDeliverableUpload,
  inferDeliverableContentType,
  isR2Configured,
  getPrivateBucketName,
} from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawFileName = typeof body.fileName === 'string' ? body.fileName : '';
    const rawContentType = typeof body.contentType === 'string' ? body.contentType : '';
    const resolvedContentType = inferDeliverableContentType(rawFileName, rawContentType);

    const upload = {
      fileName: rawFileName,
      contentType: resolvedContentType,
      sizeBytes: Number(body.sizeBytes),
    };

    const validationError = validatePrivateDeliverableUpload(upload);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const result = await createPrivatePresignedUpload(upload);
    return NextResponse.json({
      success: true,
      ...result,
      bucket: isR2Configured() ? getPrivateBucketName() : 'local',
      sizeBytes: upload.sizeBytes,
      contentType: upload.contentType,
    });
  } catch (error) {
    console.error('Private upload initialization failed:', error);
    const message = error instanceof Error ? error.message : 'Private upload service is temporarily unavailable.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
