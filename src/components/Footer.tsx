'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Lock, Terminal, Mail, MessageSquare, FileText } from 'lucide-react';
import { PublicSettings } from '@/lib/settings';

export default function Footer() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  // Hide public footer in admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const businessName = settings?.businessName || 'Zivo AI';
  const rawWhatsapp = settings?.whatsappNumber || '918220303164';
  const cleanWhatsapp = rawWhatsapp.replace(/\D/g, '') || '918220303164';
  const supportEmail = settings?.supportEmail || 'support@zivo.ai';

  return (
    <footer className="border-t border-slate-200 bg-slate-100 pt-14 pb-10 text-slate-600 sm:pt-16 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-slate-200/80 pb-10 md:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:gap-x-12 lg:gap-y-10 lg:pb-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/zivoai-logo.png"
                alt="Zivo AI Logo"
                className="h-16 w-[210px] object-contain mix-blend-multiply"
              />
            </Link>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              Modern project discovery and digital delivery platform. Verified production AI models, full-stack architectures, computer vision pipelines, and custom software systems with instant automated delivery.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-600" /> 100% Tested Code</span>
              <span className="flex items-center gap-1"><Terminal className="w-4 h-4 text-indigo-600" /> Setup & Docs Included</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Discover</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/projects" className="hover:text-indigo-600 transition-colors">Project Catalog</Link></li>
              <li><Link href="/projects/finder" className="hover:text-indigo-600 transition-colors font-medium text-indigo-600">AI Project Finder</Link></li>
              <li><Link href="/projects/compare" className="hover:text-indigo-600 transition-colors">Compare Projects</Link></li>
              <li><Link href="/wishlist" className="hover:text-indigo-600 transition-colors">Saved Wishlist</Link></li>
              <li><Link href="/projects/custom" className="hover:text-indigo-600 transition-colors">Custom Architecture</Link></li>
            </ul>
          </div>

          {/* Categories & Policies */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Platform & Trust</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/policies" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-indigo-500" /> Terms & Licenses</Link></li>
              <li><Link href="/orders/track" className="hover:text-indigo-600 transition-colors">Track Order & Milestones</Link></li>
              <li><Link href="/account" className="hover:text-indigo-600 transition-colors">Customer Dashboard</Link></li>
              <li><Link href="/login" className="hover:text-indigo-600 transition-colors">Customer Sign In</Link></li>
            </ul>
          </div>

          {/* Admin & Support */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Support & Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <a href={`https://wa.me/${cleanWhatsapp}?text=Hi%2C%20I%20am%20interested%20in%20exploring%20Zivo%20AI%20projects`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-700 font-semibold text-slate-900">WhatsApp: {rawWhatsapp}</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <a href={`mailto:${supportEmail}`} className="break-all text-xs hover:text-indigo-600">{supportEmail}</a>
              </li>
              <li className="pt-4">
                <Link href="/admin/login" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 border border-slate-300 bg-white px-3 py-1.5 rounded-lg transition-all shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-slate-500" /> Admin Workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-7 text-center text-xs text-slate-500 md:flex-row md:items-center md:text-left">
          <p>&copy; {new Date().getFullYear()} {businessName}. All rights reserved.</p>
          <p className="max-w-xl text-slate-500 md:text-right">Engineering the future with modern AI, cloud architectures, and developer-first digital assets.</p>
        </div>
      </div>
    </footer>
  );
}
