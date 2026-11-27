'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  PhoneCall,
  ShoppingCart,
  Star,
  AlertCircle,
  Heart,
  ArrowRight,
  CheckCircle2,
  FileCode2,
} from 'lucide-react';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { BRAND_ASSETS } from '@/lib/brand';

interface ProjectCardProps {
  project: Project;
  onDiscussClick?: (project: Project) => void;
  onBuyClick?: (project: Project) => void;
}

export default function ProjectCard({ project, onDiscussClick, onBuyClick }: ProjectCardProps) {
  const router = useRouter();
  const isFixed = project.salesType === 'fixed';
  const isAvailable =
    project.available &&
    project.published &&
    (project.stockLimit === null || project.stockLimit === undefined || project.stockLimit > 0);

  const [isWishlisted, setIsWishlisted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('pm_wishlist');
      const list: string[] = raw ? JSON.parse(raw) : [];
      return list.includes(project.id);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const raw = localStorage.getItem('pm_wishlist');
        const list: string[] = raw ? JSON.parse(raw) : [];
        setIsWishlisted(list.includes(project.id));
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [project.id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !isWishlisted;
    setIsWishlisted(next);

    try {
      const localWishlistRaw = localStorage.getItem('pm_wishlist');
      let localWishlist: string[] = localWishlistRaw ? JSON.parse(localWishlistRaw) : [];
      if (next) {
        localWishlist = Array.from(new Set([...localWishlist, project.id]));
      } else {
        localWishlist = localWishlist.filter((id) => id !== project.id);
      }
      localStorage.setItem('pm_wishlist', JSON.stringify(localWishlist));

      await fetch('/api/wishlist', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
    } catch {
      // ignore
    }
  };

  const handlePrimaryAction = () => {
    if (isFixed) {
      if (onBuyClick) {
        onBuyClick(project);
      } else {
        router.push(`/checkout/${project.id}`);
      }
    } else {
      if (onDiscussClick) {
        onDiscussClick(project);
      } else {
        router.push('/projects/custom');
      }
    }
  };

  const materialsCount = project.includedMaterials?.length ?? 0;

  return (
    <article className="group zivo-card relative flex h-full flex-col overflow-hidden rounded-xl bg-white">
      {/* Top Image Banner */}
      <Link
        href={`/projects/${project.slug}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-[#F3F4F6]"
      >
        <Image
          src={project.mainImage || BRAND_ASSETS.ogImage}
          alt={project.title}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
          <span className="rounded bg-white/95 px-2.5 py-1 font-heading text-[10px] font-bold uppercase tracking-[0.06em] text-[#0A0A0A] shadow-xs">
            {project.category}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleWishlist}
              aria-pressed={isWishlisted}
              aria-label={isWishlisted ? `Remove ${project.title} from wishlist` : `Save ${project.title} to wishlist`}
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                isWishlisted
                  ? 'border-[#ED1C24] bg-[#ED1C24] text-white shadow-xs'
                  : 'border-white/80 bg-white/95 text-[#4B5563] hover:border-[#ED1C24] hover:text-[#ED1C24]'
              }`}
              title={isWishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
            >
              <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-white' : ''}`} />
            </button>
            <span className="rounded bg-[#0A0A0A]/85 px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-wider text-white">
              {project.projectType}
            </span>
          </div>
        </div>

        {/* Bottom Availability Indicator */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between gap-2">
          <div>
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 rounded bg-[#008C44] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs">
                <CheckCircle2 className="h-3 w-3 text-white" aria-hidden="true" />
                {isFixed ? 'Ready Download' : 'Custom Scope'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-[#ED1C24] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs">
                <AlertCircle className="h-3 w-3 text-white" aria-hidden="true" />
                {project.stockLimit !== null && project.stockLimit !== undefined && project.stockLimit <= 0
                  ? 'Out of Stock'
                  : 'Unavailable'}
              </span>
            )}
          </div>

          {project.featured && (
            <span className="inline-flex items-center gap-1 rounded bg-[#FDB913] px-2 py-0.5 font-heading text-[10px] font-extrabold uppercase tracking-wider text-[#0A0A0A] shadow-xs">
              <Star className="h-3 w-3 fill-[#0A0A0A] text-[#0A0A0A]" aria-hidden="true" />
              Featured
            </span>
          )}
        </div>
      </Link>

      {/* Content Area */}
      <div className="flex flex-grow flex-col justify-between space-y-4 p-5">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#6B7280]">
            <span>{project.difficulty} Level</span>
            {materialsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[#0089CF]">
                <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                {materialsCount} deliverable{materialsCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <Link href={`/projects/${project.slug}`} className="block">
            <h3 className="font-heading text-base font-bold leading-snug text-[#0A0A0A] line-clamp-2 transition-colors group-hover:text-[#0089CF]">
              {project.title}
            </h3>
          </Link>

          <p className="text-xs leading-relaxed text-[#4B5563] line-clamp-2">
            {project.shortDescription}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {project.technologies.slice(0, 4).map((tech, idx) => (
              <span
                key={idx}
                className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-semibold text-[#374151]"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 4 && (
              <span className="px-1 py-0.5 text-[10px] font-semibold text-[#6B7280]">
                +{project.technologies.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Commercial Footer & CTA */}
        <div className="space-y-3 border-t border-[#F3F4F6] pt-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
                {isFixed ? 'Fixed Price' : 'Engagement'}
              </span>
              {isFixed ? (
                <span className="font-heading text-xl font-extrabold text-[#0A0A0A]">
                  {formatCurrency(project.price)}
                </span>
              ) : (
                <span className="font-heading text-xs font-bold text-[#0A0A0A]">
                  Custom Quote on Call
                </span>
              )}
            </div>

            <Link
              href={`/projects/${project.slug}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0089CF] transition-colors hover:text-[#0073B0]"
            >
              <span>View Specs</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>

          {isFixed ? (
            <button
              type="button"
              disabled={!isAvailable}
              onClick={handlePrimaryAction}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#ED1C24] px-4 font-heading text-xs font-bold uppercase tracking-[0.06em] text-white shadow-xs transition-all duration-200 hover:bg-[#D1171F] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4 text-white" aria-hidden="true" />
              <span>{isAvailable ? `Buy Now — ${formatCurrency(project.price)}` : 'Temporarily Unavailable'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 font-heading text-xs font-bold uppercase tracking-[0.06em] text-white shadow-xs transition-all duration-200 hover:bg-[#1F2937] cursor-pointer"
            >
              <PhoneCall className="h-4 w-4 text-[#FDB913]" aria-hidden="true" />
              <span>Request Custom Quote</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
