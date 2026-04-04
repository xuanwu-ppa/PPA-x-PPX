import React, { useState, useEffect } from 'react';
import { Search, Plus, AlertCircle, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
import { Invitation } from '../types';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [formData, setFormData] = useState({
    curator: '',
    campaign_name: '',
    campaign_start: '',
    campaign_end: '',
    courseIdsInput: '', // Bulk ID input
    courseNamesInput: '' // Bulk Name input
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dbStatus, setDbStatus] = useState<{dbType?: string, hasDbUrl?: boolean} | null>(null);

  useEffect(() => {
    fetchInvitations();
    // Fetch DB status once on mount
    fetch('/api/debug/db')
      .then(res => res.json())
      .then(data => {
        if (data && data.dbType) {
          setDbStatus({ dbType: data.dbType, hasDbUrl: data.env?.hasDbUrl });
        }
      })
      .catch(console.error);
  }, [search, filterCampaign, filterStartDate, filterEndDate]);

  const fetchInvitations = async () => {
    try {
      let url = `/api/invitations?search=${search}`;
      if (filterCampaign) {
        url += `&campaign_name=${encodeURIComponent(filterCampaign)}`;
      }
      if (filterStartDate) {
        url += `&startDate=${filterStartDate}`;
      }
      if (filterEndDate) {
        url += `&endDate=${filterEndDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvitations(data);
        setError(null);
      } else {
        console.error('API returned non-array data:', data);
        setError(data.error || '無法取得資料');
        setInvitations([]);
      }
    } catch (err: any) {
      console.error(err);
      setError('連線失敗，請檢查網路或資料庫設定。');
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch('/api/invitations', {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to clear invitations');

      setIsConfirmingClear(false);
      fetchInvitations();
    } catch (err) {
      console.error(err);
      alert('清除失敗，請重試。');
    }
  };

  const handleDeleteOne = async (id: number) => {
    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete invitation');

      setDeletingId(null);
      fetchInvitations();
    } catch (err) {
      console.error(err);
      alert('刪除失敗，請重試。');
    }
  };

  // Get unique campaigns for filter
  const campaigns = Array.from(new Set(invitations.map(i => i.campaign_name)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Parse bulk inputs
    const idLines = formData.courseIdsInput.split('\n').map(l => l.trim());
    const nameLines = formData.courseNamesInput.split('\n').map(l => l.trim());
    
    // Determine the max length to pair them
    const maxLength = Math.max(idLines.length, nameLines.length);
    const courses = [];

    for (let i = 0; i < maxLength; i++) {
      const id = idLines[i] || '';
      const name = nameLines[i] || '';
      
      if (id || name) {
        courses.push({
          id: id || 'N/A',
          name: name || '(未命名課程)'
        });
      }
    }

    if (courses.length === 0) {
      setError('請輸入至少一堂課程的 ID 或名稱');
      return;
    }

    try {
      console.log('Submitting form with data:', { ...formData, coursesCount: courses.length });
      setIsSubmitting(true);
      setError(null);
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curator: formData.curator,
          campaign_name: formData.campaign_name,
          campaign_start: formData.campaign_start,
          campaign_end: formData.campaign_end,
          courses
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create invitations');
      }

      setFormData({ 
        curator: '', 
        campaign_name: '', 
        campaign_start: '', 
        campaign_end: '', 
        courseIdsInput: '', 
        courseNamesInput: '' 
      });
      fetchInvitations();
      setSuccess('邀請已成功送出！');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || '發送邀請失敗，請重試。');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">PPA 邀請看板</h1>
        <p className="text-gray-500 mt-2">管理策展邀請並追蹤狀態。</p>
      </header>

      {dbStatus?.dbType === 'SQLite' && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-amber-800 font-medium">系統警告：目前使用暫時性本地資料庫 (SQLite)</h3>
            <p className="text-amber-700 text-sm mt-1">
              因為系統未偵測到有效的 <code>DATABASE_URL</code> 環境變數，目前已自動切換為本地 SQLite 資料庫。
              <strong>請注意：</strong> 由於雲端伺服器的特性，當網頁閒置約 15 分鐘後伺服器會休眠，此時所有新輸入的資料將會被清空。
              若要永久保存資料，請在專案設定中加入 PostgreSQL 的連線字串，或請工程師協助轉換為 Firebase。
            </p>
          </div>
        </div>
      )}

      {/* Invitation Form */}
      <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          批量新增邀請
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="企劃姓名"
              className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              value={formData.curator}
              onChange={e => setFormData({...formData, curator: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="策展名稱"
              className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              value={formData.campaign_name}
              onChange={e => setFormData({...formData, campaign_name: e.target.value})}
              required
            />
            <div className="flex flex-col">
              <label className="text-[10px] text-gray-400 ml-1">起始時間</label>
              <input
                type="date"
                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                value={formData.campaign_start}
                onChange={e => setFormData({...formData, campaign_start: e.target.value})}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-gray-400 ml-1">結束時間</label>
              <input
                type="date"
                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                value={formData.campaign_end}
                onChange={e => setFormData({...formData, campaign_end: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                課程名稱 列表 (每行一個名稱)
              </label>
              <textarea
                className="w-full h-32 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-mono text-sm"
                placeholder="投資理財入門&#10;攝影基礎班"
                value={formData.courseNamesInput}
                onChange={e => setFormData({...formData, courseNamesInput: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                課程 ID 列表 (每行一個 ID，需與名稱對應)
              </label>
              <textarea
                className="w-full h-32 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-mono text-sm"
                placeholder="123456&#10;789012"
                value={formData.courseIdsInput}
                onChange={e => setFormData({...formData, courseIdsInput: e.target.value})}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100 flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={() => fetchInvitations()}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-medium transition-colors"
              >
                重試
              </button>
            </div>
          )}
          {success && <div className="text-emerald-600 text-sm bg-emerald-50 p-2 rounded border border-emerald-100">{success}</div>}

          <button 
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full bg-gray-900 text-white py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-2",
              isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-800"
            )}
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                發送中...
              </>
            ) : '發送批量邀請'}
          </button>
        </form>
      </section>

      {/* List / Archive */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">邀請列表</h2>
            {invitations.length > 0 && (
              <div className="flex items-center gap-2">
                {isConfirmingClear ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                    <span className="text-xs text-red-600 font-medium">確定要清除所有紀錄？</span>
                    <button
                      onClick={handleClearAll}
                      className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm"
                    >
                      確認清除
                    </button>
                    <button
                      onClick={() => setIsConfirmingClear(false)}
                      className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingClear(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    一鍵清除
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">策展時間</span>
              <input 
                type="date"
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
              />
              <span className="text-gray-400">~</span>
              <input 
                type="date"
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
              value={filterCampaign}
              onChange={e => setFilterCampaign(e.target.value)}
            >
              <option value="">所有策展</option>
              {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜尋..."
                className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-64"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {(filterStartDate || filterEndDate || filterCampaign || search) && (
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterCampaign(''); setSearch(''); }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                清除
              </button>
            )}
            <button 
              onClick={async () => {
                const res = await fetch('/api/debug/db');
                const data = await res.json();
                console.log('DB Debug:', data);
                alert(`DB Count: ${data.count}\nCheck console for details.`);
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              偵錯
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">課程</th>
                  <th className="px-6 py-3 font-medium text-gray-500">策展活動</th>
                  <th className="px-6 py-3 font-medium text-gray-500">時間</th>
                  <th className="px-6 py-3 font-medium text-gray-500">企劃</th>
                  <th className="px-6 py-3 font-medium text-gray-500">狀態</th>
                  <th className="px-6 py-3 font-medium text-gray-500">更新時間</th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{inv.course_name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{inv.course_id}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{inv.campaign_name}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {inv.campaign_start && inv.campaign_end 
                        ? `${inv.campaign_start} ~ ${inv.campaign_end}`
                        : inv.campaign_start || inv.campaign_end || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{inv.curator}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        inv.status === 'Approved' && "bg-green-100 text-green-700",
                        inv.status === 'Rejected' && "bg-red-100 text-red-700",
                        inv.status === 'Pending' && "bg-yellow-100 text-yellow-700"
                      )}>
                        {inv.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {inv.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                        {inv.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                        {getStatusLabel(inv.status)}
                      </span>
                      {inv.status === 'Rejected' && inv.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={inv.rejection_reason}>
                          原因： {inv.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 tabular-nums">
                      {new Date(inv.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deletingId === inv.id ? (
                        <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                          <button
                            onClick={() => handleDeleteOne(inv.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            確認
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs font-medium text-gray-400 hover:text-gray-600"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(inv.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="刪除此筆邀請"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      找不到邀請資料。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
