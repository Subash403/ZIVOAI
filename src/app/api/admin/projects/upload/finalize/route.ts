import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  createPrivateUploadFinalizationToken,
  validatePrivateDeliverableUpload,
  verifyPrivatePresignedUpload,
  inferDeliverableContentType,
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
      key: typeof body.key === 'string' ? body.key : '',
      fileName: rawFileName,
      contentType: resolvedContentType,
      sizeBytes: Number(body.sizeBytes),
    };

    const validationError = validatePrivateDeliverableUpload(upload);
    if (validationError || !upload.key.startsWith('deliverables/')) {
      return NextResponse.json({ error: validationError || 'Invalid private upload key.' }, { status: 400 });
    }

    if (!(await verifyPrivatePresignedUpload(upload))) {
      return NextResponse.json({ error: 'Uploaded deliverable could not be verified.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      fileName: upload.fileName,
      fileUrl: upload.key,
      sizeBytes: upload.sizeBytes,
      uploadToken: createPrivateUploadFinalizationToken(upload),
    });
  } catch (error) {
    console.error('Private upload finalization failed:', error);
    const message = error instanceof Error ? error.message : 'Private upload finalization failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
