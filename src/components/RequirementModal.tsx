'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Send, CheckCircle2, PhoneCall, AlertCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Project } from '@/types';

interface RequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
}

export default function RequirementModal({ isOpen, onClose, project }: RequirementModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    whatsapp: '',
    college: '',
    department: '',
    year: 'Enterprise / Startup Production',
    domain: '',
    technology: '',
    projectType: 'Custom Build',
    deadline: '',
    requirements: '',
    callbackTime: 'Anytime (9 AM - 8 PM)',
  });

  const [loading, setLoading] = useState(false);
  const [successLeadId, setSuccessLeadId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prevProject, setPrevProject] = useState<Project | null | undefined>(project);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setFormData((prev) => ({
            ...prev,
            studentName: prev.studentName || data.user.name || '',
            email: prev.email || data.user.email || '',
            phone: prev.phone || data.user.phone || '',
            college: prev.college || data.user.college || '',
            department: prev.department || data.user.department || '',
          }));
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (project !== prevProject) {
    setPrevProject(project);
    if (project) {
      setFormData((prev) => ({
        ...prev,
        domain: project.category || prev.domain,
        technology: project.technologies?.join(', ') || prev.technology,
        projectType: project.projectType || prev.projectType,
        requirements: `I am interested in "${project.title}". Please share customization options, timeline, and a quote.`,
      }));
    }
  }

  if (!isOpen) return null;

  const handleNextStep = () => {
    setErrorMsg(null);
    if (!formData.studentName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setErrorMsg('Please complete Name, Email, and Phone/WhatsApp before continuing.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requirements.trim()) {
      setErrorMsg('Please describe your project requirements.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: project?.id || null,
          projectName: project?.title || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit enquiry');
      }

      setSuccessLeadId(data.leadId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessLeadId(null);
    setErrorMsg(null);
    setStep(1);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
        <div className="zivo-quad-bar zivo-quad-bar-thin shrink-0" aria-hidden="true">
          <span className="bg-[#0089CF]" />
          <span className="bg-[#ED1C24]" />
          <span className="bg-[#FDB913]" />
          <span className="bg-[#008C44]" />
        </div>
        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F9FF] text-[#0089CF]">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h2 id="enquiry-modal-title" className="font-heading text-base font-bold text-[#0A0A0A]">
                {project ? 'Project Consultation & Quote' : 'Custom Project Enquiry'}
              </h2>
              <p className="text-xs text-[#6B7280]">
                {successLeadId ? 'Request confirmed' : `Step ${step} of 2 — Response within 1 business day`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close enquiry dialog"
            className="cursor-pointer rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0A0A0A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-grow space-y-5 overflow-y-auto p-6">
          {successLeadId ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#BBF7D0] bg-[#F0FDF4] text-[#008C44]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-[#0A0A0A]">Enquiry Received</h3>
              <div className="mx-auto max-w-md space-y-1.5 rounded-xl border border-[#0089CF]/25 bg-[#F0F9FF] p-4">
                <p className="font-mono text-xs font-bold text-[#0073B0]">Reference: {successLeadId}</p>
                <p className="text-xs leading-relaxed text-[#374151]">
                  Our engineering team reviews custom enquiries within <strong>1 business day</strong>. Track all 8 development stages inside your Customer Dashboard.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                <Link
                  href="/account"
                  onClick={handleResetAndClose}
                  className="w-full rounded-md bg-[#ED1C24] px-6 py-2.5 text-center font-heading text-xs font-bold uppercase tracking-[0.05em] text-white shadow-sm hover:bg-[#D1171F] sm:w-auto"
                >
                  Open Customer Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full cursor-pointer rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-2.5 text-xs font-bold text-[#374151] hover:bg-[#F3F4F6] sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step Indicator (ZAI-105) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-left font-heading font-bold transition-colors ${
                    step === 1
                      ? 'border-[#0089CF] bg-[#F0F9FF] text-[#0073B0]'
                      : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]'
                  }`}
                >
                  1. Contact Details
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-left font-heading font-bold transition-colors ${
                    step === 2
                      ? 'border-[#0089CF] bg-[#F0F9FF] text-[#0073B0]'
                      : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]'
                  }`}
                >
                  2. Project Brief
                </button>
              </div>

              {errorMsg && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {project && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 truncate">{project.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F0F9FF] text-[#0073B0] shrink-0">
                    Selected Project
                  </span>
                </div>
              )}

              {step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="req-name" className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="req-name"
                      type="text"
                      required
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder="Your name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="req-email" className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="req-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter your email address"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="req-phone" className="block text-xs font-bold text-slate-700 mb-1">
                        Phone / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="req-phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Enter your phone or WhatsApp number"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Used only for scoping calls &amp; project updates.</p>
                    </div>

                    <div>
                      <label htmlFor="req-callback" className="block text-xs font-bold text-slate-700 mb-1">
                        Preferred Callback Window
                      </label>
                      <select
                        id="req-callback"
                        value={formData.callbackTime}
                        onChange={(e) => setFormData({ ...formData, callbackTime: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                      >
                        <option value="Anytime (9 AM - 8 PM)">Anytime (9 AM – 8 PM IST)</option>
                        <option value="Morning (9 AM - 12 PM)">Morning (9 AM – 12 PM)</option>
                        <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM – 4 PM)</option>
                        <option value="Evening (4 PM - 8 PM)">Evening (4 PM – 8 PM)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl glow-gradient text-white text-sm font-bold shadow-md hover:opacity-95"
                  >
                    Continue to Project Brief <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="req-details" className="block text-xs font-bold text-slate-700 mb-1">
                      Project Requirements <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="req-details"
                      required
                      rows={4}
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      placeholder="Describe features, dataset, target architecture, or customizations needed..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="req-tech" className="block text-xs font-bold text-slate-700 mb-1">
                        Preferred Tech Stack (Optional)
                      </label>
                      <input
                        id="req-tech"
                        type="text"
                        value={formData.technology}
                        onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                        placeholder="e.g. Python, Next.js, PyTorch"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="req-deadline" className="block text-xs font-bold text-slate-700 mb-1">
                        Target Deadline (Optional)
                      </label>
                      <input
                        id="req-deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="req-org" className="block text-xs font-bold text-slate-700 mb-1">
                      Organization / University (Optional)
                    </label>
                    <input
                      id="req-org"
                      type="text"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      placeholder="Company, startup, or university"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl glow-gradient text-white text-sm font-bold shadow-md hover:opacity-95 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Submit Enquiry
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
