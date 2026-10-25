import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  createPrivateUploadFinalizationToken,
  validatePrivateDeliverableUpload,
  verifyPrivatePresignedUpload,
} from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await request.json();
    const upload = {
      key: typeof body.key === 'string' ? body.key : '',
      fileName: typeof body.fileName === 'string' ? body.fileName : '',
      contentType: typeof body.contentType === 'string' ? body.contentType : '',
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
    return NextResponse.json({ error: 'Private upload finalization failed.' }, { status: 500 });
  }
}
