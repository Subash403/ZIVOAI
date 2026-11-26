'use client';

import { Search, RotateCcw, Sparkles } from 'lucide-react';


interface ProjectFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  selectedProjectType: string;
  setSelectedProjectType: (val: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (val: string) => void;
  selectedSalesType: string;
  setSelectedSalesType: (val: string) => void;
  featuredOnly: boolean;
  setFeaturedOnly: (val: boolean) => void;
  onReset: () => void;
}

export default function ProjectFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedProjectType,
  setSelectedProjectType,
  selectedDifficulty,
  setSelectedDifficulty,
  selectedSalesType,
  setSelectedSalesType,
  featuredOnly,
  setFeaturedOnly,
  onReset,
}: ProjectFiltersProps) {
  const categories = [
    'All',
    'Artificial Intelligence',
    'Machine Learning',
    'Cybersecurity',
    'IoT',
    'Blockchain',
    'Cloud Computing',
    'Generative AI',
  ];

  const projectTypes = ['All', 'Major', 'Minor', 'Mini', 'Research'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const salesTypes = [
    { label: 'All Sales Types', value: 'All' },
    { label: 'Fixed Price', value: 'fixed' },
    { label: 'Discuss on Call', value: 'call' },
  ];

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedProjectType !== 'All' ||
    selectedDifficulty !== 'All' ||
    selectedSalesType !== 'All' ||
    featuredOnly;

  return (
    <div className="glass-panel space-y-4 rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
      {/* Search Input Bar */}
      <div className="relative">
        <Search aria-hidden="true" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          id="catalog-search-input"
          type="search"
          aria-label="Search projects by title, architecture, tech stack, or domain"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by project title, architecture, tech stack, or domain..."
          className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white/90 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 shadow-2xs transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search query"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Select Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Category */}
        <div>
          <label htmlFor="filter-category" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
            Category
          </label>
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-semibold shadow-2xs transition-all cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Project Type */}
        <div>
          <label htmlFor="filter-project-type" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
            Project Type
          </label>
          <select
            id="filter-project-type"
            value={selectedProjectType}
            onChange={(e) => setSelectedProjectType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-semibold shadow-2xs transition-all cursor-pointer"
          >
            {projectTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label htmlFor="filter-difficulty" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
            Complexity Level
          </label>
          <select
            id="filter-difficulty"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-semibold shadow-2xs transition-all cursor-pointer"
          >
            {difficulties.map((diff) => (
              <option key={diff} value={diff}>
                {diff}
              </option>
            ))}
          </select>
        </div>

        {/* Purchase Type */}
        <div>
          <label htmlFor="filter-sales-type" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
            Purchase Type
          </label>
          <select
            id="filter-sales-type"
            value={selectedSalesType}
            onChange={(e) => setSelectedSalesType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-semibold shadow-2xs transition-all cursor-pointer"
          >
            {salesTypes.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Featured Toggle & Reset */}
        <div className="flex items-end gap-2">
          <label htmlFor="filter-featured-only" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-xs text-slate-700 font-semibold cursor-pointer hover:border-indigo-300 w-full justify-center shadow-2xs transition-colors">
            <input
              id="filter-featured-only"
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="accent-indigo-600 w-3.5 h-3.5 rounded"
            />
            <Sparkles aria-hidden="true" className="w-3.5 h-3.5 text-amber-500" />
            <span>Featured Only</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              title="Reset Filters"
              aria-label="Reset all catalog filters"
              className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors shrink-0"
            >
              <RotateCcw aria-hidden="true" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
