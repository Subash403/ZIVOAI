'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Terminal, Mail, MessageSquare, FileText, MapPin, Phone, ExternalLink } from 'lucide-react';
import { isSafeHttpUrl, PublicSettings } from '@/lib/settings';

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

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const businessName = settings?.businessName || 'Zivo AI';
  const rawWhatsapp = settings?.whatsappNumber || '918220303164';
  const cleanWhatsapp = rawWhatsapp.replace(/\D/g, '') || '918220303164';
  const supportEmail = settings?.supportEmail || 'support@zivo.ai';
  const phoneNumber = settings?.phoneNumber || '+91 8220303164';
  const address = settings?.address || 'India (Remote Engineering Studio)';
  const logoUrl = settings?.logoUrl || '/images/zivoai-logo.png';

  return (
    <footer className="border-t border-slate-200 bg-white/95 py-12 text-slate-600 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-9 border-b border-slate-200 pb-9 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:gap-x-10 lg:gap-y-8 lg:pb-10">
          {/* Brand Summary */}
          <div className="space-y-4 lg:pr-4">
            <Link href="/" className="inline-flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Zivo AI Logo"
                className="h-11 w-auto object-contain mix-blend-multiply"
              />
            </Link>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              {settings?.footerDescription ||
                'Software marketplace for ready-to-run AI pipelines, full-stack web codebases, and custom-engineered architectures with documented setup and secure account delivery.'}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-emerald-600" /> Verified Razorpay Checkout
              </span>
              <span className="flex items-center gap-1">
                <Terminal className="w-4 h-4 text-indigo-600" /> Source Code &amp; Setup Docs
              </span>
            </div>
          </div>

          {/* Catalog & Discovery */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900">Catalog</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/projects" className="hover:text-indigo-600 transition-colors">All Projects</Link></li>
              <li><Link href="/projects/custom" className="hover:text-indigo-600 transition-colors">Custom Development</Link></li>
              <li><Link href="/projects/finder" className="hover:text-indigo-600 transition-colors">AI Project Finder</Link></li>
              <li><Link href="/projects/compare" className="hover:text-indigo-600 transition-colors">Compare Projects</Link></li>
              <li><Link href="/wishlist" className="hover:text-indigo-600 transition-colors">Saved Wishlist</Link></li>
            </ul>
          </div>

          {/* Customer Account & Legal (ZAI-053: single customer account path; ZAI-054: no public admin link) */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900">Account &amp; Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/account" className="hover:text-indigo-600 transition-colors font-medium text-slate-800">Customer Dashboard &amp; Orders</Link></li>
              <li><Link href="/policies" className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-indigo-500" /> Refund, Delivery &amp; License Policies</Link></li>
              <li><Link href="/orders/track" className="hover:text-indigo-600 transition-colors text-slate-500">Guest Order Lookup (OTP)</Link></li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900">Support &amp; Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex min-w-0 items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=Hi%2C%20I%20would%20like%20help%20with%20a%20Zivo%20AI%20project`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-words font-semibold text-slate-900 hover:text-emerald-700"
                >
                  WhatsApp Support
                </a>
              </li>
              <li className="flex min-w-0 items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-indigo-600" />
                <a href={`mailto:${supportEmail}`} className="min-w-0 break-all text-xs hover:text-indigo-600">
                  {supportEmail}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                <a href={`tel:${phoneNumber.replace(/[^\d+]/g, '')}`} className="hover:text-indigo-600">
                  {phoneNumber}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600" />
                <span className="leading-relaxed text-xs">{address}</span>
              </li>
              <li className="flex flex-wrap items-center gap-3 pt-2">
                {[
                  { href: settings?.githubUrl, label: 'GitHub', enabled: settings?.showGithub === true },
                  { href: settings?.linkedinUrl, label: 'LinkedIn', enabled: settings?.showLinkedin === true },
                  { href: settings?.instagramUrl, label: 'Instagram', enabled: settings?.showInstagram !== false },
                  { href: settings?.youtubeUrl, label: 'YouTube', enabled: settings?.showYoutube === true },
                ]
                  .filter((social): social is typeof social & { href: string } => social.enabled && isSafeHttpUrl(social.href))
                  .map(({ href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {label}
                    </a>
                  ))}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-7 text-center text-xs text-slate-500 md:flex-row md:items-center md:text-left">
          <p>&copy; {new Date().getFullYear()} {businessName}. All rights reserved.</p>
          <p className="max-w-xl text-slate-500 md:text-right">
            {settings?.footerCopyright || 'Ready-to-run AI software, documented architectures, and secure digital delivery.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
