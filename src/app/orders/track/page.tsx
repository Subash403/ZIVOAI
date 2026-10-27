'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ShoppingBag,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  ArrowLeft,
  PhoneCall,
  User,
} from 'lucide-react';
import { CUSTOM_PROJECT_STAGES, CustomProjectStage } from '@/types';
import { formatDate } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  stage: string;
  statusMessage?: string | null;
  estimatedDate?: string | null;
  createdAt: string;
}

interface CustomProjectData {
  id: string;
  leadId: string;
  studentName: string;
  email: string;
  phone: string;
  whatsapp?: string | null;
  projectName: string;
  domain?: string | null;
  technology?: string | null;
  requirements: string;
  status: string;
  currentStage: string;
  customerProgressMessage: string;
  estimatedCompletionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
}

function OrderTrackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref') || searchParams.get('orderId') || '';

  const [orderId, setOrderId] = useState(refParam);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(Boolean(refParam));
  const [error, setError] = useState<string | null>(null);

  const [trackedCustomProject, setTrackedCustomProject] = useState<CustomProjectData | null>(null);

  const trackReference = useCallback(
    async (idToTrack: string, emailToTrack: string) => {
      if (!idToTrack) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/orders/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: idToTrack, email: emailToTrack }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to locate order or custom project');
        }

        if (data.type === 'FIXED_ORDER' && data.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }

        if (data.type === 'CUSTOM_PROJECT' && data.customProject) {
          setTrackedCustomProject(data.customProject);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid Reference ID or Email');
        setTrackedCustomProject(null);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // Check auth to prefill email
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setEmail((prev) => prev || data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-search if ref is in URL
  useEffect(() => {
    if (!refParam) return;
    let ignore = false;

    fetch('/api/orders/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: refParam, email }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to locate order or custom project');
        }
        return data;
      })
      .then((data) => {
        if (ignore) return;
        if (data.type === 'FIXED_ORDER' && data.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
        if (data.type === 'CUSTOM_PROJECT' && data.customProject) {
          setTrackedCustomProject(data.customProject);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Invalid Reference ID or Email');
          setTrackedCustomProject(null);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [refParam, email, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackReference(orderId, email);
  };

  // Determine stage index
  const getStageStatus = (stageName: string, currentStage: string) => {
    const stageIndex = CUSTOM_PROJECT_STAGES.indexOf(stageName as CustomProjectStage);
    const currentIndex = CUSTOM_PROJECT_STAGES.indexOf(currentStage as CustomProjectStage);

    if (currentStage === 'Cancelled') {
      return 'cancelled';
    }
    if (currentStage === 'On Hold') {
      if (stageIndex < currentIndex) return 'completed';
      if (stageIndex === currentIndex) return 'on_hold';
      return 'upcoming';
    }

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <main className="zivo-page relative isolate mx-auto min-h-screen max-w-5xl overflow-hidden px-4 pt-28 sm:pt-32 pb-20 sm:px-6 lg:px-8 text-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(99,102,241,0.11),transparent_34%),radial-gradient(circle_at_84%_72%,rgba(16,185,129,0.08),transparent_30%)]" />
        <div className="tracking-orb absolute -right-20 top-24 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />
      </div>
      <div className="relative z-10 space-y-8">
        {/* If custom project details loaded, show rich tracker view */}
        {trackedCustomProject ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setTrackedCustomProject(null);
                setOrderId('');
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Track Another Reference
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                {trackedCustomProject.leadId}
              </span>
            </div>
          </div>

          {/* Header Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white/95 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Custom Project Development Tracker
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {trackedCustomProject.projectName}
                </h1>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Client: {trackedCustomProject.studentName}</span>
                  <span>•</span>
                  <span>Initiated on {formatDate(trackedCustomProject.createdAt)}</span>
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5">
                <span className="text-xs text-slate-500 font-semibold">Current Development Stage</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-xs ${
                    trackedCustomProject.currentStage === 'Delivered'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : trackedCustomProject.currentStage === 'Cancelled'
                      ? 'bg-red-50 text-red-800 border border-red-300'
                      : trackedCustomProject.currentStage === 'On Hold'
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {trackedCustomProject.currentStage}
                </span>
              </div>
            </div>

            {/* Current Status Message Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-emerald-50/70 border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Latest Development Update
                </span>
                {trackedCustomProject.estimatedCompletionDate && (
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 bg-white/80 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Target Delivery: <strong>{trackedCustomProject.estimatedCompletionDate}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                “{trackedCustomProject.customerProgressMessage}”
              </p>
            </div>
          </div>

          {/* 8-Stage Development Stepper */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white/95 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Project Development Lifecycle</h2>
                <p className="text-xs text-slate-500">
                  Real-time engineering progress monitored directly by our technical team
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                8 Milestone Stages
              </span>
            </div>

            {/* Stepper Visual: Mobile vertical, Desktop horizontal */}
            <div className="relative pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-2">
                {CUSTOM_PROJECT_STAGES.map((stage, idx) => {
                  const status = getStageStatus(stage, trackedCustomProject.currentStage);
                  const isCompleted = status === 'completed';
                  const isCurrent = status === 'current';

                  return (
                    <div
                      key={idx}
                      className={`relative flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-indigo-50/90 border-indigo-300 shadow-md ring-2 ring-indigo-500/20'
                          : isCompleted
                          ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                          : 'bg-slate-50 border-slate-200/70 text-slate-400 opacity-70'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isCurrent
                            ? 'bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100 animate-pulse'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>

                      <span
                        className={`text-[11px] font-bold leading-tight ${
                          isCurrent
                            ? 'text-indigo-900'
                            : isCompleted
                            ? 'text-emerald-900'
                            : 'text-slate-600'
                        }`}
                      >
                        {stage}
                      </span>

                      <span className="text-[10px] mt-1 font-semibold">
                        {isCompleted && <span className="text-emerald-600">Completed</span>}
                        {isCurrent && <span className="text-indigo-600 font-bold">In Progress</span>}
                        {!isCompleted && !isCurrent && <span className="text-slate-400">Upcoming</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline History Log */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white/95 shadow-xl space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Milestone Activity Log</h3>
            </div>

            {trackedCustomProject.timeline && trackedCustomProject.timeline.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                {trackedCustomProject.timeline.map((item, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />
                    <div className="flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-xs font-bold text-indigo-600">{item.stage}</span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      {item.statusMessage && (
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {item.statusMessage}
                        </p>
                      )}
                      {item.estimatedDate && (
                        <p className="text-[11px] text-slate-500">
                          Estimated Target Date: <strong>{item.estimatedDate}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No milestone events logged yet.</p>
            )}

            {/* Support Callout */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <span>Have questions about your project scope or timeline?</span>
              </div>
              <a
                href={`https://wa.me/918220303164?text=${encodeURIComponent(
                  `Hi, I am tracking my custom project requirement (#${trackedCustomProject.leadId}). Could you please share an update?`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Chat on WhatsApp Support
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Tracker Search Box */
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
              <Search className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Track Your Project Order</h1>
            <p className="text-xs text-slate-500 font-medium">
              Enter your Order ID (e.g. <strong>ORD-10001</strong>) or Custom Project Reference (e.g. <strong>LD-1001</strong>) along with your billing email.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order ID or Custom Reference <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                    placeholder="e.g. ORD-10001 or LD-1001"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl glow-gradient text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Locating order & progress...
                  </>
                ) : (
                  <>
                    Track Order & Progress
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Already have an account?{' '}
              <Link href="/login?from=/account" className="font-bold text-indigo-600 hover:underline">
                Sign in to your customer dashboard
              </Link>{' '}
              to view all your fixed purchases and custom project enquiries in one place.
            </p>
          </div>
        </div>
        )}
      </div>
    </main>
  );
}

export default function OrderTrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <OrderTrackContent />
    </Suspense>
  );
}
