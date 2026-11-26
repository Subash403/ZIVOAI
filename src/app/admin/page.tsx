'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  CheckCircle2,
  Star,
  EyeOff,
  MessageSquareText,
  Clock,
  ShoppingBag,
  CreditCard,
  IndianRupee,
  PlusCircle,
  ArrowRight,
  Loader2,
  Users,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  History,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardStats {
  totalProjects: number;
  availableProjects: number;
  featuredProjects: number;
  unavailableProjects: number;
  totalEnquiries: number;
  newEnquiries: number;
  totalOrders: number;
  paidOrders: number;
  refundedOrders?: number;
  reconciliationOrders?: number;
  totalCustomers?: number;
  revenue: number;
  grossPaidSales?: number;
  refundedAmount?: number;
  netSalesBeforeFees?: number;
  failedNotifications?: number;
  failedWebhooks?: number;
}

interface DashboardEnquiry {
  id: string;
  leadId: string;
  studentName: string;
  projectName?: string | null;
  college: string;
  status: string;
  currentStage?: string;
  createdAt: string;
}

interface DashboardOrder {
  id: string;
  orderId?: string;
  studentName: string;
  amount: number;
  projectName: string;
  paymentStatus: string;
  deliveryStatus?: string;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  createdAt: string;
}

interface AdminDashboardData {
  success: boolean;
  refreshedAt?: string;
  stats: DashboardStats;
  health?: {
    readyForProduction: boolean;
    razorpayMode: string;
    missingEnvCount: number;
    warnings: string[];
  };
  recentEnquiries: DashboardEnquiry[];
  recentOrders: DashboardOrder[];
  recentAuditLogs?: AuditEntry[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadMetrics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to load dashboard metrics.');
      }
      setData(resData);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to fetch dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMetrics(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMetrics]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading admin metrics...</p>
      </div>
    );
  }

  const stats: DashboardStats = data?.stats || {
    totalProjects: 0,
    availableProjects: 0,
    featuredProjects: 0,
    unavailableProjects: 0,
    totalEnquiries: 0,
    newEnquiries: 0,
    totalOrders: 0,
    paidOrders: 0,
    refundedOrders: 0,
    reconciliationOrders: 0,
    totalCustomers: 0,
    revenue: 0,
    grossPaidSales: 0,
    refundedAmount: 0,
    netSalesBeforeFees: 0,
    failedNotifications: 0,
    failedWebhooks: 0,
  };

  const grossSales = stats.grossPaidSales ?? stats.revenue ?? 0;
  const refundedAmount = stats.refundedAmount ?? 0;
  const netSales = stats.netSalesBeforeFees ?? Math.max(0, grossSales - refundedAmount);
  const hasOperationalAlerts =
    (stats.reconciliationOrders || 0) > 0 ||
    (stats.failedNotifications || 0) > 0 ||
    (stats.failedWebhooks || 0) > 0;

  const metricCards = [
    {
      title: 'Gross Paid Sales',
      subtitle: 'Verified PAID orders (pre-refund)',
      value: formatCurrency(grossSales),
      icon: IndianRupee,
      color: 'text-emerald-800',
      bg: 'bg-emerald-50 border-emerald-200',
      href: '/admin/orders?status=PAID',
    },
    {
      title: 'Refunded Total',
      subtitle: `${stats.refundedOrders || 0} refunded order(s)`,
      value: formatCurrency(refundedAmount),
      icon: CreditCard,
      color: 'text-rose-700',
      bg: 'bg-rose-50 border-rose-200',
      href: '/admin/orders?status=REFUNDED',
    },
    {
      title: 'Net Sales (Pre-Fees)',
      subtitle: 'Gross Paid minus Processed Refunds',
      value: formatCurrency(netSales),
      icon: ShieldCheck,
      color: 'text-indigo-800',
      bg: 'bg-indigo-50 border-indigo-200',
      href: '/admin/orders',
    },
    {
      title: 'Total Orders',
      subtitle: `${stats.paidOrders} paid`,
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'text-blue-700',
      bg: 'bg-white border-slate-200',
      href: '/admin/orders',
    },
    {
      title: 'Customer Accounts',
      subtitle: 'Registered customers',
      value: stats.totalCustomers || 0,
      icon: Users,
      color: 'text-cyan-700',
      bg: 'bg-white border-slate-200',
      href: '/admin/customers',
    },
    {
      title: 'Active Enquiries',
      subtitle: `${stats.newEnquiries} new`,
      value: stats.totalEnquiries,
      icon: MessageSquareText,
      color: 'text-purple-700',
      bg: 'bg-white border-slate-200',
      href: '/admin/enquiries',
    },
    {
      title: 'Catalog Projects',
      subtitle: `${stats.availableProjects} live & public`,
      value: stats.totalProjects,
      icon: FolderKanban,
      color: 'text-indigo-700',
      bg: 'bg-white border-slate-200',
      href: '/admin/projects',
    },
    {
      title: 'Featured Live',
      subtitle: `${stats.unavailableProjects} hidden/draft`,
      value: stats.featuredProjects,
      icon: Star,
      color: 'text-amber-700',
      bg: 'bg-white border-slate-200',
      href: '/admin/projects',
    },
    {
      title: 'Hidden / Unavailable',
      subtitle: 'Draft or retired projects',
      value: stats.unavailableProjects,
      icon: EyeOff,
      color: 'text-slate-700',
      bg: 'bg-white border-slate-200',
      href: '/admin/projects',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Refresh Controls (ZAI-084) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Dashboard Overview</h1>
          <p className="text-xs text-slate-500 font-medium">
            Marketplace snapshot — financial totals, active leads, orders &amp; operational health.
            {data?.refreshedAt && (
              <span className="ml-2 font-mono text-slate-400">
                Last updated: {new Date(data.refreshedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadMetrics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Snapshot'}
          </button>

          <Link
            href="/admin/projects/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Add New Project
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => loadMetrics(true)}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Operational Alerts Banner (ZAI-010, ZAI-026, ZAI-075) */}
      {hasOperationalAlerts && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Operational Attention Required</p>
              <p className="text-amber-800">
                {(stats.reconciliationOrders || 0) > 0 && `${stats.reconciliationOrders} order(s) need reconciliation. `}
                {(stats.failedNotifications || 0) > 0 && `${stats.failedNotifications} failed email outbox item(s). `}
                {(stats.failedWebhooks || 0) > 0 && `${stats.failedWebhooks} failed Razorpay webhook event(s).`}
              </p>
            </div>
          </div>
          <Link
            href="/admin/orders"
            className="px-3.5 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 shrink-0 text-center"
          >
            Review Orders
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className={`p-5 rounded-2xl border ${card.bg} flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-all`}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-600 block">{card.title}</span>
                <span className={`text-2xl font-black block ${card.color}`}>{card.value}</span>
                <span className="text-[11px] text-slate-500 block">{card.subtitle}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquareText className="w-4 h-4 text-purple-600" /> Recent Client Enquiries
            </h2>
            <Link href="/admin/enquiries" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!data?.recentEnquiries || data.recentEnquiries.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No enquiries received yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentEnquiries.map((enq) => (
                <div key={enq.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{enq.studentName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                        {enq.leadId}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] truncate max-w-xs">{enq.projectName || enq.college}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {enq.status}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">{formatDate(enq.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" /> Recent Orders &amp; Transactions
            </h2>
            <Link href="/admin/orders" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!data?.recentOrders || data.recentOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No orders created yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((ord) => (
                <div key={ord.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ord.studentName}</span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">{formatCurrency(ord.amount)}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] truncate max-w-xs">{ord.projectName}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : ord.paymentStatus === 'RECONCILIATION_REQUIRED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ord.paymentStatus}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">{formatDate(ord.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Admin Audit Trail */}
      {data?.recentAuditLogs && data.recentAuditLogs.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" /> Recent Admin Activity Audit Log
          </h2>
          <div className="divide-y divide-slate-100 text-xs">
            {data.recentAuditLogs.map((log) => (
              <div key={log.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {log.action}
                  </span>
                  <span className="text-slate-700 font-medium">
                    {log.resourceType} {log.resourceId ? `#${log.resourceId}` : ''}
                  </span>
                  <span className="text-slate-400">by {log.actorEmail}</span>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDate(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment Readiness Summary */}
      {data?.health && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`w-4 h-4 ${data.health.readyForProduction ? 'text-emerald-600' : 'text-amber-500'}`}
            />
            <span className="font-bold text-slate-800">
              Razorpay Mode: <span className="font-mono uppercase">{data.health.razorpayMode}</span>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">
              {data.health.missingEnvCount === 0
                ? 'All production env variables configured'
                : `${data.health.missingEnvCount} production env variable(s) not set in this environment`}
            </span>
          </div>
          <Link href="/admin/settings" className="text-indigo-600 font-bold hover:underline">
            Review Settings
          </Link>
        </div>
      )}
    </div>
  );
}
