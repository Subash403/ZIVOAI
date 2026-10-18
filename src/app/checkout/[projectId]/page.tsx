'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  XCircle,
} from 'lucide-react';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useRazorpayCheckout } from '@/lib/useRazorpayCheckout';

export default function PurchasingCheckoutPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    college: '',
    department: '',
    year: '4th Year / Final Year',
  });

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const [userSession, setUserSession] = useState<{ name: string; email: string } | null>(null);

  const { startCheckout, loading: paymentLoading, errorMsg: paymentError, setErrorMsg: setPaymentError } =
    useRazorpayCheckout({
      onCancel: () => {
        setPaymentError('Payment was cancelled. You can try again whenever you are ready.');
      },
    });

  // Verify authentication and prefill profile details
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.authenticated || !data.user) {
          const returnUrl = encodeURIComponent(`/checkout/${projectId}`);
          router.replace(`/login?from=${returnUrl}&notice=auth_required`);
          return;
        }

        setUserSession({ name: data.user.name, email: data.user.email });
        setFormData((prev) => ({
          ...prev,
          studentName: prev.studentName || data.user.name || '',
          email: prev.email || data.user.email || '',
          phone: prev.phone || data.user.phone || '',
          college: prev.college || data.user.college || '',
          department: prev.department || data.user.department || '',
          year: prev.year || data.user.year || '4th Year / Final Year',
        }));
      })
      .catch(() => {
        const returnUrl = encodeURIComponent(`/checkout/${projectId}`);
        router.replace(`/login?from=${returnUrl}&notice=auth_required`);
      });
  }, [projectId, router]);

  // Fetch project details on mount
  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.project) {
          setProject(data.project);
        } else {
          setProjectError(data.error || 'Project not found or unavailable.');
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load project details.';
        setProjectError(msg);
      })
      .finally(() => setLoadingProject(false));
  }, [projectId]);

  // Payment Handler
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!project) return;

    const result = await startCheckout(project.id, formData);
    if (!result.isValid && result.errors) {
      setFieldErrors(result.errors);
    }
  };

  if (loadingProject) {

    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading secure checkout page...</p>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
          <XCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Project Currently Unavailable</h1>
        <p className="text-sm text-slate-600">{projectError || 'This project is either call-based or currently not listed for online purchase.'}</p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glow-gradient text-white text-sm font-bold shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Browse Available Projects
        </Link>
      </div>
    );
  }

  if (project.salesType === 'call') {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
          <Phone className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Call-Based Project</h1>
        <p className="text-sm text-slate-600">
          This project requires custom scope discussion and pricing calculation on call. Please submit a request form or chat on WhatsApp.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/projects/custom"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glow-gradient text-white text-sm font-bold shadow-lg"
          >
            Request Custom Call
          </Link>
        </div>
      </div>
    );
  }

  const materialsList = project.includedMaterials || ['Source Code', 'Documentation', 'PPT', 'Research Paper', 'Dataset', 'Installation Guide'];

  return (
    <main className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Details
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>256-Bit Razorpay SSL Encrypted Checkout</span>
        </div>
      </div>

      {/* Main Grid: Left Summary, Right Buyer Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Project Summary */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl bg-white/90 backdrop-blur-xl space-y-6">
            
            {/* Project Image & ID Badge */}
            <div className="relative rounded-2xl overflow-hidden aspect-16/9 border border-slate-200/80 shadow-sm">
              <Image
                src={project.mainImage}
                alt={project.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/90 text-white text-xs font-mono font-bold backdrop-blur-md shadow-md">
                ID: PRJ-{project.id.slice(-5).toUpperCase()}
              </div>
              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md">
                {project.category}
              </div>
            </div>

            {/* Title & Synopsis */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {project.title}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {project.shortDescription}
              </p>
            </div>

            {/* Technologies */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Technologies & Tools</span>
              <div className="flex flex-wrap gap-2">
                {project.technologies?.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Included Materials Checklist */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Included Delivery Package</span>
              <div className="grid grid-cols-2 gap-2.5">
                {materialsList.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 border border-indigo-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Verified Amount</span>
                <span className="text-2xl sm:text-3xl font-black text-indigo-600">{formatCurrency(project.price)}</span>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  All Taxes Included
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Buyer Form & Payment Button */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl bg-white/95 backdrop-blur-xl space-y-6">
            
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Complete Your Purchase</h2>
                <p className="text-xs text-slate-500 font-medium">Verify your details to receive project materials instantly</p>
              </div>
            </div>

            {userSession && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Signed in as <strong className="font-bold text-indigo-900">{userSession.name}</strong> ({userSession.email})
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  Account Verified
                </span>
              </div>
            )}

            {paymentError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Payment Error</span>
                  <p>{paymentError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handlePayment} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => {
                    setFormData({ ...formData, studentName: e.target.value });
                    if (fieldErrors.studentName) setFieldErrors({ ...fieldErrors, studentName: '' });
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                    fieldErrors.studentName ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.studentName && (
                  <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.studentName}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Delivery Email Address <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal">Any standard email</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                    }}
                    placeholder="name@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                      fieldErrors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                    }`}
                  />
                </div>
                {fieldErrors.email ? (
                  <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.email}</p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">Please double check your email address carefully.</p>
                )}
              </div>

              {/* WhatsApp Number (+91 Default) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>WhatsApp Number (+91 India) <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal">Mandatory</span>
                </label>
                <div className="relative flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl bg-slate-100 border border-r-0 border-slate-300 text-slate-600 text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                    }}
                    placeholder="9876543210"
                    className={`w-full px-4 py-3 rounded-r-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                      fieldErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                    }`}
                  />
                </div>
                {fieldErrors.phone ? (
                  <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.phone}</p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">We may contact you on WhatsApp regarding your order & setup support.</p>
                )}
              </div>

              {/* Optional College Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">College Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    placeholder="e.g. Anna University / VIT"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Stream (Optional)</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. CSE / IT / B.Sc CS"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* 3. PROMINENT 1-3 HOUR DELIVERY MESSAGE ALERT BOX */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-amber-900 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
                  <span>Important Delivery Schedule Notice</span>
                </div>
                <p className="text-xs font-bold text-amber-950 leading-relaxed">
                  “After the payment completion, the project will be delivered to your email ID within 1 to 3 hours.”
                </p>
                <div className="text-[11px] text-amber-800 space-y-1 pt-1 border-t border-amber-200">
                  <p>• Please make sure your email ID is correct before completing payment.</p>
                  <p>• Your WhatsApp number may be used to contact you regarding project delivery.</p>
                </div>
              </div>

              {/* 21. PRE-PAYMENT CHECKLIST */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Project selected: <strong>{project.title}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Verified Email & WhatsApp entered</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Price confirmed: <strong>{formatCurrency(project.price)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>1 to 3 Hour delivery timeframe understood</span>
                </div>
              </div>

              {/* Submit Payment Button */}
              <button
                type="submit"
                disabled={paymentLoading}
                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl glow-gradient text-white text-base font-extrabold shadow-xl shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing Razorpay Payment...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-emerald-200" />
                    Pay {formatCurrency(project.price)} Securely with Razorpay
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Instant automated payment receipt & server verification</span>
              </div>
            </form>

          </div>
        </div>

      </div>
    </main>
  );
}
