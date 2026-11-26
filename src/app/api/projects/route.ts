import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { verifyPrivateUploadFinalizationToken } from '@/lib/storage';
import { PUBLIC_PROJECT_WHERE, toAdminProjectDTO, toPublicProjectDTO } from '@/lib/project-visibility';
import { recordAdminAuditLog, safeErrorResponse } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getAdminSession(request);
    const isAdmin = session?.role === 'ADMIN';

    const featuredParam = searchParams.get('featured');
    const category = searchParams.get('category');
    const technology = searchParams.get('technology');
    const projectType = searchParams.get('projectType');
    const difficulty = searchParams.get('difficulty');
    const salesType = searchParams.get('salesType');
    const search = searchParams.get('search')?.trim();
    const sort = searchParams.get('sort') || 'newest';
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

    const whereClause: Prisma.ProjectWhereInput = {};

    // Centralized PUBLIC VISIBILITY POLICY (ZAI-003, ZAI-004):
    // Non-admin viewers ONLY see projects that are BOTH published AND available.
    if (!isAdmin) {
      Object.assign(whereClause, PUBLIC_PROJECT_WHERE);
    } else {
      const availableParam = searchParams.get('available');
      if (availableParam !== null) {
        whereClause.available = availableParam === 'true';
      }
      const publishedParam = searchParams.get('published');
      if (publishedParam !== null) {
        whereClause.published = publishedParam === 'true';
      }
    }

    if (featuredParam === 'true') {
      whereClause.featured = true;
      if (!isAdmin) {
        Object.assign(whereClause, PUBLIC_PROJECT_WHERE);
      }
    }

    if (category && category !== 'All') {
      whereClause.category = category;
    }

    if (projectType && projectType !== 'All') {
      whereClause.projectType = projectType;
    }

    if (difficulty && difficulty !== 'All') {
      whereClause.difficulty = difficulty;
    }

    if (salesType && salesType !== 'All') {
      whereClause.salesType = salesType;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { shortDescription: { contains: search } },
        { category: { contains: search } },
        { technologies: { contains: search } },
        { problemStatement: { contains: search } },
      ];
    }

    if (technology && technology !== 'All') {
      whereClause.technologies = { contains: technology };
    }

    let orderBy: Prisma.ProjectOrderByWithRelationInput | Prisma.ProjectOrderByWithRelationInput[] = { createdAt: 'desc' };
    if (sort === 'price_asc') {
      orderBy = [{ salesType: 'desc' }, { price: 'asc' }, { createdAt: 'desc' }];
    } else if (sort === 'price_desc') {
      orderBy = [{ salesType: 'desc' }, { price: 'desc' }, { createdAt: 'desc' }];
    } else if (sort === 'featured') {
      orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];
    } else if (sort === 'title_asc') {
      orderBy = { title: 'asc' };
    }

    const hasPagination = Boolean(pageParam || pageSizeParam);
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeParam || '12', 10) || 12));
    const take = hasPagination
      ? pageSize
      : limitParam
      ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 24))
      : undefined;
    const skip = hasPagination ? (page - 1) * pageSize : undefined;

    const [projectsRaw, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        orderBy,
        skip,
        take,
      }),
      prisma.project.count({ where: whereClause }),
    ]);

    const parsedProjects = projectsRaw.map((p) => (isAdmin ? toAdminProjectDTO(p) : toPublicProjectDTO(p)));

    return NextResponse.json({
      success: true,
      projects: parsedProjects,
      pagination: {
        page: hasPagination ? page : 1,
        pageSize: hasPagination ? pageSize : parsedProjects.length || 1,
        totalCount,
        totalPages: hasPagination ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1,
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch projects', 500, 'projects:GET');
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      title,
      shortDescription,
      fullDescription,
      category,
      technologies,
      difficulty,
      projectType,
      problemStatement,
      proposedSolution,
      features,
      modules,
      expectedOutput,
      requirements,
      workflow,
      mainImage,
      gallery,
      architectureImage,
      demoVideo,
      includedMaterials,
      available,
      featured,
      salesType,
      price,
    } = body;

    if (!title || !shortDescription || !category || !mainImage) {
      return NextResponse.json({ error: 'Required project fields missing' }, { status: 400 });
    }

    if (body.downloadFileUrl) {
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

    const baseSlug = slugify(title);
    let uniqueSlug = baseSlug;
    let count = 1;
    while (await prisma.project.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${count++}`;
    }

    const newProject = await prisma.project.create({
      data: {
        title,
        slug: uniqueSlug,
        shortDescription,
        fullDescription: fullDescription || shortDescription,
        category,
        technologies: Array.isArray(technologies) ? JSON.stringify(technologies) : (technologies || '[]'),
        difficulty: difficulty || 'Intermediate',
        projectType: projectType || 'Major',
        problemStatement: problemStatement || null,
        proposedSolution: proposedSolution || null,
        features: Array.isArray(features) ? JSON.stringify(features) : (features || '[]'),
        modules: Array.isArray(modules) ? JSON.stringify(modules) : (modules || '[]'),
        expectedOutput: expectedOutput || null,
        requirements: requirements || null,
        workflow: workflow || null,
        mainImage,
        gallery: Array.isArray(gallery) ? JSON.stringify(gallery) : (gallery || '[]'),
        architectureImage: architectureImage || null,
        demoVideo: demoVideo || null,
        includedMaterials: Array.isArray(includedMaterials) ? JSON.stringify(includedMaterials) : (includedMaterials || '[]'),
        available: available !== undefined ? Boolean(available) : true,
        published: body.published !== undefined ? Boolean(body.published) : true,
        featured: featured !== undefined ? Boolean(featured) : false,
        salesType: salesType || 'fixed',
        price: salesType === 'call' ? 0 : parseFloat(price || 0),
        stockLimit: body.stockLimit !== undefined ? (body.stockLimit === null ? null : parseInt(body.stockLimit)) : null,
        prerequisites: body.prerequisites || null,
        setupInstructions: body.setupInstructions || null,
        documentation: body.documentation || null,
        downloadFileName: body.downloadFileName || null,
        downloadFileUrl: body.downloadFileUrl || null,
      },
    });

    await recordAdminAuditLog({
      actor: session,
      action: 'PROJECT_CREATE',
      resourceType: 'Project',
      resourceId: newProject.id,
      metadata: { title: newProject.title, slug: newProject.slug, salesType: newProject.salesType },
      request,
    });

    return NextResponse.json({ success: true, project: toAdminProjectDTO(newProject) }, { status: 201 });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to create project', 500, 'projects:POST');
  }
}
