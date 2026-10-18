'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Eye,
  Images,
} from 'lucide-react';
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_EXTENSIONS } from '@/lib/image-upload-constants';

interface GalleryUploadManagerProps {
  galleryUrls: string[];
  onChange: (urls: string[]) => void;
}

export default function GalleryUploadManager({
  galleryUrls,
  onChange,
}: GalleryUploadManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        errors.push(`"${file.name}": Unsupported format.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        errors.push(`"${file.name}": Exceeds 5MB limit.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/projects/upload-image', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.fileUrl) {
          uploadedUrls.push(data.fileUrl);
        } else {
          errors.push(`"${file.name}": ${data.error || 'Upload failed'}`);
        }
      } catch {
        errors.push(`"${file.name}": Network error during upload.`);
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...galleryUrls, ...uploadedUrls]);
    }

    if (errors.length > 0) {
      setError(errors.join(' | '));
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddUrl = () => {
    if (!customUrl.trim()) return;
    const trimmed = customUrl.trim();
    if (!galleryUrls.includes(trimmed)) {
      onChange([...galleryUrls, trimmed]);
    }
    setCustomUrl('');
    setShowUrlInput(false);
  };

  const handleRemove = async (indexToRemove: number) => {
    const targetUrl = galleryUrls[indexToRemove];
    const nextList = galleryUrls.filter((_, idx) => idx !== indexToRemove);
    onChange(nextList);

    // If local uploaded image, clean up file
    if (targetUrl && targetUrl.startsWith('/uploads/projects/')) {
      try {
        await fetch(`/api/admin/projects/upload-image?url=${encodeURIComponent(targetUrl)}`, {
          method: 'DELETE',
        });
      } catch {
        // Silently continue
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Images className="w-4 h-4 text-indigo-600" />
            Project Gallery Showcase
          </label>
          <p className="text-[11px] text-slate-500">
            Upload multiple screenshots, benchmark graphs, or UI previews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleFilesUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-2xs"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Images</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add by URL</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {showUrlInput && (
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://example.com/gallery-screenshot.jpg"
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Thumbnails Grid */}
      {galleryUrls.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {galleryUrls.map((imgUrl, idx) => {
            const isLocal = imgUrl.startsWith('/uploads/projects/');
            return (
              <div
                key={idx}
                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video shadow-2xs"
              >
                <Image
                  src={imgUrl}
                  alt={`Gallery image ${idx + 1}`}
                  fill
                  unoptimized
                  sizes="180px"
                  className="object-cover"
                />

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(imgUrl, '_blank')}
                    className="p-1 rounded-md bg-white/80 hover:bg-white text-slate-900"
                    title="View Full Image"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
                    title="Remove from Gallery"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isLocal && (
                  <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded bg-black/70 text-white">
                    Local
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-slate-300 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <Images className="w-8 h-8 text-slate-400 mx-auto mb-1" />
          <p className="text-xs font-semibold text-slate-600">No gallery images added yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Click or upload multiple project screenshots</p>
        </div>
      )}
    </div>
  );
}
