'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Save,
  Loader2,
  AlertCircle,
  Upload,
  Eye,
  CheckCircle2,
  X,
  Package,
  Wrench,
} from 'lucide-react';
import { Project } from '@/types';
import ImageUploadField from '@/components/ImageUploadField';
import GalleryUploadManager from '@/components/GalleryUploadManager';

interface ProjectFormProps {
  initialData?: Project;
  isEdit?: boolean;
}

export default function ProjectForm({ initialData, isEdit }: ProjectFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    shortDescription: initialData?.shortDescription || '',
    fullDescription: initialData?.fullDescription || '',
    category: initialData?.category || 'Artificial Intelligence',
    technologies: initialData?.technologies?.join(', ') || 'Python, PyTorch, React',
    difficulty: initialData?.difficulty || 'Intermediate',
    projectType: initialData?.projectType || 'Major',
    problemStatement: initialData?.problemStatement || '',
    proposedSolution: initialData?.proposedSolution || '',
    features: initialData?.features?.join('\n') || '',
    modules: initialData?.modules?.join('\n') || '',
    expectedOutput: initialData?.expectedOutput || '',
    requirements: initialData?.requirements || '',
    workflow: initialData?.workflow || '',
    prerequisites: initialData?.prerequisites || '',
    setupInstructions: initialData?.setupInstructions || '',
    documentation: initialData?.documentation || '',
    mainImage:
      initialData?.mainImage ||
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    gallery: Array.isArray(initialData?.gallery) ? initialData.gallery : [],
    architectureImage: initialData?.architectureImage || '',
    demoVideo: initialData?.demoVideo || '',
    includedMaterials: initialData?.includedMaterials || [
      'Source Code',
      'Documentation',
      'PPT',
      'Report',
      'Installation Guide',
    ],
    available: initialData?.available !== undefined ? initialData.available : true,
    published: initialData?.published !== undefined ? initialData.published : true,
    featured: initialData?.featured !== undefined ? initialData.featured : false,
    salesType: initialData?.salesType || 'fixed',
    price: initialData?.price || 4999,
    stockLimit: initialData?.stockLimit !== undefined && initialData?.stockLimit !== null ? initialData.stockLimit : '',
    downloadFileName: initialData?.downloadFileName || '',
    downloadFileUrl: initialData?.downloadFileUrl || '',
    downloadFileContentType: '',
    downloadFileSizeBytes: 0,
    downloadUploadToken: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const allMaterials = [
    'Source Code',
    'Documentation',
    'PPT',
    'Research Paper',
    'Report',
    'Dataset',
    'Installation Guide',
    'Customization',
  ];

  const handleMaterialToggle = (material: string) => {
    setFormData((prev) => {
      const exists = prev.includedMaterials.includes(material);
      return {
        ...prev,
        includedMaterials: exists
          ? prev.includedMaterials.filter((m) => m !== material)
          : [...prev.includedMaterials, material],
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadSuccess(null);
    setUploadProgress(0);
    setError(null);

    try {
      const initResponse = await fetch('/api/admin/projects/upload/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
      });
      const initData = await initResponse.json();
      if (!initResponse.ok) {
        throw new Error(initData.error || 'Could not start secure upload');
      }

      await new Promise<void>((resolve, reject) => {
        const upload = new XMLHttpRequest();
        upload.open('PUT', initData.uploadUrl);
        Object.entries(initData.requiredHeaders as Record<string, string>).forEach(([name, value]) => upload.setRequestHeader(name, value));
        upload.upload.onprogress = (event) => {
          if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        upload.onerror = () => reject(new Error('Upload to secure storage failed.'));
        upload.onload = () => (upload.status >= 200 && upload.status < 300 ? resolve() : reject(new Error('Upload to secure storage was rejected.')));
        upload.send(file);
      });

      const finalizeResponse = await fetch('/api/admin/projects/upload/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: initData.key,
          fileName: initData.fileName,
          contentType: initData.contentType,
          sizeBytes: initData.sizeBytes,
        }),
      });
      const finalizeData = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizeData.error || 'Uploaded file could not be verified');
      }

      setFormData((prev) => ({
        ...prev,
        downloadFileName: finalizeData.fileName,
        downloadFileUrl: finalizeData.fileUrl,
        downloadFileContentType: initData.contentType,
        downloadFileSizeBytes: finalizeData.sizeBytes,
        downloadUploadToken: finalizeData.uploadToken,
      }));

      setUploadSuccess(`File uploaded and verified: ${finalizeData.fileName}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'File upload failed');
    } finally {
      setUploadingFile(false);
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        technologies: formData.technologies.split(',').map((t) => t.trim()).filter(Boolean),
        features: formData.features.split('\n').map((f) => f.trim()).filter(Boolean),
        modules: formData.modules.split('\n').map((m) => m.trim()).filter(Boolean),
        gallery: formData.gallery.filter(Boolean),
        price: formData.salesType === 'call' ? 0 : Number(formData.price) || 0,
        stockLimit: formData.stockLimit === '' ? null : Number(formData.stockLimit),
      };

      const url = isEdit ? `/api/projects/${initialData?.id}` : '/api/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save project');
      }

      router.push('/admin/projects');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Basic Information */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600">
              1. Basic Project Metadata
            </h3>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. AI-Powered Autonomous Disease Predictor"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Description (Marketplace Card Summary) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Brief 1-2 sentence overview for catalog cards..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Detailed Description</label>
              <textarea
                rows={4}
                value={formData.fullDescription}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                placeholder="Complete project synopsis, methodology, architecture, and academic scope..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category Domain <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Web Development">Web Development</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="IoT">IoT & Embedded</option>
                <option value="Blockchain">Blockchain</option>
                <option value="Cloud Computing">Cloud Computing</option>
                <option value="Generative AI">Generative AI</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Technologies (Comma separated)
              </label>
              <input
                type="text"
                value={formData.technologies}
                onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                placeholder="Python, PyTorch, React, PostgreSQL"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty Level</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Type</label>
              <select
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Major">Major Final Year</option>
                <option value="Minor">Minor Semester</option>
                <option value="Mini">Mini Project</option>
                <option value="Research">Research / IEEE Journal</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Availability, Pricing & Purchase Controls */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600 pb-3 border-b border-slate-100">
            2. Availability, Pricing & Status Controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Published Status</h4>
                <p className="text-[11px] text-slate-500">Live in public catalog</p>
              </div>
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">In Stock / Available</h4>
                <p className="text-[11px] text-slate-500">Open for orders</p>
              </div>
              <input
                type="checkbox"
                checked={formData.available}
                onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Featured Showcase</h4>
                <p className="text-[11px] text-slate-500">Homepage highlight</p>
              </div>
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Type</label>
              <select
                value={formData.salesType}
                onChange={(e) => setFormData({ ...formData, salesType: e.target.value as 'fixed' | 'call' })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="fixed">Fixed Price (Instant Online Purchase)</option>
                <option value="call">Call-Based (Price on Discussion)</option>
              </select>
            </div>

            {formData.salesType === 'fixed' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price (INR ₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stock / Purchase Limit (Optional)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Leave blank for unlimited"
                value={formData.stockLimit}
                onChange={(e) => setFormData({ ...formData, stockLimit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Digital Asset Upload & Download Delivery */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4" />
            3. Downloadable Project Assets (Private Storage)
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed">
            Attach the compiled project ZIP file (source code, datasets, reports). This file is stored in private backend storage and is only accessible via cryptographic expiring tokens to verified paying students.
          </p>

          <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200/80 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
            <Upload className="w-8 h-8 text-indigo-600" />
            <div>
              <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:underline">
                <span>Upload Project Archive (.zip, .tar.gz, .rar, .7z, .pdf, .docx, .txt)</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".zip,.tar.gz,.rar,.7z,.pdf,.docx,.txt"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">Secure direct upload to private storage. Maximum file size: 2GB.</p>
            </div>
            {uploadingFile && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading to secure storage{uploadProgress !== null ? `: ${uploadProgress}%` : '...'}
              </div>
            )}
            {uploadSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {uploadSuccess}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attached File Name</label>
              <input
                type="text"
                value={formData.downloadFileName}
                onChange={(e) => setFormData({ ...formData, downloadFileName: e.target.value })}
                placeholder="project-source-code.zip"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Storage Key</label>
              <input
                type="text"
                readOnly
                value={formData.downloadFileUrl}
                placeholder="Auto-generated on file upload"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* 4. Setup, Prerequisites & Technical Deliverables */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            4. Execution Setup & Prerequisites
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prerequisites & Software Environment
              </label>
              <textarea
                rows={3}
                value={formData.prerequisites}
                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                placeholder="e.g. Python 3.10+, Node.js 18, GPU with 4GB VRAM for model training"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Step-by-step Execution Instructions
              </label>
              <textarea
                rows={3}
                value={formData.setupInstructions}
                onChange={(e) => setFormData({ ...formData, setupInstructions: e.target.value })}
                placeholder="e.g. 1. pip install -r requirements.txt&#10;2. python train.py&#10;3. python app.py"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Problem Statement (Academic)
              </label>
              <textarea
                rows={3}
                value={formData.problemStatement}
                onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                placeholder="Academic challenge addressed..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proposed Solution & Methodology
              </label>
              <textarea
                rows={3}
                value={formData.proposedSolution}
                onChange={(e) => setFormData({ ...formData, proposedSolution: e.target.value })}
                placeholder="Novel approach, neural network architecture, etc."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 5. Media & Visual Assets */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-8 shadow-xs">
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600">
              5. Media & Visual Assets
            </h3>
            <span className="text-[11px] text-slate-400">
              Supports direct upload (JPG, PNG, WebP) and remote image URLs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUploadField
              label="Main Cover Image"
              description="Showcased on catalog cards, project header, and explore pages (16:9 recommended)."
              required
              value={formData.mainImage}
              onChange={(url) => setFormData((prev) => ({ ...prev, mainImage: url }))}
            />

            <ImageUploadField
              label="Architecture / Methodology Diagram"
              description="System workflow or neural architecture schematic (Optional)."
              value={formData.architectureImage}
              onChange={(url) => setFormData((prev) => ({ ...prev, architectureImage: url }))}
            />
          </div>

          {/* Project Gallery Showcase */}
          <div className="pt-2 border-t border-slate-100">
            <GalleryUploadManager
              galleryUrls={formData.gallery}
              onChange={(urls) => setFormData((prev) => ({ ...prev, gallery: urls }))}
            />
          </div>

          {/* Demo Video Walkthrough */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Demo Video Walkthrough URL (YouTube Embed / MP4)
            </label>
            <input
              type="url"
              value={formData.demoVideo}
              onChange={(e) => setFormData({ ...formData, demoVideo: e.target.value })}
              placeholder="https://www.youtube-nocookie.com/embed/..."
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Optional YouTube embed or video link for customer demonstration.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Checklist of Included Deliverables</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {allMaterials.map((mat) => {
                const isSelected = formData.includedMaterials.includes(mat);
                return (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => handleMaterialToggle(mat)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {mat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.push('/admin/projects')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Update Project' : 'Create & Publish Project'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Project Card Preview</h3>
              <button onClick={() => setShowPreview(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-4 bg-white">
              {formData.mainImage && (
                <div className="relative w-full h-44 rounded-xl overflow-hidden">
                  <Image src={formData.mainImage} alt={formData.title} fill unoptimized className="object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  {formData.category}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {formData.difficulty}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900">{formData.title || 'Untitled Project'}</h4>
              <p className="text-xs text-slate-500 line-clamp-2">{formData.shortDescription || 'No description'}</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-base font-black text-indigo-600">
                  {formData.salesType === 'call' ? 'Price on Call' : `₹${formData.price}`}
                </span>
                <span className="text-xs text-emerald-600 font-bold">100% Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
