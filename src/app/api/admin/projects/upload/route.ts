import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { uploadPrivateAsset } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate size (max 100 MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds maximum 100MB limit.' }, { status: 400 });
    }

    // Validate allowed file extensions for deliverables
    const allowedDeliverableExts = ['.zip', '.tar.gz', '.rar', '.7z', '.pdf', '.docx', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isAllowedExt = allowedDeliverableExts.some((ext) => lowerName.endsWith(ext));
    if (!isAllowedExt) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed deliverable archives: .zip, .tar.gz, .rar, .7z, .pdf, .docx, .txt' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadPrivateAsset({
      buffer,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      folder: 'deliverables',
    });

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      fileUrl: result.key, // Object key or local key
      sizeBytes: result.sizeBytes,
      storageType: result.storage,
    });
  } catch (err: unknown) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Failed to upload project asset file' }, { status: 500 });
  }
}
