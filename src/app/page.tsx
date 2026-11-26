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
  PhoneCall,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Layers,
  AlertCircle,
  RefreshCw,
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
      a: 'Browse the project catalog, inspect the included deliverables, tech stack, and setup prerequisites on the project page, then open secure Razorpay checkout. You sign in first so your receipt and downloads are automatically linked to your account.',
    },
    {
      q: 'When is payment confirmed and how do downloads work?',
      a: 'Orders are confirmed only after Razorpay payment signatures and captured payment amounts are verified server-side. Once verified, fixed-price project downloads become available directly in your Customer Dashboard via short-lived 1-hour private cloud links.',
    },
    {
      q: 'Where do I track my purchases and custom project milestones?',
      a: 'Sign in to your Customer Dashboard (/account) to view fixed-price receipts, download allowances, and your custom project’s 8-stage engineering timeline — no manual order ID entry is required.',
    },
    {
      q: 'What deliverables are included with each project?',
      a: 'Deliverables vary by project and are listed explicitly on every project detail page (such as source code, setup instructions, documentation, or presentation slides). Only items marked included on a project page are part of that package.',
    },
    {
      q: 'How do I request technical support or a refund?',
      a: 'Contact us via the WhatsApp or support email listed in the footer with your Order ID or Custom Reference. Review our full Refund, Delivery, and License terms on the Policies page before purchase.',
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

  const rawWhatsapp = settings?.whatsappNumber || '918220303164';
  const cleanWhatsapp = rawWhatsapp.replace(/\D/g, '') || '918220303164';

  return (
    <main className="min-h-screen bg-transparent pt-24 sm:pt-28 text-slate-900 pb-16 space-y-14 sm:space-y-16">
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

      {/* 1. HERO SECTION */}
      <ProjectHero settings={settings} />

      {/* 2. FEATURED PROJECTS FIRST (ZAI-036, ZAI-095 — catalog prioritized above marketing narrative) */}
      {settings?.showFeaturedSection !== false && (
        <section id="featured-codebases" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Featured Marketplace Catalog
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Ready-to-Run Software &amp; AI Projects
              </h2>
              <p className="text-sm text-slate-600 max-w-xl">
                Compare stack, project type, deliverables, and transparent pricing before purchase.
              </p>
            </div>

            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-1"
            >
              Browse Complete Catalog
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 rounded-3xl bg-slate-200/60 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : featuredError ? (
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-amber-900"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">Could not load featured projects right now</p>
                  <p className="text-amber-800 mt-0.5">{featuredError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={loadFeatured}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100"
                >
                  Open Catalog
                </Link>
              </div>
            </div>
          ) : featuredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <Layers className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-900">Explore the Full Project Catalog</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Visit the catalog to browse all available AI models, web applications, and custom-scoped systems.
              </p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md"
              >
                Browse Projects
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 3. TWO CLEAR ENGAGEMENT TRACKS (ZAI-038 — explained once, concisely) */}
      <section id="delivery-track" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-1.5">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Two Ways to Work With Us</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Ready-to-Run Catalog or Custom Development
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-3xl p-7 border border-indigo-200/80 flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Fixed-Price Project Catalog</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Purchase verified codebases with transparent pricing, itemized deliverables, and secure private downloads in your Customer Dashboard.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Server-verified Razorpay checkout with automatic account linking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Private signed download links accessible anytime in /account
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Exact deliverables, prerequisites &amp; setup steps shown before checkout
                </li>
              </ul>
            </div>

            <Link
              href="/projects"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl glow-gradient text-white font-bold text-sm shadow-md hover:opacity-95 transition-opacity"
            >
              <span>Browse Projects</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="glass-card rounded-3xl p-7 border border-slate-200 flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Custom Software Development</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Need a custom research implementation, tailored AI pipeline, or bespoke full-stack architecture? Submit a brief for a scoped quote.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  8-stage milestone tracking directly inside your Customer Dashboard
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Direct scope review and consultation within 1 business day
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Tailored stack, dataset integration, and walkthrough handoff
                </li>
              </ul>
            </div>

            <Link
              href="/projects/custom"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-indigo-300" />
              <span>Custom Development</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. CAPABILITIES BENTO GRID */}
      <CapabilitiesBento showStats={settings?.showStatsSection !== false} />

      {/* 5. HOW IT WORKS (Concise 4-step workflow — ZAI-038) */}
      {settings?.showHowItWorksSection !== false && (
        <section id="how-it-works" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Workflow</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">How Zivo AI Works</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: '01',
                title: 'Inspect & Compare',
                desc: 'Filter by stack, category, or difficulty and review each project’s listed deliverables and prerequisites.',
              },
              {
                step: '02',
                title: 'Verified Checkout',
                desc: 'Sign in and complete payment via Razorpay. Signatures, amounts, and stock are verified server-side.',
              },
              {
                step: '03',
                title: 'Dashboard Download',
                desc: 'Access private signed download links and verified receipts directly from your Customer Dashboard.',
              },
              {
                step: '04',
                title: 'Setup Guidance',
                desc: 'Follow the included setup guide or reach our support team on WhatsApp or email if you hit setup snags.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
              >
                <span className="text-2xl font-extrabold text-indigo-600/35 block font-mono">{item.step}</span>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. FAQ ACCORDION */}
      {settings?.showFaqSection !== false && (
        <section id="faq" className="scroll-mt-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" /> FAQ
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {displayFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 text-sm sm:text-base"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-indigo-600 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      id={`faq-answer-${idx}`}
                      role="region"
                      aria-label={faq.q}
                      className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. SUPPORT CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-950 p-8 sm:p-10 rounded-3xl text-center space-y-5 text-white shadow-xl border border-slate-800">
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Need Help Choosing a Project or Scoping a Custom Build?
            </h2>
            <p className="text-sm text-slate-300">
              Message our engineering team on WhatsApp or use the AI Project Finder to narrow down your stack and budget.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/projects"
              className="px-7 py-3 rounded-xl bg-white text-slate-950 font-bold text-sm shadow-md hover:bg-slate-100 transition-colors"
            >
              Browse Projects
            </Link>

            <a
              href={`https://wa.me/${cleanWhatsapp}?text=Hi%2C%20I%20would%20like%20to%20consult%20on%20a%20Zivo%20AI%20project`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-md transition-colors"
            >
              <MessageSquare className="w-4 h-4" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
