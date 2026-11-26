'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, Frown, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import ProjectCard from '@/components/ProjectCard';
import ProjectFilters from '@/components/ProjectFilters';
import RequirementModal from '@/components/RequirementModal';
import CheckoutModal from '@/components/CheckoutModal';
import { Project } from '@/types';

const PAGE_SIZE = 12;

function ProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters, Sort & Pagination State (initialized from URL — ZAI-098, ZAI-099)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedProjectType, setSelectedProjectType] = useState(searchParams.get('projectType') || 'All');
  const [selectedDifficulty, setSelectedDifficulty] = useState(searchParams.get('difficulty') || 'All');
  const [selectedSalesType, setSelectedSalesType] = useState(searchParams.get('salesType') || 'All');
  const [featuredOnly, setFeaturedOnly] = useState(searchParams.get('featured') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));

  // Modals
  const [selectedDiscussProject, setSelectedDiscussProject] = useState<Project | null>(null);
  const [selectedBuyProject, setSelectedBuyProject] = useState<Project | null>(null);

  // Debounce text search (300ms — ZAI-098)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedProjectType !== 'All') params.set('projectType', selectedProjectType);
    if (selectedDifficulty !== 'All') params.set('difficulty', selectedDifficulty);
    if (selectedSalesType !== 'All') params.set('salesType', selectedSalesType);
    if (featuredOnly) params.set('featured', 'true');
    if (sortBy && sortBy !== 'newest') params.set('sort', sortBy);
    if (page > 1) params.set('page', String(page));
    return params;
  }, [debouncedSearch, selectedCategory, selectedProjectType, selectedDifficulty, selectedSalesType, featuredOnly, sortBy, page]);

  // Sync URL query params for back/forward restoration (ZAI-098)
  useEffect(() => {
    const urlParams = buildQueryParams();
    const qs = urlParams.toString();
    router.replace(qs ? `/projects?${qs}` : '/projects', { scroll: false });
  }, [buildQueryParams, router]);

  // Fetch projects with AbortController to prevent stale overwrites (ZAI-098, ZAI-100)
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const apiParams = buildQueryParams();
    apiParams.set('page', String(page));
    apiParams.set('pageSize', String(PAGE_SIZE));
    apiParams.set('sort', sortBy);

    const timer = window.setTimeout(() => {
      setLoading(true);
      setFetchError(null);

      fetch(`/api/projects?${apiParams.toString()}`, { signal: controller.signal })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Could not load projects from server.');
          }
          return data;
        })
        .then((data) => {
          setProjects(Array.isArray(data.projects) ? data.projects : []);
          if (data.pagination) {
            setTotalCount(data.pagination.totalCount ?? data.projects.length);
            setTotalPages(data.pagination.totalPages ?? 1);
          } else {
            setTotalCount(data.projects.length);
            setTotalPages(1);
          }
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setFetchError(
            err instanceof Error ? err.message : 'Unable to reach the catalog right now. Please check your connection and retry.'
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [buildQueryParams, page, sortBy, reloadNonce]);

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedProjectType('All');
    setSelectedDifficulty('All');
    setSelectedSalesType('All');
    setFeaturedOnly(false);
    setSortBy('newest');
    setPage(1);
  };

  const activeFilterTags: { label: string; clear: () => void }[] = [];
  if (debouncedSearch) activeFilterTags.push({ label: `Search: "${debouncedSearch}"`, clear: () => setSearchInput('') });
  if (selectedCategory !== 'All') activeFilterTags.push({ label: `Category: ${selectedCategory}`, clear: () => { setSelectedCategory('All'); setPage(1); } });
  if (selectedProjectType !== 'All') activeFilterTags.push({ label: `Type: ${selectedProjectType}`, clear: () => { setSelectedProjectType('All'); setPage(1); } });
  if (selectedDifficulty !== 'All') activeFilterTags.push({ label: `Level: ${selectedDifficulty}`, clear: () => { setSelectedDifficulty('All'); setPage(1); } });
  if (selectedSalesType !== 'All') activeFilterTags.push({ label: `Pricing: ${selectedSalesType === 'fixed' ? 'Fixed Price' : 'Custom Quote'}`, clear: () => { setSelectedSalesType('All'); setPage(1); } });
  if (featuredOnly) activeFilterTags.push({ label: 'Featured Only', clear: () => { setFeaturedOnly(false); setPage(1); } });

  const startIdx = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(totalCount, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <RequirementModal
        isOpen={!!selectedDiscussProject}
        onClose={() => setSelectedDiscussProject(null)}
        project={selectedDiscussProject}
      />
      <CheckoutModal
        isOpen={!!selectedBuyProject}
        onClose={() => setSelectedBuyProject(null)}
        project={selectedBuyProject}
      />

      {/* Page Header */}
      <div className="zivo-reveal space-y-2.5 text-center sm:text-left">
        <div className="zivo-eyebrow">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zivo AI Software Catalog</span>
        </div>
        <h1 className="zivo-display text-3xl font-bold text-slate-900 sm:text-5xl">
          Browse Ready-to-Run Projects
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          Filter by category, tech stack, complexity, or pricing model. Every project detail page lists exact included deliverables and prerequisites.
        </p>
      </div>

      {/* Filters Toolbar */}
      <ProjectFilters
        searchQuery={searchInput}
        setSearchQuery={setSearchInput}
        selectedCategory={selectedCategory}
        setSelectedCategory={(v) => { setSelectedCategory(v); setPage(1); }}
        selectedProjectType={selectedProjectType}
        setSelectedProjectType={(v) => { setSelectedProjectType(v); setPage(1); }}
        selectedDifficulty={selectedDifficulty}
        setSelectedDifficulty={(v) => { setSelectedDifficulty(v); setPage(1); }}
        selectedSalesType={selectedSalesType}
        setSelectedSalesType={(v) => { setSelectedSalesType(v); setPage(1); }}
        featuredOnly={featuredOnly}
        setFeaturedOnly={(v) => { setFeaturedOnly(v); setPage(1); }}
        onReset={handleResetFilters}
      />

      {/* Active Filter Summary Chips (ZAI-048, ZAI-098) */}
      {activeFilterTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Active filters:</span>
          {activeFilterTags.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={tag.clear}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 font-semibold text-indigo-800 hover:bg-indigo-100"
            >
              <span>{tag.label}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-bold text-rose-600 hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results Header: Count Range + Sort Control (ZAI-099) */}
      {!fetchError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <span className="font-mono">
            {loading ? (
              'Updating catalog...'
            ) : (
              <>
                Showing <strong className="text-slate-900">{startIdx}–{endIdx}</strong> of{' '}
                <strong className="text-slate-900">{totalCount}</strong> project{totalCount !== 1 ? 's' : ''}
              </>
            )}
          </span>

          <div className="flex items-center gap-2">
            <label htmlFor="catalog-sort" className="font-semibold text-slate-500">
              Sort by:
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-semibold cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="featured">Featured First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="title_asc">Title: A–Z</option>
            </select>
          </div>
        </div>
      )}

      {/* Distinct Loading / Error / Empty / Results States (ZAI-100) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="zivo-card rounded-3xl overflow-hidden p-6 space-y-4 animate-pulse">
              <div className="aspect-[16/10] bg-slate-200/80 rounded-2xl w-full" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-16 bg-slate-200 rounded-md" />
                <div className="h-6 w-16 bg-slate-200 rounded-md" />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="h-6 w-24 bg-slate-200 rounded" />
                <div className="h-9 w-28 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div
          role="alert"
          className="py-12 px-6 text-center bg-white rounded-3xl border border-red-200 shadow-sm space-y-4 max-w-lg mx-auto"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Unable to load projects</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{fetchError}</p>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Loading Catalog
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-14 px-6 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Frown className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No projects match your current filters</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Try removing one or more filters, broadening your search term, or resetting all filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDiscussClick={(p) => setSelectedDiscussProject(p)}
                onBuyClick={(p) => setSelectedBuyProject(p)}
              />
            ))}
          </div>

          {/* Pagination Controls (ZAI-099) */}
          {totalPages > 1 && (
            <nav
              aria-label="Catalog pagination"
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200 p-4 text-xs"
            >
              <span className="text-slate-600">
                Page <strong className="text-slate-900">{page}</strong> of{' '}
                <strong className="text-slate-900">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <main className="zivo-page min-h-screen text-slate-900 pb-20 pt-24 sm:pt-28">
      <Suspense fallback={<div className="text-center py-20 text-slate-500 font-mono text-xs">Loading Catalog...</div>}>
        <ProjectsContent />
      </Suspense>
    </main>
  );
}
