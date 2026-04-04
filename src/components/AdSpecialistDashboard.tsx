import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Megaphone, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Invitation } from '../types';
import { cn } from '../lib/utils';

export default function AdSpecialistDashboard() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // Optional: can filter between Approved/Rejected
  const [filterPM, setFilterPM] = useState('');

  useEffect(() => {
    fetchReviewedInvitations();
  }, []);

  const fetchReviewedInvitations = async () => {
    try {
      // Fetch all, then filter for reviewed ones (Approved/Rejected)
      const res = await fetch('/api/invitations');
      const data = await res.json();
      if (Array.isArray(data)) {
        // Only show Approved or Rejected
        const reviewed = data.filter((inv: Invitation) => inv.status !== 'Pending');
        setInvitations(reviewed);
      } else {
        console.error('API returned non-array data:', data);
        setInvitations([]);
        alert(data.error || '無法取得審核紀錄');
      }
    } catch (err) {
      console.error(err);
      alert('連線失敗');
    }
  };

  // Get unique PMs for filter
  const pms = useMemo(() => {
    const uniquePMs = Array.from(new Set(invitations.map(inv => inv.pm).filter(Boolean)));
    return uniquePMs.sort();
  }, [invitations]);

  // Apply filters
  const filteredInvitations = invitations.filter(inv => {
    // Date filtering based on campaign period (overlap logic)
    if (startDate || endDate) {
      const campStart = inv.campaign_start ? new Date(inv.campaign_start) : null;
      const campEnd = inv.campaign_end ? new Date(inv.campaign_end) : null;

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        // If the campaign ends before the selected start date, hide it
        if (campEnd && campEnd < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        // If the campaign starts after the selected end date, hide it
        if (campStart && campStart > end) return false;
      }
    }

    if (filterStatus && inv.status !== filterStatus) return false;
    if (filterPM && inv.pm !== filterPM) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        inv.course_name.toLowerCase().includes(s) ||
        inv.course_id.toLowerCase().includes(s) ||
        inv.campaign_name.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Pending': return '待確認';
      case 'Approved': return '已接受';
      case 'Rejected': return '已拒絕';
      default: return status;
    }
  };

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-indigo-600" />
          廣告投手審核看板
        </h1>
        <p className="text-gray-500 mt-2">查看已審核通過或拒絕的課程清單，並進行投放規劃。</p>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
          <Filter className="w-4 h-4" />
          篩選條件：
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">起始時間</span>
          <input 
            type="date"
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">結束時間</span>
          <input 
            type="date"
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>

        <select 
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
          value={filterPM}
          onChange={e => setFilterPM(e.target.value)}
        >
          <option value="">所有負責 PM</option>
          {pms.map(pm => (
            <option key={pm} value={pm}>{pm}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">所有審核結果</option>
          <option value="Approved">已接受</option>
          <option value="Rejected">已拒絕</option>
        </select>

        <div className="relative flex-grow max-w-md ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋課程、ID 或策展名稱..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {(startDate || endDate || filterStatus || filterPM || search) && (
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); setFilterStatus(''); setFilterPM(''); setSearch(''); }}
            className="text-sm text-red-600 hover:text-red-700"
          >
            清除篩選
          </button>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">課程資訊</th>
                <th className="px-6 py-3 font-medium text-gray-500">策展活動</th>
                <th className="px-6 py-3 font-medium text-gray-500">策展區間</th>
                <th className="px-6 py-3 font-medium text-gray-500">負責 PM</th>
                <th className="px-6 py-3 font-medium text-gray-500">審核狀態</th>
                <th className="px-6 py-3 font-medium text-gray-500">最後更新</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{inv.course_name}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{inv.course_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600">{inv.campaign_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      {inv.campaign_start && inv.campaign_end 
                        ? `${inv.campaign_start} ~ ${inv.campaign_end}`
                        : inv.campaign_start || inv.campaign_end || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {inv.pm && (
                      <span className="text-emerald-700 font-medium">
                        {inv.pm}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      inv.status === 'Approved' && "bg-green-100 text-green-700",
                      inv.status === 'Rejected' && "bg-red-100 text-red-700"
                    )}>
                      {inv.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {inv.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                      {getStatusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 tabular-nums">
                    {new Date(inv.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredInvitations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>目前沒有符合條件的已審核課程。</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
