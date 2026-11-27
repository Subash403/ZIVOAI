'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Cpu,
  Code2,
  Eye,
  Cloud,
  Radio,
  ArrowUpRight,
} from 'lucide-react';

interface CapabilityCard {
  id: string;
  title: string;
  description: string;
  highlight?: string;
  category: string;
  icon: React.ElementType;
  tags: string[];
  accentColor: string;
  softBg: string;
  isFeatured?: boolean;
}

const CAPABILITIES: CapabilityCard[] = [
  {
    id: 'gen-ai',
    title: 'Generative AI & LLMs',
    description:
      'Retrieval-augmented generation (RAG), multi-agent orchestration, prompt workflows, and parameter-efficient fine-tuning on domain datasets.',
    highlight: 'Flagship AI Core',
    category: 'Artificial Intelligence',
    icon: Cpu,
    tags: ['RAG Pipelines', 'AI Agents', 'LLM APIs', 'Fine-Tuning'],
    accentColor: '#0089CF',
    softBg: 'bg-[#F0F9FF]',
    isFeatured: true,
  },
  {
    id: 'fullstack',
    title: 'Full-Stack Web & SaaS',
    description:
      'Production-ready Next.js architectures, type-safe API gateways, relational databases, and commercial authentication flows.',
    category: 'Web Development',
    icon: Code2,
    tags: ['Next.js 16', 'FastAPI', 'PostgreSQL'],
    accentColor: '#ED1C24',
    softBg: 'bg-[#FEF2F2]',
  },
  {
    id: 'vision',
    title: 'Computer Vision & ML',
    description:
      'Object detection, segmentation masks, predictive analytics pipelines, and real-time model inference services.',
    category: 'Machine Learning',
    icon: Eye,
    tags: ['PyTorch', 'OpenCV', 'ONNX Runtime'],
    accentColor: '#D97706',
    softBg: 'bg-[#FFFBEB]',
  },
  {
    id: 'cloud',
    title: 'Cloud & Microservices',
    description:
      'Containerized deployment templates, async task workers, Docker environments, and high-throughput REST/gRPC backends.',
    category: 'Cloud Computing',
    icon: Cloud,
    tags: ['Docker', 'Kubernetes', 'Redis'],
    accentColor: '#008C44',
    softBg: 'bg-[#F0FDF4]',
  },
  {
    id: 'edge-iot',
    title: 'Edge AI & IoT Systems',
    description:
      'Embedded machine learning runtimes, microcontroller firmware, smart sensor telemetry, and MQTT pipelines.',
    category: 'IoT',
    icon: Radio,
    tags: ['ESP32', 'MQTT', 'Edge AI'],
    accentColor: '#0089CF',
    softBg: 'bg-[#F0F9FF]',
  },
];

export default function CapabilitiesBento({ showStats = true }: { showStats?: boolean }) {
  const featured = CAPABILITIES.find((c) => c.isFeatured) || CAPABILITIES[0];
  const supporting = CAPABILITIES.filter((c) => !c.isFeatured);

  return (
    <section id="capabilities" className="border-y border-[#E5E7EB] bg-[#F9FAFB] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Editorial Introduction */}
          <div className="space-y-6 lg:col-span-4 lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 text-[11px] font-heading font-bold uppercase tracking-[0.12em] text-[#0089CF]">
              <span className="h-[2px] w-6 bg-[#0089CF]" aria-hidden="true" />
              AI Solutions &amp; Categories
            </div>

            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-extrabold leading-[1.13] tracking-[-0.03em] text-[#0A0A0A] sm:text-4xl">
                Intelligence, engineered for real delivery.
              </h2>
              <p className="text-sm leading-relaxed text-[#4B5563]">
                Explore ready-made software categories and AI/ML solution stacks — each structured with clean repositories, environment guides, and clear deliverables.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/projects"
                className="inline-flex h-11 items-center gap-2 rounded-sm bg-[#ED1C24] px-6 font-heading text-[11px] font-bold uppercase tracking-[0.09em] text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#D1171F] hover:shadow-md"
              >
                <span>Explore Categories</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="/projects/finder"
                className="inline-flex h-11 items-center gap-2 rounded-sm border border-[#0A0A0A] px-5 font-heading text-[11px] font-bold uppercase tracking-[0.09em] text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
              >
                <span>AI Finder</span>
              </Link>
            </div>

            {/* Factual Platform Pillars (Quad-Accent Styled) */}
            {showStats && (
              <div className="grid grid-cols-2 gap-4 border-t border-[#E5E7EB] pt-6">
                <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                  <div className="font-heading text-lg font-extrabold text-[#0089CF]">Private R2</div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#6B7280]">Signed Cloud Delivery</div>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                  <div className="font-heading text-lg font-extrabold text-[#008C44]">8-Stage</div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#6B7280]">Custom Build Tracking</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Clean Editorial Cards */}
          <div className="space-y-4 lg:col-span-8 sm:space-y-5">
            {/* Flagship Featured Card */}
            <Link
              href={`/projects?category=${encodeURIComponent(featured.category)}`}
              className="group relative block overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0089CF] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7"
            >
              <div className="absolute top-0 left-0 right-0 zivo-quad-bar zivo-quad-bar-thin" aria-hidden="true">
                <span className="bg-[#0089CF]" />
                <span className="bg-[#ED1C24]" />
                <span className="bg-[#FDB913]" />
                <span className="bg-[#008C44]" />
              </div>

              <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent text-[#0089CF] transition-colors duration-200"
                  >
                    <featured.icon className="h-6 w-6 text-current transition-colors duration-200" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="inline-block rounded bg-[#F0F9FF] px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-[0.08em] text-[#0089CF]">
                      {featured.highlight}
                    </span>
                    <h3 className="mt-1 font-heading text-xl font-extrabold text-[#0A0A0A] transition-colors duration-200 group-hover:text-[#0089CF] sm:text-2xl">
                      {featured.title}
                    </h3>
                  </div>
                </div>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] text-[#6B7280] transition-all duration-200 group-hover:border-[#0089CF] group-hover:text-[#0089CF]">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>

              <p className="mb-5 max-w-2xl text-sm leading-relaxed text-[#4B5563]">
                {featured.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 border-t border-[#F3F4F6] pt-4">
                {featured.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs font-semibold text-[#374151]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>

            {/* 2x2 Supporting Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              {supporting.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.id}
                    href={`/projects?category=${encodeURIComponent(card.category)}`}
                    className="group flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0089CF] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-6"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent transition-colors duration-200"
                          style={{ color: card.accentColor }}
                        >
                          <Icon className="h-5 w-5 text-current transition-colors duration-200" aria-hidden="true" />
                        </div>
                        <ArrowUpRight
                          className="h-4 w-4 text-[#9CA3AF] transition-colors duration-200 group-hover:text-[#0089CF]"
                          aria-hidden="true"
                        />
                      </div>

                      <div>
                        <h4 className="font-heading text-base font-bold text-[#0A0A0A] transition-colors duration-200 group-hover:text-[#0089CF]">
                          {card.title}
                        </h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#4B5563] line-clamp-3">
                          {card.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#F3F4F6] pt-3.5">
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[11px] font-medium text-[#4B5563]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
