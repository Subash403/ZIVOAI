'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Project } from '@/types';
import ProjectCard from '@/components/ProjectCard';

export default function WishlistPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let localIds: string[] = [];
      try {
        const raw = localStorage.getItem('pm_wishlist');
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) localIds = parsed.filter((id): id is string => typeof id === 'string');
      } catch {
        localIds = [];
      }

      // Check if signed in; if so, merge guest localStorage wishlist into account (ZAI-049)
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
      const isSignedIn = meRes.ok;

      if (isSignedIn && localIds.length > 0) {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectIds: localIds }),
        }).catch(() => {});
      }

      if (isSignedIn) {
        const res = await fetch('/api/wishlist', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Could not load your saved wishlist.');
        const serverList: Project[] = Array.isArray(data.wishlist) ? data.wishlist : [];
        setProjects(serverList);
        try {
          localStorage.setItem('pm_wishlist', JSON.stringify(serverList.map((p) => p.id)));
        } catch {
          // ignore storage quota errors
        }
      } else if (localIds.length > 0) {
        const projRes = await fetch('/api/projects?pageSize=100');
        const projData = await projRes.json();
        if (!projRes.ok || !projData.success) throw new Error('Could not load saved projects.');
        const matched = (projData.projects || []).filter((p: Project) => localIds.includes(p.id));
        setProjects(matched);
      } else {
        setProjects([]);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load your wishlist right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWishlist();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWishlist]);

  return (
    <main className="zivo-page min-h-screen pt-24 sm:pt-28 pb-20 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="zivo-reveal flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="zivo-eyebrow mb-2">
              <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
              <span>Saved for Later</span>
            </div>
            <h1 className="zivo-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              My Wishlist ({projects.length})
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-normal mt-1">
              Shortlisted projects sync automatically to your account when you sign in.
            </p>
          </div>

          <Link
            href="/projects"
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl glow-gradient text-white shadow-md hover:opacity-95 self-start sm:self-auto"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-mono">Loading your saved projects...</p>
          </div>
        ) : errorMsg ? (
          <div role="alert" className="bg-white rounded-3xl border border-red-200 p-10 text-center max-w-md mx-auto space-y-4">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Could not load wishlist</h2>
            <p className="text-xs text-slate-600">{errorMsg}</p>
            <button
              type="button"
              onClick={loadWishlist}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-12 text-center max-w-md mx-auto space-y-5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center mx-auto border border-pink-100">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your wishlist is empty</h2>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Click the heart icon on any project card to save it here for side-by-side comparison.
              </p>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl glow-gradient text-white shadow-md"
            >
              Browse Projects
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
    </main>
  );
}
