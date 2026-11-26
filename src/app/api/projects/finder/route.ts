import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PUBLIC_PROJECT_WHERE, toPublicProjectDTO } from '@/lib/project-visibility';
import { safeErrorResponse } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, difficulty, technology, budgetMax } = body;

    // Centralized PUBLIC VISIBILITY POLICY: both published AND available required (ZAI-003, ZAI-004)
    const where: Prisma.ProjectWhereInput = {
      ...PUBLIC_PROJECT_WHERE,
    };

    if (difficulty && difficulty !== 'Any') {
      where.difficulty = { equals: difficulty };
    }

    if (category && category !== 'Any') {
      where.category = { contains: category };
    }

    if (budgetMax && Number(budgetMax) > 0) {
      where.OR = [
        { price: { lte: Number(budgetMax) } },
        { salesType: 'call' },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 12,
    });

    const parsed = projects
      .map((p) => toPublicProjectDTO(p))
      .filter((p) => {
        if (technology && technology !== 'Any') {
          const needle = String(technology).toLowerCase();
          const matches = p.technologies.some((t: string) => t.toLowerCase().includes(needle));
          return matches || p.fullDescription.toLowerCase().includes(needle);
        }
        return true;
      });

    return NextResponse.json({
      success: true,
      count: parsed.length,
      projects: parsed,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to find matching projects', 500, 'projects:finder');
  }
}
