'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PhoneCall, ShoppingCart, Star, AlertCircle, Heart, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onDiscussClick?: (project: Project) => void;
  onBuyClick?: (project: Project) => void;
}

export default function ProjectCard({ project, onDiscussClick, onBuyClick }: ProjectCardProps) {
  const router = useRouter();
  const isFixed = project.salesType === 'fixed';
  const isAvailable = project.available && project.published && (!project.stockLimit || project.stockLimit > 0);
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

  return (
    <div className="group zivo-card relative flex h-full flex-col overflow-hidden rounded-3xl bg-white">
      {/* Top Image Banner */}
      <Link href={`/projects/${project.slug}`} className="relative block aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <Image
          src={project.mainImage || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80'}
          alt={project.title}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white/95 text-slate-800 border border-slate-200/80 shadow-xs backdrop-blur-md">
            {project.category}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleWishlist}
              className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all ${
                isWishlisted
                  ? 'bg-pink-600 text-white border-pink-500 shadow-xs'
                  : 'bg-white/90 hover:bg-white text-slate-600 hover:text-pink-600 border-slate-200'
              }`}
              title="Save to Wishlist"
              aria-label="Save to Wishlist"
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white' : ''}`} />
            </button>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/80 text-white backdrop-blur-md">
              {project.projectType}
            </span>
          </div>
        </div>

        {/* Bottom Banner Indicators */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div>
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="w-3 h-3 text-white" />
                Available • 1-3h Delivery
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                <AlertCircle className="w-3 h-3 text-white" />
                {project.stockLimit !== null && project.stockLimit !== undefined && project.stockLimit <= 0
                  ? 'Out of Stock'
                  : 'Unavailable'}
              </span>
            )}
          </div>

          {project.featured && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white flex items-center gap-1 shadow-xs">
              <Star className="w-3 h-3 fill-white text-white" /> Featured
            </span>
          )}
        </div>
      </Link>

      {/* Content Area */}
      <div className="flex flex-grow flex-col justify-between space-y-4 p-5 sm:p-6">
        <div className="space-y-2">
          {/* Title */}
          <Link href={`/projects/${project.slug}`} className="block group-hover:text-indigo-600 transition-colors">
            <h3 className="text-base font-bold leading-snug text-slate-900 transition-colors line-clamp-2 sm:text-lg">
              {project.title}
            </h3>
          </Link>

          {/* Short Description */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {project.shortDescription}
          </p>

          {/* Technologies Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {project.technologies.slice(0, 4).map((tech, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 4 && (
              <span className="text-[10px] text-slate-500 font-medium px-1 py-0.5">
                +{project.technologies.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Commercial Section & Primary Action */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          {/* Price Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Deliverable Price</span>
              {isFixed ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-900">
                    {formatCurrency(project.price)}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-0.5">
                    <Zap className="w-3 h-3 text-emerald-600" /> Instant Access
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-700">
                  Custom Scope on Call
                </span>
              )}
            </div>

            <Link
              href={`/projects/${project.slug}`}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1 transition-colors"
            >
              Specs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Primary Action Button */}
          {isFixed ? (
            <button
              disabled={!isAvailable}
              onClick={handlePrimaryAction}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold py-3 px-4 rounded-xl glow-gradient text-white shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span>{isAvailable ? `Get Codebase — ${formatCurrency(project.price)}` : 'Temporarily Unavailable'}</span>
            </button>
          ) : (
            <button
              onClick={handlePrimaryAction}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-[0.99] transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 text-indigo-400" />
              <span>Request Custom Architecture Quote</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
