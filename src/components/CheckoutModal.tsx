'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ShieldCheck, CreditCard, Lock, Loader2, AlertCircle, Clock, LogIn, UserPlus } from 'lucide-react';
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
    };
  }, [isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Quick Purchase Checkout</h3>
              <p className="text-xs text-slate-500 font-medium">Zivo AI — Secure Order</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Order Summary</span>
            <div className="flex justify-between items-start gap-4">
              <h4 className="text-sm font-bold text-slate-900 leading-snug">{project.title}</h4>
              <span className="text-xl font-black text-indigo-600 shrink-0">
                {formatCurrency(project.price)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Source Code & Docs</span>
              <span>1-on-1 Setup Guide</span>
            </div>
          </div>

          {/* Auth Gate Check */}
          {checkingAuth ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Verifying account session...</p>
            </div>
          ) : !userSession ? (
            <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                <LogIn className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900">Sign in required to purchase</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Please sign in or create an account to proceed with checkout, link your order, and receive instant downloadable project files.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Link
                  href={`/login?from=${checkoutReturnUrl}&notice=auth_required`}
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95 transition-all"
                >
                  <LogIn className="w-4 h-4" /> Sign In & Continue
                </Link>
                <Link
                  href={`/register?from=${checkoutReturnUrl}&notice=auth_required`}
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-all"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600" /> Create Account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Ordering as <strong>{userSession.name}</strong> ({userSession.email})
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Verified</span>
              </div>

              {/* 3. PROMINENT 1-3 HOUR DELIVERY MESSAGE ALERT BOX */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Delivery Timeframe Notice</span>
                </div>
                <p className="text-xs font-bold text-amber-950 leading-relaxed">
                  “After the payment completion, the project will be delivered to your email ID within 1 to 3 hours.”
                </p>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
              <input
                type="text"
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                placeholder="e.g. Ananya Verma"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                  fieldErrors.studentName ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                }`}
              />
              {fieldErrors.studentName && (
                <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.studentName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (For Delivery) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                  fieldErrors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Number (+91 India) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-sm focus:outline-none focus:bg-white transition-colors ${
                  fieldErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-slate-300 focus:border-indigo-600'
                }`}
              />
              {fieldErrors.phone && (
                <p className="text-[11px] font-semibold text-red-600 mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl glow-gradient text-white text-sm font-extrabold shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Razorpay Checkout...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-emerald-200" />
                    Pay {formatCurrency(project.price)} Securely with Razorpay
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[11px] text-center text-slate-500 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Encrypted 256-bit Razorpay Checkout SSL
            </p>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
