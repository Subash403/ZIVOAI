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

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by project title, technology, or domain..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Select Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Category */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
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
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Project Type
          </label>
          <select
            value={selectedProjectType}
            onChange={(e) => setSelectedProjectType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
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
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Difficulty Level
          </label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
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
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Purchase Type
          </label>
          <select
            value={selectedSalesType}
            onChange={(e) => setSelectedSalesType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
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
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 font-semibold cursor-pointer hover:border-slate-400 w-full justify-center">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="accent-indigo-600 w-4 h-4"
            />
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Featured</span>
          </label>

          <button
            onClick={onReset}
            title="Reset Filters"
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
