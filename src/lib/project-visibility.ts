import type { Project as PrismaProject } from '@prisma/client';

export const PUBLIC_PROJECT_WHERE = {
  published: true,
  available: true,
} as const;

export function isProjectPubliclyVisible(project: { published?: boolean; available?: boolean } | null | undefined): boolean {
  return Boolean(project && project.published === true && project.available === true);
}

function safeParseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export interface PublicProjectDTO {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  technologies: string[];
  difficulty: string;
  projectType: string;
  problemStatement: string | null;
  proposedSolution: string | null;
  features: string[];
  modules: string[];
  expectedOutput: string | null;
  requirements: string | null;
  workflow: string | null;
  prerequisites: string | null;
  setupInstructions: string | null;
  documentation: string | null;
  mainImage: string;
  gallery: string[];
  architectureImage: string | null;
  demoVideo: string | null;
  includedMaterials: string[];
  available: boolean;
  published: boolean;
  featured: boolean;
  salesType: string;
  price: number;
  stockLimit: number | null;
  hasDeliverable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminProjectDTO extends PublicProjectDTO {
  downloadFileName: string | null;
  downloadFileUrl: string | null;
}

/**
 * Explicitly constructs a safe public project DTO.
 * Never exposes internal private storage keys (`downloadFileUrl`, `downloadFileName`)
 * and masks pricing (`price = 0`) for call-based custom projects.
 */
export function toPublicProjectDTO(project: PrismaProject): PublicProjectDTO {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    shortDescription: project.shortDescription,
    fullDescription: project.fullDescription,
    category: project.category,
    technologies: safeParseStringArray(project.technologies),
    difficulty: project.difficulty,
    projectType: project.projectType,
    problemStatement: project.problemStatement,
    proposedSolution: project.proposedSolution,
    features: safeParseStringArray(project.features),
    modules: safeParseStringArray(project.modules),
    expectedOutput: project.expectedOutput,
    requirements: project.requirements,
    workflow: project.workflow,
    prerequisites: project.prerequisites,
    setupInstructions: project.setupInstructions,
    documentation: project.documentation,
    mainImage: project.mainImage,
    gallery: safeParseStringArray(project.gallery),
    architectureImage: project.architectureImage,
    demoVideo: project.demoVideo,
    includedMaterials: safeParseStringArray(project.includedMaterials),
    available: project.available,
    published: project.published,
    featured: project.featured,
    salesType: project.salesType,
    price: project.salesType === 'call' ? 0 : project.price,
    stockLimit: project.stockLimit,
    hasDeliverable: Boolean(project.downloadFileUrl),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function toAdminProjectDTO(project: PrismaProject): AdminProjectDTO {
  return {
    ...toPublicProjectDTO(project),
    price: project.price,
    downloadFileName: project.downloadFileName,
    downloadFileUrl: project.downloadFileUrl,
  };
}
