'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import ProjectForm from '@/components/ProjectForm';
import { Project } from '@/types';

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.project) {
          setProject(data.project);
        } else {
          setError(data.error || 'Project not found');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading project details for edit...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 text-center glass-card rounded-2xl border border-slate-200 space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Could not fetch project data'}</p>
        <Link href="/admin/projects" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glow-gradient text-white text-xs font-semibold">
          Back to Projects List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/projects"
          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Edit Project</h1>
          <p className="text-xs text-slate-500">Update project details, commercial settings, price, or availability</p>
        </div>
      </div>

      <ProjectForm initialData={project} isEdit={true} />
    </div>
  );
}
