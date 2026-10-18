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
    <footer className="bg-slate-100 border-t border-slate-200 pt-16 pb-12 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200/80">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-1.5 shadow-md shadow-indigo-500/20 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Zivo AI Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Zivo <span className="text-indigo-600">AI</span>
              </span>
            </Link>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              Modern project discovery and digital delivery platform. Verified production AI models, full-stack architectures, computer vision pipelines, and custom software systems with instant automated delivery.
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs text-slate-500 font-medium">
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
                <a href={`mailto:${supportEmail}`} className="hover:text-indigo-600 text-xs truncate">{supportEmail}</a>
              </li>
              <li className="pt-4">
                <Link href="/admin/login" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 border border-slate-300 bg-white px-3 py-1.5 rounded-lg transition-all shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-slate-500" /> Admin Workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {businessName}. All rights reserved.</p>
          <p className="text-slate-500">Engineering the future with modern AI, cloud architectures, and developer-first digital assets.</p>
        </div>
      </div>
    </footer>
  );
}
