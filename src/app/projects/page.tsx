'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layers, Frown } from 'lucide-react';
import ProjectCard from '@/components/ProjectCard';
import ProjectFilters from '@/components/ProjectFilters';
import RequirementModal from '@/components/RequirementModal';
import CheckoutModal from '@/components/CheckoutModal';
import { Project } from '@/types';

function ProjectsContent() {
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedProjectType, setSelectedProjectType] = useState(searchParams.get('projectType') || 'All');
  const [selectedDifficulty, setSelectedDifficulty] = useState(searchParams.get('difficulty') || 'All');
  const [selectedSalesType, setSelectedSalesType] = useState(searchParams.get('salesType') || 'All');
  const [featuredOnly, setFeaturedOnly] = useState(searchParams.get('featured') === 'true');

  // Modals
  const [selectedDiscussProject, setSelectedDiscussProject] = useState<Project | null>(null);
  const [selectedBuyProject, setSelectedBuyProject] = useState<Project | null>(null);

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams();

    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedProjectType !== 'All') params.set('projectType', selectedProjectType);
    if (selectedDifficulty !== 'All') params.set('difficulty', selectedDifficulty);
    if (selectedSalesType !== 'All') params.set('salesType', selectedSalesType);
    if (featuredOnly) params.set('featured', 'true');

    fetch(`/api/projects?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setProjects(data.projects);
        }
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [searchQuery, selectedCategory, selectedProjectType, selectedDifficulty, selectedSalesType, featuredOnly]);


  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedProjectType('All');
    setSelectedDifficulty('All');
    setSelectedSalesType('All');
    setFeaturedOnly(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Modals */}
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

      {/* Page Title Header */}
      <div className="zivo-reveal space-y-3 text-center sm:text-left">
        <div className="zivo-eyebrow">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zivo AI Verified Catalog</span>
        </div>
        <h1 className="zivo-display text-4xl font-bold text-slate-900 sm:text-5xl">Explore Production Architectures</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Filter by domain, technology stack, project type, or search by keywords to discover verified AI models, web apps, and IoT systems with instant automated digital delivery.
        </p>
      </div>

      {/* Filters Toolbar */}
      <ProjectFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedProjectType={selectedProjectType}
        setSelectedProjectType={setSelectedProjectType}
        selectedDifficulty={selectedDifficulty}
        setSelectedDifficulty={setSelectedDifficulty}
        selectedSalesType={selectedSalesType}
        setSelectedSalesType={setSelectedSalesType}
        featuredOnly={featuredOnly}
        setFeaturedOnly={setFeaturedOnly}
        onReset={handleResetFilters}
      />

      {/* Project Grid */}
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
      ) : projects.length === 0 ? (
        <div className="py-16 px-6 text-center glass-panel rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Frown className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No projects found matching your filters</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Try adjusting your search keywords, switching categories, or resetting the filter options.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95 transition-all"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>
              Showing <strong className="text-slate-900 font-bold">{projects.length}</strong> available architecture{projects.length !== 1 ? 's' : ''}
            </span>
          </div>

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
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <main className="zivo-page min-h-screen text-slate-900 pb-20 pt-20 sm:pt-24">
      <Suspense fallback={<div className="text-center py-20 text-slate-500 font-mono text-xs">Loading Marketplace...</div>}>
        <ProjectsContent />
      </Suspense>
    </main>
  );
}
