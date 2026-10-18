import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate unique slug for copy
    const baseSlug = `${existing.slug}-copy`;
    let uniqueSlug = baseSlug;
    let count = 1;
    while (await prisma.project.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${count++}`;
    }

    const duplicated = await prisma.project.create({
      data: {
        title: `${existing.title} (Copy)`,
        slug: uniqueSlug,
        shortDescription: existing.shortDescription,
        fullDescription: existing.fullDescription,
        category: existing.category,
        technologies: existing.technologies,
        difficulty: existing.difficulty,
        projectType: existing.projectType,
        problemStatement: existing.problemStatement,
        proposedSolution: existing.proposedSolution,
        features: existing.features,
        modules: existing.modules,
        expectedOutput: existing.expectedOutput,
        requirements: existing.requirements,
        workflow: existing.workflow,
        prerequisites: existing.prerequisites,
        setupInstructions: existing.setupInstructions,
        documentation: existing.documentation,
        mainImage: existing.mainImage,
        gallery: existing.gallery,
        architectureImage: existing.architectureImage,
        demoVideo: existing.demoVideo,
        includedMaterials: existing.includedMaterials,
        available: false, // Default to inactive until reviewed
        published: false, // Default to unpublished
        featured: false,
        salesType: existing.salesType,
        price: existing.price,
        stockLimit: existing.stockLimit,
        downloadFileName: existing.downloadFileName,
        downloadFileUrl: existing.downloadFileUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Project duplicated successfully as draft',
      project: duplicated,
    });
  } catch (error: unknown) {
    console.error('Duplicate project error:', error);
    return NextResponse.json({ error: 'Failed to duplicate project' }, { status: 500 });
  }
}
