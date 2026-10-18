'use client';

import { useState, useEffect } from 'react';
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
  ShieldCheck,
  FolderKanban,
  Wrench,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  Zap,
  Sparkles,
  Layers,
  Server,
} from 'lucide-react';

export default function HomePage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [selectedBuyProject, setSelectedBuyProject] = useState<Project | null>(null);
  const [selectedDiscussProject, setSelectedDiscussProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});

    fetch('/api/projects?featured=true&limit=6')
      .then((res) => res.json())
      .then((data) => {
        if (data?.projects && Array.isArray(data.projects)) {
          setFeaturedProjects(data.projects);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
  }, []);

  const defaultFaqs = [
    {
      q: 'What assets are included with every project?',
      a: 'Each package includes 100% verified executable source code, full system architecture documentation, comprehensive specifications, module breakdowns, configuration files, sample datasets, and step-by-step deployment instructions.',
    },
    {
      q: 'How does instant automated delivery work?',
      a: 'For fixed-price codebases, payments are verified server-side with HMAC security. Upon confirmation, you receive a cryptographically signed, expiring download link immediately with zero waiting time.',
    },
    {
      q: 'Can I request a custom software or AI architecture?',
      a: 'Yes. Our senior engineering team crafts bespoke solutions tailored to your technical stack, performance benchmarks, and deployment constraints. You can track milestone progress through 8 distinct development stages.',
    },
    {
      q: 'Do you provide setup and environment configuration support?',
      a: 'Yes! We provide 1-on-1 remote setup assistance via Screen Share / Anydesk to configure your local or cloud environment (Python, Node.js, PyTorch, Docker, CUDA, etc.) and run the architecture live.',
    },
    {
      q: 'Are the project licenses commercial and educational friendly?',
      a: 'All source code is released with full developer rights for study, customization, research, benchmarking, degree defense, and production prototyping.',
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
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20 space-y-24">
      {/* Modals for Immediate Interaction */}
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

      {/* Dynamic Announcement Banner */}
      {settings?.heroBannerActive && settings?.announcementNotice && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{settings.announcementNotice}</span>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <ProjectHero settings={settings} />

      {/* TRUST INDICATORS BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="zivo-card rounded-2xl p-6 sm:p-8 bg-white border border-slate-200/90 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900">100% Tested Runtimes</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Every project tested against fixed dependency requirements with clear setup steps.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900">1-3 Hour Delivery</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Instant Razorpay verification with automated download links delivered to your inbox.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900">Architecture & Docs</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Complete IEEE report docs, database schemas, presentation decks, and flowcharts.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900">1-on-1 Remote Setup</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Direct WhatsApp support and Screen Share guidance to run the codebase locally.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED PROJECTS SHOWCASE */}
      {settings?.showFeaturedSection !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Curated Architectures
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Featured Production Codebases
              </h2>
              <p className="text-sm text-slate-600 max-w-xl">
                Pre-tested, fully documented software solutions with instant automated checkout and download access.
              </p>
            </div>

            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-2"
            >
              Browse Complete Catalog ({featuredProjects.length > 0 ? `${featuredProjects.length}+` : 'View All'})
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 rounded-2xl bg-slate-200/60 animate-pulse border border-slate-200" />
              ))}
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
              <h3 className="font-bold text-slate-900">Explore Available Projects</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Visit the catalog to browse all available AI models, web apps, and IoT codebases.
              </p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md"
              >
                Open Project Catalog
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 3. CAPABILITIES BENTO GRID */}
      <CapabilitiesBento showStats={settings?.showStatsSection !== false} />

      {/* 4. GET STARTED OPTIONS (TWO CLEAR PATHWAYS) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Get Started</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Choose Your Delivery Track</h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Choose from ready-to-deploy verified codebases or collaborate directly with our engineers for custom architectures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* TRACK 1: SEE AVAILABLE PROJECTS */}
          <div className="group bg-white rounded-3xl p-8 border-2 border-indigo-100 hover:border-indigo-500 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />

            <div className="relative space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <FolderKanban className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Track 01</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  Ready-to-Deploy Catalog
                </h3>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Instant access to verified fixed-price codebases across Generative AI, Computer Vision, Full-Stack SaaS, and IoT with secure automated delivery.
              </p>

              <ul className="space-y-2.5 pt-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Instant download link immediately upon Razorpay confirmation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Verified source code, architecture reports & PPT deck
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Includes sample datasets and environment configuration guides
                </li>
              </ul>
            </div>

            <div className="relative pt-4">
              <Link
                href="/projects"
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl glow-gradient text-white font-bold text-base shadow-xl shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Explore Ready Projects
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* TRACK 2: CUSTOM ARCHITECTURE */}
          <div className="group bg-white rounded-3xl p-8 border-2 border-purple-100 hover:purple-500 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />

            <div className="relative space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                <Wrench className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Track 02</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  Custom Architecture
                </h3>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Have a specialized research paper, novel algorithm, or custom product requirement? Our senior software team will build it to your exact specifications.
              </p>

              <ul className="space-y-2.5 pt-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  8-Stage transparent milestone tracking with public updates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Technical phone & WhatsApp consultation with lead engineers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Bespoke dataset curation and complete environment deployment
                </li>
              </ul>
            </div>

            <div className="relative pt-4">
              <Link
                href="/projects/custom"
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <PhoneCall className="w-5 h-5 text-indigo-400" />
                Request Custom Architecture
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (4 STEPS) */}
      {settings?.showHowItWorksSection !== false && (
        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Engineering Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">How Zivo AI Works</h2>
            <p className="text-sm text-slate-600">From discovery to local live execution in 4 streamlined steps</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Discover & Benchmark',
                desc: 'Explore pre-built projects with live specs, technology stacks, sample screenshots, and deliverables.',
              },
              {
                step: '02',
                title: 'Instant Secure Checkout',
                desc: 'Complete payment via Razorpay. Transactions are verified server-side with HMAC security.',
              },
              {
                step: '03',
                title: 'Automated Digital Delivery',
                desc: 'Receive secure, expiring download links to source code repositories, IEEE documentation, and assets within 1 to 3 hours.',
              },
              {
                step: '04',
                title: '1-on-1 Remote Setup',
                desc: 'Our engineers guide you through local environment configuration, dependency resolution, and execution.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <span className="text-3xl font-extrabold text-indigo-600/30 block font-mono">{item.step}</span>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. THE ZIVO AI STANDARD (BENEFITS & TRUST) */}
      {settings?.showTestimonialsSection !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-md space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                The Zivo AI Quality Standard
              </h2>
              <p className="text-sm text-slate-600">
                Built by senior software developers with strict code hygiene, verified test suites, and clean documentation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">100% Executable Code</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every codebase is tested against fixed runtime dependencies with deterministic setup instructions and verified outputs.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Comprehensive Blueprints</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Includes complete architectural diagrams, database schema models, sequence workflows, and technical slide presentations.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <Server className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Automated Secure Delivery</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Never wait for manual email transfers. Files are authorized and served via protected, expiring tokens right after payment.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. FAQ ACCORDION */}
      {settings?.showFaqSection !== false && (
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" /> Got Questions?
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {displayFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 text-sm sm:text-base focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-indigo-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. DIRECT WHATSAPP & SUPPORT CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-8 sm:p-12 rounded-3xl text-center space-y-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Need Direct Technical Advice?
            </h2>
            <p className="text-sm text-slate-300">
              Speak directly with a senior engineer on WhatsApp for topic feasibility analysis, tech stack advice, and custom project quotes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/projects"
              className="px-8 py-3.5 rounded-xl bg-white text-slate-950 font-bold text-sm shadow-md hover:bg-slate-100 transition-all"
            >
              Browse All Projects
            </Link>

            <a
              href={`https://wa.me/${cleanWhatsapp}?text=Hi%2C%20I%20would%20like%20to%20consult%20on%20a%20Zivo%20AI%20project`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-md transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Chat on WhatsApp ({rawWhatsapp})
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
