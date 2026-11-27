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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [archivedFilter, setArchivedFilter] = useState<'false' | 'true' | 'all'>('false');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [assignedToInput, setAssignedToInput] = useState('');
  const [nextFollowUpInput, setNextFollowUpInput] = useState('');
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

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    params.set('archived', archivedFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());

    try {
      const res = await fetch(`/api/enquiries?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load enquiries.');
      }
      setEnquiries(data.enquiries || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.totalCount || 0);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to fetch enquiries.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, archivedFilter, page]);

  const handleToggleArchive = async (id: string, archive: boolean) => {
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: archive }),
      });
      if (!res.ok) throw new Error('Failed to update archive state');
      await fetchEnquiries();
      if (selectedEnquiry?.id === id) setSelectedEnquiry(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update enquiry archive state.');
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchEnquiries();
    }, 0);
    return () => window.clearTimeout(timer);
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
        body: JSON.stringify({
          adminNotes: adminNoteInput,
          assignedTo: assignedToInput || null,
          nextFollowUpAt: nextFollowUpInput || null,
        }),
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
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Leads
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button type="button" onClick={fetchEnquiries} className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
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
            placeholder="Search by Lead ID, Student, Phone, College..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/70 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#0089CF] font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            aria-label="Filter archived enquiries"
            value={archivedFilter}
            onChange={(e) => {
              setPage(1);
              setArchivedFilter(e.target.value as 'false' | 'true' | 'all');
            }}
            className="px-3 py-2 rounded-xl bg-white/70 border border-slate-200 text-slate-900 text-xs font-medium"
          >
            <option value="false">Active Leads</option>
            <option value="true">Archived Leads</option>
            <option value="all">All Leads</option>
          </select>

          <span className="text-xs text-slate-500 font-semibold">Status:</span>
          <select
            aria-label="Filter by lead status"
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="px-3 py-2 rounded-xl bg-white/70 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#0089CF] font-medium"
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#0089CF] animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading enquiries...</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <MessageSquareText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No client enquiries found</p>
            <p className="text-xs text-slate-500">
              {search || statusFilter !== 'ALL' || archivedFilter !== 'false'
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Custom project requests and inbound leads will appear here once submitted.'}
            </p>
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
                        <span className="font-mono font-bold text-[#0089CF] text-sm block">
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
                          <a href={`tel:${enquiry.phone}`} className="hover:text-[#0089CF] flex items-center gap-1">
                            <PhoneCall className="w-3 h-3 text-emerald-600" /> {enquiry.phone}
                          </a>
                          <a href={`mailto:${enquiry.email}`} className="hover:text-[#0089CF] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#0089CF]" /> {enquiry.email}
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
                        <span className="font-bold text-[#0073B0] block line-clamp-1">
                          {enquiry.projectName || 'Custom Requirement'}
                        </span>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{enquiry.requirements}</p>
                      </div>
                    </td>

                    {/* Dev Stage */}
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#F0F9FF] text-[#0073B0] border border-[#0089CF]/30 block text-center whitespace-nowrap">
                        {enquiry.currentStage || 'Request Received'}
                      </span>
                    </td>

                    {/* Lead Status Select */}
                    <td className="p-4">
                      <select
                        value={enquiry.status}
                        onChange={(e) => handleStatusChange(enquiry.id, e.target.value as LeadStatus)}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-[11px] font-bold focus:outline-none focus:border-[#0089CF]"
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
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const extended = enquiry as Enquiry & { assignedTo?: string | null; nextFollowUpAt?: string | null; archived?: boolean };
                            setSelectedEnquiry(enquiry);
                            setAdminNoteInput(enquiry.adminNotes || '');
                            setAssignedToInput(extended.assignedTo || '');
                            setNextFollowUpInput(extended.nextFollowUpAt ? extended.nextFollowUpAt.slice(0, 10) : '');
                            setStageInput(enquiry.currentStage || 'Request Received');
                            setCustomerMessageInput(enquiry.customerProgressMessage || '');
                            setEstimatedDateInput(enquiry.estimatedCompletionDate || '');
                            setNewAdminNoteInput('');
                            setConfirmDelivered(false);
                            setStageUpdateError(null);
                            setStageSuccessNotice(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#F0F9FF] hover:bg-[#E0F2FE] text-[#0073B0] border border-[#0089CF]/30 font-bold text-[11px] transition-colors whitespace-nowrap"
                        >
                          Manage Stage &amp; Notes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(enquiry.id, !(enquiry as Enquiry & { archived?: boolean }).archived)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px]"
                        >
                          {(enquiry as Enquiry & { archived?: boolean }).archived ? 'Restore' : 'Archive'}
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} enquiries)
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

      {/* Enquiry Detail & Development Stage Tracking Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#0089CF] font-bold bg-[#F0F9FF] border border-[#0089CF]/30 px-2 py-0.5 rounded">
                  {selectedEnquiry.leadId}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedEnquiry.studentName}</h3>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#005E91]">
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
                <p className="text-sm font-bold text-[#0089CF]">{selectedEnquiry.projectName || 'Custom Project Request'}</p>
              </div>

              <div>
                <span className="text-slate-500 font-bold block uppercase tracking-wider mb-1">Customer Requirements</span>
                <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                  {selectedEnquiry.requirements}
                </p>
              </div>

              {/* 3. CUSTOM PROJECT DEVELOPMENT STAGE TRACKER (ADMIN CONTROL) */}
              <div className="p-5 rounded-2xl bg-[#F0F9FF] border border-[#0089CF]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A] block">
                    Custom Project Development Stage & Customer Updates
                  </span>
                  <span className="text-[10px] text-[#0073B0] font-medium">
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
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:border-[#0089CF]"
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
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#0089CF]"
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
                        className="mt-0.5 rounded text-[#0089CF] focus:ring-[#0089CF]"
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
                    className="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#0089CF] font-medium"
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
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ED1C24] hover:bg-[#D1171F] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
                          <span className="font-bold text-[#0073B0]">{item.stage}</span>
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

              {/* General Internal Admin Notes & Lead Assignment Section */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lead Owner / Assignee</label>
                    <input
                      type="text"
                      value={assignedToInput}
                      onChange={(e) => setAssignedToInput(e.target.value)}
                      placeholder="e.g. Lead Engineer / Operations"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Next Follow-Up Date</label>
                    <input
                      type="date"
                      value={nextFollowUpInput}
                      onChange={(e) => setNextFollowUpInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                  Overall Internal Admin Notes (Private)
                </span>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="General notes regarding pricing, client calls, WhatsApp conversations..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#0089CF] font-medium"
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
