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
  AlertTriangle,
  Eye,
  X,
  ShoppingBag,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  phone?: string | null;
  college?: string | null;
  department?: string | null;
  year?: string | null;
  authType: string;
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
    currentStage?: string;
    createdAt: string;
  }[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({ totalAccounts: 0, totalCustomers: 0, grossPaidSpend: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (search.trim()) params.set('search', search.trim());

    try {
      const res = await fetch(`/api/admin/customers?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch customers.');
      }
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.totalCount || 0);
      }
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load customer accounts.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCustomers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCustomers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Customer Accounts</h1>
          <p className="text-xs text-slate-500 font-medium">
            Server-filtered &amp; paginated customer directory ({totalCount} matching customers).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCustomers}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" /> {errorMsg}
          </span>
          <button type="button" onClick={fetchCustomers} className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Matching Customers</span>
            <span className="text-2xl font-black text-slate-900">{summary.totalAccounts}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] text-[#0089CF] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Total Customer Accounts</span>
            <span className="text-2xl font-black text-emerald-600">{summary.totalCustomers}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Gross Paid Customer Spend</span>
            <span className="text-2xl font-black text-[#0089CF]">{formatCurrency(summary.grossPaidSpend)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] text-[#0089CF] flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name, email, phone, org..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#0089CF] font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0089CF] animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading customer directory...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">No accounts found</h2>
          <p className="text-xs text-slate-500">
            {search
              ? 'Try adjusting your search criteria.'
              : 'Customer accounts and order histories will appear here once registered.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#F0F9FF] border border-[#0089CF]/30 text-[#0073B0] font-bold flex items-center justify-center text-base shrink-0">
                    {customer.name ? customer.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm">{customer.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F9FF] text-[#0073B0] border border-[#0089CF]/30">
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
                    <span className="text-sm font-black text-[#0089CF]">
                      {customer.paidOrdersCount} Paid ({formatCurrency(customer.totalSpent)})
                    </span>
                  </div>
                  <div className="text-right pl-3 border-l border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 block">Custom Enquiries</span>
                    <span className="text-sm font-bold text-slate-800">
                      {customer.customProjectsCount} Requests
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(customer)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#0089CF]" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  {customer.college ? (
                    <span className="flex items-center gap-1.5 font-medium">
                      <School className="w-3.5 h-3.5 text-[#0089CF]" />
                      {customer.college} {customer.department ? `(${customer.department})` : ''}{' '}
                      {customer.year ? `• ${customer.year}` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No organization details provided</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {formatDate(customer.createdAt)}
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 text-xs">
              <span className="text-slate-500">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} accounts)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Customer Account Details</h3>
                <p className="text-xs text-slate-500">Account overview, verified purchase records &amp; enquiry history</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 font-semibold block">Full Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Account Email:</span>
                  <span className="font-medium text-slate-800">{selectedCustomer.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Phone / WhatsApp:</span>
                  <span className="font-medium text-slate-800">{selectedCustomer.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Account Role:</span>
                  <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-200 text-slate-800">
                    {selectedCustomer.role}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Organization / College:</span>
                  <span className="font-medium text-slate-800">{selectedCustomer.college || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Department &amp; Year:</span>
                  <span className="font-medium text-slate-800">
                    {selectedCustomer.department ? `${selectedCustomer.department} (${selectedCustomer.year || 'N/A'})` : 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Auth Provider:</span>
                  <span className="font-medium text-slate-800">{selectedCustomer.authType}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Joined On:</span>
                  <span className="font-medium text-slate-800">{formatDate(selectedCustomer.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#0089CF]" />
                Order History ({selectedCustomer.totalOrdersCount} total, {selectedCustomer.paidOrdersCount} paid)
              </h4>
              {selectedCustomer.recentOrders && selectedCustomer.recentOrders.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.recentOrders.map((ord) => (
                    <div key={ord.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-[#0089CF]">{ord.orderId}</span>
                        <span className="text-slate-500 text-[11px] block">{formatDate(ord.createdAt)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700 block">{formatCurrency(ord.amount)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ord.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ord.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No orders placed by this customer yet.</p>
              )}
            </div>

            {/* Custom Project Enquiries */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5 text-[#D97706]" />
                Custom Project Requests ({selectedCustomer.customProjectsCount})
              </h4>
              {selectedCustomer.recentEnquiries && selectedCustomer.recentEnquiries.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.recentEnquiries.map((enq) => (
                    <div key={enq.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-800">{enq.leadId}</span>
                        <span className="text-slate-500 text-[11px] block">{formatDate(enq.createdAt)}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        {enq.currentStage || 'Request Received'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No custom project enquiries submitted by this customer.</p>
              )}
            </div>

            {/* Security Notice */}
            <div className="p-3.5 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] text-[11px] text-[#005E91] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0089CF] shrink-0 mt-0.5" />
              <span>Customer passwords and OAuth tokens are hashed/encrypted on the server and cannot be viewed or altered directly to protect account security.</span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
