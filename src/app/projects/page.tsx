'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layers, Loader2, Frown } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zivo AI Verified Catalog</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900">Explore Production Architectures</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
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
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto">
          <Frown className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No projects found matching your filters</h3>
          <p className="text-xs text-slate-500">Try clearing some search terms or resetting the filter options.</p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl glow-gradient text-white text-xs font-semibold shadow-md"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-600 font-medium">
            Showing <span className="text-slate-900 font-bold">{projects.length}</span> available project{projects.length !== 1 ? 's' : ''}
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
    <main className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-20">
      <Suspense fallback={<div className="text-center py-20 text-slate-500">Loading Marketplace...</div>}>
        <ProjectsContent />
      </Suspense>
    </main>
  );
}
