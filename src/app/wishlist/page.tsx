'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight, Loader2 } from 'lucide-react';
import { Project } from '@/types';
import ProjectCard from '@/components/ProjectCard';

export default function WishlistPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try fetching from server API for logged in users
    fetch('/api/wishlist')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.wishlist) && data.wishlist.length > 0) {
          setProjects(data.wishlist);
        } else {
          // 2. Fallback to localStorage wishlist IDs
          try {
            const localWishlistRaw = localStorage.getItem('pm_wishlist');
            const localIds: string[] = localWishlistRaw ? JSON.parse(localWishlistRaw) : [];
            if (localIds.length > 0) {
              fetch('/api/projects')
                .then((r) => r.json())
                .then((projData) => {
                  if (projData.success && Array.isArray(projData.projects)) {
                    const matched = projData.projects.filter((p: Project) => localIds.includes(p.id));
                    setProjects(matched);
                  }
                });
            }
          } catch {
            // ignore localStorage parse error
          }
        }
      })
      .catch((err) => console.error('Wishlist error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full mb-2">
            <Heart className="w-3.5 h-3.5 fill-pink-500" />
            Saved for Later
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Wishlist ({projects.length})
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Keep track of projects you are shortlisting for your final semester review.
          </p>
        </div>

        <Link
          href="/projects"
          className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all self-start sm:self-auto"
        >
          Explore More Projects
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading your saved projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center mx-auto shadow-xs">
            <Heart className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Your wishlist is empty</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Click the heart icon on any project card to save it here for easy access and side-by-side evaluation.
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20"
          >
            Browse Verified Projects
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
