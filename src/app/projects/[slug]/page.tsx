'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  PhoneCall,
  ShoppingCart,
  ShieldCheck,
  FileText,
  Code2,
  Presentation,
  BookOpen,
  Database,
  Wrench,
  Video,
  Layers,
  Star,
  AlertCircle,
  Loader2,
  Heart,
  Scale,
  Terminal,
} from 'lucide-react';
import RequirementModal from '@/components/RequirementModal';
import CheckoutModal from '@/components/CheckoutModal';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function ProjectDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDiscussOpen, setIsDiscussOpen] = useState(false);
  const [isBuyOpen, setIsBuyOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.project) {
          setProject(data.project);
          setSelectedImage(data.project.mainImage);

          // Record to recently viewed projects in localStorage
          try {
            const recentRaw = localStorage.getItem('pm_recent_viewed');
            let recent: string[] = recentRaw ? JSON.parse(recentRaw) : [];
            recent = [data.project.id, ...recent.filter((id) => id !== data.project.id)].slice(0, 6);
            localStorage.setItem('pm_recent_viewed', JSON.stringify(recent));

            // Check wishlist state
            const localWishlistRaw = localStorage.getItem('pm_wishlist');
            const localWishlist: string[] = localWishlistRaw ? JSON.parse(localWishlistRaw) : [];
            if (localWishlist.includes(data.project.id)) {
              setIsWishlisted(true);
            }
          } catch {
            // ignore
          }
        } else {
          setError(data.error || 'Project not found');
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load project';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const toggleWishlist = async () => {
    if (!project) return;
    setWishlistLoading(true);
    const nextState = !isWishlisted;
    setIsWishlisted(nextState);

    try {
      // 1. Update localStorage
      const localWishlistRaw = localStorage.getItem('pm_wishlist');
      let localWishlist: string[] = localWishlistRaw ? JSON.parse(localWishlistRaw) : [];
      if (nextState) {
        localWishlist = Array.from(new Set([...localWishlist, project.id]));
      } else {
        localWishlist = localWishlist.filter((id) => id !== project.id);
      }
      localStorage.setItem('pm_wishlist', JSON.stringify(localWishlist));

      // 2. Sync to server API if logged in
      await fetch('/api/wishlist', {
        method: nextState ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
    } catch {
      // ignore
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center pt-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading project details...</p>
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center pt-20 px-4">
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-lg space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Project Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'This project may be unavailable or has been removed.'}</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glow-gradient text-white text-xs font-semibold shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Projects Catalogue
          </Link>
        </div>
      </main>
    );
  }

  const isFixed = project.salesType === 'fixed';
  const isPurchasable = project.available && project.published && (!project.stockLimit || project.stockLimit > 0);

  const materialsChecklist = [
    { name: 'Source Code', icon: Code2 },
    { name: 'Documentation', icon: FileText },
    { name: 'PPT', icon: Presentation },
    { name: 'Research Paper', icon: BookOpen },
    { name: 'Report', icon: FileText },
    { name: 'Dataset', icon: Database },
    { name: 'Installation Guide', icon: Wrench },
    { name: 'Customization', icon: Sparkles },
  ];

  return (
    <main className="zivo-page min-h-screen text-slate-900 pt-20 sm:pt-24 pb-20">
      {/* Modals */}
      <RequirementModal
        isOpen={isDiscussOpen}
        onClose={() => setIsDiscussOpen(false)}
        project={project}
      />
      <CheckoutModal
        isOpen={isBuyOpen}
        onClose={() => setIsBuyOpen(false)}
        project={project}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Projects
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                isWishlisted
                  ? 'border-pink-300 bg-pink-50 text-pink-600 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-pink-500 text-pink-500' : ''}`} />
              {isWishlisted ? 'Saved' : 'Save to Wishlist'}
            </button>

            <Link
              href="/projects/compare"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs transition-all"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              Compare
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Gallery & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Badges */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {project.category}
                </span>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {project.projectType}
                </span>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  {project.difficulty} Level
                </span>

                {project.featured && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white border border-amber-600 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-white text-white" /> Featured
                  </span>
                )}

                {!project.available && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                    Currently Unavailable
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                {project.title}
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed">
                {project.shortDescription}
              </p>
            </div>

            {/* Image Preview & Gallery */}
            <div className="space-y-4">
              <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                <Image
                  src={selectedImage || project.mainImage}
                  alt={project.title}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              </div>

              {project.gallery && project.gallery.length > 0 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedImage(project.mainImage)}
                    className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImage === project.mainImage ? 'border-indigo-600 scale-105 shadow-md' : 'border-slate-200 opacity-70'
                    }`}
                  >
                    <Image src={project.mainImage} alt="Main" fill unoptimized sizes="80px" className="object-cover" />
                  </button>

                  {project.gallery.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImage === imgUrl ? 'border-indigo-600 scale-105 shadow-md' : 'border-slate-200 opacity-70'
                      }`}
                    >
                      <Image src={imgUrl} alt={`Gallery ${idx}`} fill unoptimized sizes="80px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content Sections */}
            <div className="space-y-8 pt-4 border-t border-slate-200">
              {/* Full Description */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" /> Project Description
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  {project.fullDescription}
                </p>
              </div>

              {/* Problem Statement & Proposed Solution */}
              {(project.problemStatement || project.proposedSolution) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {project.problemStatement && (
                    <div className="p-5 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
                      <h4 className="text-sm font-bold text-red-700">Problem Statement</h4>
                      <p className="text-xs text-slate-700 leading-relaxed">{project.problemStatement}</p>
                    </div>
                  )}

                  {project.proposedSolution && (
                    <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <h4 className="text-sm font-bold text-emerald-800">Proposed Solution</h4>
                      <p className="text-xs text-slate-700 leading-relaxed">{project.proposedSolution}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Key Features */}
              {project.features && project.features.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" /> Key Features & Capabilities
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-800 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modules Breakdown */}
              {project.modules && project.modules.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" /> System Modules Architecture
                  </h3>
                  <div className="space-y-2">
                    {project.modules.map((mod, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium flex items-center gap-3 shadow-xs">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-mono font-bold flex items-center justify-center text-[11px]">
                          {idx + 1}
                        </span>
                        <span>{mod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prerequisites & Setup Instructions */}
              {(project.prerequisites || project.setupInstructions) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {project.prerequisites && (
                    <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-indigo-600" /> Prerequisites & Environment
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {project.prerequisites}
                      </p>
                    </div>
                  )}

                  {project.setupInstructions && (
                    <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                      <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-indigo-600" /> Setup & Execution Guide
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-mono text-[11px]">
                        {project.setupInstructions}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Architecture Diagram */}
              {project.architectureImage && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" /> Architecture Diagram
                  </h3>
                  <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 shadow-xs">
                    <Image
                      src={project.architectureImage}
                      alt="Architecture Diagram"
                      width={1200}
                      height={800}
                      className="w-full h-auto object-contain rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Demo Video */}
              {project.demoVideo && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Video className="w-5 h-5 text-red-600" /> Demo Video Walkthrough
                  </h3>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
                    <iframe
                      src={project.demoVideo}
                      title="Demo Video"
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Tech Stack & System Requirements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Technologies Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech, idx) => (
                      <span key={idx} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white text-slate-800 border border-slate-200 shadow-2xs">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {project.requirements && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">System Requirements</h4>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed shadow-2xs">
                      {project.requirements}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Commercial & Action Sidebar */}
          <div className="space-y-6">
            <div className="sticky top-24 glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200/80 space-y-6 shadow-lg backdrop-blur-2xl">
              {/* Commercial Heading */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Project Purchase</span>
                
                {isFixed ? (
                  <div>
                    <div className="text-3xl font-black text-indigo-600">
                      {formatCurrency(project.price)}
                    </div>
                    {isPurchasable ? (
                      <p className="text-xs text-emerald-600 font-bold mt-1">Instant Online Purchase & Download</p>
                    ) : (
                      <p className="text-xs text-red-600 font-bold mt-1">Currently Out of Stock / Inactive</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-xl font-bold text-amber-800 flex items-center gap-1.5">
                      <PhoneCall className="w-5 h-5 text-amber-600" /> Price: Discuss on Call
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Customization & Research Project</p>
                  </div>
                )}
              </div>

              {/* Action CTAs */}
              <div className="space-y-3">
                {isFixed ? (
                  <button
                    onClick={() => setIsBuyOpen(true)}
                    disabled={!isPurchasable}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl glow-gradient text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {isPurchasable ? 'Buy Now with Razorpay' : 'Currently Unavailable'}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsDiscussOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md transition-all"
                  >
                    <PhoneCall className="w-4 h-4" /> Request a Call
                  </button>
                )}

                <button
                  onClick={() => setIsDiscussOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-all"
                >
                  Ask a Question / Request Customization
                </button>
              </div>

              {/* Included Materials Checklist */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Included Project Materials
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {materialsChecklist.map((mat, idx) => {
                    const Icon = mat.icon;
                    const isIncluded = project.includedMaterials?.includes(mat.name);
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          isIncluded
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-400 line-through opacity-60'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] truncate">{mat.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trust & Guarantee Policies */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-slate-700 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  100% Verified Production Quality
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Includes full source code, complete architecture documentation, PPT presentation slides, and 1-on-1 remote setup support.
                </p>
                <div className="pt-1 border-t border-indigo-100/80 flex items-center justify-between text-[11px] text-indigo-700 font-semibold">
                  <span>⚡ 1-3 Hour Delivery</span>
                  <span>🔒 Secure Razorpay Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
