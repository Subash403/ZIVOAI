'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  MessageSquareText,
  ShoppingBag,
  Users,
  Settings,
  ExternalLink,
  X,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { BRAND_ASSETS } from '@/lib/brand';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string>(BRAND_ASSETS.horizontalLight);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.logoUrl) setLogoUrl(data.settings.logoUrl);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard, accent: '#0089CF' },
    { name: 'All Projects', href: '/admin/projects', icon: FolderKanban, accent: '#ED1C24' },
    { name: 'Add Project', href: '/admin/projects/new', icon: PlusCircle, accent: '#008C44' },
    { name: 'Enquiries / Leads', href: '/admin/enquiries', icon: MessageSquareText, accent: '#D97706' },
    { name: 'Orders & Payments', href: '/admin/orders', icon: ShoppingBag, accent: '#0089CF' },
    { name: 'Customers', href: '/admin/customers', icon: Users, accent: '#008C44' },
    { name: 'Admin Settings', href: '/admin/settings', icon: Settings, accent: '#4B5563' },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        <div className="zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
          <span className="bg-[#0089CF]" />
          <span className="bg-[#ED1C24]" />
          <span className="bg-[#FDB913]" />
          <span className="bg-[#008C44]" />
        </div>
        <div className="space-y-6 p-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4">
            <Link href="/admin" onClick={onClose} className="flex items-center gap-2.5">
              <BrandLogo
                variant="horizontal"
                tone="light"
                size="sm"
                src={logoUrl}
                alt="Zivo AI"
                className="h-8"
              />
              <div className="border-l border-[#E5E7EB] pl-2.5">
                <span className="block font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B7280]">
                  Admin
                </span>
                <span className="block font-heading text-xs font-extrabold text-[#0A0A0A]">
                  Console
                </span>
              </div>
            </Link>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sidebar"
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0A0A0A] lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Admin Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && item.href !== '/admin/projects' && pathname.startsWith(item.href)) ||
                (item.href === '/admin/projects' && pathname === '/admin/projects');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-l-2 border-[#0089CF] bg-[#F0F9FF] font-bold text-[#0A0A0A]'
                      : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#0A0A0A]'
                  }`}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: isActive ? '#0089CF' : item.accent }}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Link to Public Storefront */}
      <div className="border-t border-[#F3F4F6] p-4">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5 text-xs font-bold text-[#0A0A0A] transition-colors hover:border-[#0089CF] hover:bg-white"
        >
          <span>View Public Storefront</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#0089CF]" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-[#E5E7EB] bg-white lg:flex">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
