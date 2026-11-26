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
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 id="enquiry-modal-title" className="text-base font-bold text-slate-900">
                {project ? 'Project Consultation & Quote' : 'Custom Project Enquiry'}
              </h2>
              <p className="text-xs text-slate-500">
                {successLeadId ? 'Request confirmed' : `Step ${step} of 2 — Response within 1 business day`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close enquiry dialog"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-grow">
          {successLeadId ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Enquiry Received</h3>
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 max-w-md mx-auto space-y-1.5">
                <p className="text-xs font-mono font-bold text-indigo-700">Reference: {successLeadId}</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Our engineering team reviews custom enquiries within <strong>1 business day</strong>. Track all 8 development stages inside your Customer Dashboard.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/account"
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md text-center"
                >
                  Open Customer Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
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
                  className={`py-2 px-3 rounded-xl font-bold border text-left ${
                    step === 1
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  1. Contact Details
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className={`py-2 px-3 rounded-xl font-bold border text-left ${
                    step === 2
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
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
                      placeholder="you@example.com"
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
                        placeholder="+91 9876543210"
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
