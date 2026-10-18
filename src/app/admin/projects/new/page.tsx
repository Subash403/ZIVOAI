import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProjectForm from '@/components/ProjectForm';

export default function NewProjectPage() {
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
          <h1 className="text-2xl font-extrabold text-slate-900">Add New Project</h1>
          <p className="text-xs text-slate-500">Create a new fixed-price or custom architecture project</p>
        </div>
      </div>

      <ProjectForm isEdit={false} />
    </div>
  );
}
