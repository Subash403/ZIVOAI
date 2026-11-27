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
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
        <div className="zivo-quad-bar zivo-quad-bar-thin shrink-0" aria-hidden="true">
          <span className="bg-[#0089CF]" />
          <span className="bg-[#ED1C24]" />
          <span className="bg-[#FDB913]" />
          <span className="bg-[#008C44]" />
        </div>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A0A0A] text-white shadow-xs">
              <CreditCard className="h-5 w-5 text-[#FDB913]" />
            </div>
            <div>
              <h2 id="checkout-modal-title" className="font-heading text-base font-bold text-[#0A0A0A]">
                Secure Order Checkout
              </h2>
              <p className="text-xs text-[#6B7280]">Razorpay server-verified checkout</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout dialog"
            className="cursor-pointer rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0A0A0A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs text-[#B91C1C]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#ED1C24]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Concise Order Summary (ZAI-106) */}
          <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="block font-heading text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
                  Order Summary
                </span>
                <h3 className="mt-0.5 font-heading text-sm font-bold leading-snug text-[#0A0A0A]">{project.title}</h3>
              </div>
              <div className="shrink-0 text-right">
                <span className="block font-heading text-xl font-extrabold text-[#ED1C24]">
                  {formatCurrency(project.price)}
                </span>
                <span className="text-[10px] text-[#6B7280]">Total payable (INR)</span>
              </div>
            </div>

            {project.includedMaterials && project.includedMaterials.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-[#E5E7EB] pt-2.5">
                {project.includedMaterials.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded border border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#374151]"
                  >
                    <CheckCircle2 className="h-3 w-3 text-[#008C44]" /> {item}
                  </span>
                ))}
              </div>
            )}

            <div className="border-t border-[#E5E7EB] pt-2.5 text-[11px] leading-relaxed text-[#4B5563]">
              <strong>Delivery Terms:</strong> Upon server-side Razorpay verification, your private download link is unlocked in your Customer Dashboard (up to 5 link issuances; each generates a 1-hour cloud download URL).{' '}
              <Link href="/policies" onClick={onClose} className="font-semibold text-[#0089CF] underline hover:text-[#0073B0]">
                Refund &amp; License Policy
              </Link>
              .
            </div>
          </div>

          {checkingAuth ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#0089CF]" />
              <p className="text-xs font-medium text-[#6B7280]">Checking account session...</p>
            </div>
          ) : !userSession ? (
            <div className="space-y-4 rounded-xl border border-[#0089CF]/25 bg-[#F0F9FF] p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0089CF] text-white shadow-sm">
                <LogIn className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-sm font-extrabold text-[#0A0A0A]">Sign in to link your purchase</h3>
                <p className="mx-auto max-w-sm text-xs text-[#4B5563]">
                  Sign in or create a quick account so your receipt and secure downloads are automatically saved to your dashboard. You will return directly to checkout.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
                <Link
                  href={`/login?from=${checkoutReturnUrl}&notice=auth_required`}
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#ED1C24] px-4 py-3 font-heading text-xs font-bold uppercase tracking-[0.05em] text-white shadow-sm hover:bg-[#D1171F]"
                >
                  <LogIn className="h-4 w-4" /> Sign In &amp; Continue
                </Link>
                <Link
                  href={`/register?from=${checkoutReturnUrl}&notice=auth_required`}
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[#0A0A0A] bg-white px-4 py-3 font-heading text-xs font-bold uppercase tracking-[0.05em] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
                >
                  <UserPlus className="h-4 w-4" /> Create Account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs font-medium text-[#166534]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#008C44]" />
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
                    placeholder="Enter your email address"
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
                    placeholder="Enter your phone or WhatsApp number"
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
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0089CF]" /> Payments processed securely by Razorpay
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
