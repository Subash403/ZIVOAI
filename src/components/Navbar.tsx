'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ArrowRight,
  Compass,
  Heart,
  User,
  Scale,
  ChevronDown,
  ShoppingBag,
} from 'lucide-react';
import { SiteSettings } from '@/types';
import { AUTH_STATE_CHANGED_EVENT } from '@/lib/auth-client';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<Partial<SiteSettings>>({
    phoneNumber: '+91 8220303164',
    whatsappNumber: '918220303164',
    businessName: 'Zivo AI',
    announcementNotice: 'Ready-to-run AI & full-stack codebases with documented setup and secure dashboard delivery.',
    heroBannerActive: true,
    logoUrl: '/images/zivoai-logo.png',
  });

  useEffect(() => {
    const loadUser = () =>
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.authenticated && data.user) {
            setUser({ name: data.user.name, role: data.user.role });
          } else {
            setUser(null);
          }
        })
        .catch(() => setUser(null));

    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});

    loadUser();

    const handleAuthStateChanged = () => {
      setUser(null);
      loadUser();
    };
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);

    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setToolsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
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

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const primaryLinks = [
    { name: 'Projects', href: '/projects' },
    { name: 'Custom Builds', href: '/projects/custom' },
    { name: 'How It Works', href: '/#how-it-works' },
  ];

  const toolLinks = [
    { name: 'AI Project Finder', href: '/projects/finder', desc: 'Guided stack & budget matcher', icon: Compass },
    { name: 'Compare Projects', href: '/projects/compare', desc: 'Side-by-side spec comparison', icon: Scale },
  ];

  const showBanner = settings.heroBannerActive && settings.announcementNotice;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        scrolled
          ? 'border-b border-slate-200/90 bg-white/95 shadow-xs backdrop-blur-lg'
          : 'border-b border-slate-200/70 bg-white/85 backdrop-blur-md'
      }`}
    >
      {/* Concise Factual Announcement Bar (ZAI-042, ZAI-043 — no pulsing dot) */}
      {showBanner && (
        <div className="bg-slate-950 px-4 py-1.5 text-center text-[11px] font-medium text-slate-200 border-b border-slate-800">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <span className="line-clamp-1">{settings.announcementNotice}</span>
            <Link
              href="/projects"
              className="hidden sm:inline-flex items-center gap-1 font-bold text-indigo-300 hover:text-white underline underline-offset-2 ml-1 shrink-0"
            >
              Browse Catalog <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 xl:h-20 items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logoUrl || '/images/zivoai-logo.png'}
              alt="Zivo AI Logo"
              className="h-9 w-auto object-contain sm:h-10 mix-blend-multiply"
            />
          </Link>

          {/* Streamlined Desktop Navigation (ZAI-041, ZAI-093, ZAI-110) */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
            {primaryLinks.map((link) => {
              const isActive =
                link.href === '/projects'
                  ? pathname === '/projects'
                  : link.href !== '/' && !link.href.startsWith('/#') && pathname.startsWith(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex h-10 items-center whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-700'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {/* Grouped Secondary Tools Dropdown */}
            <div ref={toolsRef} className="relative">
              <button
                type="button"
                onClick={() => setToolsOpen((o) => !o)}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                className={`flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                  pathname.startsWith('/projects/finder') || pathname.startsWith('/projects/compare')
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-700'
                }`}
              >
                <span>Discovery Tools</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsOpen && (
                <div
                  role="menu"
                  className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  {toolLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setToolsOpen(false)}
                        className="flex items-start gap-3 rounded-xl p-3 hover:bg-indigo-50/70 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{item.name}</span>
                          <span className="block text-[11px] text-slate-500">{item.desc}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Utilities & Single Dominant CTA */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/wishlist"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600"
              title="Saved Wishlist"
              aria-label="Saved Wishlist"
            >
              <Heart className="w-4 h-4" />
            </Link>

            {user ? (
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/account'}
                className="flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{user.role === 'ADMIN' ? 'Admin Panel' : `My Orders (${user.name.split(' ')[0]})`}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In</span>
              </Link>
            )}

            <Link
              href="/projects"
              className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-opacity glow-gradient hover:opacity-95"
            >
              <span>Browse Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Controls — 44x44px minimum touch targets (ZAI-094) */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <Link
              href="/wishlist"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-pink-600"
              aria-label="Saved Wishlist"
            >
              <Heart className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="space-y-2 border-b border-slate-200 bg-white px-4 pb-6 pt-3 shadow-xl lg:hidden"
        >
          <Link
            href="/projects"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl glow-gradient text-sm font-bold text-white shadow-md mb-2"
          >
            <span>Browse Projects</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {[
            { name: 'Custom Builds', href: '/projects/custom' },
            { name: 'AI Project Finder', href: '/projects/finder' },
            { name: 'Compare Projects', href: '/projects/compare' },
            { name: 'Policies & Licensing', href: '/policies' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center border-b border-slate-100 px-2 text-sm font-semibold text-slate-700 hover:text-indigo-600"
            >
              {link.name}
            </Link>
          ))}

          <div className="pt-3 flex flex-col gap-2">
            {user ? (
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/account'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[44px] items-center justify-center gap-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700"
              >
                <ShoppingBag className="w-4 h-4" />
                {user.role === 'ADMIN' ? 'Admin Panel' : `My Dashboard & Orders (${user.name})`}
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center text-xs font-bold rounded-xl bg-slate-900 text-white"
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
