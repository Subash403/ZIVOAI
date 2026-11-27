'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProjectHero from '@/components/ProjectHero';
import CapabilitiesBento from '@/components/CapabilitiesBento';
import ProjectCard from '@/components/ProjectCard';
import CheckoutModal from '@/components/CheckoutModal';
import RequirementModal from '@/components/RequirementModal';
import { PublicSettings } from '@/lib/settings';
import { Project } from '@/types';
import {
  ArrowRight,
  FolderKanban,
  Wrench,
  CheckCircle2,
  MessageCircle,
  ChevronDown,
  Layers,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Zap,
  FileCode2,
  Users,
  Search,
  CreditCard,
  Download,
  LifeBuoy,
} from 'lucide-react';

export default function HomePage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [selectedBuyProject, setSelectedBuyProject] = useState<Project | null>(null);
  const [selectedDiscussProject, setSelectedDiscussProject] = useState<Project | null>(null);

  const loadFeatured = useCallback(async () => {
    setLoadingFeatured(true);
    setFeaturedError(null);
    try {
      const res = await fetch('/api/projects?featured=true&limit=6');
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not load featured projects right now.');
      }
      setFeaturedProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (err: unknown) {
      setFeaturedError(
        err instanceof Error ? err.message : 'Featured projects are temporarily unavailable.'
      );
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});

    const timer = window.setTimeout(() => {
      void loadFeatured();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFeatured]);

  const defaultFaqs = [
    {
      q: 'How do I browse and purchase a ready-to-run project?',
      a: 'Browse the project catalog, inspect the listed deliverables, tech stack, and setup prerequisites on the project page, then complete secure Razorpay checkout. Sign in first so your receipt and downloads are automatically linked to your account.',
    },
    {
      q: 'When is payment confirmed and how do downloads work?',
      a: 'Orders are confirmed only after Razorpay payment signatures and captured payment amounts are verified server-side. Once verified, fixed-price downloads unlock directly inside your Customer Dashboard via short-lived 1-hour private cloud links.',
    },
    {
      q: 'Where do I track my purchases and custom project milestones?',
      a: 'Sign in to your Customer Dashboard (/account) to view fixed-price receipts, download allowances, and your custom project’s 8-stage engineering timeline — no manual order ID entry is required.',
    },
    {
      q: 'What deliverables are included with each project?',
      a: 'Deliverables vary by project and are listed explicitly on every project detail page (such as source code, setup instructions, documentation, or presentation slides). Only items listed on the project page are part of that package.',
    },
    {
      q: 'How do I request technical support or review refund terms?',
      a: 'Message us on WhatsApp or email support with your Order ID or Custom Reference. Review our complete Refund, Delivery, and License terms on the Policies page prior to purchase.',
    },
  ];

  let displayFaqs = defaultFaqs;
  if (settings?.faqItems) {
    try {
      const parsed = JSON.parse(settings.faqItems);
      if (Array.isArray(parsed) && parsed.length > 0) {
        displayFaqs = parsed;
      }
    } catch {
      // fallback to defaults
    }
  }

  const rawWhatsapp = settings?.whatsappNumber || '';
  const cleanWhatsapp = rawWhatsapp.replace(/\D/g, '');

  const whyChoosePillars = [
    {
      title: 'Transparent Deliverables Before Checkout',
      desc: 'Every project lists its exact tech stack, complexity level, prerequisites, and included materials upfront before you pay.',
      icon: FileCode2,
      color: '#0089CF',
      softBg: 'bg-[#F0F9FF]',
    },
    {
      title: 'Server-Verified Razorpay & Atomic Stock',
      desc: 'Signatures, payment amounts, and inventory reservations are verified server-side so orders never oversell or silently fail.',
      icon: ShieldCheck,
      color: '#ED1C24',
      softBg: 'bg-[#FEF2F2]',
    },
    {
      title: 'Private Cloud Delivery Inside Your Account',
      desc: 'Purchases link straight to your Customer Dashboard with signed Cloudflare R2 links and full receipt history.',
      icon: Zap,
      color: '#D97706',
      softBg: 'bg-[#FFFBEB]',
    },
    {
      title: 'Direct Engineering Support & Custom Builds',
      desc: 'Need custom features, a research prototype, or a tailored AI pipeline? Track every build across 8 transparent stages.',
      icon: Users,
      color: '#008C44',
      softBg: 'bg-[#F0FDF4]',
    },
  ];

  const workflowSteps = [
    {
      step: 'PHASE 01',
      title: 'Inspect & Compare',
      desc: 'Filter by stack, category, or difficulty and review each project’s listed deliverables and prerequisites.',
      icon: Search,
      accent: '#0089CF',
    },
    {
      step: 'PHASE 02',
      title: 'Verified Checkout',
      desc: 'Sign in and pay securely via Razorpay. Signatures, captured amounts, and stock are validated server-side.',
      icon: CreditCard,
      accent: '#ED1C24',
    },
    {
      step: 'PHASE 03',
      title: 'Dashboard Download',
      desc: 'Unlock private signed cloud download links and verified payment receipts directly in your Customer Dashboard.',
      icon: Download,
      accent: '#FDB913',
    },
    {
      step: 'PHASE 04',
      title: 'Setup Guidance',
      desc: 'Follow the included setup guide or reach our engineering team on WhatsApp or email if you need assistance.',
      icon: LifeBuoy,
      accent: '#22C55E',
    },
  ];

  return (
    <main className="min-h-screen bg-white pt-16 xl:pt-20 text-[#0A0A0A]">
      <CheckoutModal
        isOpen={!!selectedBuyProject}
        onClose={() => setSelectedBuyProject(null)}
        project={selectedBuyProject}
      />
      <RequirementModal
        isOpen={!!selectedDiscussProject}
        onClose={() => setSelectedDiscussProject(null)}
        project={selectedDiscussProject}
      />

      {/* BAND 1 (DARK #0A0A0A): HERO SECTION */}
      <ProjectHero settings={settings} />

      {/* BAND 2 (CRISP WHITE #FFFFFF): FEATURED PROJECTS */}
      {settings?.showFeaturedSection !== false && (
        <section id="featured-codebases" className="scroll-mt-24 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#F3F4F6] pb-6 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#ED1C24]">
                  <span className="h-[2px] w-6 bg-[#ED1C24]" aria-hidden="true" />
                  Featured Marketplace Catalog
                </div>
                <h2 className="font-heading text-2xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] sm:text-4xl">
                  Ready-to-Run Software &amp; AI Projects
                </h2>
                <p className="max-w-xl text-sm text-[#4B5563]">
                  Compare architecture, technology stack, deliverables, and transparent fixed pricing before purchase.
                </p>
              </div>

              <Link
                href="/projects"
                className="inline-flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-[0.08em] text-[#0089CF] transition-colors hover:text-[#0073B0]"
              >
                <span>Browse Complete Catalog</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {loadingFeatured ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-96 animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]" />
                ))}
              </div>
            ) : featuredError ? (
              <div
                role="alert"
                className="flex flex-col items-center justify-between gap-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-6 text-xs text-[#92400E] sm:flex-row"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-[#D97706]" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-[#0A0A0A]">Could not load featured projects right now</p>
                    <p className="mt-0.5 text-[#78350F]">{featuredError}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={loadFeatured}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#ED1C24] px-4 py-2 font-heading text-xs font-bold text-white hover:bg-[#D1171F]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                  </button>
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#D1D5DB] bg-white px-4 py-2 font-heading text-xs font-bold text-[#0A0A0A] hover:bg-[#F9FAFB]"
                  >
                    Open Catalog
                  </Link>
                </div>
              </div>
            ) : featuredProjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onBuyClick={(p) => setSelectedBuyProject(p)}
                    onDiscussClick={(p) => setSelectedDiscussProject(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-10 text-center">
                <Layers className="mx-auto h-10 w-10 text-[#9CA3AF]" aria-hidden="true" />
                <h3 className="font-heading text-base font-bold text-[#0A0A0A]">
                  No projects available yet
                </h3>
                <p className="mx-auto max-w-md text-xs text-[#6B7280]">
                  New AI systems, full-stack web applications, and custom-scoped architectures will appear here as soon as they are published to the catalog.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 rounded-md bg-[#ED1C24] px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.06em] text-white hover:bg-[#D1171F]"
                  >
                    Explore Projects
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/projects/custom"
                    className="inline-flex items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.06em] text-[#0A0A0A] hover:bg-[#F3F4F6]"
                  >
                    Request Custom Build
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* BAND 3 (SOFT NEUTRAL #F9FAFB): AI SOLUTIONS & CATEGORIES */}
      <CapabilitiesBento showStats={settings?.showStatsSection !== false} />

      {/* BAND 4 (CRISP WHITE #FFFFFF): SERVICES & ABOUT / WHY CHOOSE ZIVO AI (YOHO Editorial Split Layout) */}
      <section id="about" className="scroll-mt-24 bg-white py-16 sm:py-20 relative">
        <div id="why-zivo" className="absolute -top-24" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
            {/* Left Column: Two Clear Engagement Tracks */}
            <div className="space-y-6 lg:col-span-5">
              <div className="inline-flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#008C44]">
                <span className="h-[2px] w-6 bg-[#008C44]" aria-hidden="true" />
                Services &amp; Engagement Models
              </div>
              <h2 className="font-heading text-3xl font-extrabold leading-[1.13] tracking-[-0.03em] text-[#0A0A0A] sm:text-4xl">
                Built Different. Delivered Cleanly.
              </h2>
              <p className="text-sm leading-relaxed text-[#4B5563]">
                Choose instant access from our fixed-price software catalog, or partner with our engineers for a bespoke AI or web build tracked across every milestone.
              </p>

              {/* Two Clean Service Cards with Quad Top Bar */}
              <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
                <div className="zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
                  <span className="bg-[#0089CF]" />
                  <span className="bg-[#ED1C24]" />
                  <span className="bg-[#FDB913]" />
                  <span className="bg-[#008C44]" />
                </div>
                <div className="divide-y divide-[#F3F4F6]">
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#ED1C24]">
                        <FolderKanban className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="font-heading text-base font-extrabold text-[#0A0A0A]">
                        Ready-Made Project Catalog
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed text-[#4B5563]">
                      Fixed-price AI models, SaaS kits, and developer codebases with listed materials and secure private cloud downloads.
                    </p>
                    <Link
                      href="/projects"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ED1C24] hover:text-[#B9141B]"
                    >
                      <span>Browse Fixed-Price Projects</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F9FF] text-[#0089CF]">
                        <Wrench className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="font-heading text-base font-extrabold text-[#0A0A0A]">
                        Custom Software Development
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed text-[#4B5563]">
                      Commission bespoke AI workflows, research implementations, or production web platforms with 8-stage dashboard tracking.
                    </p>
                    <Link
                      href="/projects/custom"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0089CF] hover:text-[#0073B0]"
                    >
                      <span>Request a Custom Scope</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: YOHO "Our Advantage" Icon Feature Rows with Thin Color Bars */}
            <div className="divide-y divide-[#F3F4F6] lg:col-span-7">
              {whyChoosePillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="flex items-start gap-4 py-6 first:pt-0">
                    <span
                      className="mt-1 h-7 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: pillar.color }}
                      aria-hidden="true"
                    />
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${pillar.softBg}`}
                      style={{ color: pillar.color }}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-heading text-base font-bold text-[#0A0A0A]">
                        {pillar.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-[#4B5563]">
                        {pillar.desc}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-3 pt-7">
                <Link
                  href="/projects"
                  className="inline-flex h-11 items-center gap-2 rounded-sm bg-[#ED1C24] px-6 font-heading text-[11px] font-bold uppercase tracking-[0.09em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#D1171F] hover:shadow-md"
                >
                  <span>Explore Projects</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/projects/custom"
                  className="inline-flex h-11 items-center gap-2 rounded-sm px-5 font-heading text-[11px] font-bold uppercase tracking-[0.09em] text-[#0A0A0A] transition-colors hover:bg-[#F3F4F6]"
                >
                  <span>Start a Conversation</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAND 5 (DEEP OBSIDIAN #0A0A0A): HOW IT WORKS — YOHO Dark Process Band */}
      {settings?.showHowItWorksSection !== false && (
        <section id="how-it-works" className="scroll-mt-24 bg-[#0A0A0A] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                <span className="h-[2px] w-6 bg-[#0089CF]" aria-hidden="true" />
                Delivery Framework
              </div>
              <h2 className="font-heading text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
                How Zivo AI Works
              </h2>
              <p className="text-sm text-[#9CA3AF]">
                A verified, repeatable 4-step workflow from specification review to private dashboard download.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="group relative border-t border-white/15 pt-6 transition-colors hover:border-white/40"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03]"
                        style={{ color: item.accent }}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="font-heading text-base font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#9CA3AF]">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* BAND 6 (CRISP WHITE #FFFFFF): FAQ ACCORDION */}
      {settings?.showFaqSection !== false && (
        <section id="faq" className="scroll-mt-24 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#0089CF]">
                <span className="h-[2px] w-5 bg-[#0089CF]" aria-hidden="true" />
                Frequently Asked Questions
                <span className="h-[2px] w-5 bg-[#0089CF]" aria-hidden="true" />
              </div>
              <h2 className="font-heading text-2xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] sm:text-4xl">
                Clear Answers Before You Buy
              </h2>
            </div>

            <div className="divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
              {displayFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${idx}`}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left font-heading text-sm font-bold text-[#0A0A0A] transition-colors hover:text-[#0089CF] sm:text-base"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-[#0089CF] transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <div
                        id={`faq-answer-${idx}`}
                        role="region"
                        aria-label={faq.q}
                        className="pb-5 text-sm leading-relaxed text-[#4B5563]"
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* BAND 7 (DEEP OBSIDIAN #0A0A0A): FINAL CTA BAND (YOHO Closing Band) */}
      <section id="contact-cta" className="scroll-mt-24 border-b border-[#1F2937] bg-[#0A0A0A] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <div className="inline-flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                <span className="h-[2px] w-6 bg-[#ED1C24]" aria-hidden="true" />
                Start a Project
              </div>
              <h2 className="font-heading text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
                Ready to pick a codebase or scope a custom build?
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-[#9CA3AF]">
                Browse ready-to-run AI &amp; full-stack architectures, match your stack with the AI Project Finder, or speak directly with our engineering team on WhatsApp.
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-[#9CA3AF]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0089CF]" aria-hidden="true" />
                  Transparent Pricing
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#ED1C24]" aria-hidden="true" />
                  Verified Razorpay Checkout
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#FDB913]" aria-hidden="true" />
                  1-Business-Day Custom Quotes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
                  Private Dashboard Downloads
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
              <Link
                href="/projects"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-[#ED1C24] px-7 font-heading text-xs font-bold uppercase tracking-[0.08em] text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#D1171F]"
              >
                <span>Explore Projects</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              {cleanWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=Hi%2C%20I%20would%20like%20to%20consult%20on%20a%20Zivo%20AI%20project`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-white/25 bg-white/[0.04] px-6 font-heading text-xs font-bold uppercase tracking-[0.08em] text-white transition-colors hover:border-[#22C55E] hover:bg-[#008C44]"
                >
                  <MessageCircle className="h-4 w-4 text-[#22C55E]" aria-hidden="true" />
                  <span>WhatsApp Support</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
