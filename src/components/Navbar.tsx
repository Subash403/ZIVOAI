'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  MessageSquare,
  ArrowRight,
  Compass,
  Heart,
  User,
  Search,
} from 'lucide-react';
import { SiteSettings } from '@/types';
import { AUTH_STATE_CHANGED_EVENT } from '@/lib/auth-client';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [settings, setSettings] = useState<Partial<SiteSettings>>({
    phoneNumber: '+91 8220303164',
    whatsappNumber: '918220303164',
    businessName: 'Zivo AI',
    announcementNotice: '100% Verified Production AI & Full-Stack Projects with Full Source Code & 1-on-1 Setup Support',
    logoUrl: '/images/zivoai-logo.png',
  });

  useEffect(() => {
    const loadUser = () => fetch('/api/auth/me', { cache: 'no-store' })
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

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    };
  }, []);

  const navLinks = [
    { name: 'Projects', href: '/projects' },
    { name: 'Custom Architecture', href: '/projects/custom' },
    { name: 'AI Finder', href: '/projects/finder', icon: Compass },
    { name: 'Track Order', href: '/orders/track' },
    { name: 'About & Policies', href: '/policies' },
  ];

  // Do not render public navbar inside /admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const waNumber = settings.whatsappNumber || '918220303164';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-xl'
          : 'border-b border-white/60 bg-white/55 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 xl:h-20 xl:gap-5">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logoUrl || '/images/zivoai-logo.png'}
              alt="Zivo AI Logo"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-[1.02] sm:h-11 xl:h-12 mix-blend-multiply"
            />
            <div className="hidden shrink-0 flex-col xl:flex">
              <span className="whitespace-nowrap text-[13px] text-slate-500 tracking-wider uppercase font-semibold">
                AI & Engineering Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden min-w-0 items-center justify-center gap-1 lg:flex xl:gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                    className={`flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-1 text-[11px] font-semibold transition-colors hover:bg-indigo-50 hover:text-indigo-600 sm:px-1.5 xl:h-10 xl:gap-1.5 xl:px-2 xl:text-[13px] ${
                    isActive ? 'text-indigo-600' : 'text-slate-600'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="hidden shrink-0 items-center gap-1 lg:flex xl:gap-2">
            <Link
              href="/projects"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 shadow-xs transition-all hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 xl:h-10 xl:w-10"
              title="Search Catalog"
              aria-label="Search Projects"
            >
              <Search className="w-4 h-4" />
            </Link>

            <Link
              href="/wishlist"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 shadow-xs transition-all hover:border-pink-300 hover:bg-pink-50/50 hover:text-pink-600 xl:h-10 xl:w-10"
              title="Saved Wishlist"
              aria-label="Saved Wishlist"
            >
              <Heart className="w-4 h-4" />
            </Link>

            <a
              href={`https://wa.me/${waNumber}?text=Hi%2C%20I%20am%20interested%20in%20exploring%20Zivo%20AI%20projects`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-1.5 text-[9px] font-semibold text-emerald-700 shadow-xs transition-all hover:bg-emerald-100 xl:h-10 xl:gap-1.5 xl:px-3 xl:text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp
            </a>

            {user ? (
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/account'}
                className="flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50/80 px-1.5 text-[9px] font-bold text-indigo-700 shadow-xs transition-all hover:bg-indigo-100 xl:h-10 xl:gap-2 xl:px-3.5 xl:text-xs"
              >
                <User className="w-3.5 h-3.5" />
                {user.name.split(' ')[0]}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-1.5 text-[9px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 xl:h-10 xl:gap-1.5 xl:px-3 xl:text-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50 px-1.5 text-[9px] font-bold text-indigo-700 shadow-xs transition-all hover:bg-indigo-100 xl:h-10 xl:gap-1.5 xl:px-3 xl:text-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <Link
              href="/projects/custom"
              className="flex h-9 items-center gap-1 whitespace-nowrap rounded-xl px-1.5 text-[9px] font-bold text-white shadow-md shadow-indigo-500/20 transition-all glow-gradient hover:scale-[1.02] hover:opacity-95 xl:h-10 xl:gap-1.5 xl:px-3.5 xl:text-xs"
            >
              Custom Project
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="col-start-3 ml-auto flex items-center gap-2 lg:hidden">
            <Link
              href="/projects"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </Link>
            <Link
              href="/wishlist"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Toggle menu"
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
        <div id="mobile-navigation" className="space-y-3 border-b border-slate-200 bg-white px-4 pb-6 pt-3 shadow-xl lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block whitespace-nowrap border-b border-slate-100 py-2 text-sm font-bold text-slate-700 hover:text-indigo-600"
            >
              {link.name}
            </Link>
          ))}

          <div className="pt-2 flex flex-col gap-2.5">
            {user ? (
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/account'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700"
              >
                <User className="w-4 h-4" />
                My Account ({user.name})
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl bg-indigo-600 text-white shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <a
              href={`https://wa.me/${waNumber}?text=Hi%2C%20I%20am%20interested%20in%20exploring%20Zivo%20AI%20projects`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              WhatsApp Help ({settings.phoneNumber || '+91 8220303164'})
            </a>

            <Link
              href="/projects/custom"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl glow-gradient text-white shadow-md"
            >
              Request Custom Project
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
