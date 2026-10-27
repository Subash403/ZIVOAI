'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Truck, FileText, Lock, Sparkles } from 'lucide-react';
import { PublicSettings } from '@/lib/settings';

export default function PoliciesPage() {
  const [activeTab, setActiveTab] = useState<'refund' | 'delivery' | 'terms' | 'privacy'>('refund');
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

  const businessName = settings?.businessName || 'Zivo AI';

  return (
    <main className="zivo-page min-h-screen pt-20 sm:pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="zivo-reveal space-y-3 text-center">
          <div className="zivo-eyebrow">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Transparency & Trust</span>
          </div>
          <h1 className="zivo-display text-4xl font-extrabold text-slate-900 sm:text-5xl tracking-tight">
            Customer Policies & Terms
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto font-normal">
            Review delivery terms, refund guarantees, code usage standards, and privacy commitments for {businessName}.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 glass-panel p-2 rounded-2xl border border-slate-200/80 shadow-xs max-w-2xl mx-auto">
          {[
            { id: 'refund' as const, label: 'Refund Policy', icon: ShieldCheck },
            { id: 'delivery' as const, label: 'Delivery Policy', icon: Truck },
            { id: 'terms' as const, label: 'Terms & Conditions', icon: FileText },
            { id: 'privacy' as const, label: 'Privacy Policy', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Policy Content Card */}
        <div className="zivo-surface space-y-6 rounded-3xl p-6 sm:p-10">
          {activeTab === 'refund' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Refund & Replacement Guarantee</h2>
                  <p className="text-xs text-slate-500">Last updated: 2026 Policy Release</p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
                <p className="whitespace-pre-line font-medium text-slate-800">
                  {settings?.refundPolicy ||
                    'We provide replacement or full refund if source code execution fails our verified specifications and cannot be resolved by our technical setup engineers within 48 hours.'}
                </p>
                
                <h3 className="text-base font-bold text-slate-900 pt-2">Eligibility Conditions</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
                  <li>Code failure must be reported within 7 days of verified digital receipt.</li>
                  <li>Our technical support team must be granted an Anydesk/remote session to diagnose dependency or environment issues.</li>
                  <li>If the project cannot run as demonstrated or advertised, a replacement project of equal value or full refund is initiated immediately.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Automated Digital Delivery Policy</h2>
                  <p className="text-xs text-slate-500">Instant distribution upon payment confirmation</p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
                <p className="whitespace-pre-line font-medium text-slate-800">
                  {settings?.deliveryPolicy ||
                    'Automated digital delivery for fixed-price packages occurs immediately following payment confirmation. Custom projects follow agreed milestone reviews.'}
                </p>
                
                <h3 className="text-base font-bold text-slate-900 pt-2">Fulfillment Methods</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
                  <li><strong>Fixed-Price Catalog Projects:</strong> Download link generated instantly on your Order Confirmation screen and securely accessible in your Customer Dashboard.</li>
                  <li><strong>Custom Architectures:</strong> Delivered via encrypted repository or secure digital archives directly to your verified customer account after milestone review.</li>
                  <li><strong>Physical Hardware/IoT Components:</strong> Dispatched via courier with tracking reference provided within 24-48 business hours.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Terms of Use & Architecture License</h2>
                  <p className="text-xs text-slate-500">Guidelines for developers, founders, researchers, and technical builders</p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
                <p className="whitespace-pre-line font-medium text-slate-800">
                  {settings?.termsConditions ||
                    'Projects are provided with complete source code, architecture documentation, and setup guides for software engineers, founders, researchers, and technical builders.'}
                </p>
                
                <h3 className="text-base font-bold text-slate-900 pt-2">Permitted Software & Architecture Use</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
                  <li>You may study, modify, deploy, enhance, and benchmark the codebase for enterprise prototypes, academic research, and technical presentations.</li>
                  <li>Direct unmodified redistribution or resale of the original proprietary package is strictly prohibited.</li>
                  <li>Customers are invited to actively participate during 1-on-1 remote setup sessions to master architectural concepts and workflows.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Customer Privacy Policy</h2>
                  <p className="text-xs text-slate-500">How we protect your identity and personal data</p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
                <p className="whitespace-pre-line font-medium text-slate-800">
                  {settings?.privacyPolicy ||
                    'We respect your privacy. Contact details and account information are strictly used for project support, licensing, and digital delivery.'}
                </p>
                
                <h3 className="text-base font-bold text-slate-900 pt-2">Our Data Commitments</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
                  <li>Your phone number and email are exclusively used for project order confirmation, remote installation, and delivery alerts.</li>
                  <li>We never sell, rent, or distribute customer profiles to any third-party advertisers.</li>
                  <li>Payment details are handled exclusively through PCI-DSS compliant Razorpay servers; we never store your card or bank credentials.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Support CTA */}
        <div className="text-center pt-4">
          <p className="text-xs sm:text-sm text-slate-500">
            Have questions about our policies? Contact our support team at{' '}
            <a
              href={`mailto:${settings?.supportEmail || 'support@zivo.ai'}`}
              className="text-indigo-600 font-semibold hover:underline"
            >
              {settings?.supportEmail || 'support@zivo.ai'}
            </a>
          </p>
        </div>

      </div>
    </main>
  );
}
