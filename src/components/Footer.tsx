'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Mail,
  MessageCircle,
  MapPin,
  Phone,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileCode2,
} from 'lucide-react';
import { isSafeHttpUrl, PublicSettings } from '@/lib/settings';
import BrandLogo from '@/components/BrandLogo';

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
  const rawWhatsapp = settings?.whatsappNumber || '';
  const cleanWhatsapp = rawWhatsapp.replace(/\D/g, '');
  const supportEmail = settings?.supportEmail || 'support@zivo.ai';
  const phoneNumber = settings?.phoneNumber || '';
  const address = settings?.address?.trim() || '';

  const isPlaceholderSocialRoot = (url?: string) => {
    if (!url) return true;
    const normalized = url.trim().replace(/\/+$/, '').toLowerCase();
    return (
      normalized === 'https://github.com' ||
      normalized === 'https://linkedin.com' ||
      normalized === 'https://instagram.com' ||
      normalized === 'https://youtube.com'
    );
  };

  const socials = [
    { href: settings?.githubUrl, label: 'GitHub', icon: 'github' as const, enabled: settings?.showGithub === true },
    { href: settings?.linkedinUrl, label: 'LinkedIn', icon: 'linkedin' as const, enabled: settings?.showLinkedin === true },
    { href: settings?.instagramUrl, label: 'Instagram', icon: 'instagram' as const, enabled: settings?.showInstagram !== false },
    { href: settings?.youtubeUrl, label: 'YouTube', icon: 'youtube' as const, enabled: settings?.showYoutube === true },
  ].filter(
    (social): social is typeof social & { href: string } =>
      social.enabled && isSafeHttpUrl(social.href) && !isPlaceholderSocialRoot(social.href)
  );

  const renderSocialSvg = (kind: 'github' | 'linkedin' | 'instagram' | 'youtube') => {
    if (kind === 'instagram') {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      );
    }
    if (kind === 'github') {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      );
    }
    if (kind === 'linkedin') {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect width="4" height="12" x="2" y="9" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </svg>
    );
  };

  return (
    <footer className="bg-[#0A0A0A] text-[#9CA3AF] pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 pb-12 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-10">
          {/* Column 1: Brand Identity (YOHO Dark Editorial Style) */}
          <div className="space-y-5 lg:pr-6">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-[2px] bg-[#0089CF]" />
              <span className="h-2 w-2 rounded-[2px] bg-[#ED1C24]" />
              <span className="h-2 w-2 rounded-[2px] bg-[#FDB913]" />
              <span className="h-2 w-2 rounded-[2px] bg-[#008C44]" />
            </div>

            {/* Dedicated Light Container Behind Footer Logo ONLY */}
            <Link
              href="/"
              className="inline-flex items-center rounded-[10px] border border-white/15 bg-[#FAFAFA] px-3.5 py-2.5 shadow-sm transition-opacity hover:opacity-95 sm:px-4 sm:py-2.5"
              aria-label={`${businessName} — Home`}
            >
              <BrandLogo
                variant="horizontal"
                tone="light"
                size="md"
                src={settings?.logoUrl}
                alt={businessName}
                className="h-9 sm:h-10"
              />
            </Link>

            <p className="text-[13px] leading-relaxed text-[#8A8A8A] max-w-sm">
              {settings?.footerDescription ||
                'Engineering marketplace for ready-to-run AI pipelines, full-stack web software, and custom architectures with documented source code and secure dashboard delivery.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#9CA3AF]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#22C55E]" aria-hidden="true" />
                Verified Razorpay
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileCode2 className="h-4 w-4 text-[#0089CF]" aria-hidden="true" />
                Source &amp; Setup Docs
              </span>
            </div>

            {socials.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {socials.map(({ href, label, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-[#222222] bg-[#111111] text-[#888888] transition-colors hover:border-[#0089CF] hover:text-white"
                  >
                    {renderSocialSvg(icon)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: PRODUCTS & CATALOG */}
          <div>
            <h4 className="mb-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Catalog
            </h4>
            <ul className="divide-y divide-[#161616] text-[13px]">
              {[
                { name: 'Artificial Intelligence', href: '/projects?category=Artificial+Intelligence' },
                { name: 'Generative AI & LLMs', href: '/projects?category=Generative+AI' },
                { name: 'Machine Learning', href: '/projects?category=Machine+Learning' },
                { name: 'Cloud & IoT Systems', href: '/projects?category=Cloud+Computing' },
                { name: 'Custom Software Builds', href: '/projects/custom' },
                { name: 'AI Project Finder', href: '/projects/finder' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 py-2.5 text-[#8A8A8A] transition-colors hover:text-white"
                  >
                    <span className="h-1 w-1 rounded-full bg-[#374151]" aria-hidden="true" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/projects"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#22C55E] hover:text-[#4ADE80] transition-colors"
            >
              <span>View All Projects</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Column 3: PLATFORM & ACCOUNT (No public admin link — ZAI-054) */}
          <div>
            <h4 className="mb-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Platform &amp; Account
            </h4>
            <ul className="divide-y divide-[#161616] text-[13px]">
              {[
                { name: 'Customer Dashboard & Orders', href: '/account' },
                { name: 'Compare Projects', href: '/projects/compare' },
                { name: 'Saved Wishlist', href: '/wishlist' },
                { name: 'Refund, Delivery & License Policies', href: '/policies' },
                { name: 'Guest Order Lookup (OTP)', href: '/orders/track' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 py-2.5 text-[#8A8A8A] transition-colors hover:text-white"
                  >
                    <span className="h-1 w-1 rounded-full bg-[#374151]" aria-hidden="true" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: CONTACT (YOHO 4-Color Icon Badge Pattern) */}
          <div>
            <h4 className="mb-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Contact
            </h4>
            <ul className="space-y-4 text-[13px]">
              {phoneNumber && (
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#0089CF]/30 bg-[#0089CF]/10 text-[#0089CF]">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Phone</span>
                    <a href={`tel:${phoneNumber.replace(/[^\d+]/g, '')}`} className="text-[#D1D5DB] hover:text-white transition-colors">
                      {phoneNumber}
                    </a>
                  </div>
                </li>
              )}

              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#ED1C24]/30 bg-[#ED1C24]/10 text-[#ED1C24]">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Email</span>
                  <a href={`mailto:${supportEmail}`} className="break-all text-[#D1D5DB] hover:text-white transition-colors">
                    {supportEmail}
                  </a>
                </div>
              </li>

              {address && (
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#008C44]/30 bg-[#008C44]/10 text-[#22C55E]">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Studio</span>
                    <span className="text-[#D1D5DB] leading-relaxed text-xs">{address}</span>
                  </div>
                </li>
              )}

              {cleanWhatsapp && (
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FDB913]/30 bg-[#FDB913]/10 text-[#FDB913]">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">WhatsApp</span>
                    <a
                      href={`https://wa.me/${cleanWhatsapp}?text=Hi%2C%20I%20would%20like%20help%20with%20a%20Zivo%20AI%20project`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#D1D5DB] hover:text-[#22C55E] transition-colors"
                    >
                      <span>Chat on WhatsApp</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Full-Width 4-Color Signature Divider */}
        <div className="zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
          <span className="bg-[#0089CF]" />
          <span className="bg-[#ED1C24]" />
          <span className="bg-[#FDB913]" />
          <span className="bg-[#008C44]" />
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-6 text-center text-xs text-[#6B7280] md:flex-row md:text-left">
          <p>
            &copy; {new Date().getFullYear()}{' '}
            <span className="font-semibold text-[#22C55E]">{businessName.toUpperCase()}</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/policies" className="hover:text-white transition-colors">
              Policies &amp; Licensing
            </Link>
            <Link href="/account" className="hover:text-white transition-colors">
              Customer Dashboard
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
