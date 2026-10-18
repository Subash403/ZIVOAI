'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Scale,
  Plus,
  X,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function ProjectComparePage() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.projects)) {
          setAllProjects(data.projects);
          // Pre-select first 2 projects by default if available
          if (data.projects.length >= 2) {
            setSelectedProjects([data.projects[0], data.projects[1]]);
          } else if (data.projects.length === 1) {
            setSelectedProjects([data.projects[0]]);
          }
        }
      })
      .catch((err) => console.error('Failed to load projects for comparison:', err))
      .finally(() => setLoading(false));
  }, []);

  const addProject = (project: Project) => {
    if (selectedProjects.some((p) => p.id === project.id)) return;
    if (selectedProjects.length >= 3) return;
    setSelectedProjects([...selectedProjects, project]);
    setPickerSlot(null);
  };

  const removeProject = (id: string) => {
    setSelectedProjects(selectedProjects.filter((p) => p.id !== id));
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading project comparison tool...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-2">
            <Scale className="w-3.5 h-3.5" />
            Side-by-Side Evaluation
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Compare Final Year Projects
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Compare features, difficulty levels, technology stacks, and deliverables for up to 3 projects.
          </p>
        </div>

        <Link
          href="/projects"
          className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all self-start sm:self-auto"
        >
          Browse All Projects
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Comparison Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Attributes Column */}
          <div className="p-6 bg-slate-50/50 hidden md:block space-y-8 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="h-44 flex items-end font-black text-slate-900 text-sm">Project Details</div>
            <div className="py-2 border-t border-slate-200">Price & Sales Type</div>
            <div className="py-2 border-t border-slate-200">Category</div>
            <div className="py-2 border-t border-slate-200">Difficulty</div>
            <div className="py-2 border-t border-slate-200">Project Type</div>
            <div className="py-2 border-t border-slate-200">Technologies</div>
            <div className="py-2 border-t border-slate-200">Deliverables</div>
            <div className="py-2 border-t border-slate-200">Availability</div>
            <div className="py-4 border-t border-slate-200">Action</div>
          </div>

          {/* Project Columns (Slots 1, 2, 3) */}
          {[0, 1, 2].map((index) => {
            const project = selectedProjects[index];

            if (!project) {
              return (
                <div
                  key={index}
                  className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[350px] bg-slate-50/30"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Add Project {index + 1}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Select a project to compare</p>
                  </div>
                  <button
                    onClick={() => setPickerSlot(index)}
                    className="text-xs font-bold px-4 py-2 rounded-xl border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 transition-all shadow-xs"
                  >
                    Select Project
                  </button>
                </div>
              );
            }

            return (
              <div key={project.id} className="p-6 space-y-8 relative group">
                <button
                  onClick={() => removeProject(project.id)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 transition-all"
                  title="Remove from comparison"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Card Top */}
                <div className="h-44 space-y-3">
                  <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-100 bg-slate-100">
                    <Image
                      src={project.mainImage}
                      alt={project.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="block font-bold text-sm text-slate-900 hover:text-indigo-600 line-clamp-2 transition-colors"
                  >
                    {project.title}
                  </Link>
                </div>

                {/* Price */}
                <div className="py-2 border-t border-slate-100 text-sm font-black text-slate-900">
                  <span className="md:hidden text-xs text-slate-400 font-semibold block">Price: </span>
                  {project.salesType === 'call' ? (
                    <span className="text-emerald-700 text-xs font-bold">Call for Pricing</span>
                  ) : (
                    formatCurrency(project.price)
                  )}
                </div>

                {/* Category */}
                <div className="py-2 border-t border-slate-100 text-xs font-semibold text-slate-700">
                  <span className="md:hidden text-xs text-slate-400 block">Category: </span>
                  {project.category}
                </div>

                {/* Difficulty */}
                <div className="py-2 border-t border-slate-100 text-xs font-bold">
                  <span className="md:hidden text-xs text-slate-400 font-semibold block">Difficulty: </span>
                  <span
                    className={`px-2 py-0.5 rounded-md ${
                      project.difficulty === 'Beginner'
                        ? 'bg-emerald-50 text-emerald-700'
                        : project.difficulty === 'Intermediate'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {project.difficulty}
                  </span>
                </div>

                {/* Project Type */}
                <div className="py-2 border-t border-slate-100 text-xs text-slate-600 font-semibold">
                  <span className="md:hidden text-xs text-slate-400 block">Type: </span>
                  {project.projectType}
                </div>

                {/* Technologies */}
                <div className="py-2 border-t border-slate-100">
                  <span className="md:hidden text-xs text-slate-400 font-semibold block mb-1">Technologies: </span>
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Deliverables */}
                <div className="py-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                  <span className="md:hidden text-xs text-slate-400 font-semibold block">Deliverables: </span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Full Source Code</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>IEEE Report Documentation</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>PPT Presentation Slides</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>1-on-1 Setup Support</span>
                  </div>
                </div>

                {/* Availability */}
                <div className="py-2 border-t border-slate-100 text-xs font-bold">
                  <span className="md:hidden text-xs text-slate-400 font-semibold block">Status: </span>
                  {project.available ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      In Stock & Ready
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Unavailable
                    </span>
                  )}
                </div>

                {/* Action CTA */}
                <div className="py-4 border-t border-slate-100">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all"
                  >
                    View Project
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Selector Modal */}
      {pickerSlot !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Choose a Project to Compare</h3>
              <button
                onClick={() => setPickerSlot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {allProjects
                .filter((p) => !selectedProjects.some((sel) => sel.id === p.id))
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProject(p)}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 flex items-center gap-3 text-left transition-all group"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                      <Image src={p.mainImage} alt={p.title} fill className="object-cover" sizes="48px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {p.category} • {p.difficulty} •{' '}
                        {p.salesType === 'call' ? 'Call for pricing' : formatCurrency(p.price)}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
