'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ShieldCheck, CreditCard, Lock, Loader2, AlertCircle, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useRazorpayCheckout } from '@/lib/useRazorpayCheckout';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export default function CheckoutModal({ isOpen, onClose, project }: CheckoutModalProps) {
  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    college: '',
  });

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [userSession, setUserSession] = useState<{ name: string; email: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const { startCheckout, loading, errorMsg } = useRazorpayCheckout({
    onSuccess: () => {
      onClose();
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    let ignore = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (ignore) return;
        if (data?.authenticated && data.user) {
          setUserSession({ name: data.user.name, email: data.user.email });
          setFormData((prev) => ({
            ...prev,
            studentName: prev.studentName || data.user.name || '',
            email: prev.email || data.user.email || '',
            phone: prev.phone || data.user.phone || '',
            college: prev.college || data.user.college || '',
          }));
        } else {
          setUserSession(null);
        }
      })
      .catch(() => {
        if (!ignore) setUserSession(null);
      })
      .finally(() => {
        if (!ignore) setCheckingAuth(false);
      });

    return () => {
      ignore = true;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const result = await startCheckout(project.id, formData);
    if (!result.isValid && result.errors) {
      setFieldErrors(result.errors);
    }
  };

  const checkoutReturnUrl = encodeURIComponent(`/checkout/${project.id}`);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="checkout-modal-title" className="text-base font-bold text-slate-900">
                Secure Order Checkout
              </h2>
              <p className="text-xs text-slate-500">Razorpay server-verified checkout</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout dialog"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Concise Order Summary (ZAI-106) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Order Summary
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">{project.title}</h3>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-black text-indigo-600 block">
                  {formatCurrency(project.price)}
                </span>
                <span className="text-[10px] text-slate-500">Total payable (INR)</span>
              </div>
            </div>

            {project.includedMaterials && project.includedMaterials.length > 0 && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-1.5">
                {project.includedMaterials.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {item}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <strong>Delivery Terms:</strong> Upon server-side Razorpay verification, your private download link is immediately unlocked in your Customer Dashboard (valid up to 5 link issuances; each link generates a 1-hour cloud download URL).{' '}
              <Link href="/policies" onClick={onClose} className="text-indigo-600 font-semibold underline">
                Refund &amp; License Policy
              </Link>
              .
            </div>
          </div>

          {checkingAuth ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Checking account session...</p>
            </div>
          ) : !userSession ? (
            <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                <LogIn className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900">Sign in to link your purchase</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Sign in or create a quick account so your receipt and secure downloads are automatically saved to your dashboard. You will return directly to checkout.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <Link
                  href={`/login?from=${checkoutReturnUrl}&notice=auth_required`}
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl glow-gradient text-white text-xs font-bold shadow-md"
                >
                  <LogIn className="w-4 h-4" /> Sign In &amp; Continue
                </Link>
                <Link
                  href={`/register?from=${checkoutReturnUrl}&notice=auth_required`}
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600" /> Create Account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  Ordering as <strong>{userSession.name}</strong> ({userSession.email})
                </span>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label htmlFor="checkout-name" className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    placeholder="Your full name"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:bg-white ${
                      fieldErrors.studentName ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {fieldErrors.studentName && (
                    <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.studentName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-email" className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Receipt &amp; Confirmation) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:bg-white ${
                      fieldErrors.email ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-phone" className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / WhatsApp Number (Setup Support) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:bg-white ${
                      fieldErrors.phone ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl glow-gradient text-white text-sm font-extrabold shadow-lg hover:opacity-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Initializing Razorpay...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-emerald-200" />
                        Pay {formatCurrency(project.price)} via Razorpay
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Payments processed securely by Razorpay
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
