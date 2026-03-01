import { useState, useEffect, useMemo } from 'react';
import { Check, X, MessageSquare, Filter } from 'lucide-react';
import { Invitation } from '../types';
import { cn } from '../lib/utils';

export default function PartnerPortal() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Filters
  const [filterCurator, setFilterCurator] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterPM, setFilterPM] = useState('');

  useEffect(() => {
    fetchPendingInvitations();
  }, []);

  const fetchPendingInvitations = async () => {
    try {
      const res = await fetch('/api/invitations?status=Pending');
      const data = await res.json();
      setInvitations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (id: number, status: 'Approved' | 'Rejected', reason?: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejection_reason: reason })
      });

      if (!res.ok) throw new Error('Failed to update status');

      setRejectingId(null);
      setRejectionReason('');
      fetchPendingInvitations();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  // Extract unique values for filters
  const curators = useMemo(() => Array.from(new Set(invitations.map(i => i.curator))), [invitations]);
  const campaigns = useMemo(() => Array.from(new Set(invitations.map(i => i.campaign_name))), [invitations]);
  const pms = useMemo(() => Array.from(new Set(invitations.map(i => i.pm).filter(Boolean))), [invitations]);

  // Apply filters
  const filteredInvitations = invitations.filter(inv => {
    if (filterCurator && inv.curator !== filterCurator) return false;
    if (filterCampaign && inv.campaign_name !== filterCampaign) return false;
    if (filterPM && inv.pm !== filterPM) return false;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">知島審核看板</h1>
        <p className="text-gray-500 mt-2">請審核您的課程策展邀請。</p>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
          <Filter className="w-4 h-4" />
          篩選條件：
        </div>
        <select 
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
          value={filterCurator}
          onChange={e => setFilterCurator(e.target.value)}
        >
          <option value="">所有企劃</option>
          {curators.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select 
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
          value={filterCampaign}
          onChange={e => setFilterCampaign(e.target.value)}
        >
          <option value="">所有策展</option>
          {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select 
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
          value={filterPM}
          onChange={e => setFilterPM(e.target.value)}
        >
          <option value="">所有負責 PM</option>
          {pms.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(filterCurator || filterCampaign || filterPM) && (
          <button 
            onClick={() => { setFilterCurator(''); setFilterCampaign(''); setFilterPM(''); }}
            className="text-sm text-red-600 hover:text-red-700 ml-auto"
          >
            清除篩選
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredInvitations.map((inv) => (
          <div key={inv.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">
                    {inv.campaign_name}
                  </span>
                  {(inv.campaign_start || inv.campaign_end) && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                      {inv.campaign_start && inv.campaign_end 
                        ? `${inv.campaign_start} ~ ${inv.campaign_end}`
                        : inv.campaign_start || inv.campaign_end}
                    </span>
                  )}
                  {inv.pm && (
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-semibold">
                      PM: {inv.pm}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">邀請人： {inv.curator}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{inv.course_name}</h3>
                <p className="text-sm text-gray-500 font-mono mt-0.5">ID: {inv.course_id}</p>
              </div>

              <div className="flex items-center gap-3">
                {rejectingId === inv.id ? (
                  <div className="flex flex-col gap-2 w-full sm:w-auto animate-in fade-in zoom-in-95 duration-200">
                    <input
                      type="text"
                      placeholder="拒絕原因（選填）"
                      className="px-3 py-1.5 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500 w-full sm:w-64"
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleAction(inv.id, 'Rejected', rejectionReason)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        確認拒絕
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setRejectingId(inv.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      拒絕
                    </button>
                    <button
                      onClick={() => handleAction(inv.id, 'Approved')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all text-sm font-medium shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      同意
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredInvitations.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">
              {invitations.length === 0 ? "已全數完成！" : "沒有符合篩選條件的邀請"}
            </h3>
            <p className="text-gray-500">
              {invitations.length === 0 ? "目前沒有待審核的邀請。" : "請嘗試調整篩選條件。"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
