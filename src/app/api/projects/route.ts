import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { verifyPrivateUploadFinalizationToken } from '@/lib/storage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getAdminSession();
    const isAdmin = session?.role === 'ADMIN';

    const featuredParam = searchParams.get('featured');
    const category = searchParams.get('category');
    const technology = searchParams.get('technology');
    const projectType = searchParams.get('projectType');
    const difficulty = searchParams.get('difficulty');
    const salesType = searchParams.get('salesType');
    const search = searchParams.get('search');
    const limitParam = searchParams.get('limit');

    const whereClause: Prisma.ProjectWhereInput = {};

    // PUBLIC FILTERING RULE:
    // If request is public (non-admin), ONLY show available and published projects
    if (!isAdmin) {
      whereClause.available = true;
      whereClause.published = true;
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

    // FEATURED RULE:
    // Available + Featured -> appears in Available AND Featured
    // Unavailable + Featured -> must NOT appear in public sections
    if (featuredParam === 'true') {
      whereClause.featured = true;
      if (!isAdmin) {
        whereClause.available = true;
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

    const projectsRaw = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limitParam ? parseInt(limitParam, 10) : undefined,
    });

    const parsedProjects = projectsRaw.map((p) => {
      let parsedTechs: string[] = [];
      let parsedFeatures: string[] = [];
      let parsedModules: string[] = [];
      let parsedGallery: string[] = [];
      let parsedMaterials: string[] = [];

      try { parsedTechs = JSON.parse(p.technologies || '[]'); } catch { parsedTechs = []; }
      try { parsedFeatures = JSON.parse(p.features || '[]'); } catch { parsedFeatures = []; }
      try { parsedModules = JSON.parse(p.modules || '[]'); } catch { parsedModules = []; }
      try { parsedGallery = JSON.parse(p.gallery || '[]'); } catch { parsedGallery = []; }
      try { parsedMaterials = JSON.parse(p.includedMaterials || '[]'); } catch { parsedMaterials = []; }

      // CRITICAL PRICING RULE:
      // The website must NEVER expose pricing for call-based projects to non-admins!
      const finalPrice = !isAdmin && p.salesType === 'call' ? 0 : p.price;

      return {
        ...p,
        price: finalPrice,
        technologies: parsedTechs,
        features: parsedFeatures,
        modules: parsedModules,
        gallery: parsedGallery,
        includedMaterials: parsedMaterials,
      };
    });

    return NextResponse.json({ success: true, projects: parsedProjects });
  } catch (error: unknown) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
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

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    console.error('Error creating project:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
