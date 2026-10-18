'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  School,
  IndianRupee,
  Calendar,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  college?: string | null;
  department?: string | null;
  year?: string | null;
  authType: string;
  avatarUrl?: string | null;
  createdAt: string;
  totalOrdersCount: number;
  paidOrdersCount: number;
  totalSpent: number;
  customProjectsCount: number;
  recentOrders?: {
    id: string;
    orderId: string;
    amount: number;
    paymentStatus: string;
    deliveryStatus: string;
    createdAt: string;
  }[];
  recentEnquiries?: {
    id: string;
    leadId: string;
    currentStage: string;
    createdAt: string;
  }[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'ADMIN'>('ALL');

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    fetch(`/api/admin/customers?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
      })
      .catch((err) => console.error('Error fetching customers:', err))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    fetch(`/api/admin/customers?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
      })
      .catch((err) => console.error('Error fetching customers:', err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [search]);

  const filteredCustomers = customers.filter((c) => {
    if (roleFilter !== 'ALL' && c.role !== roleFilter) return false;
    return true;
  });

  const totalRegistered = customers.length;
  const totalPaying = customers.filter((c) => c.paidOrdersCount > 0).length;
  const totalCustomerRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Customer Accounts</h1>
          <p className="text-xs text-slate-500 font-medium">
            View and manage student profiles, authenticated accounts, purchasing activity, and custom projects.
          </p>
        </div>

        <button
          onClick={fetchCustomers}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Total Accounts</span>
            <span className="text-2xl font-black text-slate-900">{totalRegistered}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Purchasing Customers</span>
            <span className="text-2xl font-black text-emerald-600">{totalPaying}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Total Customer Spend</span>
            <span className="text-2xl font-black text-indigo-600">{formatCurrency(totalCustomerRevenue)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, college..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'CUSTOMER' | 'ADMIN')}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">All Accounts</option>
            <option value="CUSTOMER">Customers Only</option>
            <option value="ADMIN">Admins Only</option>
          </select>
        </div>
      </div>

      {/* Customers List / Table */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading customer directory...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No accounts found</h3>
          <p className="text-xs text-slate-500">Try modifying your search query or role filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-200 transition-all space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-lg shrink-0">
                    {customer.name ? customer.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{customer.name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          customer.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {customer.role}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {customer.authType}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {customer.email}
                      </span>
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {customer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 block">Orders / Spend</span>
                    <span className="text-sm font-black text-indigo-600">
                      {customer.paidOrdersCount} Paid ({formatCurrency(customer.totalSpent)})
                    </span>
                  </div>

                  <div className="text-right pl-3 border-l border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 block">Custom Enquiries</span>
                    <span className="text-sm font-bold text-slate-800">
                      {customer.customProjectsCount} Requests
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic & Timestamp Details */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-3">
                  {customer.college ? (
                    <span className="flex items-center gap-1.5 font-medium">
                      <School className="w-3.5 h-3.5 text-indigo-600" />
                      {customer.college} {customer.department ? `(${customer.department})` : ''} {customer.year ? `• ${customer.year}` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No college details provided</span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {formatDate(customer.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
