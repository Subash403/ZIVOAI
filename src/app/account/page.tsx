'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  User,
  ShoppingBag,
  Download,
  ExternalLink,
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
} from 'lucide-react';
import { UserProfile } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { notifyAuthStateChanged } from '@/lib/auth-client';

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
  paidAt?: string | null;
  deliveredAt?: string | null;
  downloadToken?: string | null;
  downloadCount?: number;
  downloadLimit?: number;
  createdAt: string;
  receiptToken: string;
  project?: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    salesType: string;
    downloadFileName?: string | null;
  };
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

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customProjects, setCustomProjects] = useState<CustomProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'custom' | 'profile'>('orders');

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

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((res) => (res.ok ? res.json() : null)),
      fetch('/api/account/orders').then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([authData, ordersData]) => {
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

        if (ordersData?.success) {
          if (Array.isArray(ordersData.orders)) {
            setOrders(ordersData.orders);
          }
          if (Array.isArray(ordersData.customProjects)) {
            setCustomProjects(ordersData.customProjects);
          }
        }
      })
      .catch((err: unknown) => {
        console.error('Account load error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
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

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading your account...</p>
      </div>
    );
  }

  return (
    <div className="zivo-page mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Account Hero Bar */}
      <div className="zivo-surface zivo-reveal flex flex-col justify-between gap-6 rounded-3xl p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl glow-gradient flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user?.name}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {user?.role === 'ADMIN' ? 'Administrator' : 'Client Account'}
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            Sign Out
          </button>
          <Link
            href="/projects"
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all"
          >
            Explore Projects
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'orders'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Fixed Purchases ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'custom'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Custom Project Orders ({customProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Profile Settings
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No project purchases yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Once you purchase a project or place an order, your receipts, assets, and source code download links will appear here.
                </p>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl glow-gradient text-white shadow-md"
              >
                Browse Projects Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => {
                const isPaid = order.paymentStatus === 'PAID';
                const isDelivered = order.deliveryStatus === 'DELIVERED';
                const confirmationUrl = `/orders/confirmation/${order.orderId}?token=${order.receiptToken}`;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="flex items-start gap-4">
                      {order.project?.mainImage ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                          <Image
                            src={order.project.mainImage}
                            alt={order.projectName}
                            fill
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
                          <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {order.orderId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isDelivered ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Delivery: {order.deliveryStatus}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{order.projectName}</h3>
                        <p className="text-xs text-slate-500">
                          Ordered on {formatDate(order.createdAt)} • Amount: {formatCurrency(order.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {isPaid && (
                        <a
                          href={`/api/orders/download/${order.orderId}?token=${order.receiptToken}`}
                          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Source Code
                        </a>
                      )}

                      <Link
                        href={confirmationUrl}
                        className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Receipt & Tracking
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Projects Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          {customProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No custom project requests yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Need a tailored AI architecture or custom full-stack system built from scratch? Submit your requirements to track its engineering milestones here.
                </p>
              </div>
              <Link
                href="/projects/custom"
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl glow-gradient text-white shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Request Custom Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {customProjects.map((cp) => {
                const isDelivered = cp.currentStage === 'Delivered';
                const isCancelled = cp.currentStage === 'Cancelled';
                const isOnHold = cp.currentStage === 'On Hold';

                return (
                  <div
                    key={cp.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
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
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          Stage: {cp.currentStage || 'Request Received'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        Initiated on {formatDate(cp.createdAt)}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900">
                        {cp.projectName || cp.domain || 'Custom Project Development'}
                      </h3>
                      {cp.domain && (
                        <p className="text-xs font-semibold text-indigo-600">
                          Domain: {cp.domain}
                        </p>
                      )}
                    </div>

                    {/* Latest Progress Update Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Latest Development Progress
                        </span>
                        {cp.estimatedCompletionDate && (
                          <span className="text-slate-600 flex items-center gap-1 text-[11px] font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                            <Calendar className="w-3 h-3 text-indigo-600" />
                            Target: <strong>{cp.estimatedCompletionDate}</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 italic leading-relaxed">
                        “{cp.customerProgressMessage || 'Our technical team is reviewing your requirements.'}”
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <Link
                        href={`/orders/track?ref=${cp.leadId}`}
                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl glow-gradient text-white shadow-xs hover:opacity-95 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Track 8-Stage Timeline
                      </Link>

                      <a
                        href={`https://wa.me/918220303164?text=${encodeURIComponent(
                          `Hi, I am checking on my custom project order #${cp.leadId}.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                        WhatsApp Support
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Profile & Account Details</h2>
          <p className="text-xs text-slate-500 mb-6">
            Keep your contact details updated for swift order communication and custom project tracking.
          </p>

          {profileMessage && (
            <div
              className={`p-3 rounded-xl text-xs mb-5 flex items-center gap-2 ${
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Year / Status (Optional)</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Final Year">Final Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="PG / Masters">PG / Masters</option>
                  <option value="Individual / Professional">Individual / Professional</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College / Institute (Optional)</label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. MIT, Anna University, etc."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Stream (Optional)</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                Security & Password Update
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl glow-gradient text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all disabled:opacity-50"
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
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
