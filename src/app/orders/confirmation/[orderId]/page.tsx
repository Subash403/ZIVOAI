'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  HelpCircle,
  Lock,
  Download,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PublicOrderReceipt {
  orderId: string;
  studentName: string;
  email: string;
  phone: string;
  college?: string | null;
  department?: string | null;
  year?: string | null;
  projectName: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  deliveryStatus: string;
  paidAt?: string | null;
  createdAt: string;
}

function OrderConfirmationContent({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [order, setOrder] = useState<PublicOrderReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    const queryToken = token ? `?token=${encodeURIComponent(token)}` : '';

    fetch(`/api/orders/confirmation/${encodeURIComponent(orderId)}${queryToken}`)
      .then(async (res) => {
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          if (res.status === 403) {
            setIsUnauthorized(true);
            throw new Error(data.error || 'Access denied: receipt token required.');
          }
          throw new Error(data.error || 'Unable to locate order receipt.');
        }
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          throw new Error('Order details not found.');
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'Failed to load order receipt.';
        setErrorMessage(msg);
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [orderId, token]);


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mask WhatsApp phone number e.g. +91 98765 43210 -> +91 ******3210
  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 6) return phone;
    const visiblePart = phone.slice(-4);
    return `${phone.slice(0, 3)} *****${visiblePart}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center pt-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying order confirmation receipt...</p>
        </div>
      </main>
    );
  }

  if (isUnauthorized) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center pt-20 px-4">
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xl space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Protected Order Receipt</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Order receipts are protected to prevent unauthorized viewing. Please use the secure receipt link sent via
            SMS/WhatsApp or log in with your administrative credentials.
          </p>
          <div className="pt-2">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md"
            >
              Back to Project Catalog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !order) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center pt-20 px-4">
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xl space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Receipt Not Available</h2>
          <p className="text-xs text-slate-500">{errorMessage || `Order ID ${orderId} could not be retrieved.`}</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glow-gradient text-white text-xs font-bold shadow-md"
          >
            Back to Project Catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Success Card */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Payment Verified & Secured
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Payment Successful! 🎉</h1>
            <p className="text-sm text-slate-600 font-medium">
              Thank you for your purchase, <strong className="text-slate-900">{order.studentName}</strong>.
            </p>
          </div>

          {/* 11. 1-3 HOUR DELIVERY PROMINENT NOTICE BANNER */}
          <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Project Delivery Notice</span>
            </div>
            <p className="text-sm font-bold text-amber-950 leading-relaxed">
              Your project will be delivered to your email ID within 1 to 3 hours.
            </p>
            <p className="text-xs text-amber-800 font-medium">
              Please check your email inbox (<strong>{order.email}</strong>) and your spam/junk folder.
            </p>
          </div>

          {/* Receipt Summary Box */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Order ID:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-indigo-600 font-bold text-base">{order.orderId}</span>
                <button
                  onClick={() => copyToClipboard(order.orderId)}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy Order ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block">Purchased Project:</span>
                <span className="text-slate-900 font-bold text-sm">{order.projectName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Amount Paid:</span>
                <span className="text-emerald-700 font-bold text-sm">{formatCurrency(order.amount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Buyer Email:</span>
                <span className="text-slate-800 font-medium">{order.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">WhatsApp Contact:</span>
                <span className="text-slate-800 font-medium">{maskPhone(order.phone)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Status:</span>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  {order.paymentStatus}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Delivery Status:</span>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                  {order.deliveryStatus || 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Support Notice */}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-left text-xs text-indigo-900 space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" /> Need Help or Remote Setup Support?
            </span>
            <p className="text-indigo-800">
              Please save your Order ID (<strong>{order.orderId}</strong>) for any support inquiries. You can also chat
              directly with our senior engineer on WhatsApp for 1-on-1 remote installation assistance.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            {order.paymentStatus === 'PAID' && (
              <a
                href={`/api/orders/download/${order.orderId}${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl glow-gradient text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all"
              >
                <Download className="w-4 h-4" /> Download Project Materials
              </a>
            )}

            <a
              href={`https://wa.me/918220303164?text=Hi%2C%20I%20have%20completed%20payment%20for%20Order%20${order.orderId}%20(${encodeURIComponent(order.projectName)}).%20Please%20assist.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Support on WhatsApp (8220303164)
            </a>

            <Link
              href="/projects"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-sm font-bold flex items-center justify-center gap-2"
            >
              Back to Project Catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OrderConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center pt-20">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading receipt confirmation...</p>
          </div>
        </main>
      }
    >
      <OrderConfirmationContent orderId={orderId} />
    </Suspense>
  );
}

