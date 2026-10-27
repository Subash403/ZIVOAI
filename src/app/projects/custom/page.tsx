'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  CheckCircle2,
  PhoneCall,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  User,
  Code2,
} from 'lucide-react';

export default function CustomProjectPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    studentName: '',
    college: '',
    department: '',
    year: '4th Year (Final Year)',
    phone: '',
    whatsapp: '',
    email: '',
    domain: 'Artificial Intelligence / Machine Learning',
    technology: '',
    projectType: 'Major Project',
    deadline: '',
    requirements: '',
    callbackTime: 'Anytime (9 AM - 8 PM)',
  });

  const [step1Errors, setStep1Errors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [successLeadId, setSuccessLeadId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-prefill if user is logged in
  useEffect(() => {
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
            year: prev.year || data.user.year || '4th Year (Final Year)',
          }));
        }
      })
      .catch(() => {});
  }, []);

  const validateStep1 = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.studentName.trim()) {
      errors.studentName = 'Full name is required';
    }
    const cleanPhone = formData.phone.trim().replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
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
          projectId: null,
          projectName: 'Custom Project Request',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit requirement');
      }

      setSuccessLeadId(data.leadId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not submit your request. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="zivo-page min-h-screen text-slate-900 pb-20 pt-20 sm:pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Back Link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Zivo AI Projects
        </Link>

        {/* Page Header */}
        <div className="zivo-reveal mx-auto max-w-2xl space-y-3 text-center">
          <div className="zivo-eyebrow">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Bespoke Engineering & Custom AI Systems</span>
          </div>
          <h1 className="zivo-display text-4xl font-bold text-slate-900 sm:text-5xl">Build a Custom Software Architecture</h1>

          <p className="text-sm text-slate-600">
            Submit your specific technical requirements, system architecture constraints, novel research papers, or startup idea. Our senior engineers will craft it to your exact specifications!
          </p>
        </div>

        {/* Stepper Wizard Indicator */}
        {!successLeadId && (
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-slate-200 z-0" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 transition-all duration-300 z-0"
                style={{ width: currentStep === 1 ? '50%' : '100%' }}
              />

              {/* Step 1 Pin */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  currentStep === 1
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Step 1: Contact Details</span>
              </button>

              {/* Step 2 Pin */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  currentStep === 2
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Step 2: Architecture Specs</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md">
          {successLeadId ? (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Custom Project Request Received!</h2>
                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 max-w-lg mx-auto text-center space-y-1.5">
                  <p className="text-xs font-mono font-bold text-indigo-700">Reference / Lead ID: {successLeadId}</p>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                    “Your custom project request has been received. Our team will review your requirements and update your project progress here.”
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left text-xs text-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <PhoneCall className="w-4 h-4 text-indigo-600" /> What Happens Next:
                </div>
                <p>1. Our technical lead reviews your requirements against IEEE / industry standards.</p>
                <p>2. We will outline the system architecture, modules, and estimated completion timeline.</p>
                <p>3. You can monitor every milestone stage in real time on the Track Project page.</p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/orders/track?ref=${successLeadId}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95 transition-all text-center"
                >
                  Track Project Development Progress
                </Link>

                <a
                  href={`https://wa.me/918220303164?text=${encodeURIComponent(
                    `Hi, I just submitted my custom project requirement (#${successLeadId}). Please connect with me.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700 transition-all text-center"
                >
                  <MessageSquare className="w-4 h-4" /> WhatsApp Team
                </a>
              </div>
            </div>
          ) : (
            <div>
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 mb-6">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: Student & Academic Details */}
              {currentStep === 1 && (
                <form onSubmit={handleNextStep} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                        <User className="w-4 h-4" /> 1. Contact & Scope Details
                      </h3>
                      <span className="text-xs text-slate-500 font-semibold">Step 1 of 2</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.studentName}
                          onChange={(e) => {
                            setFormData({ ...formData, studentName: e.target.value });
                            if (step1Errors.studentName) setStep1Errors({ ...step1Errors, studentName: '' });
                          }}
                          placeholder="e.g. Priyanshu Das"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                            step1Errors.studentName ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                          }`}
                        />
                        {step1Errors.studentName && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">{step1Errors.studentName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Organization / University (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.college}
                          onChange={(e) => {
                            setFormData({ ...formData, college: e.target.value });
                            if (step1Errors.college) setStep1Errors({ ...step1Errors, college: '' });
                          }}
                          placeholder="e.g. Tech Startup / University / Self-Builder"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Domain / Focus Area (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => {
                            setFormData({ ...formData, department: e.target.value });
                            if (step1Errors.department) setStep1Errors({ ...step1Errors, department: '' });
                          }}
                          placeholder="e.g. Generative AI / Full-Stack / Robotics"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Project Scope & Tier</label>
                        <select
                          value={formData.year}
                          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        >
                          <option value="Enterprise / Startup Production">Enterprise / Startup Production</option>
                          <option value="Research / Thesis Implementation">Research / Thesis Implementation</option>
                          <option value="MVP & Rapid Prototype">MVP & Rapid Prototype</option>
                          <option value="Final Year Degree Project">Final Year Degree Project</option>
                          <option value="Self-Learning & Benchmark">Self-Learning & Benchmark</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({ ...formData, phone: e.target.value });
                            if (step1Errors.phone) setStep1Errors({ ...step1Errors, phone: '' });
                          }}
                          placeholder="+91 9876543210"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                            step1Errors.phone ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                          }`}
                        />
                        {step1Errors.phone && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">{step1Errors.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                        <input
                          type="tel"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          placeholder="Same as phone if left blank"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (step1Errors.email) setStep1Errors({ ...step1Errors, email: '' });
                        }}
                        placeholder="student@example.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                          step1Errors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                        }`}
                      />
                      {step1Errors.email && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">{step1Errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 py-3 px-8 rounded-xl glow-gradient text-white text-sm font-bold shadow-lg hover:opacity-95 transition-all"
                    >
                      <span>Continue to Project Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Project Tech & Specs */}
              {currentStep === 2 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                        <Code2 className="w-4 h-4" /> 2. Project Specifications & Requirements
                      </h3>
                      <span className="text-xs text-slate-500 font-semibold">Step 2 of 2</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Domain</label>
                        <select
                          value={formData.domain}
                          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        >
                          <option value="Artificial Intelligence / Machine Learning">Artificial Intelligence / Machine Learning</option>
                          <option value="Computer Vision / Deep Learning">Computer Vision / Deep Learning</option>
                          <option value="Generative AI & LLM RAG">Generative AI & LLM RAG</option>
                          <option value="Cybersecurity & SIEM Anomaly">Cybersecurity & SIEM Anomaly</option>
                          <option value="IoT & Hardware Embedded Systems">IoT & Hardware Embedded Systems</option>
                          <option value="Blockchain & Smart Contracts">Blockchain & Smart Contracts</option>
                          <option value="Cloud & Microservices DevOps">Cloud & Microservices DevOps</option>
                          <option value="Full-Stack Web / Mobile Application">Full-Stack Web / Mobile Application</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Technologies</label>
                        <input
                          type="text"
                          value={formData.technology}
                          onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                          placeholder="e.g. Python, PyTorch, YOLOv8, ESP32, React"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Project Type</label>
                        <select
                          value={formData.projectType}
                          onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        >
                          <option value="Major Project">Major Project</option>
                          <option value="Minor Project">Minor Project</option>
                          <option value="Mini Project">Mini Project</option>
                          <option value="Research Paper Implementation">Research Paper Implementation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Target Submission Deadline</label>
                        <input
                          type="date"
                          value={formData.deadline}
                          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Detailed Requirements / Synopsis / IEEE Paper Link <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.requirements}
                        onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                        placeholder="Describe your project idea, problem statement, required datasets, specific modules, or paste your base IEEE paper reference link..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Callback Window</label>
                      <select
                        value={formData.callbackTime}
                        onChange={(e) => setFormData({ ...formData, callbackTime: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                      >
                        <option value="Anytime (9 AM - 8 PM)">Anytime (9 AM - 8 PM)</option>
                        <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                        <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                        <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Student Details</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-2 py-3 px-8 rounded-xl glow-gradient text-white text-sm font-bold shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting Requirement...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Custom Requirements
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
