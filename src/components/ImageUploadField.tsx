'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Link as LinkIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  FileImage,
} from 'lucide-react';
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_EXTENSIONS } from '@/lib/image-upload-constants';

interface ImageUploadFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  aspectRatioClass?: string;
  placeholderUrl?: string;
}

export default function ImageUploadField({
  label,
  description,
  value,
  onChange,
  required = false,
  aspectRatioClass = 'aspect-video',
  placeholderUrl = '',
}: ImageUploadFieldProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset feedback
    setError(null);
    setSuccess(null);

    // Client-side quick validation
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      setError(`Invalid file type "${ext}". Supported formats: JPG, JPEG, PNG, WebP.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File size (${mb} MB) exceeds maximum allowed 5 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Execute upload to backend
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (value && value.startsWith('/uploads/projects/')) {
      formData.append('replaceOldUrl', value);
    }

    try {
      const res = await fetch('/api/admin/projects/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      onChange(data.fileUrl);
      setSuccess(`Image uploaded successfully (${(file.size / 1024).toFixed(0)} KB)`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setError(null);
    setSuccess(null);
    const previousUrl = value;
    onChange('');

    // If it was a local uploaded image, clean up from backend storage
    if (previousUrl && previousUrl.startsWith('/uploads/projects/')) {
      try {
        await fetch(`/api/admin/projects/upload-image?url=${encodeURIComponent(previousUrl)}`, {
          method: 'DELETE',
        });
      } catch {
        // Silently continue
      }
    }
  };

  const isLocal = value && value.startsWith('/uploads/projects/');

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-800">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {description && <p className="text-[11px] text-slate-500">{description}</p>}
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1 ${
              mode === 'upload'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3 h-3" /> Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1 ${
              mode === 'url'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3 h-3" /> Image URL
          </button>
        </div>
      </div>

      {/* Error / Success Feedback */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Container */}
      {value ? (
        /* Image Preview State */
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-3 space-y-3 shadow-xs">
          <div className={`relative w-full ${aspectRatioClass} rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200`}>
            {/* Fallback & Image renderer */}
            <Image
              src={value}
              alt={label}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover"
            />

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-md">
                {isLocal ? 'Local Storage' : 'External URL'}
              </span>
            </div>

            {/* Overlay Action Buttons */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => window.open(value, '_blank')}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all"
                title="View Full Image"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-700 text-white backdrop-blur-md transition-all"
                title="Remove Image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <p className="text-[11px] font-mono text-slate-500 truncate max-w-sm sm:max-w-md">
              {value}
            </p>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Replacing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Replace Image</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: Upload File or URL Input */
        <div className="space-y-3">
          {mode === 'upload' ? (
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer"
                 onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">
                  {uploading ? 'Uploading image to server...' : 'Click to upload image'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Supports JPG, JPEG, PNG, or WebP (Max 5MB)
                </p>
              </div>

              <button
                type="button"
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 text-xs font-bold shadow-2xs"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <FileImage className="w-3.5 h-3.5" />
                <span>Select from Computer</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="url"
                  placeholder={placeholderUrl || 'https://images.unsplash.com/... or /uploads/...'}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Paste an external CDN, Unsplash, or public image URL.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
