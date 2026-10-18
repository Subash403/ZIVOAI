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
} from 'lucide-react';
import { Order, DeliveryStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingDeliveryStatus, setEditingDeliveryStatus] = useState<DeliveryStatus>('PENDING');
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchOrders = useCallback(() => {
    const url = '/api/orders';
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search) params.set('search', search);

    fetch(`${url}?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.orders);
        }
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setEditingNotes(order.adminNotes || '');
    setEditingDeliveryStatus(order.deliveryStatus || 'PENDING');
  };

  const handleSaveOrderDelivery = async () => {
    if (!selectedOrder) return;
    setSavingOrder(true);
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order delivery');
      }

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, deliveryStatus: editingDeliveryStatus, adminNotes: editingNotes } : o))
      );
      setSelectedOrder(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating order';
      alert(msg);
    } finally {
      setSavingOrder(false);
    }
  };


  const statuses = ['CREATED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Orders & Project Delivery</h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage student purchases, verify Razorpay receipts, track 1-3 hour delivery status, and log admin notes.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order ID, Student, Email, Project..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-semibold">Payment Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          >
            <option value="ALL">All Payment Statuses</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">No orders found matching filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Order ID & Date</th>
                  <th className="p-4">Student Info</th>
                  <th className="p-4">Purchased Project</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Delivery Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Order ID & Date */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-indigo-600 text-sm block">
                          {order.orderId}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-medium">{formatDate(order.createdAt)}</span>
                      </div>
                    </td>

                    {/* Student Details */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{order.studentName}</span>
                        <span className="text-[11px] text-slate-600 block">{order.email}</span>
                        <span className="text-[10px] text-slate-500 block">{order.phone}</span>
                        {order.college && <span className="text-[9px] text-indigo-600 font-semibold block">{order.college}</span>}
                      </div>
                    </td>

                    {/* Purchased Project */}
                    <td className="p-4 max-w-xs">
                      <span className="font-bold text-slate-800 block line-clamp-2">
                        {order.projectName}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="p-4">
                      <span className="font-extrabold text-emerald-700 text-sm">
                        {formatCurrency(order.amount)}
                      </span>
                    </td>

                    {/* Payment Status Badge */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : order.paymentStatus === 'CREATED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {order.paymentStatus === 'PAID' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {order.paymentStatus}
                      </span>
                    </td>

                    {/* Delivery Status */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          order.deliveryStatus === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : order.deliveryStatus === 'PROCESSING'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : order.deliveryStatus === 'FAILED'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {order.deliveryStatus || 'PENDING'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4">
                      <button
                        onClick={() => handleOpenOrderModal(order)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
      </div>

      {/* Order Delivery Management Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 sticky top-0 bg-slate-50 z-10">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Manage Order & Delivery</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Order Info Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Order Reference ID:</span>
                  <span className="font-mono text-indigo-600 font-bold text-sm">{selectedOrder.orderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Payment Status:</span>
                  <span className="font-bold text-emerald-700">{selectedOrder.paymentStatus}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Amount Paid:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(selectedOrder.amount)}</span>
                </div>
              </div>

              {/* Student Details */}
              <div className="space-y-1 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <span className="text-indigo-900 font-bold block text-sm">Customer Details</span>
                <p className="text-slate-900 font-semibold">{selectedOrder.studentName}</p>
                <p className="text-slate-700">Email: <strong>{selectedOrder.email}</strong></p>
                <p className="text-slate-700">WhatsApp: <strong>{selectedOrder.phone}</strong></p>
                {selectedOrder.college && <p className="text-slate-600">College: {selectedOrder.college} ({selectedOrder.department || 'N/A'})</p>}
              </div>

              {/* Project */}
              <div>
                <span className="text-slate-500 font-bold block mb-1">Purchased Project</span>
                <p className="text-slate-900 font-bold text-sm p-3 rounded-xl bg-slate-50 border border-slate-200">{selectedOrder.projectName}</p>
              </div>

              {/* Update Delivery Status */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800">
                  Update Delivery Status (1–3 Hour Window Target)
                </label>
                <select
                  value={editingDeliveryStatus}
                  onChange={(e) => setEditingDeliveryStatus(e.target.value as DeliveryStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:border-indigo-600"
                >
                  <option value="PENDING">PENDING (Awaiting Dispatch - Target: 1-3 Hours)</option>
                  <option value="PROCESSING">PROCESSING (Preparing Zip Materials)</option>
                  <option value="DELIVERED">DELIVERED (Email & Materials Dispatched)</option>
                  <option value="FAILED">FAILED (Delivery Attempt Issues)</option>
                </select>
              </div>

              {/* Internal Admin Notes (Never shown to student) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Internal Admin Notes (Private — Never visible to buyer)
                </label>
                <textarea
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="e.g. Sent Google Drive zip link via email at 2:15 PM. Verified receipt on WhatsApp."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              {/* Modal Save Button */}
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingOrder}
                  onClick={handleSaveOrderDelivery}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {savingOrder ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Delivery Status
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
