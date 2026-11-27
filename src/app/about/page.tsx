import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ShieldCheck,
  Layers,
  CheckCircle2,
  FolderKanban,
  Wrench,
  Lock,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Zivo AI — Verified Technology Marketplace',
  description:
    'Learn about Zivo AI: our engineering philosophy, verified source code standards, private cloud delivery, and bespoke software solutions.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] pt-24 pb-16 sm:pt-28 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Hero Section */}
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 sm:p-12 lg:p-16 shadow-xs relative overflow-hidden">
          <div className="zivo-quad-bar zivo-quad-bar-thin absolute top-0 left-0 right-0" aria-hidden="true">
            <span className="bg-[#0089CF]" />
            <span className="bg-[#ED1C24]" />
            <span className="bg-[#FDB913]" />
            <span className="bg-[#008C44]" />
          </div>

          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#0089CF]">
              <span className="h-[2px] w-6 bg-[#0089CF]" aria-hidden="true" />
              About Zivo AI
            </div>

            <h1 className="font-heading text-3xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] sm:text-5xl leading-[1.12]">
              Engineering marketplace built for real software delivery.
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-[#4B5563]">
              Zivo AI connects software engineers, researchers, students, and technology builders with fully verified AI architectures, production-grade Next.js web applications, and custom engineering solutions.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/projects"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ED1C24] px-6 font-heading text-xs font-bold tracking-[0.02em] text-white shadow-md hover:bg-[#D1171F] transition-all"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/projects/custom"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#D1D5DB] bg-white px-6 font-heading text-xs font-bold tracking-[0.02em] text-[#0A0A0A] hover:bg-[#F3F4F6] transition-colors"
              >
                <span>Request Custom Project</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F9FF] text-[#0089CF]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-xl font-bold text-[#0A0A0A]">
              100% Verified Codebases
            </h2>
            <p className="text-sm leading-relaxed text-[#4B5563]">
              Every project in our catalog is built, compiled, and benchmarked. You receive pristine source code, dependencies, and environment setup documentation.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#ED1C24]">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-xl font-bold text-[#0A0A0A]">
              Secure Private Cloud Delivery
            </h2>
            <p className="text-sm leading-relaxed text-[#4B5563]">
              Purchases are immediately delivered through authenticated, short-lived Cloudflare R2 signed presigned URLs directly within your customer dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#008C44]">
              <Layers className="h-6 w-6" />
            </div>
            <h2 className="font-heading text-xl font-bold text-[#0A0A0A]">
              8-Stage Milestone Tracking
            </h2>
            <p className="text-sm leading-relaxed text-[#4B5563]">
              Custom development requests are tracked across eight chronological stages from planning to final testing, ensuring transparent client milestones.
            </p>
          </div>
        </div>

        {/* Our Standards & Values */}
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 sm:p-12 shadow-xs space-y-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#008C44]">
              <span className="h-[2px] w-6 bg-[#008C44]" aria-hidden="true" />
              Our Standards
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0A0A0A]">
              Why Builders Choose Zivo AI
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="h-5 w-5 text-[#008C44] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Zero Dummy Data &amp; Genuine Architecture</h3>
                <p className="text-xs sm:text-sm text-[#4B5563] mt-1 leading-relaxed">
                  Real backend integrations, authenticated routes, database schemas, and runnable scripts. We never sell superficial UI templates disguised as full systems.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="h-5 w-5 text-[#008C44] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Comprehensive Documentation Included</h3>
                <p className="text-xs sm:text-sm text-[#4B5563] mt-1 leading-relaxed">
                  Every package includes README setup instructions, environment variable declarations, architecture diagrams, and requirements files.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="h-5 w-5 text-[#008C44] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Instant Automated Fulfillment</h3>
                <p className="text-xs sm:text-sm text-[#4B5563] mt-1 leading-relaxed">
                  Razorpay webhooks idempotently verify payments, grant access tokens, and send instant confirmation emails with zero human bottleneck.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="h-5 w-5 text-[#008C44] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Bespoke Engineering On Demand</h3>
                <p className="text-xs sm:text-sm text-[#4B5563] mt-1 leading-relaxed">
                  Need a tailored machine learning pipeline or specialized full-stack application? Our engineering leads work with you directly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Tracks CTA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-6 w-6 text-[#ED1C24]" />
              <h3 className="font-heading text-lg font-bold text-[#0A0A0A]">Ready-to-Run Catalog</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
              Explore hundreds of verified fixed-price software packages ready for immediate download and local execution.
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ED1C24] hover:text-[#B9141B]"
            >
              <span>Browse Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-[#0089CF]" />
              <h3 className="font-heading text-lg font-bold text-[#0A0A0A]">Custom Development</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
              Have specific thesis, capstone, or commercial startup requirements? Submit an enquiry for milestone development.
            </p>
            <Link
              href="/projects/custom"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0089CF] hover:text-[#0073B0]"
            >
              <span>Submit Project Requirements</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
