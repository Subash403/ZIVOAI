'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  Zap,
  Terminal,
  FileCheck,
} from 'lucide-react';
import { PublicSettings } from '@/lib/settings';

interface ProjectHeroProps {
  settings?: PublicSettings | null;
}

export default function ProjectHero({ settings }: ProjectHeroProps = {}) {
  return (
    <section className="relative flex flex-col justify-center overflow-hidden border-b border-slate-200/80 bg-transparent px-4 pt-4 pb-8 sm:px-6 sm:pt-6 sm:pb-10 lg:px-8 lg:pt-8 lg:pb-12">
      {/* Background Subtle Tech Ambient Glow */}
      <div className="absolute inset-0 bg-radial-[at_50%_20%] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Hero Copy & Actions */}
        <div className="space-y-5 text-left lg:col-span-7">
          {/* Top Tech Badge */}
          <div className="zivo-eyebrow zivo-reveal">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span className="font-bold tracking-wide">
              {settings?.heroBadgeText || 'Modern AI & Software Engineering Platform'}
            </span>
          </div>

          {/* Main Cinematic Heading */}
          <div className="zivo-reveal zivo-reveal-delay-1 space-y-1">
            <h1 className="zivo-display text-4xl font-extrabold leading-[1.06] text-slate-900 sm:text-5xl lg:text-6xl tracking-tight">
              {settings?.heroHeading ? (
                <span>{settings.heroHeading}</span>
              ) : (
                <>
                  Production-Ready AI & Full-Stack Projects with{' '}
                  <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent">
                    Instant Delivery.
                  </span>
                </>
              )}
            </h1>
          </div>

          {/* Supporting Pitch Text */}
          <p className="zivo-reveal zivo-reveal-delay-2 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg font-normal">
            {settings?.heroSubheading ||
              'Discover, benchmark, and deploy verified AI agents, machine learning pipelines, full-stack web applications, and software architectures with complete source code & live documentation.'}
          </p>

          {/* Key Value Prop Highlights */}
          <div className="zivo-reveal zivo-reveal-delay-2 grid grid-cols-2 gap-2.5 pt-1 text-xs font-semibold text-slate-700 sm:grid-cols-3">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 border border-slate-200/90 shadow-2xs backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Tested Runtimes</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 border border-slate-200/90 shadow-2xs backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Full Architecture Docs</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 border border-slate-200/90 shadow-2xs backdrop-blur-sm col-span-2 sm:col-span-1">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Instant Digital Delivery</span>
            </div>
          </div>

          {/* Primary & Secondary Action CTAs */}
          <div className="zivo-reveal zivo-reveal-delay-3 flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl glow-gradient text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Rocket className="w-4 h-4" />
              <span>{settings?.heroPrimaryButtonText || 'Explore Project Catalog'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/projects/custom"
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-slate-200/90 text-sm font-bold shadow-2xs hover:border-indigo-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{settings?.heroSecondaryButtonText || 'Request Custom Architecture'}</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Clean Architectural Code & Deliverable Preview */}
        <div className="zivo-reveal zivo-reveal-delay-2 flex w-full items-center justify-center lg:col-span-5">
          <div className="w-full max-w-md overflow-hidden rounded-2xl dark-panel shadow-2xl transition-transform duration-300 hover:-translate-y-1">
            {/* Terminal Top Window Bar */}
            <div className="px-4 py-3 bg-slate-900/90 text-slate-300 flex items-center justify-between border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="font-mono text-[11px] text-slate-400 ml-2">zivo-platform • architecture.ts</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE
              </span>
            </div>

            {/* Code / Architecture Snippet */}
            <div className="p-5 font-mono text-[11.5px] leading-relaxed bg-[#090d16] text-slate-300 space-y-1.5 select-none overflow-x-auto">
              <div className="text-slate-500">{'// Zivo AI Verified Production Engine'}</div>
              <div>
                <span className="text-indigo-400">const</span>{' '}
                <span className="text-cyan-300">verifiedProject</span> ={' '}
                <span className="text-indigo-400">await</span>{' '}
                <span className="text-amber-300">ZivoEngine</span>.
                <span className="text-blue-400">benchmark</span>({'{'}
              </div>
              <div className="pl-4">
                <span className="text-slate-400">architecture</span>:{' '}
                <span className="text-emerald-300">&quot;Production RAG & Multi-Agent&quot;</span>,
              </div>
              <div className="pl-4">
                <span className="text-slate-400">runtimes</span>:{' '}
                <span className="text-emerald-300">&quot;PyTorch 2.2 • Next.js 16 • FastAPI&quot;</span>,
              </div>
              <div className="pl-4">
                <span className="text-slate-400">deliverables</span>: [
                <span className="text-amber-200">&quot;Source Code&quot;</span>,{' '}
                <span className="text-amber-200">&quot;IEEE Report&quot;</span>,{' '}
                <span className="text-amber-200">&quot;Deck&quot;</span>],
              </div>
              <div className="pl-4">
                <span className="text-slate-400">fulfillment</span>:{' '}
                <span className="text-indigo-400">&quot;Instant Automated Delivery&quot;</span>
              </div>
              <div>{'}'});</div>
              <div className="pt-2 text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Verification: 100% Tested & Complete</span>
              </div>
            </div>

            {/* Bottom Delivery Features */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Pre-compiled Environment
                </span>
                <span className="text-[11px] font-bold text-slate-200">Python 3.10+ / Node 20+</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Deliverables Included
                </span>
                <span className="text-[11px] font-bold text-slate-200">Full Code + Schemas + PPT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
