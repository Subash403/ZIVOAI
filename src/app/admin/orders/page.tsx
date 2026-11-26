'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Eye,
  X,
  Clock,
  PackageCheck,
  Save,
  Download,
  Mail,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Order, DeliveryStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ExtendedAdminOrder extends Order {
  reconciliationStatus?: string | null;
  notification?: {
    status: string;
    attemptCount: number;
    lastError?: string | null;
    updatedAt: string;
  } | null;
  refunds?: {
    id: string;
    razorpayRefundId?: string | null;
    amount: number;
    status: string;
    reason: string;
    processedAt?: string | null;
    createdAt: string;
  }[];
  _count?: {
    downloadLogs: number;
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<ExtendedAdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reconciliationOnly, setReconciliationOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedOrder, setSelectedOrder] = useState<ExtendedAdminOrder | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingDeliveryStatus, setEditingDeliveryStatus] = useState<DeliveryStatus>('PENDING');
  const [savingOrder, setSavingOrder] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Controlled refund form
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundRefId, setRefundRefId] = useState('');
  const [refundRestoreStock, setRefundRestoreStock] = useState(false);
  const [refundMarkProcessed, setRefundMarkProcessed] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (reconciliationOnly) params.set('reconciliation', 'true');

    try {
      const res = await fetch(`/api/orders?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load orders.');
      }
      setOrders(data.orders || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.totalCount || 0);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to fetch orders.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, reconciliationOnly, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOrders]);

  const handleOpenOrderModal = (order: ExtendedAdminOrder) => {
    setSelectedOrder(order);
    setEditingNotes(order.adminNotes || '');
    setEditingDeliveryStatus((order.deliveryStatus as DeliveryStatus) || 'PENDING');
    setActionFeedback(null);
    setShowRefundForm(false);
    setRefundReason('');
    setRefundRefId('');
    setRefundRestoreStock(false);
    setRefundMarkProcessed(false);
  };

  const handleSaveOrderDelivery = async () => {
    if (!selectedOrder) return;
    setSavingOrder(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryStatus: editingDeliveryStatus,
          adminNotes: editingNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update order delivery');

      setActionFeedback({ type: 'success', text: 'Order delivery status and notes updated.' });
      await fetchOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error updating order',
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleResendEmail = async () => {
    if (!selectedOrder) return;
    setResendingEmail(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/resend-email`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend email');
      setActionFeedback({
        type: data.success ? 'success' : 'error',
        text: `${data.message} (Status: ${data.status})`,
      });
      await fetchOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to resend confirmation email.',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmittingRefund(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: refundReason,
          razorpayRefundId: refundRefId || undefined,
          restoreStock: refundRestoreStock,
          revokeAccess: true,
          markProcessed: refundMarkProcessed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record refund');
      setActionFeedback({
        type: 'success',
        text: `Refund ${refundMarkProcessed ? 'marked PROCESSED' : 'recorded as REQUESTED'}. Download access revoked.`,
      });
      setShowRefundForm(false);
      await fetchOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Refund action failed',
      });
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['OrderID', 'Date', 'Customer', 'Email', 'Project', 'Amount', 'Currency', 'PaymentStatus', 'DeliveryStatus', 'RazorpayPaymentId'];
    const rows = orders.map((o) => [
      o.orderId,
      o.createdAt,
      o.studentName,
      o.email,
      o.projectName,
      String(o.amount),
      o.currency,
      o.paymentStatus,
      o.deliveryStatus,
      o.razorpayPaymentId || '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zivo-orders-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statuses = ['CREATED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'RECONCILIATION_REQUIRED'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Orders, Fulfilment &amp; Refunds</h1>
          <p className="text-xs text-slate-500 font-medium">
            Inspect verified Razorpay records, email outbox diagnostics, download counts, and audited refund workflows ({totalCount} total).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={fetchOrders}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            {errorMsg}
          </span>
          <button type="button" onClick={fetchOrders} className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search Order ID, Buyer, Email, Razorpay ID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          />
        </div>

        <select
          aria-label="Filter by payment status"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-600"
        >
          <option value="ALL">All Payment Statuses</option>
          {statuses.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(e) => {
              setPage(1);
              setDateFrom(e.target.value);
            }}
            className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
          <input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(e) => {
              setPage(1);
              setDateTo(e.target.value);
            }}
            className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 cursor-pointer">
          <input
            type="checkbox"
            checked={reconciliationOnly}
            onChange={(e) => {
              setPage(1);
              setReconciliationOnly(e.target.checked);
            }}
            className="rounded text-amber-600"
          />
          Needs Reconciliation
        </label>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">No orders found matching current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Order ID &amp; Date</th>
                  <th className="p-4">Buyer</th>
                  <th className="p-4">Project</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Delivery &amp; Email</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold text-indigo-600 text-xs block">{order.orderId}</span>
                      <span className="text-[10px] text-slate-500 block font-medium">{formatDate(order.createdAt)}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{order.studentName}</span>
                      <span className="text-[11px] text-slate-600 block">{order.email}</span>
                      <span className="text-[10px] text-slate-500 block">{order.phone}</span>
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="font-bold text-slate-800 block line-clamp-2">{order.projectName}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(order.amount)}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : order.paymentStatus === 'RECONCILIATION_REQUIRED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : order.paymentStatus === 'CREATED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {order.paymentStatus === 'PAID' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 space-y-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'ASSET_READY'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : order.deliveryStatus === 'FAILED'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {order.deliveryStatus}
                      </span>
                      {order.notification && (
                        <span className="block text-[10px] text-slate-500">
                          Email: <strong>{order.notification.status}</strong> ({order.notification.attemptCount}x)
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleOpenOrderModal(order)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} orders)
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

      {/* Order Management Modal */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-order-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-600" />
                <h2 id="manage-order-title" className="text-base font-bold text-slate-900">
                  Manage Order &amp; Reconciliation
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {actionFeedback && (
                <div
                  role="status"
                  className={`p-3 rounded-xl border ${
                    actionFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {actionFeedback.text}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Order ID:</span>
                  <span className="font-mono text-indigo-600 font-bold">{selectedOrder.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Payment Status (Webhook Controlled):</span>
                  <span className="font-bold text-emerald-700">{selectedOrder.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Amount:</span>
                  <span className="font-extrabold text-slate-900">{formatCurrency(selectedOrder.amount)}</span>
                </div>
                {selectedOrder.razorpayPaymentId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Razorpay Payment ID:</span>
                    <span className="font-mono text-slate-700">{selectedOrder.razorpayPaymentId}</span>
                  </div>
                )}
                {selectedOrder.notification && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Email Outbox:</span>
                    <span className="font-bold text-slate-800">
                      {selectedOrder.notification.status} ({selectedOrder.notification.attemptCount} attempt(s))
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Operations: Resend Email & Refund Trigger */}
              <div className="flex flex-wrap gap-2">
                {selectedOrder.paymentStatus === 'PAID' && (
                  <button
                    type="button"
                    disabled={resendingEmail}
                    onClick={handleResendEmail}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold disabled:opacity-50"
                  >
                    {resendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Resend Confirmation Email
                  </button>
                )}

                {['PAID', 'RECONCILIATION_REQUIRED'].includes(selectedOrder.paymentStatus) && (
                  <button
                    type="button"
                    onClick={() => setShowRefundForm((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {showRefundForm ? 'Hide Refund Form' : 'Record / Reconcile Refund'}
                  </button>
                )}
              </div>

              {showRefundForm && (
                <form onSubmit={handleSubmitRefund} className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
                  <p className="font-bold text-rose-900">Audited Refund &amp; Access Revocation</p>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Refund Reason (Required)</label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="e.g. Stock conflict after payment capture"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Razorpay Refund ID (Optional)</label>
                    <input
                      type="text"
                      value={refundRefId}
                      onChange={(e) => setRefundRefId(e.target.value)}
                      placeholder="rfnd_..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={refundMarkProcessed}
                        onChange={(e) => setRefundMarkProcessed(e.target.checked)}
                      />
                      Mark REFUNDED immediately
                    </label>
                    <label className="flex items-center gap-2 font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={refundRestoreStock}
                        onChange={(e) => setRefundRestoreStock(e.target.checked)}
                      />
                      Restore 1 stock unit
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
                  >
                    {submittingRefund ? 'Recording...' : 'Submit Audited Refund'}
                  </button>
                </form>
              )}

              {/* Update Delivery Status */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <label htmlFor="admin-delivery-status" className="block text-xs font-bold text-slate-800">
                  Delivery Status
                </label>
                <select
                  id="admin-delivery-status"
                  value={editingDeliveryStatus}
                  onChange={(e) => setEditingDeliveryStatus(e.target.value as DeliveryStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="ASSET_READY">ASSET_READY (Available in Dashboard)</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="DELIVERED">DELIVERED (Customer Downloaded)</option>
                  <option value="FAILED">FAILED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-order-notes" className="block text-xs font-bold text-slate-800">
                  Internal Admin Notes (Private)
                </label>
                <textarea
                  id="admin-order-notes"
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={savingOrder}
                  onClick={handleSaveOrderDelivery}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {savingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
