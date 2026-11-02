import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchActivityLogs, deleteActivityEntry, purgeActivityLogs } from '../../services/api';
import { showConfirmToast } from '../../utils/confirmToast';

interface ActivityEntry {
  _id: string;
  actorEmail: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entity: string;
  method: string;
  path: string;
  target?: string;
  statusCode?: number;
  ip?: string;
  createdAt: string;
}

const ENTITIES = [
  'all', 'auth', 'users', 'menu', 'plans', 'referrals', 'customers', 'subscriptions',
  'orders', 'drivers', 'kitchen', 'purchases', 'expenses', 'settings', 'media', 'activity', 'system'
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const entityTone: Record<string, string> = {
  menu: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  plans: 'bg-teal-50 text-teal-700 border-teal-200',
  users: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  customers: 'bg-sky-50 text-sky-700 border-sky-200',
  referrals: 'bg-amber-50 text-amber-700 border-amber-200',
  auth: 'bg-slate-100 text-slate-600 border-slate-200',
  settings: 'bg-violet-50 text-violet-700 border-violet-200'
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const statusTone = (code?: number) => {
  if (!code) return 'text-slate-400';
  if (code < 300) return 'text-emerald-600';
  if (code < 400) return 'text-slate-500';
  return 'text-rose-600';
};

export function AdminActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [entity, setEntity] = useState('all');
  const [search, setSearch] = useState('');

  const limit = 50;

  const load = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await fetchActivityLogs({ from, to, entity, q: search, page: targetPage, limit });
      if (res?.success) {
        setEntries(res.data || []);
        setTotal(res.total || 0);
        setPage(res.page || 1);
        setPages(res.pages || 1);
      } else {
        toast.error(res?.message || 'Could not load activity log');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not load activity log');
    } finally {
      setLoading(false);
    }
  }, [from, to, entity, search, page, limit]);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, entity]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const quickRange = (days: number) => {
    setFrom(daysAgoISO(days));
    setTo(todayISO());
  };

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setEntity('all');
    setSearch('');
    load(1);
  };

  const handleDeleteEntry = (entry: ActivityEntry) => {
    showConfirmToast({
      title: 'Delete this activity entry?',
      description: `${entry.action} — ${entry.actorName || entry.actorEmail} · ${formatDateTime(entry.createdAt)}`,
      confirmText: 'Delete',
      confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        const res = await deleteActivityEntry(entry._id);
        if (res?.success) {
          toast.success('Activity entry deleted');
          load();
        } else {
          toast.error(res?.message || 'Could not delete entry');
        }
      }
    });
  };

  const handlePurge = () => {
    if (!from && !to && entity === 'all') {
      toast.error('Set a date range or an entity before deleting');
      return;
    }
    showConfirmToast({
      title: 'Delete matching activity entries?',
      description: `This removes every logged action for ${from || 'the beginning'} → ${to || 'now'}${entity !== 'all' ? ` (${entity})` : ''}. It cannot be undone.`,
      confirmText: 'Delete entries',
      confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        const res = await purgeActivityLogs({ from, to, entity: entity !== 'all' ? entity : undefined });
        if (res?.success) {
          toast.success(res.message || 'Activity entries deleted');
          load(1);
        } else {
          toast.error(res?.message || 'Could not delete entries');
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <Activity className="w-4 h-4" />
            <span>Audit trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Activity Log</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Every create, update and delete performed in the admin panel and on the customer site.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load(page)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handlePurge}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete filtered</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={e => setTo(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
            <select
              value={entity}
              onChange={e => setEntity(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 capitalize focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search action, person, path…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Quick range:
          </span>
          {[{ label: 'Today', days: 0 }, { label: '7 days', days: 6 }, { label: '30 days', days: 29 }].map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => quickRange(opt.days)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer"
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Clear
          </button>
          <span className="ml-auto text-[11px] font-semibold text-slate-500">
            {total} {total === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="text-left font-bold py-3 px-4">When</th>
                <th className="text-left font-bold py-3 px-4">Who</th>
                <th className="text-left font-bold py-3 px-4">Activity</th>
                <th className="text-left font-bold py-3 px-4">Section</th>
                <th className="text-left font-bold py-3 px-4">Target</th>
                <th className="text-left font-bold py-3 px-4">Result</th>
                <th className="text-right font-bold py-3 px-4">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-50" />
                    Loading activity…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-500 font-semibold">No activity found</p>
                    <p className="text-slate-400 text-[11px] mt-1">Try a wider date range or clear the filters.</p>
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry._id} className="hover:bg-slate-50/70 transition-colors align-top">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{entry.actorName || entry.actorEmail}</div>
                      <div className="text-[10px] text-slate-400">
                        {entry.actorEmail} · {entry.actorRole}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{entry.action}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {entry.method} {entry.path}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${entityTone[entry.entity] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {entry.entity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-[160px] truncate">
                      {entry.target || '—'}
                    </td>
                    <td className={`py-3 px-4 font-bold ${statusTone(entry.statusCode)}`}>
                      {entry.statusCode || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry)}
                        title="Delete entry"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Page {page} of {pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => load(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              onClick={() => load(Math.min(pages, page + 1))}
              disabled={page >= pages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <UserCheck className="w-3.5 h-3.5" />
        Only create / update / delete actions are recorded — page views are not logged.
      </p>
    </div>
  );
}
