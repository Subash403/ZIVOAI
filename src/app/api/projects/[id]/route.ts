import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { verifyPrivateUploadFinalizationToken } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAdminSession();
    const isAdmin = session?.role === 'ADMIN';

    // Search by ID or Slug
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: id }, { slug: id }],
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Public rule: Unavailable projects hidden from non-admin viewers
    if (!isAdmin && !project.available) {
      return NextResponse.json({ error: 'Project not available' }, { status: 404 });
    }

    let parsedTechs: string[] = [];
    let parsedFeatures: string[] = [];
    let parsedModules: string[] = [];
    let parsedGallery: string[] = [];
    let parsedMaterials: string[] = [];

    try { parsedTechs = JSON.parse(project.technologies || '[]'); } catch { parsedTechs = []; }
    try { parsedFeatures = JSON.parse(project.features || '[]'); } catch { parsedFeatures = []; }
    try { parsedModules = JSON.parse(project.modules || '[]'); } catch { parsedModules = []; }
    try { parsedGallery = JSON.parse(project.gallery || '[]'); } catch { parsedGallery = []; }
    try { parsedMaterials = JSON.parse(project.includedMaterials || '[]'); } catch { parsedMaterials = []; }

    const finalPrice = !isAdmin && project.salesType === 'call' ? 0 : project.price;

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        price: finalPrice,
        technologies: parsedTechs,
        features: parsedFeatures,
        modules: parsedModules,
        gallery: parsedGallery,
        includedMaterials: parsedMaterials,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const changesPrivateDeliverable =
      body.downloadFileUrl !== undefined &&
      (body.downloadFileUrl !== existing.downloadFileUrl || body.downloadFileName !== existing.downloadFileName);
    if (changesPrivateDeliverable && body.downloadFileUrl) {
      const isVerifiedUpload = verifyPrivateUploadFinalizationToken(body.downloadUploadToken || '', {
        key: body.downloadFileUrl,
        fileName: body.downloadFileName || '',
        contentType: body.downloadFileContentType || '',
        sizeBytes: Number(body.downloadFileSizeBytes),
      });
      if (!isVerifiedUpload) {
        return NextResponse.json({ error: 'Private deliverable must be finalized before saving the project.' }, { status: 400 });
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : existing.title,
        shortDescription: body.shortDescription !== undefined ? body.shortDescription : existing.shortDescription,
        fullDescription: body.fullDescription !== undefined ? body.fullDescription : existing.fullDescription,
        category: body.category !== undefined ? body.category : existing.category,
        technologies: body.technologies !== undefined
          ? (Array.isArray(body.technologies) ? JSON.stringify(body.technologies) : body.technologies)
          : existing.technologies,
        difficulty: body.difficulty !== undefined ? body.difficulty : existing.difficulty,
        projectType: body.projectType !== undefined ? body.projectType : existing.projectType,
        problemStatement: body.problemStatement !== undefined ? body.problemStatement : existing.problemStatement,
        proposedSolution: body.proposedSolution !== undefined ? body.proposedSolution : existing.proposedSolution,
        features: body.features !== undefined
          ? (Array.isArray(body.features) ? JSON.stringify(body.features) : body.features)
          : existing.features,
        modules: body.modules !== undefined
          ? (Array.isArray(body.modules) ? JSON.stringify(body.modules) : body.modules)
          : existing.modules,
        expectedOutput: body.expectedOutput !== undefined ? body.expectedOutput : existing.expectedOutput,
        requirements: body.requirements !== undefined ? body.requirements : existing.requirements,
        workflow: body.workflow !== undefined ? body.workflow : existing.workflow,
        mainImage: body.mainImage !== undefined ? body.mainImage : existing.mainImage,
        gallery: body.gallery !== undefined
          ? (Array.isArray(body.gallery) ? JSON.stringify(body.gallery) : body.gallery)
          : existing.gallery,
        architectureImage: body.architectureImage !== undefined ? body.architectureImage : existing.architectureImage,
        demoVideo: body.demoVideo !== undefined ? body.demoVideo : existing.demoVideo,
        includedMaterials: body.includedMaterials !== undefined
          ? (Array.isArray(body.includedMaterials) ? JSON.stringify(body.includedMaterials) : body.includedMaterials)
          : existing.includedMaterials,
        available: body.available !== undefined ? Boolean(body.available) : existing.available,
        published: body.published !== undefined ? Boolean(body.published) : existing.published,
        featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
        salesType: body.salesType !== undefined ? body.salesType : existing.salesType,
        price: body.salesType === 'call' ? 0 : (body.price !== undefined ? parseFloat(body.price) : existing.price),
        stockLimit: body.stockLimit !== undefined ? (body.stockLimit === null ? null : parseInt(body.stockLimit)) : existing.stockLimit,
        prerequisites: body.prerequisites !== undefined ? body.prerequisites : existing.prerequisites,
        setupInstructions: body.setupInstructions !== undefined ? body.setupInstructions : existing.setupInstructions,
        documentation: body.documentation !== undefined ? body.documentation : existing.documentation,
        downloadFileName: body.downloadFileName !== undefined ? body.downloadFileName : existing.downloadFileName,
        downloadFileUrl: body.downloadFileUrl !== undefined ? body.downloadFileUrl : existing.downloadFileUrl,
      },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update project';
    console.error('Error updating project:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updateData: Prisma.ProjectUpdateInput = {};
    if (body.available !== undefined) updateData.available = Boolean(body.available);
    if (body.published !== undefined) updateData.published = Boolean(body.published);
    if (body.featured !== undefined) updateData.featured = Boolean(body.featured);
    if (body.stockLimit !== undefined) updateData.stockLimit = body.stockLimit === null ? null : parseInt(body.stockLimit);

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: unknown) {
    console.error('Error toggling project status:', error);
    return NextResponse.json({ error: 'Failed to update project status' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
