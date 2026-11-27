'use client';

import { Search, RotateCcw, Star } from 'lucide-react';

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
    <div className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs sm:p-6">
      {/* Search Input Bar */}
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
        <input
          id="catalog-search-input"
          type="search"
          aria-label="Search projects by title, architecture, tech stack, or domain"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by project title, architecture, tech stack, or domain..."
          className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2.5 pl-10 pr-16 text-xs text-[#0A0A0A] placeholder-[#9CA3AF] transition-colors focus:border-[#0089CF] focus:bg-white focus:outline-none sm:text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search query"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#E5E7EB] px-2 py-0.5 text-xs font-semibold text-[#374151] transition-colors hover:bg-[#D1D5DB] cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Select Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="filter-category" className="mb-1.5 block font-heading text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
            Category
          </label>
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[#0A0A0A] transition-colors focus:border-[#0089CF] focus:bg-white focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-project-type" className="mb-1.5 block font-heading text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
            Project Type
          </label>
          <select
            id="filter-project-type"
            value={selectedProjectType}
            onChange={(e) => setSelectedProjectType(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[#0A0A0A] transition-colors focus:border-[#0089CF] focus:bg-white focus:outline-none"
          >
            {projectTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-difficulty" className="mb-1.5 block font-heading text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
            Complexity Level
          </label>
          <select
            id="filter-difficulty"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[#0A0A0A] transition-colors focus:border-[#0089CF] focus:bg-white focus:outline-none"
          >
            {difficulties.map((diff) => (
              <option key={diff} value={diff}>
                {diff}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-sales-type" className="mb-1.5 block font-heading text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
            Purchase Type
          </label>
          <select
            id="filter-sales-type"
            value={selectedSalesType}
            onChange={(e) => setSelectedSalesType(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs font-semibold text-[#0A0A0A] transition-colors focus:border-[#0089CF] focus:bg-white focus:outline-none"
          >
            {salesTypes.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <label
            htmlFor="filter-featured-only"
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              featuredOnly
                ? 'border-[#FDB913] bg-[#FFFBEB] text-[#0A0A0A]'
                : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#374151] hover:border-[#0089CF]'
            }`}
          >
            <input
              id="filter-featured-only"
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-[#ED1C24]"
            />
            <Star aria-hidden="true" className="h-3.5 w-3.5 text-[#FDB913] fill-[#FDB913]" />
            <span>Featured</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              title="Reset Filters"
              aria-label="Reset all catalog filters"
              className="shrink-0 cursor-pointer rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-2 text-[#ED1C24] transition-colors hover:bg-[#FEE2E2]"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
