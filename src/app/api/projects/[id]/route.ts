import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import {
  verifyPrivateUploadFinalizationToken,
  deletePublicAsset,
  deletePrivateAsset,
} from '@/lib/storage';
import { isProjectPubliclyVisible, toAdminProjectDTO, toPublicProjectDTO } from '@/lib/project-visibility';
import { recordAdminAuditLog, safeErrorResponse } from '@/lib/security';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAdminSession(request);
    const isAdmin = session?.role === 'ADMIN';

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: id }, { slug: id }],
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Enforce published && available visibility policy for public viewers (ZAI-003, ZAI-004)
    if (!isAdmin && !isProjectPubliclyVisible(project)) {
      return NextResponse.json({ error: 'Project not available' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project: isAdmin ? toAdminProjectDTO(project) : toPublicProjectDTO(project),
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch project', 500, 'projects:[id]:GET');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(request);
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

    await recordAdminAuditLog({
      actor: session,
      action: 'PROJECT_UPDATE',
      resourceType: 'Project',
      resourceId: updated.id,
      metadata: { title: updated.title, deliverableChanged: changesPrivateDeliverable },
      request,
    });

    return NextResponse.json({ success: true, project: toAdminProjectDTO(updated) });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to update project', 500, 'projects:[id]:PUT');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(request);
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

    await recordAdminAuditLog({
      actor: session,
      action: 'PROJECT_STATUS_PATCH',
      resourceType: 'Project',
      resourceId: updated.id,
      metadata: { available: updated.available, published: updated.published, featured: updated.featured },
      request,
    });

    return NextResponse.json({ success: true, project: toAdminProjectDTO(updated) });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to update project status', 500, 'projects:[id]:PATCH');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const orderCount = project._count?.orders ?? 0;
    if (orderCount > 0) {
      const retired = await prisma.project.update({
        where: { id: project.id },
        data: {
          available: false,
          published: false,
          featured: false,
        },
      });

      try {
        await prisma.wishlistItem.deleteMany({
          where: { projectId: project.id },
        });
      } catch (wishlistErr) {
        console.warn('Failed to clean wishlists during project retirement:', wishlistErr);
      }

      await recordAdminAuditLog({
        actor: session,
        action: 'PROJECT_ARCHIVE',
        resourceType: 'Project',
        resourceId: project.id,
        reason: `Preserved ${orderCount} historical order(s)`,
        metadata: { title: project.title, orderCount },
        request,
      });

      return NextResponse.json({
        success: true,
        action: 'archived',
        message: `Project "${project.title}" has ${orderCount} customer order(s). It has been retired and removed from the public catalog while preserving customer purchase records.`,
        project: retired,
      });
    }

    const publicAssetsToDelete: string[] = [];
    if (project.mainImage) publicAssetsToDelete.push(project.mainImage);
    if (project.architectureImage) publicAssetsToDelete.push(project.architectureImage);

    if (project.gallery) {
      try {
        const galleryItems = JSON.parse(project.gallery);
        if (Array.isArray(galleryItems)) {
          galleryItems.forEach((item) => {
            if (typeof item === 'string' && item) {
              publicAssetsToDelete.push(item);
            }
          });
        }
      } catch {
        // Ignored
      }
    }

    for (const assetUrl of publicAssetsToDelete) {
      try {
        await deletePublicAsset(assetUrl);
      } catch (assetErr) {
        console.warn('Non-fatal error cleaning public project asset:', assetUrl, assetErr);
      }
    }

    // ZAI-022 reference check: only delete private asset if no other project shares the same key
    if (project.downloadFileUrl) {
      try {
        const sharedCount = await prisma.project.count({
          where: {
            downloadFileUrl: project.downloadFileUrl,
            id: { not: project.id },
          },
        });
        if (sharedCount === 0) {
          await deletePrivateAsset(project.downloadFileUrl);
        }
      } catch (delivErr) {
        console.warn('Non-fatal error cleaning private project deliverable:', project.downloadFileUrl, delivErr);
      }
    }

    try {
      await prisma.wishlistItem.deleteMany({
        where: { projectId: project.id },
      });
    } catch (wishlistErr) {
      console.warn('Non-fatal error cleaning wishlists during project deletion:', wishlistErr);
    }

    await prisma.project.delete({
      where: { id: project.id },
    });

    await recordAdminAuditLog({
      actor: session,
      action: 'PROJECT_DELETE',
      resourceType: 'Project',
      resourceId: project.id,
      metadata: { title: project.title },
      request,
    });

    return NextResponse.json({
      success: true,
      action: 'deleted',
      message: `Project "${project.title}" and its storage deliverables were permanently deleted.`,
      projectId: project.id,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to delete project', 500, 'projects:[id]:DELETE');
  }
}
