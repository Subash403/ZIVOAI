'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  Loader2,
  DollarSign,
  Cpu,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { Project } from '@/types';
import ProjectCard from '@/components/ProjectCard';

const STEPS = [
  { id: 1, title: 'Department', icon: GraduationCap, description: 'Select your field of study' },
  { id: 2, title: 'Domain', icon: Layers, description: 'Choose your project domain' },
  { id: 3, title: 'Technology', icon: Cpu, description: 'Select core stack or language' },
  { id: 4, title: 'Complexity', icon: Filter, description: 'Select difficulty level' },
  { id: 5, title: 'Budget', icon: DollarSign, description: 'Specify your budget range' },
];

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication',
  'MCA / BCA Computer Applications',
];

const DOMAINS = [
  'Artificial Intelligence & Deep Learning',
  'Machine Learning & Predictive Analytics',
  'Full-Stack Web Applications',
  'Cloud Computing & Distributed Systems',
  'Cybersecurity & Network Defense',
  'Internet of Things (IoT) & Smart Systems',
];

const TECHNOLOGIES = [
  'Python',
  'PyTorch / TensorFlow',
  'React / Next.js',
  'Node.js & Express',
  'Java / Spring Boot',
  'Computer Vision (OpenCV)',
  'Natural Language Processing (NLP)',
];

const DIFFICULTIES = ['Any', 'Beginner', 'Intermediate', 'Advanced'];

const BUDGET_OPTIONS = [
  { label: 'Any Budget', max: 0 },
  { label: 'Under ₹2,000', max: 2000 },
  { label: 'Under ₹3,500', max: 3500 },
  { label: 'Under ₹5,000', max: 5000 },
  { label: 'Custom / Flexible', max: 10000 },
];

export default function ProjectFinderPage() {
  const [step, setStep] = useState(1);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [technology, setTechnology] = useState(TECHNOLOGIES[0]);
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [budgetMax, setBudgetMax] = useState(0);

  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<Project[]>([]);

  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);

    try {
      // Map domain or department to category
      let category = 'Artificial Intelligence';
      if (domain.includes('Web')) category = 'Web Development';
      else if (domain.includes('Cloud')) category = 'Cloud & DevOps';
      else if (domain.includes('Cyber')) category = 'Cybersecurity';
      else if (domain.includes('IoT')) category = 'IoT';

      const res = await fetch('/api/projects/finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          difficulty: difficulty === 'Any' ? undefined : difficulty,
          technology,
          budgetMax: budgetMax > 0 ? budgetMax : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        setResults(data.projects);
      } else {
        setResults([]);
      }
    } catch (err: unknown) {
      console.error('Project finder error:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const nextStep = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      handleSearch();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <main className="zivo-page min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-10">
      {/* Header */}
      <div className="zivo-reveal mx-auto max-w-2xl space-y-3 text-center">
        <div className="zivo-eyebrow">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Project & Architecture Advisor
        </div>
        <h1 className="zivo-display text-4xl font-bold text-slate-900 sm:text-5xl">
          Find Your Ideal Software & AI Architecture
        </h1>
        <p className="text-sm text-slate-600">
          Answer a few quick questions about your focus domain, preferred technology stack, and project goals to discover tailored, production-ready codebases.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="zivo-surface rounded-3xl p-4 sm:p-5">
        <div className="grid grid-cols-5 gap-2 text-center">
          {STEPS.map((s) => {
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isCurrent
                      ? 'glow-gradient text-white shadow-md'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span
                  className={`text-[11px] font-semibold hidden sm:inline ${
                    isCurrent ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      {!hasSearched ? (
        <div className="zivo-surface mx-auto max-w-3xl space-y-8 rounded-3xl p-6 sm:p-10">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Step {step} of 5
            </span>
            <h2 className="zivo-display mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              {STEPS[step - 1].description}
            </h2>
          </div>

          {/* Step 1: Department */}
          {step === 1 && (
            <div className="grid grid-cols-1 gap-3">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDepartment(dept)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    department === dept
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-800">{dept}</span>
                  {department === dept && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Domain */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-3">
              {DOMAINS.map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setDomain(dom)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    domain === dom
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-800">{dom}</span>
                  {domain === dom && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Technology */}
          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TECHNOLOGIES.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => setTechnology(tech)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    technology === tech
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-800">{tech}</span>
                  {technology === tech && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Difficulty */}
          {step === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`p-5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                    difficulty === diff
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-base font-bold text-slate-900">{diff}</span>
                  <span className="text-xs text-slate-500">
                    {diff === 'Beginner' && 'Simple algorithms, quick setup, ideal for Mini Projects.'}
                    {diff === 'Intermediate' && 'Standard ML/Full-Stack architecture, IEEE approved.'}
                    {diff === 'Advanced' && 'Novel research, distributed architectures, high viva score.'}
                    {diff === 'Any' && 'Show all difficulty levels in catalog.'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 5: Budget */}
          {step === 5 && (
            <div className="grid grid-cols-1 gap-3">
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setBudgetMax(opt.max)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    budgetMax === opt.max
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                  {budgetMax === opt.max && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              type="button"
              disabled={step === 1}
              onClick={prevStep}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 text-xs font-bold px-6 py-2.5 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all"
            >
              {step === 5 ? 'Find Matching Projects' : 'Next Step'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Recommended Projects ({results.length})
              </h2>
              <p className="text-xs text-slate-500">
                Filtered for: {department} • {domain} • {technology}
              </p>
            </div>

            <button
              onClick={() => {
                setHasSearched(false);
                setStep(1);
              }}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            >
              <Compass className="w-4 h-4 text-indigo-600" />
              Restart Finder
            </button>
          </div>

          {searching ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Scanning catalog for syllabus matches...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-2xl mx-auto space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Search className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  No exact catalog match found for these filters
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Don&apos;t worry! Our expert development team builds custom final-year projects from scratch according to your exact base paper, dataset, and university guidelines.
                </p>
              </div>

              <Link
                href={`/projects/custom?domain=${encodeURIComponent(domain)}&tech=${encodeURIComponent(
                  technology
                )}&dept=${encodeURIComponent(department)}`}
                className="inline-flex items-center gap-2 text-xs font-bold px-6 py-3 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all"
              >
                Request Custom Project for {domain}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
      </div>
    </main>
  );
}
