'use client';

import { useState, useEffect } from 'react';
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
  totalCustomers?: number;
  revenue: number;
}

interface DashboardEnquiry {
  id: string;
  leadId: string;
  studentName: string;
  projectName?: string | null;
  college: string;
  status: string;
  createdAt: string;
}

interface DashboardOrder {
  id: string;
  studentName: string;
  amount: number;
  projectName: string;
  paymentStatus: string;
  createdAt: string;
}

interface AdminDashboardData {
  success: boolean;
  stats: DashboardStats;
  recentEnquiries: DashboardEnquiry[];
  recentOrders: DashboardOrder[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => res.json())
      .then((resData: AdminDashboardData) => {
        if (resData.success) {
          setData(resData);
        }
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoading(false));
  }, []);


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
    totalCustomers: 0,
    revenue: 0,
  };

  const metricCards = [
    { title: 'Total Projects', value: stats.totalProjects || 0, icon: FolderKanban, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    { title: 'Available Projects', value: stats.availableProjects || 0, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { title: 'Featured Projects', value: stats.featuredProjects || 0, icon: Star, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { title: 'Unavailable Projects', value: stats.unavailableProjects || 0, icon: EyeOff, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    { title: 'Total Enquiries', value: stats.totalEnquiries || 0, icon: MessageSquareText, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    { title: 'New Enquiries', value: stats.newEnquiries || 0, icon: Clock, color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200' },
    { title: 'Total Orders', value: stats.totalOrders || 0, icon: ShoppingBag, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { title: 'Paid Orders', value: stats.paidOrders || 0, icon: CreditCard, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
    { title: 'Customer Accounts', value: stats.totalCustomers || 0, icon: Users, color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200', href: '/admin/customers' },
    { title: 'Total Revenue', value: formatCurrency(stats.revenue || 0), icon: IndianRupee, color: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-300 font-bold' },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Dashboard Overview</h1>
          <p className="text-xs text-slate-500 font-medium">Zivo AI platform real-time telemetry, leads, orders & catalog stats</p>
        </div>

        <Link
          href="/admin/projects/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Add New Project
        </Link>
      </div>

      {/* 9 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          const cardElement = (
            <div className={`p-5 rounded-2xl border ${card.bg} flex items-center justify-between shadow-2xs ${card.href ? 'hover:scale-[1.02] transition-transform cursor-pointer' : ''}`}>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-600 block">{card.title}</span>
                <span className={`text-2xl font-black ${card.color}`}>{card.value}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );

          return card.href ? (
            <Link key={idx} href={card.href} className="block">
              {cardElement}
            </Link>
          ) : (
            <div key={idx}>{cardElement}</div>
          );
        })}
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Enquiries / Leads */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquareText className="w-4 h-4 text-purple-600" /> Recent Client Enquiries
            </h3>
            <Link href="/admin/enquiries" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!data?.recentEnquiries || data.recentEnquiries.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No enquiries received yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentEnquiries.map((enq: DashboardEnquiry) => (
                <div key={enq.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
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

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" /> Recent Orders & Transactions
            </h3>
            <Link href="/admin/orders" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!data?.recentOrders || data.recentOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No orders created yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((ord: DashboardOrder) => (
                <div key={ord.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ord.studentName}</span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">{formatCurrency(ord.amount)}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] truncate max-w-xs">{ord.projectName}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ord.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                    }`}>
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
    </div>
  );
}
