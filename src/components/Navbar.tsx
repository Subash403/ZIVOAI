'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Compass,
  Heart,
  User,
  Search,
} from 'lucide-react';
import { SiteSettings } from '@/types';

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
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setUser({ name: data.user.name, role: data.user.role });
        }
      })
      .catch(() => {});

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md'
          : 'bg-white/80 backdrop-blur-sm border-b border-slate-200/60'
      }`}
    >
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 text-xs py-1.5 px-4 text-center text-indigo-900 border-b border-indigo-100/80 flex items-center justify-center gap-2 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="truncate">
          {settings.announcementNotice || '100% Verified IEEE / Industry Projects with Full Source Code & 1-on-1 Setup Support'}
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-1.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Zivo AI Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
                Zivo <span className="text-indigo-600">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
                AI & Engineering Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-xs font-bold flex items-center gap-1.5 transition-colors hover:text-indigo-600 ${
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
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/projects"
              className="p-2 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-600 transition-all shadow-xs"
              title="Search Catalog"
              aria-label="Search Projects"
            >
              <Search className="w-4 h-4" />
            </Link>

            <Link
              href="/wishlist"
              className="p-2 rounded-xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50/50 text-slate-600 hover:text-pink-600 transition-all shadow-xs"
              title="Saved Wishlist"
              aria-label="Saved Wishlist"
            >
              <Heart className="w-4 h-4" />
            </Link>

            <a
              href={`https://wa.me/${waNumber}?text=Hi%2C%20I%20am%20interested%20in%20exploring%20Zivo%20AI%20projects`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp
            </a>

            {user ? (
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/account'}
                className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 transition-all shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                {user.name.split(' ')[0]}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 shadow-xs transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <Link
              href="/projects/custom"
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20 hover:opacity-95 hover:scale-[1.02] transition-all"
            >
              Custom Project
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-1.5 md:hidden">
            <Link
              href="/projects"
              className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 border border-slate-200"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </Link>
            <Link
              href="/wishlist"
              className="p-2 rounded-lg text-slate-600 hover:text-pink-600 border border-slate-200"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 hover:text-indigo-600 py-2 border-b border-slate-100"
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
