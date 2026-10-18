'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Globe,
  Sparkles,
  Share2,
  FileText,
  Eye,
} from 'lucide-react';
import { SiteSettings } from '@/types';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    businessName: 'Zivo AI',
    logoUrl: '/logo.svg',
    faviconUrl: '/favicon.ico',
    themeColor: '#4f46e5',
    fontFamily: 'Inter',
    phoneNumber: '+91 8220303164',
    whatsappNumber: '918220303164',
    supportEmail: 'support@zivo.ai',
    announcementNotice: '🔥 Production-Ready AI & Full-Stack Architectures with Instant Automated Delivery',
    razorpayKeyId: '',
    googleSheetId: '',

    heroHeading: 'Production-Ready AI & Full-Stack Projects with Instant Delivery',
    heroSubheading:
      'Discover, benchmark, and deploy verified AI agents, machine learning pipelines, full-stack web applications, and software architectures with complete source code & live documentation.',
    heroBadgeText: '⚡ Modern AI & Software Engineering Platform',
    heroPrimaryButtonText: 'Explore Project Catalog',
    heroSecondaryButtonText: 'Request Custom Architecture',
    heroBannerActive: true,

    showFeaturedSection: true,
    showHowItWorksSection: true,
    showTestimonialsSection: true,
    showFaqSection: true,
    showStatsSection: true,

    githubUrl: 'https://github.com',
    linkedinUrl: 'https://linkedin.com',
    instagramUrl: 'https://instagram.com',
    youtubeUrl: 'https://youtube.com',
    address: 'Chennai / Bangalore, India',

    refundPolicy:
      'We provide replacement or full refund if source code execution fails our verified specifications and cannot be resolved by our technical setup engineers within 48 hours.',
    deliveryPolicy:
      'Automated digital delivery for fixed-price packages occurs immediately following payment confirmation. Custom projects follow agreed milestone reviews.',
    termsConditions:
      'Projects are provided with complete source code, architecture documentation, and setup guides for software engineers, founders, researchers, and technical builders.',
    privacyPolicy:
      'We respect your privacy. Contact details and account information are strictly used for project support, licensing, and digital delivery.',
  });

  const [activeTab, setActiveTab] = useState<'branding' | 'hero' | 'sections' | 'social' | 'policies' | 'integrations'>('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccessMsg('Settings updated successfully! Changes are now active across the website.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving settings';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof SiteSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading marketplace configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Site Customization & Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Dynamically customize marketplace branding, hero text, section visibility, policies, and integrations without modifying code.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save All Settings
            </>
          )}
        </button>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'branding', label: 'Branding & Theme', icon: Globe },
          { id: 'hero', label: 'Hero & Announcements', icon: Sparkles },
          { id: 'sections', label: 'Section Visibility', icon: Eye },
          { id: 'social', label: 'Contact & Social', icon: Share2 },
          { id: 'policies', label: 'Policies & Legal', icon: FileText },
          { id: 'integrations', label: 'Payment & API Keys', icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Forms by Tab */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {/* Tab 1: Branding & Theme */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Brand Identity & Appearance
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL / Path</label>
                <input
                  type="text"
                  value={settings.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Theme Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.themeColor || '#4f46e5'}
                    onChange={(e) => handleChange('themeColor', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-1"
                  />
                  <input
                    type="text"
                    value={settings.themeColor || '#4f46e5'}
                    onChange={(e) => handleChange('themeColor', e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleChange('supportEmail', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hero & Announcements */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Homepage Hero Section & Announcement Bar
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Bar Notice</label>
                <input
                  type="text"
                  value={settings.announcementNotice}
                  onChange={(e) => handleChange('announcementNotice', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Badge Text</label>
                <input
                  type="text"
                  value={settings.heroBadgeText || ''}
                  onChange={(e) => handleChange('heroBadgeText', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Main Heading</label>
                <input
                  type="text"
                  value={settings.heroHeading || ''}
                  onChange={(e) => handleChange('heroHeading', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Subheading</label>
                <textarea
                  rows={3}
                  value={settings.heroSubheading || ''}
                  onChange={(e) => handleChange('heroSubheading', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Button Text</label>
                  <input
                    type="text"
                    value={settings.heroPrimaryButtonText || ''}
                    onChange={(e) => handleChange('heroPrimaryButtonText', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Button Text</label>
                  <input
                    type="text"
                    value={settings.heroSecondaryButtonText || ''}
                    onChange={(e) => handleChange('heroSecondaryButtonText', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Section Visibility */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Homepage Section Visibility Toggles
            </h2>

            <div className="space-y-3">
              {[
                { key: 'showFeaturedSection', label: 'Featured Projects Showcase', desc: 'Display curated projects in high-contrast carousel' },
                { key: 'showHowItWorksSection', label: 'How It Works Stepper', desc: 'Step-by-step student workflow instructions' },
                { key: 'showTestimonialsSection', label: 'Student Testimonials & Reviews', desc: 'Social proof and placement testimonials' },
                { key: 'showFaqSection', label: 'Frequently Asked Questions (FAQ)', desc: 'Answers to student queries regarding viva & setup' },
                { key: 'showStatsSection', label: 'Platform Metrics & Statistics', desc: 'Numbers of verified projects and placed students' },
              ].map((sec) => (
                <div
                  key={sec.key}
                  className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-all"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{sec.label}</h4>
                    <p className="text-[11px] text-slate-500">{sec.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[sec.key as keyof SiteSettings] !== false}
                    onChange={(e) => handleChange(sec.key as keyof SiteSettings, e.target.checked)}
                    className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Contact & Social */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Contact Numbers & Social Profiles
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Helpline Number</label>
                <input
                  type="text"
                  value={settings.whatsappNumber}
                  onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Phone Number</label>
                <input
                  type="text"
                  value={settings.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GitHub Organization URL</label>
                <input
                  type="url"
                  value={settings.githubUrl || ''}
                  onChange={(e) => handleChange('githubUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  value={settings.linkedinUrl || ''}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Office / Tech Hub Address</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Policies & Legal */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Customer-Facing Policies & Terms
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Refund & Replacement Policy</label>
                <textarea
                  rows={3}
                  value={settings.refundPolicy || ''}
                  onChange={(e) => handleChange('refundPolicy', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Digital Delivery Policy</label>
                <textarea
                  rows={3}
                  value={settings.deliveryPolicy || ''}
                  onChange={(e) => handleChange('deliveryPolicy', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Terms of Use & License Conditions</label>
                <textarea
                  rows={3}
                  value={settings.termsConditions || ''}
                  onChange={(e) => handleChange('termsConditions', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Payment & Integrations */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Payment Gateway & External Service Credentials
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Razorpay Public Key ID (Client-side)
                </label>
                <input
                  type="text"
                  value={settings.razorpayKeyId || ''}
                  onChange={(e) => handleChange('razorpayKeyId', e.target.value)}
                  placeholder="rzp_live_..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Razorpay Secret Key is securely stored in backend environment variables and is never displayed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Sheet ID (Enquiry Sync)
                </label>
                <input
                  type="text"
                  value={settings.googleSheetId || ''}
                  onChange={(e) => handleChange('googleSheetId', e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Service Account credentials are encrypted and stored in backend environment configuration.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
