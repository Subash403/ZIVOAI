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
  AlertTriangle,
  Trash2,
  ShieldAlert,
  X,
  Lock,
} from 'lucide-react';
import { SiteSettings } from '@/types';
import { BRAND_ASSETS } from '@/lib/brand';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    businessName: 'Zivo AI',
    logoUrl: BRAND_ASSETS.horizontalLight,
    faviconUrl: BRAND_ASSETS.mark,
    themeColor: '#ED1C24',
    fontFamily: 'Inter',
    phoneNumber: '',
    whatsappNumber: '',
    supportEmail: 'support@zivo.ai',
    footerDescription: 'Engineering marketplace for ready-to-run AI pipelines, full-stack web software, and custom architectures with documented source code and secure dashboard delivery.',
    footerCopyright: 'Engineering the future with modern AI, cloud architectures, and developer-first digital assets.',
    announcementNotice: 'Verified AI & Full-Stack Software Projects with Secure Dashboard Delivery',
    razorpayKeyId: '',
    googleSheetId: '',

    heroHeading: 'Production-Ready AI & Full-Stack Projects Built to Run',
    heroSubheading:
      'Discover, compare, and deploy documented AI pipelines, machine learning systems, full-stack web applications, and custom software architectures with complete source code.',
    heroBadgeText: 'Modern AI & Software Engineering Platform',
    heroPrimaryButtonText: 'Explore Project Catalog',
    heroSecondaryButtonText: 'Request Custom Architecture',
    heroBannerActive: true,

    showFeaturedSection: true,
    showHowItWorksSection: true,
    showTestimonialsSection: false,
    showFaqSection: true,
    showStatsSection: true,

    githubUrl: '',
    linkedinUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    showGithub: false,
    showLinkedin: false,
    showInstagram: true,
    showYoutube: false,
    address: '',

    refundPolicy:
      'We provide replacement or full refund if source code execution fails our verified specifications and cannot be resolved by our technical setup engineers within 48 hours.',
    deliveryPolicy:
      'Fixed-price packages unlock in your Customer Dashboard immediately once Razorpay payment verification completes. Custom projects follow agreed milestone reviews.',
    termsConditions:
      'Projects are provided with complete source code, architecture documentation, and setup guides for software engineers, founders, researchers, and technical builders.',
    privacyPolicy:
      'We respect your privacy. Contact details and account information are strictly used for project support, licensing, and digital delivery.',
  });

  const [activeTab, setActiveTab] = useState<'branding' | 'hero' | 'sections' | 'social' | 'policies' | 'integrations' | 'danger'>('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Danger Zone Controlled Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmPhrase, setResetConfirmPhrase] = useState('');
  const [resetAdminPassword, setResetAdminPassword] = useState('');
  const [resetIncludeProjects, setResetIncludeProjects] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmPhrase !== 'DELETE ALL DATA') {
      setResetError('Confirmation phrase mismatch. You must type "DELETE ALL DATA" exactly.');
      return;
    }
    if (!resetAdminPassword) {
      setResetError('Administrator password is required.');
      return;
    }

    setIsResetting(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const res = await fetch('/api/admin/system/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPhrase: resetConfirmPhrase,
          adminPassword: resetAdminPassword,
          includeProjects: resetIncludeProjects,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute data reset.');
      }

      setResetSuccess(
        `Data reset completed successfully. Backup snapshot created: ${data.backupFilename}. ` +
        `Cleared: ${data.summary.deletedOrders} orders, ${data.summary.deletedCustomers} customers, ` +
        `${data.summary.deletedEnquiries} enquiries${data.summary.deletedProjects ? `, ${data.summary.deletedProjects} projects` : ''}.`
      );
      setShowResetModal(false);
      setResetConfirmPhrase('');
      setResetAdminPassword('');
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'An error occurred during data reset.');
    } finally {
      setIsResetting(false);
    }
  };

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

  const SECTION_KEYS: Record<'branding' | 'hero' | 'sections' | 'social' | 'policies' | 'integrations', (keyof SiteSettings)[]> = {
    branding: ['businessName', 'logoUrl', 'themeColor', 'supportEmail', 'footerDescription', 'footerCopyright'],
    hero: ['announcementNotice', 'heroBadgeText', 'heroHeading', 'heroSubheading', 'heroPrimaryButtonText', 'heroSecondaryButtonText', 'heroBannerActive'],
    sections: ['showFeaturedSection', 'showHowItWorksSection', 'showTestimonialsSection', 'showFaqSection', 'showStatsSection'],
    social: ['whatsappNumber', 'phoneNumber', 'githubUrl', 'linkedinUrl', 'instagramUrl', 'youtubeUrl', 'showInstagram', 'showGithub', 'showLinkedin', 'showYoutube', 'address'],
    policies: ['refundPolicy', 'deliveryPolicy', 'termsConditions', 'privacyPolicy'],
    integrations: ['razorpayKeyId', 'googleSheetId'],
  };

  const savePayload = async (payload: Partial<SiteSettings>, label: string) => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccessMsg(`${label} saved successfully! Changes are audit-logged and active across the website.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving settings';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePayload(settings, 'All settings');
  };

  const handleSaveCurrentSection = async () => {
    if (activeTab === 'danger') return;
    const keys = SECTION_KEYS[activeTab as keyof typeof SECTION_KEYS];
    if (!keys) return;
    const partial: Partial<SiteSettings> = {};
    for (const k of keys) {
      (partial as Record<string, unknown>)[k] = settings[k];
    }
    await savePayload(partial, `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section`);
  };

  const handleChange = (key: keyof SiteSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#0089CF] animate-spin mx-auto" />
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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSaveCurrentSection}
            disabled={saving}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-xs transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-[#0089CF]" />
            Save This Section
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-[#ED1C24] hover:bg-[#D1171F] text-white shadow-xs transition-all disabled:opacity-50"
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
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{resetSuccess}</span>
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
          { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, isDanger: true },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDanger = (tab as { isDanger?: boolean }).isDanger;

          let btnClass = 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50';
          if (isActive) {
            btnClass = isDanger ? 'bg-[#ED1C24] text-white shadow-sm' : 'bg-[#0089CF] text-white shadow-sm';
          } else if (isDanger) {
            btnClass = 'bg-red-50/40 border border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50';
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${btnClass}`}
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL / Path</label>
                <input
                  type="text"
                  value={settings.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Footer Description</label>
                <textarea rows={2} value={settings.footerDescription} onChange={(e) => handleChange('footerDescription', e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Footer Copyright Text</label>
                <input type="text" value={settings.footerCopyright} onChange={(e) => handleChange('footerCopyright', e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]" />
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Badge Text</label>
                <input
                  type="text"
                  value={settings.heroBadgeText || ''}
                  onChange={(e) => handleChange('heroBadgeText', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Main Heading</label>
                <input
                  type="text"
                  value={settings.heroHeading || ''}
                  onChange={(e) => handleChange('heroHeading', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Subheading</label>
                <textarea
                  rows={3}
                  value={settings.heroSubheading || ''}
                  onChange={(e) => handleChange('heroSubheading', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Button Text</label>
                  <input
                    type="text"
                    value={settings.heroPrimaryButtonText || ''}
                    onChange={(e) => handleChange('heroPrimaryButtonText', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Button Text</label>
                  <input
                    type="text"
                    value={settings.heroSecondaryButtonText || ''}
                    onChange={(e) => handleChange('heroSecondaryButtonText', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
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
                    className="w-5 h-5 rounded-md text-[#0089CF] focus:ring-[#0089CF] cursor-pointer"
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Phone Number</label>
                <input
                  type="text"
                  value={settings.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GitHub Organization URL</label>
                <input
                  type="url"
                  value={settings.githubUrl || ''}
                  onChange={(e) => handleChange('githubUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  value={settings.linkedinUrl || ''}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Office / Tech Hub Address</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <p className="text-xs font-bold text-slate-700">Footer Social Visibility</p>
                {[
                  { key: 'showInstagram', label: 'Show Instagram', defaultEnabled: true },
                  { key: 'showGithub', label: 'Show GitHub', defaultEnabled: false },
                  { key: 'showLinkedin', label: 'Show LinkedIn', defaultEnabled: false },
                  { key: 'showYoutube', label: 'Show YouTube', defaultEnabled: false },
                ].map((social) => (
                  <label key={social.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700">
                    <span>{social.label}</span>
                    <input
                      type="checkbox"
                      checked={settings[social.key as keyof SiteSettings] === undefined ? social.defaultEnabled : settings[social.key as keyof SiteSettings] === true}
                      onChange={(e) => handleChange(social.key as keyof SiteSettings, e.target.checked)}
                      className="h-4 w-4 rounded text-[#0089CF] focus:ring-[#0089CF]"
                    />
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instagram Profile</label>
                <input type="url" value={settings.instagramUrl || ''} onChange={(e) => handleChange('instagramUrl', e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">YouTube Channel</label>
                <input type="url" value={settings.youtubeUrl || ''} onChange={(e) => handleChange('youtubeUrl', e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]" />
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Digital Delivery Policy</label>
                <textarea
                  rows={3}
                  value={settings.deliveryPolicy || ''}
                  onChange={(e) => handleChange('deliveryPolicy', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Terms of Use & License Conditions</label>
                <textarea
                  rows={3}
                  value={settings.termsConditions || ''}
                  onChange={(e) => handleChange('termsConditions', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
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
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
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
                  placeholder="Enter your Google Sheet ID"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Service Account credentials are encrypted and stored in backend environment configuration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Danger Zone (Controlled Data Reset) */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-red-100 pb-3">
              <ShieldAlert className="w-5 h-5 text-[#ED1C24]" />
              <h2 className="text-base font-bold text-slate-900">
                Danger Zone: Controlled System Data Reset
              </h2>
            </div>

            <div className="p-5 rounded-2xl bg-red-50/70 border border-red-200 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ED1C24] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-red-900">
                    Irreversible Action Warning
                  </h3>
                  <p className="text-xs text-red-700 leading-relaxed">
                    This administrative operation performs a controlled reset of business application data. This utility is restricted to verified administrators and requires re-authenticating with your admin password.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-red-200 bg-white p-4 space-y-2">
                  <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">
                    Data Scope Reset:
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>Customer accounts and profile data</li>
                    <li>Fixed-price project orders &amp; downloads</li>
                    <li>Custom project enquiries &amp; timelines</li>
                    <li>Customer wishlists &amp; activity records</li>
                    <li>Order notifications &amp; outbox retries</li>
                    <li>Optional: Project catalog records</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Strictly Preserved:
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>Administrator account &amp; credentials</li>
                    <li>Essential authentication security tokens</li>
                    <li>Website settings &amp; branding configuration</li>
                    <li>Database migrations &amp; schema integrity</li>
                    <li>Verified pre-deletion backup archive</li>
                    <li>Audit log trail recording the reset</li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">Automated Pre-Deletion Backup</p>
                  <p className="text-[11px] text-slate-500">
                    A full snapshot of all records slated for deletion is automatically archived to <code className="font-mono text-slate-700">storage/backups/</code> before deletion starts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResetError(null);
                    setResetConfirmPhrase('');
                    setResetAdminPassword('');
                    setShowResetModal(true);
                  }}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ED1C24] hover:bg-[#D1171F] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete All Data</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-red-50/50">
              <div className="flex items-center gap-2.5 text-[#ED1C24]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900">Confirm Controlled Data Reset</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isResetting) setShowResetModal(false);
                }}
                disabled={isResetting}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteReset} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                This will reset customer accounts, purchases, custom enquiries, and notification outbox entries. An automated JSON backup snapshot will be archived before deletion.
              </p>

              {/* Optional Project Catalog Toggle */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                <input
                  type="checkbox"
                  id="resetIncludeProjects"
                  checked={resetIncludeProjects}
                  onChange={(e) => setResetIncludeProjects(e.target.checked)}
                  disabled={isResetting}
                  className="rounded text-[#ED1C24] focus:ring-[#ED1C24]"
                />
                <label htmlFor="resetIncludeProjects" className="font-semibold cursor-pointer">
                  Also reset Project Catalog records (default preserves catalog)
                </label>
              </div>

              {/* Phrase Confirmation Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Type <span className="font-mono text-[#ED1C24] bg-red-50 px-1.5 py-0.5 rounded border border-red-200">DELETE ALL DATA</span> to confirm:
                </label>
                <input
                  type="text"
                  value={resetConfirmPhrase}
                  onChange={(e) => setResetConfirmPhrase(e.target.value)}
                  placeholder="DELETE ALL DATA"
                  disabled={isResetting}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                />
              </div>

              {/* Admin Password Re-authentication Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Confirm Administrator Password:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={resetAdminPassword}
                    onChange={(e) => setResetAdminPassword(e.target.value)}
                    placeholder="Enter your admin password"
                    disabled={isResetting}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                  />
                </div>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    resetConfirmPhrase !== 'DELETE ALL DATA' ||
                    !resetAdminPassword ||
                    isResetting
                  }
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ED1C24] hover:bg-[#D1171F] text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing Reset...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm Irreversible Reset</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
