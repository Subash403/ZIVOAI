'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  House,
  FolderKanban,
  BrainCircuit,
  Layers,
  Building2,
  MessageCircle,
  Search,
  Heart,
  GitCompareArrows,
  UserRound,
  LogIn,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Cpu,
  Code2,
  Eye,
  Cloud,
  Wrench,
  ShieldCheck,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { BRAND_ASSETS } from '@/lib/brand';
import { SiteSettings } from '@/types';
import { AUTH_STATE_CHANGED_EVENT } from '@/lib/auth-client';

const PROJECT_MEGA_PILLARS = [
  {
    title: 'AI & GENERATIVE LLMS',
    color: '#0089CF',
    softBg: 'bg-[#F0F9FF]',
    icon: Cpu,
    items: [
      { name: 'Artificial Intelligence', desc: 'Agents, RAG pipelines & LLM orchestration', href: '/projects?category=Artificial+Intelligence' },
      { name: 'Generative AI', desc: 'Diffusion, prompt workflows & model fine-tuning', href: '/projects?category=Generative+AI' },
      { name: 'Machine Learning', desc: 'Predictive analytics & tabular/NLP engines', href: '/projects?category=Machine+Learning' },
    ],
  },
  {
    title: 'FULL-STACK & SECURITY',
    color: '#ED1C24',
    softBg: 'bg-[#FEF2F2]',
    icon: Code2,
    items: [
      { name: 'All Fixed-Price Projects', desc: 'Ready-to-run source code with setup docs', href: '/projects?salesType=fixed' },
      { name: 'Cybersecurity', desc: 'Threat detection, audit & zero-trust tools', href: '/projects?category=Cybersecurity' },
      { name: 'Blockchain & Web3', desc: 'Smart contracts & decentralized apps', href: '/projects?category=Blockchain' },
    ],
  },
  {
    title: 'VISION & SMART SYSTEMS',
    color: '#D97706',
    softBg: 'bg-[#FFFBEB]',
    icon: Eye,
    items: [
      { name: 'IoT & Edge AI', desc: 'Embedded telemetry & sensor intelligence', href: '/projects?category=IoT' },
      { name: 'Research & Major Builds', desc: 'End-to-end capstone & thesis architectures', href: '/projects?projectType=Major' },
    ],
  },
  {
    title: 'CLOUD & DISCOVERY',
    color: '#008C44',
    softBg: 'bg-[#F0FDF4]',
    icon: Cloud,
    items: [
      { name: 'Cloud Computing', desc: 'Docker, Kubernetes & serverless pipelines', href: '/projects?category=Cloud+Computing' },
      { name: 'AI Project Finder', desc: 'Match your stack & budget in seconds', href: '/projects/finder' },
      { name: 'Compare Architectures', desc: 'Side-by-side deliverable & spec matrix', href: '/projects/compare' },
    ],
  },
];

const SERVICES_DROPDOWN_ITEMS = [
  {
    name: 'Custom Software & AI Development',
    desc: 'Bespoke AI architectures, full-stack web platforms & 8-stage progress tracking',
    href: '/projects/custom',
    icon: Wrench,
    badge: 'Bespoke Build',
    color: '#0089CF',
    softBg: 'bg-[#F0F9FF]',
  },
  {
    name: 'Ready-to-Run Software Catalog',
    desc: 'Instant delivery of verified source code, architecture diagrams & documentation',
    href: '/projects?salesType=fixed',
    icon: FolderKanban,
    badge: 'Instant Access',
    color: '#ED1C24',
    softBg: 'bg-[#FEF2F2]',
  },
  {
    name: 'AI Solution Finder & Matcher',
    desc: 'Intelligent questionnaire matching your technical stack, domain & budget',
    href: '/projects/finder',
    icon: BrainCircuit,
    badge: 'AI Recommender',
    color: '#008C44',
    softBg: 'bg-[#F0FDF4]',
  },
  {
    name: 'Technical Architecture Comparison',
    desc: 'Side-by-side spec evaluation, framework matrix & deliverable checklists',
    href: '/projects/compare',
    icon: GitCompareArrows,
    badge: 'Tech Matrix',
    color: '#D97706',
    softBg: 'bg-[#FFFBEB]',
  },
  {
    name: 'Live Order & Milestone Tracking',
    desc: 'Track deliverable assets, download access & custom milestone completion in real time',
    href: '/orders/track',
    icon: ShieldCheck,
    badge: 'Milestone Hub',
    color: '#0089CF',
    softBg: 'bg-[#F0F9FF]',
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectsMenuOpen, setProjectsMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  const projectsMenuRef = useRef<HTMLDivElement>(null);
  const servicesMenuRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const projectsHoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const servicesHoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [settings, setSettings] = useState<Partial<SiteSettings>>({
    businessName: 'Zivo AI',
    logoUrl: BRAND_ASSETS.horizontalLight,
  });

  useEffect(() => {
    const loadUser = () =>
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            setUser({ name: data.user.name, role: data.user.role });
          } else {
            setUser(null);
          }
        })
        .catch(() => setUser(null));

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings({
            businessName: data.settings.businessName || 'Zivo AI',
            logoUrl: data.settings.logoUrl || BRAND_ASSETS.horizontalLight,
          });
        }
      })
      .catch(() => {});

    loadUser();

    const handleAuthStateChanged = () => {
      setUser(null);
      loadUser();
    };
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);

    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setProjectsMenuOpen(false);
        setServicesMenuOpen(false);
        setSearchOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (projectsMenuRef.current && !projectsMenuRef.current.contains(e.target as Node)) {
        setProjectsMenuOpen(false);
      }
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(e.target as Node)) {
        setServicesMenuOpen(false);
      }
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lock background scroll when mobile navigation drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (searchOpen) {
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [searchOpen]);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Hover handlers with micro-debounce bridge to prevent flickering
  const handleProjectsMouseEnter = () => {
    if (projectsHoverTimerRef.current) clearTimeout(projectsHoverTimerRef.current);
    setServicesMenuOpen(false);
    setProjectsMenuOpen(true);
  };

  const handleProjectsMouseLeave = () => {
    projectsHoverTimerRef.current = setTimeout(() => {
      setProjectsMenuOpen(false);
    }, 180);
  };

  const handleServicesMouseEnter = () => {
    if (servicesHoverTimerRef.current) clearTimeout(servicesHoverTimerRef.current);
    setProjectsMenuOpen(false);
    setServicesMenuOpen(true);
  };

  const handleServicesMouseLeave = () => {
    servicesHoverTimerRef.current = setTimeout(() => {
      setServicesMenuOpen(false);
    }, 180);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(q ? `/projects?search=${encodeURIComponent(q)}` : '/projects');
  };

  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      const el = document.getElementById('about');
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', '#about');
      }
    }
  };

  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === '/';
    if (href === '/about') return pathname === '/about';
    if (href.startsWith('/#')) return false;
    if (href === '/projects') {
      return (
        pathname === '/projects' ||
        (pathname.startsWith('/projects/') &&
          !pathname.startsWith('/projects/finder') &&
          !pathname.startsWith('/projects/custom') &&
          !pathname.startsWith('/projects/compare'))
      );
    }
    if (href === '/projects/custom') {
      return pathname.startsWith('/projects/custom') || pathname === '/orders/track';
    }
    return pathname.startsWith(href);
  };

  const accountHref = user ? (user.role === 'ADMIN' ? '/admin' : '/account') : '/login';
  const accountLabel = user
    ? user.role === 'ADMIN'
      ? 'Admin Console'
      : `Account (${user.name.split(' ')[0]})`
    : 'Sign In / Account';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        scrolled
          ? 'bg-white/95 shadow-md backdrop-blur-md'
          : 'bg-white/92 shadow-xs backdrop-blur-md'
      }`}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-5 xl:px-8">
        <div className="flex h-16 xl:h-20 items-center justify-between gap-2 xl:gap-3">
          {/* LEFT: Centralized ZIVO AI Horizontal Brand Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] rounded-lg"
            aria-label="Zivo AI — Go to homepage"
          >
            <BrandLogo
              variant="horizontal"
              tone="light"
              size="sm"
              src={settings.logoUrl}
              alt={settings.businessName || 'Zivo AI'}
              className="h-8 sm:h-9 xl:h-10 transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>

          {/* CENTER: Primary Navigation with Dropdowns & Icons */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1" aria-label="Main Navigation">
            {/* 1. Home */}
            <Link
              href="/"
              className={`group relative flex h-10 items-center gap-1 xl:gap-1.5 whitespace-nowrap rounded-lg px-2 xl:px-3 text-[12.5px] xl:text-sm font-medium tracking-[0.01em] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                isLinkActive('/', true) ? 'text-[#0A0A0A] font-semibold' : 'text-[#6B7280] hover:text-[#0A0A0A]'
              }`}
            >
              <House
                className={`h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 stroke-[1.85] transition-colors ${
                  isLinkActive('/', true) ? 'text-[#0089CF]' : 'text-[#6B7280] group-hover:text-[#0089CF]'
                }`}
                aria-hidden="true"
              />
              <span>Home</span>
              <span
                className={`pointer-events-none absolute bottom-0 left-2 right-2 xl:left-2.5 xl:right-2.5 h-[2px] rounded-full bg-[#0089CF] transition-transform duration-200 origin-left ${
                  isLinkActive('/', true) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}
              />
            </Link>

            {/* 2. Projects (Dropdown Mega-Menu) */}
            <div
              ref={projectsMenuRef}
              className="relative"
              onMouseEnter={handleProjectsMouseEnter}
              onMouseLeave={handleProjectsMouseLeave}
            >
              <button
                type="button"
                onClick={() => setProjectsMenuOpen((open) => !open)}
                aria-expanded={projectsMenuOpen}
                aria-haspopup="menu"
                className={`group relative flex h-10 items-center gap-1 xl:gap-1.5 whitespace-nowrap rounded-lg px-2 xl:px-3 text-[12.5px] xl:text-sm font-medium tracking-[0.01em] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                  isLinkActive('/projects') || projectsMenuOpen
                    ? 'text-[#0A0A0A] font-semibold'
                    : 'text-[#6B7280] hover:text-[#0A0A0A]'
                }`}
              >
                <FolderKanban
                  className={`h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 stroke-[1.85] transition-colors ${
                    isLinkActive('/projects') || projectsMenuOpen ? 'text-[#0089CF]' : 'text-[#6B7280] group-hover:text-[#0089CF]'
                  }`}
                  aria-hidden="true"
                />
                <span>Projects</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform duration-200 ${
                    projectsMenuOpen ? 'rotate-180 text-[#0089CF]' : ''
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`pointer-events-none absolute bottom-0 left-2 right-2 xl:left-2.5 xl:right-2.5 h-[2px] rounded-full bg-[#0089CF] transition-transform duration-200 origin-left ${
                    isLinkActive('/projects') || projectsMenuOpen ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </button>

              {/* Projects Mega-Menu Dropdown */}
              {projectsMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-1/2 top-full mt-2 w-[680px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_56px_-14px_rgba(10,10,10,0.18)] z-50"
                  onMouseEnter={handleProjectsMouseEnter}
                  onMouseLeave={handleProjectsMouseLeave}
                >
                  <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
                    <div>
                      <p className="font-heading text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B7280]">
                        ZIVO AI MARKETPLACE
                      </p>
                      <p className="text-xs text-[#4B5563] mt-0.5">
                        Ready-to-run AI pipelines, full-stack software &amp; developer resources
                      </p>
                    </div>
                    <Link
                      href="/projects"
                      role="menuitem"
                      onClick={() => setProjectsMenuOpen(false)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F9FF] px-3.5 py-1.5 text-xs font-semibold text-[#0089CF] hover:bg-[#0089CF] hover:text-white transition-colors"
                    >
                      View all projects
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-6">
                    {PROJECT_MEGA_PILLARS.map((pillar) => {
                      const PillarIcon = pillar.icon;
                      return (
                        <div key={pillar.title} className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-md ${pillar.softBg}`}
                              style={{ color: pillar.color }}
                            >
                              <PillarIcon className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-heading text-[11px] font-bold tracking-[0.06em] text-[#0A0A0A]">
                              {pillar.title}
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {pillar.items.map((sub) => (
                              <li key={sub.name}>
                                <Link
                                  href={sub.href}
                                  role="menuitem"
                                  onClick={() => setProjectsMenuOpen(false)}
                                  className="group flex flex-col rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[#F9FAFB]"
                                >
                                  <span className="text-xs font-semibold text-[#0A0A0A] group-hover:text-[#0089CF] transition-colors">
                                    {sub.name}
                                  </span>
                                  <span className="text-[11px] text-[#6B7280] line-clamp-1">
                                    {sub.desc}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-3.5">
                    <div className="flex items-center gap-2 text-xs text-[#4B5563]">
                      <span className="flex h-2 w-2 rounded-full bg-[#008C44]" />
                      <span>Private R2 Storage &amp; 100% Verified Specifications</span>
                    </div>
                    <Link
                      href="/projects/finder"
                      role="menuitem"
                      onClick={() => setProjectsMenuOpen(false)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0089CF] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0077B5] transition-colors"
                    >
                      Launch AI Finder
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
                    <span className="bg-[#0089CF]" />
                    <span className="bg-[#ED1C24]" />
                    <span className="bg-[#FDB913]" />
                    <span className="bg-[#008C44]" />
                  </div>
                </div>
              )}
            </div>

            {/* 3. AI Solutions */}
            <Link
              href="/projects/finder"
              className={`group relative flex h-10 items-center gap-1 xl:gap-1.5 whitespace-nowrap rounded-lg px-2 xl:px-3 text-[12.5px] xl:text-sm font-medium tracking-[0.01em] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                isLinkActive('/projects/finder') ? 'text-[#0A0A0A] font-semibold' : 'text-[#6B7280] hover:text-[#0A0A0A]'
              }`}
            >
              <BrainCircuit
                className={`h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 stroke-[1.85] transition-colors ${
                  isLinkActive('/projects/finder') ? 'text-[#0089CF]' : 'text-[#6B7280] group-hover:text-[#0089CF]'
                }`}
                aria-hidden="true"
              />
              <span>AI Solutions</span>
              <span
                className={`pointer-events-none absolute bottom-0 left-2 right-2 xl:left-2.5 xl:right-2.5 h-[2px] rounded-full bg-[#0089CF] transition-transform duration-200 origin-left ${
                  isLinkActive('/projects/finder') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}
              />
            </Link>

            {/* 4. Services (Dropdown Menu) */}
            <div
              ref={servicesMenuRef}
              className="relative"
              onMouseEnter={handleServicesMouseEnter}
              onMouseLeave={handleServicesMouseLeave}
            >
              <button
                type="button"
                onClick={() => setServicesMenuOpen((open) => !open)}
                aria-expanded={servicesMenuOpen}
                aria-haspopup="menu"
                className={`group relative flex h-10 items-center gap-1 xl:gap-1.5 whitespace-nowrap rounded-lg px-2 xl:px-3 text-[12.5px] xl:text-sm font-medium tracking-[0.01em] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                  isLinkActive('/projects/custom') || servicesMenuOpen
                    ? 'text-[#0A0A0A] font-semibold'
                    : 'text-[#6B7280] hover:text-[#0A0A0A]'
                }`}
              >
                <Layers
                  className={`h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 stroke-[1.85] transition-colors ${
                    isLinkActive('/projects/custom') || servicesMenuOpen
                      ? 'text-[#0089CF]'
                      : 'text-[#6B7280] group-hover:text-[#0089CF]'
                  }`}
                  aria-hidden="true"
                />
                <span>Services</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform duration-200 ${
                    servicesMenuOpen ? 'rotate-180 text-[#0089CF]' : ''
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`pointer-events-none absolute bottom-0 left-2 right-2 xl:left-2.5 xl:right-2.5 h-[2px] rounded-full bg-[#0089CF] transition-transform duration-200 origin-left ${
                    isLinkActive('/projects/custom') || servicesMenuOpen
                      ? 'scale-x-100'
                      : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </button>

              {/* Services Dropdown Menu */}
              {servicesMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-1/2 top-full mt-2 w-[520px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_56px_-14px_rgba(10,10,10,0.18)] z-50"
                  onMouseEnter={handleServicesMouseEnter}
                  onMouseLeave={handleServicesMouseLeave}
                >
                  <div className="flex items-center justify-between border-b border-[#F3F4F6] px-5 py-3.5">
                    <div>
                      <p className="font-heading text-[11px] font-bold uppercase tracking-[0.1em] text-[#008C44]">
                        SERVICES &amp; ENGAGEMENT
                      </p>
                      <p className="text-xs text-[#4B5563] mt-0.5">
                        End-to-end custom development, ready architectures &amp; milestone delivery
                      </p>
                    </div>
                    <Link
                      href="/projects/custom"
                      role="menuitem"
                      onClick={() => setServicesMenuOpen(false)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3.5 py-1.5 text-xs font-semibold text-[#008C44] hover:bg-[#008C44] hover:text-white transition-colors"
                    >
                      Custom Scope
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="divide-y divide-[#F3F4F6] p-3">
                    {SERVICES_DROPDOWN_ITEMS.map((service) => {
                      const Icon = service.icon;
                      return (
                        <Link
                          key={service.name}
                          href={service.href}
                          role="menuitem"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group flex items-start gap-3.5 rounded-xl p-3 transition-colors hover:bg-[#F9FAFB]"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${service.softBg} transition-colors group-hover:bg-[#0089CF] group-hover:text-white`}
                            style={{ color: service.color }}
                          >
                            <Icon className="h-5 w-5 text-current transition-colors" />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#0A0A0A] group-hover:text-[#0089CF] transition-colors truncate">
                                {service.name}
                              </span>
                              <span className="shrink-0 rounded-sm bg-[#F3F4F6] px-1.5 py-0.5 font-heading text-[9.5px] font-bold text-[#4B5563]">
                                {service.badge}
                              </span>
                            </div>
                            <p className="text-[11.5px] leading-relaxed text-[#6B7280] line-clamp-2">
                              {service.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between border-t border-[#F3F4F6] bg-[#F9FAFB] px-5 py-3">
                    <div className="flex items-center gap-2 text-xs text-[#4B5563]">
                      <span className="flex h-2 w-2 rounded-full bg-[#0089CF]" />
                      <span>Dedicated technical leads for every custom milestone</span>
                    </div>
                    <Link
                      href="/orders/track"
                      role="menuitem"
                      onClick={() => setServicesMenuOpen(false)}
                      className="text-xs font-bold text-[#0089CF] hover:text-[#0073B0] transition-colors"
                    >
                      Track Project Status →
                    </Link>
                  </div>

                  <div className="zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
                    <span className="bg-[#0089CF]" />
                    <span className="bg-[#ED1C24]" />
                    <span className="bg-[#FDB913]" />
                    <span className="bg-[#008C44]" />
                  </div>
                </div>
              )}
            </div>

            {/* 5. About */}
            <Link
              href="/about"
              onClick={handleAboutClick}
              className={`group relative flex h-10 items-center gap-1 xl:gap-1.5 whitespace-nowrap rounded-lg px-2 xl:px-3 text-[12.5px] xl:text-sm font-medium tracking-[0.01em] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                isLinkActive('/about') ? 'text-[#0A0A0A] font-semibold' : 'text-[#6B7280] hover:text-[#0A0A0A]'
              }`}
            >
              <Building2
                className={`h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 stroke-[1.85] transition-colors ${
                  isLinkActive('/about') ? 'text-[#0089CF]' : 'text-[#6B7280] group-hover:text-[#0089CF]'
                }`}
                aria-hidden="true"
              />
              <span>About</span>
              <span
                className={`pointer-events-none absolute bottom-0 left-2 right-2 xl:left-2.5 xl:right-2.5 h-[2px] rounded-full bg-[#0089CF] transition-transform duration-200 origin-left ${
                  isLinkActive('/about') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}
              />
            </Link>

            {/* 6. Contact */}
            <Link
              href="/#contact-cta"
              className="group relative flex h-10 items-center gap-1 xl:gap-1.5 whitespace-nowrap rounded-lg px-2 xl:px-3 text-[12.5px] xl:text-sm font-medium tracking-[0.01em] transition-all duration-200 hover:-translate-y-0.5 text-[#6B7280] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF]"
            >
              <MessageCircle
                className="h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 stroke-[1.85] text-[#6B7280] transition-colors group-hover:text-[#008C44]"
                aria-hidden="true"
              />
              <span>Contact</span>
              <span className="pointer-events-none absolute bottom-0 left-2 right-2 xl:left-2.5 xl:right-2.5 h-[2px] rounded-full bg-[#008C44] transition-transform duration-200 origin-left scale-x-0 group-hover:scale-x-100" />
            </Link>
          </nav>

          {/* RIGHT: Utility Icons (Search, Wishlist, Compare, Account) + Red Pill CTA */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0">
            {/* Search Toggle */}
            <div ref={searchPanelRef} className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search projects"
                aria-expanded={searchOpen}
                title="Search Projects"
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                  searchOpen
                    ? 'border-[#0089CF] bg-[#F0F9FF] text-[#0089CF]'
                    : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#0089CF] hover:text-[#0089CF]'
                }`}
              >
                <Search className="h-4 w-4 stroke-[1.9]" aria-hidden="true" />
              </button>

              {searchOpen && (
                <form
                  onSubmit={handleSearchSubmit}
                  className="absolute right-0 top-full mt-3 flex w-80 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-xl z-50"
                >
                  <Search className="ml-2 h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden="true" />
                  <input
                    id="navbar-desktop-search"
                    name="search"
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search AI, Next.js, RAG, IoT..."
                    aria-label="Search catalog projects"
                    className="w-full bg-transparent py-1.5 text-xs text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-[#ED1C24] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#D1171F] transition-colors cursor-pointer"
                  >
                    Go
                  </button>
                </form>
              )}
            </div>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              title="Saved Wishlist"
              aria-label="Saved Wishlist"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED1C24] ${
                pathname === '/wishlist'
                  ? 'border-[#ED1C24] bg-[#FEF2F2] text-[#ED1C24]'
                  : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#ED1C24] hover:bg-[#FEF2F2] hover:text-[#ED1C24]'
              }`}
            >
              <Heart className="h-4 w-4 stroke-[1.9]" aria-hidden="true" />
            </Link>

            {/* Compare */}
            <Link
              href="/projects/compare"
              title="Compare Projects"
              aria-label="Compare Projects"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                pathname === '/projects/compare'
                  ? 'border-[#0089CF] bg-[#F0F9FF] text-[#0089CF]'
                  : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#0089CF] hover:bg-[#F0F9FF] hover:text-[#0089CF]'
              }`}
            >
              <GitCompareArrows className="h-4 w-4 stroke-[1.9]" aria-hidden="true" />
            </Link>

            {/* Login / Authenticated Account CTA */}
            {user ? (
              <Link
                href={accountHref}
                title={accountLabel}
                aria-label={accountLabel}
                className={`relative flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                  pathname === '/account' || pathname.startsWith('/admin')
                    ? 'border-[#0089CF] bg-[#F0F9FF] text-[#0089CF]'
                    : 'border-[#E5E7EB] bg-white text-[#111827] hover:border-[#0089CF] hover:bg-[#F0F9FF] hover:text-[#0089CF]'
                }`}
              >
                <UserRound className="h-4 w-4 stroke-[1.9] shrink-0" aria-hidden="true" />
                <span className="max-w-[84px] truncate">
                  {user.role === 'ADMIN' ? 'Admin' : user.name.split(' ')[0]}
                </span>
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#008C44] shrink-0"
                  title="Signed in"
                  aria-hidden="true"
                />
              </Link>
            ) : (
              <Link
                href="/login"
                title="Sign in to your Zivo AI account"
                aria-label="Login"
                className={`flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
                  pathname === '/login' || pathname === '/register'
                    ? 'border-[#0089CF] bg-[#F0F9FF] text-[#0089CF]'
                    : 'border-[#D1D5DB] bg-white text-[#0A0A0A] hover:border-[#0089CF] hover:bg-[#F0F9FF] hover:text-[#0089CF]'
                }`}
              >
                <LogIn className="h-3.5 w-3.5 stroke-[2] shrink-0" aria-hidden="true" />
                <span>Login</span>
              </Link>
            )}

            {/* Primary YOHO-Style Red Pill CTA */}
            <Link
              href="/projects"
              className="ml-0.5 xl:ml-1 inline-flex h-9 xl:h-10 items-center gap-1.5 xl:gap-2 whitespace-nowrap rounded-full bg-[#ED1C24] pl-3 pr-2 xl:pl-4 xl:pr-2.5 font-heading text-[11.5px] xl:text-xs font-bold tracking-[0.02em] text-white shadow-[0_8px_20px_-4px_rgba(237,28,36,0.38)] transition-all duration-200 hover:bg-[#D1171F] hover:scale-[1.03] hover:shadow-[0_10px_24px_-4px_rgba(237,28,36,0.46)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED1C24]"
            >
              <span>Explore Projects</span>
              <span className="flex h-5 w-5 xl:h-6 xl:w-6 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-3 w-3 xl:h-3.5 xl:w-3.5 text-white" aria-hidden="true" />
              </span>
            </Link>
          </div>

          {/* MOBILE CONTROLS (44x44px touch targets + visible Login) */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {user ? (
              <Link
                href={accountHref}
                className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#0A0A0A] hover:text-[#0089CF]"
                aria-label={accountLabel}
              >
                <UserRound className="h-4 w-4 stroke-[1.9]" aria-hidden="true" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#008C44]" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs font-semibold text-[#0A0A0A] hover:border-[#0089CF] hover:text-[#0089CF]"
                aria-label="Login"
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Login</span>
              </Link>
            )}
            <Link
              href="/wishlist"
              className="hidden sm:flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#ED1C24]"
              aria-label="Saved Wishlist"
            >
              <Heart className="h-4 w-4 stroke-[1.9]" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#0A0A0A] hover:bg-[#F9FAFB] cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Signature YOHO-Inspired 4-Colour Quad-Stripe Accent Bar */}
      <div className="zivo-quad-bar" aria-hidden="true">
        <span className="bg-[#0089CF]" />
        <span className="bg-[#ED1C24]" />
        <span className="bg-[#FDB913]" />
        <span className="bg-[#008C44]" />
      </div>

      {/* MOBILE FLOATING SHEET DRAWER */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="lg:hidden border-b border-[#E5E7EB] bg-white px-4 pb-6 pt-4 shadow-2xl max-h-[calc(100vh-4.2rem)] overflow-y-auto"
        >
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="mb-3 flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden="true" />
            <input
              id="navbar-mobile-search"
              name="search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, AI stacks..."
              aria-label="Search projects"
              className="w-full bg-transparent text-sm text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#0A0A0A] px-3 py-1 text-xs font-semibold text-white cursor-pointer"
            >
              Search
            </button>
          </form>

          <nav className="space-y-1" aria-label="Mobile Navigation">
            {/* 1. Home */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors ${
                pathname === '/' ? 'bg-[#F3F4F6] text-[#0A0A0A] font-semibold' : 'text-[#4B5563] hover:bg-[#F9FAFB]'
              }`}
            >
              {pathname === '/' && <span className="h-2 w-2 rounded-full bg-[#0089CF]" aria-hidden="true" />}
              <House className="h-4 w-4 text-[#0089CF] stroke-[1.85]" aria-hidden="true" />
              <span>Home</span>
            </Link>

            {/* 2. Expandable Projects Accordion */}
            <div>
              <button
                type="button"
                onClick={() => setMobileProjectsOpen((o) => !o)}
                aria-expanded={mobileProjectsOpen}
                className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <FolderKanban className="h-4 w-4 text-[#ED1C24] stroke-[1.85]" aria-hidden="true" />
                  <span>Projects</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileProjectsOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileProjectsOpen && (
                <div className="ml-8 mt-1 space-y-1 border-l-2 border-[#F3F4F6] pl-3 pb-2">
                  {[
                    { name: 'All Projects', href: '/projects' },
                    { name: 'Artificial Intelligence', href: '/projects?category=Artificial+Intelligence' },
                    { name: 'Generative AI', href: '/projects?category=Generative+AI' },
                    { name: 'Machine Learning', href: '/projects?category=Machine+Learning' },
                    { name: 'Cloud & IoT', href: '/projects?category=Cloud+Computing' },
                  ].map((sub) => (
                    <Link
                      key={sub.name}
                      href={sub.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex min-h-[40px] items-center text-xs font-medium text-[#4B5563] hover:text-[#0089CF]"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 3. AI Solutions */}
            <Link
              href="/projects/finder"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors ${
                isLinkActive('/projects/finder') ? 'bg-[#F3F4F6] text-[#0A0A0A] font-semibold' : 'text-[#4B5563] hover:bg-[#F9FAFB]'
              }`}
            >
              {isLinkActive('/projects/finder') && <span className="h-2 w-2 rounded-full bg-[#0089CF]" aria-hidden="true" />}
              <BrainCircuit className="h-4 w-4 text-[#0089CF] stroke-[1.85]" aria-hidden="true" />
              <span>AI Solutions (Finder)</span>
            </Link>

            {/* 4. Expandable Services Accordion */}
            <div>
              <button
                type="button"
                onClick={() => setMobileServicesOpen((o) => !o)}
                aria-expanded={mobileServicesOpen}
                className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-[#008C44] stroke-[1.85]" aria-hidden="true" />
                  <span>Services &amp; Engagement</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileServicesOpen && (
                <div className="ml-8 mt-1 space-y-1 border-l-2 border-[#F3F4F6] pl-3 pb-2">
                  {SERVICES_DROPDOWN_ITEMS.map((service) => (
                    <Link
                      key={service.name}
                      href={service.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex flex-col py-1.5 text-xs text-[#4B5563] hover:text-[#0089CF]"
                    >
                      <span className="font-semibold">{service.name}</span>
                      <span className="text-[10.5px] text-[#9CA3AF] line-clamp-1">{service.badge}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Compare Projects */}
            <Link
              href="/projects/compare"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors ${
                pathname === '/projects/compare' ? 'bg-[#F3F4F6] text-[#0A0A0A] font-semibold' : 'text-[#4B5563] hover:bg-[#F9FAFB]'
              }`}
            >
              {pathname === '/projects/compare' && <span className="h-2 w-2 rounded-full bg-[#0089CF]" aria-hidden="true" />}
              <GitCompareArrows className="h-4 w-4 text-[#D97706] stroke-[1.85]" aria-hidden="true" />
              <span>Compare Projects</span>
            </Link>

            {/* 6. About */}
            <Link
              href="/about"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleAboutClick(e);
              }}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors ${
                isLinkActive('/about') ? 'bg-[#F3F4F6] text-[#0A0A0A] font-semibold' : 'text-[#4B5563] hover:bg-[#F9FAFB]'
              }`}
            >
              {isLinkActive('/about') && <span className="h-2 w-2 rounded-full bg-[#0089CF]" aria-hidden="true" />}
              <Building2 className="h-4 w-4 text-[#4B5563] stroke-[1.85]" aria-hidden="true" />
              <span>About Zivo AI</span>
            </Link>

            {/* 7. Contact */}
            <Link
              href="/#contact-cta"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors text-[#4B5563] hover:bg-[#F9FAFB]"
            >
              <MessageCircle className="h-4 w-4 text-[#008C44] stroke-[1.85]" aria-hidden="true" />
              <span>Contact &amp; Support</span>
            </Link>
          </nav>

          {/* 4-Color Hairline Divider */}
          <div className="my-4 zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
            <span className="bg-[#0089CF]" />
            <span className="bg-[#ED1C24]" />
            <span className="bg-[#FDB913]" />
            <span className="bg-[#008C44]" />
          </div>

          <div className="space-y-2.5">
            <Link
              href="/projects"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#ED1C24] font-heading text-sm font-bold text-white shadow-md hover:bg-[#D1171F]"
            >
              <span>Explore Projects</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>

            {user ? (
              <Link
                href={accountHref}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs font-semibold text-[#0A0A0A]"
              >
                <UserRound className="h-4 w-4 text-[#0089CF]" aria-hidden="true" />
                <span>{user.role === 'ADMIN' ? 'Open Admin Console' : `My Dashboard & Orders (${user.name})`}</span>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#D1D5DB] bg-white text-xs font-semibold text-[#0A0A0A]"
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center rounded-xl bg-[#0A0A0A] text-xs font-semibold text-white"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
