'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Terminal,
  FileCheck,
  BrainCircuit,
  Layers,
} from 'lucide-react';
import { PublicSettings } from '@/lib/settings';

interface ProjectHeroProps {
  settings?: PublicSettings | null;
}

export default function ProjectHero({ settings }: ProjectHeroProps = {}) {
  return (
    <section className="relative flex flex-col justify-center overflow-hidden bg-[#0A0A0A] text-white py-12 sm:py-16 lg:min-h-[calc(100svh-4.25rem)] lg:py-16 xl:min-h-[calc(100svh-5.25rem)] xl:py-20 2xl:min-h-[min(calc(100svh-5.25rem),920px)]">
      {/* Subtle architectural dark grid + controlled ambient radial depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-[#0089CF]/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-0 h-[360px] w-[360px] rounded-full bg-[#ED1C24]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        {/* Left Column: YOHO-Inspired High-Contrast Editorial Headline & Pill CTAs */}
        <div className="space-y-6 text-left lg:col-span-7">
          {/* 4-Color Dot Eyebrow Pill */}
          <div className="zivo-reveal inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-xs">
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-[#0089CF]" />
              <span className="h-2 w-2 rounded-full bg-[#ED1C24]" />
              <span className="h-2 w-2 rounded-full bg-[#FDB913]" />
              <span className="h-2 w-2 rounded-full bg-[#008C44]" />
            </span>
            <span className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
              {settings?.heroBadgeText || 'AI & Full-Stack Software Marketplace'}
            </span>
          </div>

          {/* Crisp Geometric Display H1 */}
          <div className="zivo-reveal zivo-reveal-delay-1 space-y-4">
            <h1 className="zivo-display text-3xl font-extrabold leading-[1.12] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.35rem]">
              {settings?.heroHeading ? (
                <span>{settings.heroHeading}</span>
              ) : (
                <>
                  We deliver{' '}
                  <span className="text-[#ED1C24]">AI &amp; Full-Stack Projects</span>{' '}
                  built to run cleanly.
                </>
              )}
            </h1>

            {/* Signature 4-Color Horizontal Accent Rule */}
            <div className="grid w-40 grid-cols-4 h-[3px] overflow-hidden rounded-full" aria-hidden="true">
              <span className="bg-[#0089CF]" />
              <span className="bg-[#ED1C24]" />
              <span className="bg-[#FDB913]" />
              <span className="bg-[#008C44]" />
            </div>
          </div>

          <p className="zivo-reveal zivo-reveal-delay-2 max-w-xl text-sm leading-relaxed text-[#D1D5DB] sm:text-base">
            {settings?.heroSubheading ||
              'Zivo AI is a technology marketplace for ready-made software projects, AI/ML pipelines, developer resources, and custom software development — delivered securely to your dashboard with clear documentation.'}
          </p>

          {/* Primary & Secondary YOHO-Style Pill CTAs */}
          <div className="zivo-reveal zivo-reveal-delay-3 flex flex-col items-stretch gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/projects"
              className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#ED1C24] pl-6 pr-3.5 font-heading text-xs font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_10px_30px_rgba(237,28,36,0.34)] transition-all duration-200 hover:bg-[#D1171F] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{settings?.heroPrimaryButtonText || 'Explore Projects'}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </span>
            </Link>

            <Link
              href="/projects/finder"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-6 font-heading text-xs font-bold uppercase tracking-[0.07em] text-white backdrop-blur-xs transition-all duration-200 hover:border-white/60 hover:bg-white/[0.12]"
            >
              <BrainCircuit className="h-4 w-4 text-[#0089CF]" aria-hidden="true" />
              <span>AI Project Finder</span>
            </Link>

            <Link
              href="/projects/custom"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-5 font-heading text-xs font-bold uppercase tracking-[0.07em] text-[#D1D5DB] transition-all duration-200 hover:border-white/40 hover:text-white"
            >
              <Layers className="h-4 w-4 text-[#FDB913]" aria-hidden="true" />
              <span>{settings?.heroSecondaryButtonText || 'Custom Builds'}</span>
            </Link>
          </div>

          {/* Verifiable Trust Strip (YOHO Green Checkmarks) */}
          <div className="zivo-reveal zivo-reveal-delay-3 flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs font-medium text-[#9CA3AF]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E] shrink-0" aria-hidden="true" />
              Documented source code
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E] shrink-0" aria-hidden="true" />
              Server-verified Razorpay
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E] shrink-0" aria-hidden="true" />
              Private dashboard delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E] shrink-0" aria-hidden="true" />
              8-stage custom tracking
            </span>
          </div>
        </div>

        {/* Right Column: Protected Representative Code Preview Feature (ZAI-044 — preserved & honestly labeled) */}
        <div className="zivo-reveal zivo-reveal-delay-2 flex w-full items-center justify-center lg:col-span-5">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#262626] bg-[#111111] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]">
            {/* Quad-color top strip */}
            <div className="zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
              <span className="bg-[#0089CF]" />
              <span className="bg-[#ED1C24]" />
              <span className="bg-[#FDB913]" />
              <span className="bg-[#008C44]" />
            </div>

            <div className="flex items-center justify-between border-b border-[#222222] bg-[#161616] px-4 py-3 text-xs text-[#9CA3AF]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ED1C24]" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FDB913]" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#008C44]" aria-hidden="true" />
                <span className="ml-1 font-mono text-[11px] text-[#9CA3AF]">architecture.ts</span>
              </div>
              <span className="rounded border border-[#0089CF]/40 bg-[#0089CF]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#38BDF8]">
                SAMPLE PREVIEW
              </span>
            </div>

            <div className="space-y-1.5 overflow-x-auto bg-[#0D0D0D] p-5 font-mono text-[11.5px] leading-relaxed text-[#D1D5DB]">
              <div className="text-[#6B7280]">{'// Representative Zivo AI package manifest'}</div>
              <div>
                <span className="text-[#0089CF]">const</span>{' '}
                <span className="text-white">packageSpec</span> ={' '}
                <span className="text-[#0089CF]">await</span>{' '}
                <span className="text-[#FDB913]">ZivoCatalog</span>.
                <span className="text-[#38BDF8]">inspect</span>({'{'}
              </div>
              <div className="pl-4">
                <span className="text-[#9CA3AF]">architecture</span>:{' '}
                <span className="text-[#22C55E]">&quot;RAG Pipeline &amp; Multi-Agent API&quot;</span>,
              </div>
              <div className="pl-4">
                <span className="text-[#9CA3AF]">stack</span>:{' '}
                <span className="text-[#22C55E]">&quot;Python • FastAPI • Next.js 16&quot;</span>,
              </div>
              <div className="pl-4">
                <span className="text-[#9CA3AF]">deliverables</span>: [
                <span className="text-[#FDB913]">&quot;Source Code&quot;</span>,{' '}
                <span className="text-[#FDB913]">&quot;Setup Guide&quot;</span>,{' '}
                <span className="text-[#FDB913]">&quot;Docs&quot;</span>],
              </div>
              <div className="pl-4">
                <span className="text-[#9CA3AF]">delivery</span>:{' '}
                <span className="text-[#38BDF8]">&quot;Private Signed Dashboard Download&quot;</span>
              </div>
              <div>{'}'});</div>
              <div className="flex items-center gap-1.5 pt-2 font-semibold text-[#22C55E]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Representative architecture preview</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#222222] bg-[#141414] p-4 text-xs">
              <div className="flex items-center justify-between font-medium text-[#D1D5DB]">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-[#0089CF]" aria-hidden="true" />
                  Typical Runtimes
                </span>
                <span className="text-[11px] font-semibold text-white">Python 3.10+ / Node 20+</span>
              </div>
              <div className="flex items-center justify-between font-medium text-[#D1D5DB]">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
                  Per-Project Specs
                </span>
                <span className="text-[11px] font-semibold text-white">Listed on every detail page</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
