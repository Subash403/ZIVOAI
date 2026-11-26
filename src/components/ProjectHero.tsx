'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  Terminal,
  FileCheck,
  Lock,
} from 'lucide-react';
import { PublicSettings } from '@/lib/settings';

interface ProjectHeroProps {
  settings?: PublicSettings | null;
}

export default function ProjectHero({ settings }: ProjectHeroProps = {}) {
  return (
    <section className="relative flex flex-col justify-center overflow-hidden border-b border-slate-200/80 bg-transparent px-4 pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-12 lg:px-8 lg:pt-8 lg:pb-14">
      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Customer-Outcome Copy & Clear CTA Hierarchy (ZAI-039, ZAI-045, ZAI-096) */}
        <div className="space-y-5 text-left lg:col-span-7">
          <div className="zivo-eyebrow zivo-reveal">
            <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" aria-hidden="true" />
            <span className="font-bold tracking-wide">
              {settings?.heroBadgeText || 'AI & Full-Stack Software Marketplace'}
            </span>
          </div>

          <div className="zivo-reveal zivo-reveal-delay-1 space-y-1">
            <h1 className="zivo-display text-4xl font-extrabold leading-[1.08] text-slate-900 sm:text-5xl lg:text-[3.4rem] tracking-tight">
              {settings?.heroHeading ? (
                <span>{settings.heroHeading}</span>
              ) : (
                <>
                  Buy Ready-to-Run AI &amp; Full-Stack Projects{' '}
                  <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent">
                    With Full Source Code.
                  </span>
                </>
              )}
            </h1>
          </div>

          <p className="zivo-reveal zivo-reveal-delay-2 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg font-normal">
            {settings?.heroSubheading ||
              'Browse fixed-price AI, machine learning, and web codebases with listed deliverables and setup guides — or commission a custom build with 8-stage progress tracking.'}
          </p>

          {/* Concise Verifiable Value Row (ZAI-045, ZAI-097) */}
          <div className="zivo-reveal zivo-reveal-delay-2 grid grid-cols-1 gap-2.5 pt-1 text-xs font-semibold text-slate-700 sm:grid-cols-3">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Documented Source Code</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Secure Dashboard Delivery</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0" />
              <span>Server-Verified Razorpay</span>
            </div>
          </div>

          {/* Primary & Secondary CTAs (ZAI-039) */}
          <div className="zivo-reveal zivo-reveal-delay-3 flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl glow-gradient text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-opacity"
            >
              <Rocket className="w-4 h-4" />
              <span>{settings?.heroPrimaryButtonText || 'Browse Projects'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/projects/custom"
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-sm font-bold shadow-2xs hover:border-indigo-300 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{settings?.heroSecondaryButtonText || 'Custom Development'}</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Protected Representative Code Preview Feature (ZAI-044 — preserved & honestly labeled) */}
        <div className="zivo-reveal zivo-reveal-delay-2 flex w-full items-center justify-center lg:col-span-5">
          <div className="w-full max-w-md overflow-hidden rounded-2xl dark-panel shadow-2xl">
            <div className="px-4 py-3 bg-slate-900/95 text-slate-300 flex items-center justify-between border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" aria-hidden="true" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" aria-hidden="true" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" aria-hidden="true" />
                <span className="font-mono text-[11px] text-slate-400 ml-1">architecture.ts</span>
              </div>
              <span className="font-mono text-[10px] text-indigo-300 font-bold bg-indigo-950/90 px-2 py-0.5 rounded border border-indigo-800/80">
                SAMPLE PREVIEW
              </span>
            </div>

            <div className="p-5 font-mono text-[11.5px] leading-relaxed bg-[#090d16] text-slate-300 space-y-1.5 overflow-x-auto">
              <div className="text-slate-500">{'// Representative Zivo AI package manifest'}</div>
              <div>
                <span className="text-indigo-400">const</span>{' '}
                <span className="text-cyan-300">packageSpec</span> ={' '}
                <span className="text-indigo-400">await</span>{' '}
                <span className="text-amber-300">ZivoCatalog</span>.
                <span className="text-blue-400">inspect</span>({'{'}
              </div>
              <div className="pl-4">
                <span className="text-slate-400">architecture</span>:{' '}
                <span className="text-emerald-300">&quot;RAG Pipeline &amp; Multi-Agent API&quot;</span>,
              </div>
              <div className="pl-4">
                <span className="text-slate-400">stack</span>:{' '}
                <span className="text-emerald-300">&quot;Python • FastAPI • Next.js 16&quot;</span>,
              </div>
              <div className="pl-4">
                <span className="text-slate-400">deliverables</span>: [
                <span className="text-amber-200">&quot;Source Code&quot;</span>,{' '}
                <span className="text-amber-200">&quot;Setup Guide&quot;</span>,{' '}
                <span className="text-amber-200">&quot;Docs&quot;</span>],
              </div>
              <div className="pl-4">
                <span className="text-slate-400">delivery</span>:{' '}
                <span className="text-indigo-400">&quot;Private Signed Dashboard Download&quot;</span>
              </div>
              <div>{'}'});</div>
              <div className="pt-2 text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Representative architecture preview</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/70 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Typical Runtimes
                </span>
                <span className="text-[11px] font-bold text-slate-200">Python 3.10+ / Node 20+</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Per-Project Specs
                </span>
                <span className="text-[11px] font-bold text-slate-200">Listed on every detail page</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
