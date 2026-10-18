'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquareText,
  Search,
  RefreshCw,
  PhoneCall,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Send,
} from 'lucide-react';
import { Enquiry, LeadStatus, CUSTOM_PROJECT_STAGES } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [updatingNote, setUpdatingNote] = useState(false);
  const [retryingSyncId, setRetryingSyncId] = useState<string | null>(null);

  // Stage Tracking State
  const [stageInput, setStageInput] = useState<string>('Request Received');
  const [customerMessageInput, setCustomerMessageInput] = useState<string>('');
  const [estimatedDateInput, setEstimatedDateInput] = useState<string>('');
  const [newAdminNoteInput, setNewAdminNoteInput] = useState<string>('');
  const [confirmDelivered, setConfirmDelivered] = useState<boolean>(false);
  const [savingStage, setSavingStage] = useState(false);
  const [stageUpdateError, setStageUpdateError] = useState<string | null>(null);
  const [stageSuccessNotice, setStageSuccessNotice] = useState<string | null>(null);

  const fetchEnquiries = useCallback(() => {
    const url = '/api/enquiries';
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search) params.set('search', search);

    fetch(`${url}?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEnquiries(data.enquiries);
        }
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);


  // Update Lead Status
  const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
    try {
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
      );

      await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      fetchEnquiries();
    }
  };

  // Save Internal Admin Note
  const handleSaveNote = async () => {
    if (!selectedEnquiry) return;
    setUpdatingNote(true);

    try {
      const res = await fetch(`/api/enquiries/${selectedEnquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: adminNoteInput }),
      });

      const data = await res.json();
      if (res.ok && data.enquiry) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === selectedEnquiry.id ? data.enquiry : e))
        );
        setSelectedEnquiry(data.enquiry);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingNote(false);
    }
  };

  // Retry Google Sheet Synchronization
  const handleRetrySync = async (id: string) => {
    setRetryingSyncId(id);
    try {
      const res = await fetch(`/api/enquiries/${id}/retry-sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.enquiry) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === id ? data.enquiry : e))
        );
        if (selectedEnquiry?.id === id) {
          setSelectedEnquiry(data.enquiry);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRetryingSyncId(null);
    }
  };

  // Save Stage Update & Milestone Event
  const handleSaveStageUpdate = async () => {
    if (!selectedEnquiry) return;
    setSavingStage(true);
    setStageUpdateError(null);
    setStageSuccessNotice(null);

    try {
      const res = await fetch(`/api/enquiries/${selectedEnquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStage: stageInput,
          customerProgressMessage: customerMessageInput,
          estimatedCompletionDate: estimatedDateInput || null,
          newAdminNote: newAdminNoteInput,
          confirmDelivered,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update development stage');
      }

      if (data.enquiry) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === selectedEnquiry.id ? data.enquiry : e))
        );
        setSelectedEnquiry(data.enquiry);
        setNewAdminNoteInput('');
        setConfirmDelivered(false);
        setStageSuccessNotice(`Stage successfully updated to "${data.enquiry.currentStage}"`);
      }
    } catch (err: unknown) {
      setStageUpdateError(err instanceof Error ? err.message : 'Failed to update stage');
    } finally {
      setSavingStage(false);
    }
  };

  const allStages: string[] = [...CUSTOM_PROJECT_STAGES, 'On Hold', 'Cancelled'];

  const statuses: LeadStatus[] = [
    'NEW',
    'CONTACTED',
    'DISCUSSING',
    'FOLLOW_UP',
    'CONFIRMED',
    'COMPLETED',
    'NOT_INTERESTED',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Student Enquiries & Leads</h1>
          <p className="text-xs text-slate-500 font-medium">Manage student consultation requests, lead statuses & Google Sheets sync</p>
        </div>

        <button
          onClick={fetchEnquiries}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Leads
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
            placeholder="Search by Lead ID, Student, Phone, College..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
          >
            <option value="ALL">All Statuses</option>
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
            <p className="text-xs text-slate-500 font-medium">Loading enquiries...</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <MessageSquareText className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">No enquiries found matching filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Lead ID & Date</th>
                  <th className="p-4">Student Info</th>
                  <th className="p-4">College & Dept</th>
                  <th className="p-4">Interested Project / Scope</th>
                  <th className="p-4">Dev Stage</th>
                  <th className="p-4">Lead Status</th>
                  <th className="p-4">Google Sheet Sync</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Lead ID & Date */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-indigo-600 text-sm block">
                          {enquiry.leadId}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-medium">{formatDate(enquiry.createdAt)}</span>
                      </div>
                    </td>

                    {/* Student Info */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 block">{enquiry.studentName}</span>
                        <div className="text-[11px] text-slate-600 space-y-0.5 font-medium">
                          <a href={`tel:${enquiry.phone}`} className="hover:text-indigo-600 flex items-center gap-1">
                            <PhoneCall className="w-3 h-3 text-emerald-600" /> {enquiry.phone}
                          </a>
                          <a href={`mailto:${enquiry.email}`} className="hover:text-indigo-600 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-indigo-600" /> {enquiry.email}
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* College & Dept */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 block">{enquiry.college || 'Individual/General'}</span>
                        <span className="text-[11px] text-slate-500 block font-medium">{enquiry.department || 'General'} ({enquiry.year || 'Final Year'})</span>
                      </div>
                    </td>

                    {/* Interested Project / Scope */}
                    <td className="p-4 max-w-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-indigo-700 block line-clamp-1">
                          {enquiry.projectName || 'Custom Requirement'}
                        </span>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{enquiry.requirements}</p>
                      </div>
                    </td>

                    {/* Dev Stage */}
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 block text-center whitespace-nowrap">
                        {enquiry.currentStage || 'Request Received'}
                      </span>
                    </td>

                    {/* Lead Status Select */}
                    <td className="p-4">
                      <select
                        value={enquiry.status}
                        onChange={(e) => handleStatusChange(enquiry.id, e.target.value as LeadStatus)}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-[11px] font-bold focus:outline-none focus:border-indigo-600"
                      >
                        {statuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Google Sheet Sync */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {enquiry.googleSheetSyncStatus === 'SYNCED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" /> {enquiry.googleSheetSyncStatus}
                          </span>
                        )}

                        <button
                          onClick={() => handleRetrySync(enquiry.id)}
                          disabled={retryingSyncId === enquiry.id}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                          title="Retry Google Sheets Sync"
                        >
                          <RefreshCw className={`w-3 h-3 ${retryingSyncId === enquiry.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <button
                        onClick={() => {
                          setSelectedEnquiry(enquiry);
                          setAdminNoteInput(enquiry.adminNotes || '');
                          setStageInput(enquiry.currentStage || 'Request Received');
                          setCustomerMessageInput(enquiry.customerProgressMessage || '');
                          setEstimatedDateInput(enquiry.estimatedCompletionDate || '');
                          setNewAdminNoteInput('');
                          setConfirmDelivered(false);
                          setStageUpdateError(null);
                          setStageSuccessNotice(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] transition-colors whitespace-nowrap"
                      >
                        Manage Stage & Notes
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enquiry Detail & Development Stage Tracking Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-600 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {selectedEnquiry.leadId}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedEnquiry.studentName}</h3>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {selectedEnquiry.currentStage || 'Request Received'}
                </span>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow text-xs">
              
              {/* Customer Contact & Meta Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block">College:</span>
                  <span className="text-slate-900 font-bold">{selectedEnquiry.college || 'Individual / General'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Department & Year:</span>
                  <span className="text-slate-900 font-bold">{selectedEnquiry.department || 'General'} ({selectedEnquiry.year || '4th Year'})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Phone:</span>
                  <a href={`tel:${selectedEnquiry.phone}`} className="text-emerald-700 font-bold">{selectedEnquiry.phone}</a>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">WhatsApp:</span>
                  <a href={`https://wa.me/${selectedEnquiry.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold">{selectedEnquiry.whatsapp || selectedEnquiry.phone}</a>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Email:</span>
                  <span className="text-slate-800 font-medium">{selectedEnquiry.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Preferred Callback:</span>
                  <span className="text-amber-800 font-bold">{selectedEnquiry.callbackTime || 'Anytime'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block uppercase tracking-wider mb-1">Attached Project / Title</span>
                <p className="text-sm font-bold text-indigo-600">{selectedEnquiry.projectName || 'Custom Project Request'}</p>
              </div>

              <div>
                <span className="text-slate-500 font-bold block uppercase tracking-wider mb-1">Customer Requirements</span>
                <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                  {selectedEnquiry.requirements}
                </p>
              </div>

              {/* 3. CUSTOM PROJECT DEVELOPMENT STAGE TRACKER (ADMIN CONTROL) */}
              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                    Custom Project Development Stage & Customer Updates
                  </span>
                  <span className="text-[10px] text-indigo-700 font-medium">
                    Updates reflect directly on Customer&apos;s Track Order Page
                  </span>
                </div>

                {stageUpdateError && (
                  <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{stageUpdateError}</span>
                  </div>
                )}

                {stageSuccessNotice && (
                  <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{stageSuccessNotice}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Current Development Stage <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={stageInput}
                      onChange={(e) => setStageInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:border-indigo-600"
                    >
                      {allStages.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estimated Completion Date (Customer Visible)
                    </label>
                    <input
                      type="text"
                      value={estimatedDateInput}
                      onChange={(e) => setEstimatedDateInput(e.target.value)}
                      placeholder="e.g. 25 Oct 2026 or Next 3 Days"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Delivery Confirmation Enforcement */}
                {stageInput === 'Delivered' && (
                  <div className="p-3.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Delivery Confirmation Guard</span>
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={confirmDelivered}
                        onChange={(e) => setConfirmDelivered(e.target.checked)}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>
                        I confirm that the full project materials, source code, and documentation have been delivered to the customer.
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer-Visible Progress Message
                  </label>
                  <textarea
                    rows={3}
                    value={customerMessageInput}
                    onChange={(e) => setCustomerMessageInput(e.target.value)}
                    placeholder="Enter the message displayed to client on their tracking timeline..."
                    className="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
                  />
                  <span className="text-[10px] text-slate-500">
                    This message is shown to the customer on their live tracking dashboard and emailed as a progress update.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Internal Admin Note for this Stage Milestone (Private — Kept Secret from Customer)
                  </label>
                  <input
                    type="text"
                    value={newAdminNoteInput}
                    onChange={(e) => setNewAdminNoteInput(e.target.value)}
                    placeholder="e.g. Backend modules passed test suite; pending frontend theme styling"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-slate-900 text-xs focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveStageUpdate}
                    disabled={savingStage}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl glow-gradient text-white text-xs font-bold shadow-md hover:opacity-95 transition-all disabled:opacity-50"
                  >
                    {savingStage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving Stage Update...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Update Stage & Notify Customer
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Chronological Milestone Timeline History */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Milestone History Log ({selectedEnquiry.timeline?.length || 0} events)
                </span>

                {selectedEnquiry.timeline && selectedEnquiry.timeline.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedEnquiry.timeline.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700">{item.stage}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
                        </div>
                        {item.statusMessage && (
                          <p className="text-slate-700 text-[11px] font-medium leading-relaxed">
                            {item.statusMessage}
                          </p>
                        )}
                        {item.adminNote && (
                          <p className="text-amber-800 text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-semibold">
                            Internal Note: {item.adminNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">No timeline milestones logged yet.</p>
                )}
              </div>

              {/* General Internal Admin Notes Section */}
              <div className="space-y-2 pt-4 border-t border-slate-200">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                  Overall Internal Admin Notes (Private)
                </span>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="General notes regarding pricing, client calls, WhatsApp conversations..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNote}
                    disabled={updatingNote}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-md"
                  >
                    {updatingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Save General Note
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
