import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { validateImageFile } from '@/lib/image-upload-constants';
import { uploadPublicAsset, deletePublicAsset } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const replaceOldUrl = formData.get('replaceOldUrl') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Server-side validation (size, extension, MIME type)
    const validation = validateImageFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // If replacing an old uploaded image, purge previous file safely
    if (replaceOldUrl) {
      await deletePublicAsset(replaceOldUrl);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadPublicAsset({
      buffer,
      originalName: file.name,
      mimeType: file.type || 'image/jpeg',
      folder: 'projects',
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileUrl: result.url,
      storageKey: result.key,
      sizeBytes: result.sizeBytes,
      mimeType: result.mimeType,
      storageType: result.storage,
    });
  } catch (err: unknown) {
    console.error('Image upload error:', err);
    return NextResponse.json({ error: 'Failed to upload image file' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
    }

    const deleted = await deletePublicAsset(fileUrl);
    return NextResponse.json({ success: true, deleted });
  } catch (err: unknown) {
    console.error('Image delete error:', err);
    return NextResponse.json({ error: 'Failed to delete image file' }, { status: 500 });
  }
}
