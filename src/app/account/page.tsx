'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  User,
  ShoppingBag,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Save,
  Key,
  FileCode,
  Layers,
  Clock,
  Sparkles,
  PhoneCall,
  Calendar,
  ChevronDown,
  ChevronUp,
  Receipt,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, CUSTOM_PROJECT_STAGES, CustomProjectStage } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { notifyAuthStateChanged } from '@/lib/auth-client';

interface OrderRefundSummary {
  id: string;
  amount: number;
  status: string;
  reason: string;
  processedAt?: string | null;
  createdAt: string;
}

interface CustomerOrder {
  id: string;
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
  reconciliationStatus?: string | null;
  paymentRefLast4?: string | null;
  paidAt?: string | null;
  deliveredAt?: string | null;
  downloadCount: number;
  downloadLimit: number;
  downloadsRemaining: number;
  downloadTokenExpiry?: string | null;
  createdAt: string;
  refunds?: OrderRefundSummary[];
  project?: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    salesType: string;
    includedMaterials?: string[];
  } | null;
}

interface CustomProjectSummary {
  id: string;
  leadId: string;
  studentName: string;
  email: string;
  phone: string;
  whatsapp?: string | null;
  projectName?: string | null;
  domain?: string | null;
  technology?: string | null;
  requirements: string;
  status: string;
  currentStage?: string | null;
  customerProgressMessage?: string | null;
  estimatedCompletionDate?: string | null;
  createdAt: string;
  timeline?: {
    id: string;
    stage: string;
    statusMessage?: string | null;
    estimatedDate?: string | null;
    createdAt: string;
  }[];
}

function getStageStatus(stageName: string, currentStage: string) {
  const stageIndex = CUSTOM_PROJECT_STAGES.indexOf(stageName as CustomProjectStage);
  const currentIndex = CUSTOM_PROJECT_STAGES.indexOf(currentStage as CustomProjectStage);
  if (currentStage === 'Cancelled') return 'cancelled';
  if (currentStage === 'On Hold') {
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'on_hold';
    return 'upcoming';
  }
  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'current';
  return 'upcoming';
}

function formatDeliveryLabel(status: string): string {
  switch (status) {
    case 'ASSET_READY':
      return 'Ready to Download';
    case 'DELIVERED':
      return 'Downloaded';
    case 'PROCESSING':
      return 'Preparing Files';
    case 'FAILED':
      return 'Action Needed';
    case 'CANCELLED':
      return 'Revoked / Cancelled';
    default:
      return 'Pending';
  }
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customProjects, setCustomProjects] = useState<CustomProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'custom' | 'profile'>('orders');

  // Inline detail expansion states (ZAI-077, ZAI-078)
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [expandedCustomIds, setExpandedCustomIds] = useState<Record<string, boolean>>({});

  // Profile Edit State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const clean = String(data?.settings?.whatsappNumber || '').replace(/\D/g, '');
        if (clean) setSupportWhatsapp(clean);
      })
      .catch(() => {});
  }, []);

  const loadAccountData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [authRes, ordersRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/account/orders', { cache: 'no-store' }),
      ]);

      const authData = authRes.ok ? await authRes.json() : null;
      if (!authData?.authenticated || !authData.user) {
        router.push('/login?from=/account');
        return;
      }

      setUser(authData.user);
      setName(authData.user.name || '');
      setPhone(authData.user.phone || '');
      setCollege(authData.user.college || '');
      setDepartment(authData.user.department || '');
      setYear(authData.user.year || 'Final Year');

      if (!ordersRes.ok) {
        throw new Error('Could not load your orders and enquiries. Please retry.');
      }

      const ordersData = await ordersRes.json();
      if (ordersData?.success) {
        const fetchedOrders: CustomerOrder[] = Array.isArray(ordersData.orders) ? ordersData.orders : [];
        const fetchedCustom: CustomProjectSummary[] = Array.isArray(ordersData.customProjects)
          ? ordersData.customProjects
          : [];
        setOrders(fetchedOrders);
        setCustomProjects(fetchedCustom);
        // Auto-expand the most recent custom project timeline inside dashboard
        if (fetchedCustom.length > 0) {
          setExpandedCustomIds((prev) =>
            Object.keys(prev).length === 0 ? { [fetchedCustom[0].id]: true } : prev
          );
        }
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load account data.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccountData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccountData]);

  const handleLogout = async (allDevices = false) => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allDevices }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Logout failed');
      setUser(null);
      setOrders([]);
      setCustomProjects([]);
      notifyAuthStateChanged();
      router.replace('/');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          college,
          department,
          year,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfileMessage({ type: 'success', text: data.message || 'Profile updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      if (data.user) {
        setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
      }
    } catch (err: unknown) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3 pt-28 sm:pt-32">
        <Loader2 className="w-8 h-8 text-[#0089CF] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <main className="zivo-page min-h-screen mx-auto max-w-7xl space-y-8 px-4 pt-28 sm:pt-32 xl:pt-36 pb-20 sm:px-6 lg:px-8 text-slate-900">
      {/* Account Hero Bar */}
      <div className="glass-panel flex flex-col justify-between gap-6 rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glow-gradient flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user?.name}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F0F9FF] text-[#0073B0] border border-[#0089CF]/30">
                {user?.role === 'ADMIN' ? 'Administrator' : 'Customer Account'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{user?.email}</p>
            {user?.college && (
              <p className="text-xs text-slate-400 mt-1">
                {user.college} {user.department ? `• ${user.department}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadAccountData}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => handleLogout(false)}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            Sign Out
          </button>
          <Link
            href="/projects"
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl glow-gradient text-white shadow-md shadow-[#ED1C24]/20 hover:opacity-95 transition-all"
          >
            Browse Projects
          </Link>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadAccountData}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto" role="tablist" aria-label="Account sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
            activeTab === 'orders'
              ? 'border-[#0089CF] text-[#0089CF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Fixed Purchases ({orders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'custom'}
          onClick={() => setActiveTab('custom')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
            activeTab === 'custom'
              ? 'border-[#0089CF] text-[#0089CF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Custom Project Orders ({customProjects.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0089CF] ${
            activeTab === 'profile'
              ? 'border-[#0089CF] text-[#0089CF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Profile &amp; Security
        </button>
      </div>

      {/* Fixed Purchases Tab — Inline Receipt, Status & Authenticated Downloads (ZAI-077, ZAI-079, ZAI-083) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#F0F9FF] text-[#0089CF] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">No project purchases yet</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Once you purchase a ready-to-run project, your verified payment receipt, delivery status, and secure download links will appear here automatically.
                </p>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl glow-gradient text-white shadow-md"
              >
                Browse Projects Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => {
                const isPaid = order.paymentStatus === 'PAID';
                const isRefunded = order.paymentStatus === 'REFUNDED';
                const isReconciliation = order.paymentStatus === 'RECONCILIATION_REQUIRED';
                const isExpanded = Boolean(expandedOrderIds[order.id]);
                const canDownload = isPaid && order.deliveryStatus !== 'FAILED' && order.downloadsRemaining > 0;
                const downloadHref = `/api/orders/download/${encodeURIComponent(order.orderId)}`;

                return (
                  <article
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-[#0089CF]/30 transition-all overflow-hidden"
                  >
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div className="flex items-start gap-4">
                        {order.project?.mainImage ? (
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                            <Image
                              src={order.project.mainImage}
                              alt={order.projectName}
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <FileCode className="w-6 h-6" />
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#0073B0] bg-[#F0F9FF] px-2 py-0.5 rounded-md border border-[#BAE6FD]">
                              {order.orderId}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isRefunded
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : isReconciliation
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'ASSET_READY'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : order.deliveryStatus === 'FAILED'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {formatDeliveryLabel(order.deliveryStatus)}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{order.projectName}</h3>
                          <p className="text-xs text-slate-500">
                            Ordered {formatDate(order.createdAt)} • {formatCurrency(order.amount)}
                            {isPaid && (
                              <>
                                {' '}
                                • Link issuances used:{' '}
                                <strong className="text-slate-700">
                                  {order.downloadCount}/{order.downloadLimit}
                                </strong>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {canDownload && (
                          <a
                            href={downloadHref}
                            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Source Code
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrderIds((prev) => ({ ...prev, [order.id]: !prev[order.id] }))
                          }
                          aria-expanded={isExpanded}
                          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#0089CF]" />
                          {isExpanded ? 'Hide Receipt Details' : 'View Receipt & Status'}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Inline Receipt & Delivery Details Panel (ZAI-077) */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/80 p-5 space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Billing &amp; Payment
                            </span>
                            <p className="font-bold text-slate-900 mt-1">{formatCurrency(order.amount)} ({order.currency})</p>
                            <p className="text-slate-500 mt-0.5">
                              Status: <strong>{order.paymentStatus}</strong>
                            </p>
                            {order.paidAt && (
                              <p className="text-slate-500 mt-0.5">Verified: {formatDate(order.paidAt)}</p>
                            )}
                            {order.paymentRefLast4 && (
                              <p className="text-slate-400 font-mono text-[10px] mt-0.5">
                                Payment Ref: ••••{order.paymentRefLast4}
                              </p>
                            )}
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Buyer Record
                            </span>
                            <p className="font-bold text-slate-900 mt-1">{order.studentName}</p>
                            <p className="text-slate-600 mt-0.5 break-all">{order.email}</p>
                            <p className="text-slate-500 mt-0.5">{order.phone}</p>
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Delivery &amp; Allowance
                            </span>
                            <p className="font-bold text-slate-900 mt-1">{formatDeliveryLabel(order.deliveryStatus)}</p>
                            <p className="text-slate-600 mt-0.5">
                              Download links issued: <strong>{order.downloadCount} / {order.downloadLimit}</strong>
                            </p>
                            {order.deliveredAt && (
                              <p className="text-slate-500 mt-0.5">First downloaded: {formatDate(order.deliveredAt)}</p>
                            )}
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Security &amp; Link Policy
                            </span>
                            <p className="text-slate-600 mt-1 leading-relaxed">
                              Clicking download generates a private <strong>1-hour</strong> storage URL tied to your authenticated account. Re-issue anytime from here within your limit.
                            </p>
                          </div>
                        </div>

                        {isReconciliation && (
                          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p>
                              Your payment was received, but stock allocation requires manual reconciliation by our support team. Please contact support with Order ID <strong>{order.orderId}</strong> for priority resolution or refund.
                            </p>
                          </div>
                        )}

                        {isPaid && order.deliveryStatus === 'FAILED' && (
                          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p>
                              Your payment is verified, and our engineering team has been alerted to attach/verify your deliverable package. Please refresh shortly or reach out on WhatsApp with <strong>{order.orderId}</strong>.
                            </p>
                          </div>
                        )}

                        {order.refunds && order.refunds.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                            <span className="font-bold text-slate-800 block">Refund History</span>
                            {order.refunds.map((rf) => (
                              <div key={rf.id} className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                                <span>
                                  {formatCurrency(rf.amount)} — <strong>{rf.status}</strong> ({rf.reason})
                                </span>
                                <span className="text-slate-400">{formatDate(rf.processedAt || rf.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Authenticated account ownership active — no manual Order ID required.
                          </span>
                          {order.project?.slug && (
                            <Link
                              href={`/projects/${order.project.slug}`}
                              className="text-xs font-bold text-[#0089CF] hover:underline"
                            >
                              View Project Specs
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Projects Tab — Inline 8-Stage Timeline inside /account (ZAI-078) */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          {customProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#F0F9FF] text-[#0089CF] flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">No custom project requests yet</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Need a custom AI architecture or full-stack application built to your specifications? Submit your requirements to track all 8 engineering milestones here.
                </p>
              </div>
              <Link
                href="/projects/custom"
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl glow-gradient text-white shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Request Custom Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {customProjects.map((cp) => {
                const currentStage = cp.currentStage || 'Request Received';
                const isDelivered = currentStage === 'Delivered';
                const isCancelled = currentStage === 'Cancelled';
                const isOnHold = currentStage === 'On Hold';
                const isExpanded = Boolean(expandedCustomIds[cp.id]);

                return (
                  <article
                    key={cp.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-[#0089CF]/30 transition-all space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-[#0073B0] bg-[#F0F9FF] px-2.5 py-1 rounded-md border border-[#BAE6FD]">
                          {cp.leadId}
                        </span>
                        <span
                          className={`text-xs font-extrabold px-3 py-0.5 rounded-full ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isCancelled
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : isOnHold
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-[#F0F9FF] text-[#0073B0] border border-[#0089CF]/30'
                          }`}
                        >
                          Stage: {currentStage}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        Initiated {formatDate(cp.createdAt)}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900">
                        {cp.projectName || cp.domain || 'Custom Project Development'}
                      </h3>
                      {cp.domain && (
                        <p className="text-xs font-semibold text-[#0089CF]">
                          Domain: {cp.domain} {cp.technology ? `• Stack: ${cp.technology}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Latest Progress Update Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#0089CF]" />
                          Latest Development Progress
                        </span>
                        {cp.estimatedCompletionDate && (
                          <span className="text-slate-600 flex items-center gap-1 text-[11px] font-medium bg-white px-2.5 py-0.5 rounded border border-slate-200">
                            <Calendar className="w-3 h-3 text-[#0089CF]" />
                            Target: <strong>{cp.estimatedCompletionDate}</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        &ldquo;{cp.customerProgressMessage || 'Our technical team is reviewing your requirements.'}&rdquo;
                      </p>
                    </div>

                    {/* Inline 8-Stage Progress Stepper (ZAI-078 — stays inside /account!) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">8-Stage Engineering Progress</span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCustomIds((prev) => ({ ...prev, [cp.id]: !prev[cp.id] }))
                          }
                          aria-expanded={isExpanded}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#0089CF] hover:text-[#005E91]"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {isExpanded ? 'Hide Activity Log' : `Show Activity Log (${cp.timeline?.length || 0})`}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                        {CUSTOM_PROJECT_STAGES.map((stage, idx) => {
                          const status = getStageStatus(stage, currentStage);
                          const isCompleted = status === 'completed';
                          const isCurrent = status === 'current';
                          return (
                            <div
                              key={stage}
                              className={`flex flex-col items-center text-center p-2.5 rounded-xl border text-[11px] ${
                                isCurrent
                                  ? 'bg-[#F0F9FF] border-[#0089CF]/50 ring-2 ring-[#0089CF]/20'
                                  : isCompleted
                                  ? 'bg-emerald-50/60 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200/70 opacity-75'
                              }`}
                            >
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1.5 ${
                                  isCompleted
                                    ? 'bg-emerald-600 text-white'
                                    : isCurrent
                                    ? 'bg-[#0089CF] text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                              </div>
                              <span
                                className={`font-bold leading-tight ${
                                  isCurrent
                                    ? 'text-[#0A0A0A]'
                                    : isCompleted
                                    ? 'text-emerald-900'
                                    : 'text-slate-600'
                                }`}
                              >
                                {stage}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 space-y-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                            Milestone Activity Log
                          </span>
                          {cp.timeline && cp.timeline.length > 0 ? (
                            <div className="space-y-2">
                              {cp.timeline.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-[#0073B0]">{item.stage}</span>
                                    <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
                                  </div>
                                  {item.statusMessage && (
                                    <p className="text-slate-700 leading-relaxed">{item.statusMessage}</p>
                                  )}
                                  {item.estimatedDate && (
                                    <p className="text-[11px] text-slate-500">
                                      Target date: <strong>{item.estimatedDate}</strong>
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">No milestone events recorded yet.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">
                        Reference: <strong className="font-mono text-slate-700">{cp.leadId}</strong>
                      </span>

                      {supportWhatsapp && (
                        <a
                          href={`https://wa.me/${supportWhatsapp}?text=${encodeURIComponent(
                            `Hi, I am checking on my custom project order #${cp.leadId}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp Support
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile & Security Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Profile &amp; Account Security</h2>
            <p className="text-xs text-slate-500">
              Update your optional contact details or rotate your password. Changing your password signs out all other active sessions.
            </p>
          </div>

          {profileMessage && (
            <div
              role="status"
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {profileMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label htmlFor="profile-year" className="block text-xs font-semibold text-slate-700 mb-1">
                  Role / Academic Year (Optional)
                </label>
                <select
                  id="profile-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                >
                  <option value="Individual / Professional">Individual / Professional</option>
                  <option value="Final Year">Final Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="PG / Masters">PG / Masters</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-college" className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization / College (Optional)
                </label>
                <input
                  id="profile-college"
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>

              <div>
                <label htmlFor="profile-dept" className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Domain (Optional)
                </label>
                <input
                  id="profile-dept"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#0089CF]" />
                Password Update
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-current-pw" className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    id="profile-current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                  />
                </div>

                <div>
                  <label htmlFor="profile-new-pw" className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password (min 8 chars)
                  </label>
                  <input
                    id="profile-new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0089CF]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl glow-gradient text-white shadow-md shadow-[#ED1C24]/20 hover:opacity-95 transition-all disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile Changes
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleLogout(true)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
              >
                Sign out from all devices
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
