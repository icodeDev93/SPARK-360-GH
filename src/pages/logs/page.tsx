import { useState, useEffect } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { supabase } from '@/lib/supabase';
import { ROLE_LABELS } from '@/hooks/useAuth';
import type { LogCategory, LogAction, LogChange } from '@/lib/activityLog';

interface LogRow {
  id: string;
  user_id: string | null;
  user_name: string;
  user_role: string;
  category: LogCategory;
  action: LogAction;
  description: string;
  changes: LogChange[] | null;
  created_at: string;
}

const CATEGORY_META: Record<LogCategory, { label: string; icon: string; color: string; bg: string }> = {
  sales:     { label: 'Sales',       icon: 'ri-shopping-cart-2-line',    color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  inventory: { label: 'Inventory',   icon: 'ri-archive-drawer-line',     color: 'text-violet-700',  bg: 'bg-violet-100' },
  expenses:  { label: 'Expenses',    icon: 'ri-wallet-3-line',           color: 'text-amber-700',   bg: 'bg-amber-100' },
  customers: { label: 'Customers',   icon: 'ri-group-line',              color: 'text-cyan-700',    bg: 'bg-cyan-100' },
  purchases: { label: 'Purchases',   icon: 'ri-store-3-line',            color: 'text-teal-700',    bg: 'bg-teal-100' },
  users:     { label: 'Users',       icon: 'ri-user-settings-line',      color: 'text-rose-700',    bg: 'bg-rose-100' },
  settings:  { label: 'Settings',    icon: 'ri-settings-3-line',         color: 'text-slate-700',   bg: 'bg-slate-100' },
  auth:      { label: 'Auth',        icon: 'ri-shield-keyhole-line',     color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

const ACTION_META: Record<LogAction, { label: string; color: string; bg: string }> = {
  create:   { label: 'Created',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
  edit:     { label: 'Edited',    color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  delete:   { label: 'Deleted',   color: 'text-red-700',     bg: 'bg-red-100' },
  login:    { label: 'Login',     color: 'text-emerald-700', bg: 'bg-emerald-100' },
  logout:   { label: 'Logout',    color: 'text-slate-600',   bg: 'bg-slate-100' },
  refund:   { label: 'Refunded',  color: 'text-red-700',     bg: 'bg-red-100' },
  complete: { label: 'Completed', color: 'text-indigo-700',  bg: 'bg-indigo-100' },
};

const ALL_CATEGORIES: LogCategory[] = ['sales', 'inventory', 'expenses', 'customers', 'purchases', 'users', 'settings', 'auth'];
const ALL_ACTIONS: LogAction[] = ['create', 'edit', 'delete', 'login', 'logout', 'refund', 'complete'];

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fullTime(iso: string) {
  return new Date(iso).toLocaleString('en-GH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getInitials(name: string) {
  return name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_CYCLE = [
  'bg-indigo-600', 'bg-emerald-600', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-600', 'bg-cyan-600',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_CYCLE[Math.abs(hash) % AVATAR_CYCLE.length];
}

export default function LogsPage() {
  const [logs, setLogs]               = useState<LogRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [catFilter, setCatFilter]     = useState<LogCategory | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<LogAction | 'all'>('all');
  const [search, setSearch]           = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('user_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) setLogs(data as LogRow[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel('user_logs_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_logs' }, (payload) => {
        setLogs((prev) => [payload.new as LogRow, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = logs.filter((log) => {
    if (catFilter !== 'all' && log.category !== catFilter) return false;
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!log.description.toLowerCase().includes(q) && !log.user_name.toLowerCase().includes(q)) return false;
    }
    if (dateFrom && log.created_at < dateFrom) return false;
    if (dateTo   && log.created_at > dateTo + 'T23:59:59') return false;
    return true;
  });

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Activity Log</h2>
          <p className="text-slate-400 text-sm mt-0.5">Full audit trail of all user actions</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-indigo-700 text-xs font-semibold">Live</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 flex-1">
            <i className="ri-search-line text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="Search by description or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
            />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400 cursor-pointer"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCatFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${catFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Categories
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const m = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${catFilter === cat ? `${m.bg} ${m.color}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <i className={`${m.icon} text-xs`}></i>
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Action pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActionFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${actionFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Actions
          </button>
          {ALL_ACTIONS.map((action) => {
            const m = ACTION_META[action];
            return (
              <button
                key={action}
                onClick={() => setActionFilter(action)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${actionFilter === action ? `${m.bg} ${m.color}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log entries */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <i className="ri-loader-4-line animate-spin text-2xl text-indigo-400"></i>
            <p className="text-slate-400 text-sm">Loading activity log…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <i className="ri-file-list-3-line text-3xl text-slate-300"></i>
            <p className="text-slate-400 text-sm font-medium">No log entries found</p>
            <p className="text-slate-300 text-xs">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((log) => {
              const catMeta    = CATEGORY_META[log.category] ?? CATEGORY_META.settings;
              const actionMeta = ACTION_META[log.action]     ?? ACTION_META.edit;
              const roleMeta   = ROLE_LABELS[log.user_role as keyof typeof ROLE_LABELS];
              const expanded   = expandedId === log.id;
              const hasChanges = log.changes && log.changes.length > 0;

              return (
                <div key={log.id} className="px-5 py-4 hover:bg-slate-50/60 transition-all">
                  <div className="flex items-start gap-4">
                    {/* User avatar */}
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor(log.user_name)}`}>
                      {getInitials(log.user_name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top row */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-slate-800 text-sm font-semibold">{log.user_name}</span>
                        {roleMeta && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleMeta.bg} ${roleMeta.color}`}>
                            {roleMeta.label}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${catMeta.bg} ${catMeta.color}`}>
                          <i className={`${catMeta.icon} text-xs`}></i>
                          {catMeta.label}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionMeta.bg} ${actionMeta.color}`}>
                          {actionMeta.label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-slate-600 text-sm leading-relaxed">{log.description}</p>

                      {/* Changes diff */}
                      {hasChanges && (
                        <div className="mt-2">
                          <button
                            onClick={() => setExpandedId(expanded ? null : log.id)}
                            className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer"
                          >
                            <i className={`${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`}></i>
                            {expanded ? 'Hide changes' : `Show ${log.changes!.length} change${log.changes!.length !== 1 ? 's' : ''}`}
                          </button>

                          {expanded && (
                            <div className="mt-2 rounded-lg border border-slate-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wide w-1/3">Field</th>
                                    <th className="text-left px-3 py-2 text-red-500 font-semibold uppercase tracking-wide w-1/3">Before</th>
                                    <th className="text-left px-3 py-2 text-emerald-600 font-semibold uppercase tracking-wide w-1/3">After</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {log.changes!.map((c, i) => (
                                    <tr key={i} className="bg-white">
                                      <td className="px-3 py-2 text-slate-700 font-semibold">{c.field}</td>
                                      <td className="px-3 py-2 text-red-600 font-mono line-through opacity-70">{c.old}</td>
                                      <td className="px-3 py-2 text-emerald-700 font-mono font-semibold">{c.new}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-slate-400 text-xs" title={fullTime(log.created_at)}>
                        {timeAgo(log.created_at)}
                      </p>
                      <p className="text-slate-300 text-xs mt-0.5 hidden sm:block">
                        {new Date(log.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-slate-400 text-xs">
              Showing <strong className="text-slate-600">{filtered.length}</strong> of <strong className="text-slate-600">{logs.length}</strong> entries
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
