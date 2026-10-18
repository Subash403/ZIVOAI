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
  isFeatured?: boolean;
}

const CAPABILITIES: CapabilityCard[] = [
  {
    id: 'gen-ai',
    title: 'Generative AI & LLMs',
    description: 'Retrieval-augmented generation (RAG), autonomous multi-agent networks, prompt orchestration, and parameter-efficient fine-tuning on domain datasets.',
    highlight: 'Flagship Core',
    category: 'Artificial Intelligence',
    icon: Cpu,
    tags: ['RAG Pipelines', 'Autonomous Agents', 'Llama 3 & GPT-4', 'Fine-Tuning'],
    isFeatured: true,
  },
  {
    id: 'fullstack',
    title: 'Full-Stack Web & SaaS',
    description: 'Production-ready Next.js architectures, type-safe API gateways, resilient microservices, and serverless database integration.',
    category: 'Web Development',
    icon: Code2,
    tags: ['Next.js 16', 'FastAPI', 'PostgreSQL', 'Tailwind CSS'],
  },
  {
    id: 'vision',
    title: 'Computer Vision & AI',
    description: 'Real-time object detection, segmentation masks, video analytics pipelines, and neural network inference acceleration.',
    category: 'Computer Vision',
    icon: Eye,
    tags: ['PyTorch', 'OpenCV', 'YOLOv10', 'ONNX Runtime'],
  },
  {
    id: 'cloud',
    title: 'Cloud & Microservices',
    description: 'Containerized deployment pipelines, asynchronous message queues, Docker environments, and high-throughput REST/gRPC endpoints.',
    category: 'Cloud Computing',
    icon: Cloud,
    tags: ['Docker', 'Kubernetes', 'Redis', 'Kafka'],
  },
  {
    id: 'edge-iot',
    title: 'Edge AI & IoT Systems',
    description: 'Embedded machine learning runtimes, microcontroller firmware, smart sensor telemetry, and MQTT device communication.',
    category: 'IoT',
    icon: Radio,
    tags: ['ESP32', 'ROS2', 'MQTT', 'Edge Computing'],
  },
];

export default function CapabilitiesBento() {
  const featured = CAPABILITIES.find((c) => c.isFeatured) || CAPABILITIES[0];
  const supporting = CAPABILITIES.filter((c) => !c.isFeatured);

  return (
    <section
      id="capabilities"
      className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Editorial Introduction */}
        <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[11px] font-mono font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            ZIVO AI / CAPABILITIES
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.08]">
              Intelligence, engineered.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              From generative AI to full-stack systems, explore the technologies behind what we build.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all duration-200 group"
            >
              <span>Explore capabilities</span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          {/* Quick Metrics Callout */}
          <div className="pt-6 border-t border-slate-200/80 grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">100%</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Verified Runtimes</div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-600 font-mono">1–3h</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Automated Delivery</div>
            </div>
          </div>
        </div>

        {/* Right Column: Asymmetric Bento Grid */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-5">
          {/* 1. Prominent Feature Card (Generative AI & LLMs) */}
          <Link
            href={`/projects?category=${encodeURIComponent(featured.category)}`}
            className="group block relative p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-indigo-400/90 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-200 overflow-hidden"
          >
            {/* Subtle Top Accent Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600" />

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200 shrink-0">
                  <featured.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      {featured.highlight}
                    </span>
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">Production Core</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors">
                    {featured.title}
                  </h3>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed font-normal mb-6 max-w-2xl">
              {featured.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
              {featured.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/80 group-hover:border-indigo-200 group-hover:bg-indigo-50/50 transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>

          {/* 2x2 Supporting Bento Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {supporting.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.id}
                  href={`/projects?category=${encodeURIComponent(card.category)}`}
                  className="group flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:bg-indigo-50 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="w-7 h-7 rounded-full border border-transparent group-hover:border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1.5 font-normal line-clamp-3">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-4 mt-4 border-t border-slate-100">
                    {card.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/70"
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
    </section>
  );
}
