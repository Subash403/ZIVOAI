'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FolderKanban,
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Copy,
  Star,
  PhoneCall,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [salesTypeFilter, setSalesTypeFilter] = useState('All');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProjects(data.projects);
        }
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);


  // Quick Toggle Handler (Available / Published / Featured)
  const handleToggle = async (id: string, field: 'available' | 'published' | 'featured', currentValue: boolean) => {
    try {
      // Optimistic update
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: !currentValue } : p))
      );

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue }),
      });

      if (!res.ok) {
        // Rollback if failed
        fetchProjects();
      }
    } catch {
      fetchProjects();
    }
  };

  // Delete Handler with Confirmation
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Duplicate Project Handler calling dedicated duplicate endpoint
  const handleDuplicate = async (project: Project) => {
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/duplicate`, {
        method: 'POST',
      });

      const data = await res.json();
      if (res.ok && data.project) {
        fetchProjects();
      }
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.technologies.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesSalesType = salesTypeFilter === 'All' || p.salesType === salesTypeFilter;

    return matchesSearch && matchesCategory && matchesSalesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Manage Catalog Projects</h1>
          <p className="text-xs text-slate-500 font-medium">Add, edit, toggle availability, featured status, or commercial pricing</p>
        </div>

        <Link
          href="/admin/projects/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Add Project
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          >
            <option value="All">All Categories</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
            <option value="Machine Learning">Machine Learning</option>
            <option value="Cybersecurity">Cybersecurity</option>
            <option value="IoT">IoT</option>
            <option value="Blockchain">Blockchain</option>
            <option value="Cloud Computing">Cloud Computing</option>
          </select>

          <select
            value={salesTypeFilter}
            onChange={(e) => setSalesTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          >
            <option value="All">All Sales Types</option>
            <option value="fixed">Fixed Price</option>
            <option value="call">Discuss on Call</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Fetching projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FolderKanban className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">No projects found matching query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Category & Tech</th>
                  <th className="p-4">Sales Type & Price</th>
                  <th className="p-4">Availability</th>
                  <th className="p-4">Published</th>
                  <th className="p-4">Featured</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Title & Image */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Image
                          src={project.mainImage || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80'}
                          alt={project.title}
                          width={48}
                          height={48}
                          unoptimized
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />

                        <div className="space-y-0.5">
                          <Link
                            href={`/projects/${project.slug}`}
                            target="_blank"
                            className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1 line-clamp-1 max-w-xs"
                          >
                            {project.title} <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>
                          <span className="text-[10px] text-slate-500 font-mono block">/projects/{project.slug}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category & Tech */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className="font-bold text-indigo-700 block">{project.category}</span>
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.slice(0, 2).map((t, idx) => (
                            <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Sales Type & Price */}
                    <td className="p-4">
                      {project.salesType === 'fixed' ? (
                        <div>
                          <span className="font-bold text-emerald-700 text-sm">{formatCurrency(project.price)}</span>
                          <span className="text-[10px] text-slate-500 font-medium block">(Fixed Price)</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1">
                          <PhoneCall className="w-3 h-3 text-amber-600" /> Discuss on Call
                        </span>
                      )}
                    </td>

                    {/* Availability Toggle */}
                    <td className="p-4">
                      <button
                        onClick={() => handleToggle(project.id, 'available', project.available)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                          project.available
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'
                        }`}
                      >
                        {project.available ? 'Available' : 'Unavailable'}
                      </button>
                    </td>

                    {/* Published Toggle */}
                    <td className="p-4">
                      <button
                        onClick={() => handleToggle(project.id, 'published', project.published)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                          project.published
                            ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                            : 'bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300'
                        }`}
                      >
                        {project.published ? 'Published' : 'Draft / Hidden'}
                      </button>
                    </td>

                    {/* Featured Toggle */}
                    <td className="p-4">
                      <button
                        onClick={() => handleToggle(project.id, 'featured', project.featured)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                          project.featured
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${project.featured ? 'fill-amber-500 text-amber-500' : ''}`} />
                        {project.featured ? 'Featured' : 'Not Featured'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/projects/${project.id}/edit`}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
                          title="Edit Project"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleDuplicate(project)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 border border-slate-200 transition-colors"
                          title="Duplicate Project"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(project.id, project.title)}
                          disabled={deletingId === project.id}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
