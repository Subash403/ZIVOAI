import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, difficulty, technology, budgetMax } = body;

    const where: Prisma.ProjectWhereInput = {
      published: true,
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
      orderBy: [{ featured: 'desc' }, { available: 'desc' }, { createdAt: 'desc' }],
      take: 12,
    });

    // Parse technologies JSON
    const parsed = projects
      .map((p) => {
        let techArr: string[] = [];
        try {
          techArr = JSON.parse(p.technologies || '[]');
        } catch {
          techArr = [];
        }
        return {
          ...p,
          technologies: techArr,
        };
      })
      .filter((p) => {
        // If a technology was selected, check if it matches in the tech array
        if (technology && technology !== 'Any') {
          const needle = technology.toLowerCase();
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
    console.error('Project finder API error:', error);
    return NextResponse.json({ error: 'Failed to find matching projects' }, { status: 500 });
  }
}
